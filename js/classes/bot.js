import Query from "../classes/query.js";

const puppeteer = require("puppeteer");
const secrets = require("../secrets.js");

const accountSid = secrets.TWILIO_ACCOUNT_SID;
const authToken = secrets.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const login_url = "https://mcat.aamc.org/mrs/#/";

/**
 * Bot that takes in queries to search for and keeps searching for availabilities.
 */
class Bot {
  /**
   * Initialize a Bot with basic parameters for searching MCAT locations.
   * @param {Query[]} queries queries to search for.
   */
  constructor(queries) {
    this.queries = queries;
    this.months = ["April", "May", "June", "July", "August", "September"];
    this.masterPhone = secrets.my_phone;
  }

  /**
   * Log in and search the MCAT website for specific locations and dates.
   * @param {boolean} testing set to true if want to test on local computer, false if on EC2.
   */
  search = async (testing = false) => {
    console.log("MCAT Bot started running.");
    text("MCAT Bot has started running.", this.masterPhone);

    // launch new browser
    if (testing) {
      this.browser = await puppeteer.launch({ headless: false });
    } else {
      this.browser = await puppeteer.launch({
        executablePath: "/snap/bin/chromium",
        args: ["--proxy-server='direct://'", "--proxy-bypass-list=*"],
        timeout: 120_000,
      });
    }
    this.page = await this.browser.newPage();

    // if on EC2 instance, give more wiggle room w/ timeout
    if (!testing) {
      this.page.setDefaultTimeout(120_000);
    }

    // navigate to login and login
    await this.page.goto(login_url);
    await Promise.all([
      this.page.waitForSelector('input[name="IDToken1"]'),
      this.page.waitForSelector('input[name="IDToken2"]'),
      this.page.waitForSelector('button[id="login-btn"]'),
      timeout(2_000),
    ]);
    await this.page.type('input[name="IDToken1"]', secrets.username);
    await this.page.type('input[name="IDToken2"]', secrets.password);
    await Promise.all([
      this.page.click('button[id="login-btn"]'),
      this.page.waitForNavigation(),
    ]);
    await this.page.waitForSelector(
      "mat-card-actions button span.mat-button-wrapper"
    );

    // go to mcat signup url, click through to schedule query
    await this.page.evaluate(() => {
      Array.from(document.querySelectorAll("span"))
        .find((el) => el.textContent === "Schedule an Exam")
        .click();
    });
    await Promise.all([
      this.page.waitForSelector("input[id='nextButton']"),
      timeout(2_000),
    ]);
    await this.page.evaluate(() => {
      Array.from(document.querySelectorAll("input"))
        .find((el) => el.id === "nextButton")
        .click();
    });
    await Promise.all([
      this.page.waitForSelector('input[name="testCentersNearAddress"]'),
      this.page.waitForSelector('img[id="calendarIcon"]'),
      this.page.waitForSelector('input[id="addressSearch"]'),
      timeout(3_500),
    ]);

    // keep looping and selecting different dates
    await this.loopSearch(0);
  };

  /**
   * Fills in address and date, and searches for test centers.
   * @param {Query} query specific query to search.
   */
  searchSpecificQuery = async (query) => {
    // fill in address
    await this.page.$eval(
      'input[name="testCentersNearAddress"]',
      (el, address) => (el.value = address),
      query.address
    );

    // fill in date
    await this.fillInDate(query);

    // navigate
    await Promise.all([
      this.page.click("input#addressSearch"),
      this.page.waitForNavigation(),
    ]);

    await Promise.all([
      this.page.waitForSelector(`tbody tr td.searchByDateApptCol span`),
      this.page.waitForSelector('img[id="calendarIcon"]'),
      this.page.waitForSelector('input[id="addressSearch"]'),
      this.page.waitForSelector('input[name="testCentersNearAddress"]'),
    ]);
  };

  fillInDate = async (query) => {
    await this.page.click('img[id="calendarIcon"]');
    await this.page.waitForSelector("span.ui-datepicker-month");
    const targetMonthInd = this.months.indexOf(query.month);
    const monthElt = await this.page.$("span.ui-datepicker-month");
    const currMonth = await monthElt.evaluate((el) => el.textContent);
    let currMonthInd = this.months.indexOf(currMonth);

    while (currMonthInd < targetMonthInd) {
      // select next month button
      await this.page.click("a.ui-datepicker-next.ui-corner-all");
      await timeout(1_000);
      currMonthInd += 1;
    }

    await this.page.$$eval(
      "a.ui-state-default",
      (elts, day) => {
        for (const elt of elts) {
          if (elt.textContent === " " + day) {
            elt.click();
            break;
          }
        }
      },
      query.day
    );
  };

  /**
   * Makes a basic location/date query and sends a text with the results.
   */
  checkWorking = async (query, iterations) => {
    await this.searchSpecificQuery(query);
    const available = await this.isSpecificCenterAvailable(query.centers[0]);
    for (const phone of query.text_phones) {
      text(
        `The bot has searched ${iterations} times for your query. Continuing on 
        with queries at address ${query.address}, on month ${query.month} and 
        day ${query.day}.`,
        phone
      );
    }
  };

  /**
   * Returns if a specific center has appointments available.
   * @param {number} index Specific center of interest.
   * @returns if the center with the specified index is available.
   */
  isSpecificCenterAvailable = async (index) => {
    const isAvailable = await this.page.evaluate((i) => {
      const arr = Array.from(
        document.querySelectorAll(
          `tr#testCenter_${i} td.searchByDateApptCol span`
        )
      ).slice(1);

      for (let i = 0; i < arr.length; i++) {
        const elt = arr[i];
        if (elt.id.slice(0, 4) === "hour") {
          return true;
        }
      }
      return false;
    }, index - 1);
    return isAvailable;
  };

  /**
   * Keeps searching for bot's location and dates, for centers.
   * Texts and calls the bot's phone number if one is available.
   * @param {int} counter How many times this loop has iterated.
   */
  loopSearch = async (counter) => {
    for (const query of this.queries) {
      // if already notified within last 60 seconds, don't search again
      const currTime = Date.now();
      if (this.getTimeDifferenceInSeconds(currTime, query.time) < 60) {
        continue;
      }

      await this.searchSpecificQuery(query);
      for (const center of query.centers) {
        const isAvailable = await this.isSpecificCenterAvailable(center);
        if (isAvailable) {
          for (const phone of query.text_phones) {
            text(
              `There are appointments available with search location ${query.address} and search date ${query.date} for test center ${center}.`,
              phone
            );
          }
          for (const phone of query.call_phones) {
            call(phone);
          }
        }
      }
    }

    // every 8,000 loops, do a test to ensure that it's working
    if (counter % 8_000 === 0) {
      for (const query of this.queries) {
        await this.checkWorking(query);
      }
    }

    // re-call this function in two seconds
    setTimeout(() => {
      this.loopSearch(counter + 1);
    }, 2_000);
  };

  /**
   * This function takes in two Date objects and
   *    returns the time difference between them in seconds.
   * @param {Date} date1 The first Date object to compare.
   * @param {Date} date2 The second Date object to compare.
   * @returns A number representing the time difference
   *    between date1 and date2 in seconds.
   */
  getTimeDifferenceInSeconds = (date1, date2) => {
    const difference = Math.abs(date1.getTime() - date2.getTime());
    const seconds = Math.floor(difference / 1_000);
    return seconds;
  };
}

/**
 * Creates a Promise with a specified resolve time.
 * @param {int} ms how long the Promise should take to resolve.
 * @returns A Promise that resolves in the specified ms
 */
const timeout = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Sends a text to a phone number.
 * @param {string} msg Message to be texted.
 * @param {string} number Phone number for text to be sent to.
 */
const text = (msg, number) => {
  client.messages.create({
    body: msg,
    from: secrets.twilio_number,
    to: number,
  });
};

/**
 * Calls a phone number.
 * @param {string} number Phone number to be called.
 */
const call = (number) => {
  client.calls.create({
    url: "http://demo.twilio.com/docs/voice.xml",
    from: secrets.twilio_number,
    to: number,
  });
};

module.exports = Bot;
