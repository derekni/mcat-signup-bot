const puppeteer = require("puppeteer");
const secrets = require("./secrets.js");

const accountSid = secrets.TWILIO_ACCOUNT_SID;
const authToken = secrets.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const login_url = "https://mcat.aamc.org/mrs/#/";

class Bot {
  /**
   * Initialize a Bot with basic parameters for searching MCAT locations.
   * @param {string} address address to query for.
   * @param {string[]} dates dates to query for.
   * @param {int[]} centers centers to query for.
   * @param {string[]} phones phones to call / text.
   */
  constructor(address, dates, centers, phones) {
    this.address = address;
    this.dates = dates;
    this.centers = centers;
    this.phones = phones;
    this.page = null;
    this.browser = null;
  }

  /**
   * Searches the MCAT website for specific locations and dates.
   * @param {boolean} testing set to true if want to test on local computer.
   */
  search = async (testing = false) => {
    // launch new browser
    if (testing) {
      this.browser = await puppeteer.launch({ headless: false });
    } else {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: "/usr/bin/chromium-browser",
      });
    }
    this.page = await this.browser.newPage();

    // navigate to login and login
    await this.page.goto(login_url);
    await Promise.all([
      this.page.waitForSelector('input[name="IDToken1"]'),
      this.page.waitForSelector('input[name="IDToken2"]'),
      this.page.waitForSelector('button[id="login-btn"]'),
      timeout(1_200),
    ]);
    await this.page.type('input[name="IDToken1"]', secrets.username);
    await this.page.type('input[name="IDToken2"]', secrets.password);
    await this.page.click('button[id="login-btn"]');
    await this.page.waitForSelector(
      "mat-card-actions button span.mat-button-wrapper"
    );

    // go to mcat signup url, click through to schedule query
    await this.page.evaluate(() => {
      Array.from(document.querySelectorAll("span"))
        .find((el) => el.textContent === " Reschedule or Cancel Appointment ")
        .click();
    });
    await Promise.all([
      this.page.waitForSelector(
        "a[title='MCAT: Medical College Admission Test']",
        { timeout: 10_000 }
      ),
      timeout(1_200),
    ]);

    // click mcat link
    await this.page.$eval(
      "a[title='MCAT: Medical College Admission Test']",
      (e) => e.click()
    );
    await Promise.all([
      this.page.waitForSelector(
        'input[aria-label="Reschedule MCAT: Medical College Admission Test"]',
        { timeout: 10_000 }
      ),
      timeout(1_200),
    ]);

    // click reschedule
    await this.page.click(
      'input[aria-label="Reschedule MCAT: Medical College Admission Test"]'
    );
    await Promise.all([
      this.page.waitForSelector('input[name="testCentersNearAddress"]'),
      this.page.waitForSelector('img[id="calendarIcon"]'),
      this.page.waitForSelector('input[id="addressSearch"]'),
      timeout(3_000),
    ]);

    // keep looping and selecting different dates
    await this.loopSearch(0);
  };

  /**
   * Fills in address and date, and searches for test centers.
   * @param {string} date specific aria-label date to query for.
   */
  searchSpecificDate = async (date) => {
    // fill in address
    await this.page.$eval(
      'input[name="testCentersNearAddress"]',
      (el, address) => (el.value = address),
      this.address
    );

    // fill in date
    await this.page.click('img[id="calendarIcon"]');
    await this.page.waitForSelector(`a[aria-label='${date}'`);
    await this.page.click(`a[aria-label='${date}'`);

    // navigate
    await this.page.click('input[id="addressSearch"]');
    await Promise.all([
      this.page.waitForSelector(
        `tbody tr[id='testCenter_0'] td.searchByDateApptCol span`
      ),
      this.page.waitForSelector('input[name="testCentersNearAddress"]'),
      this.page.waitForSelector('img[id="calendarIcon"]'),
      this.page.waitForSelector('input[id="addressSearch"]'),
      timeout(3_000),
    ]);
  };

  /**
   * Makes a basic location/date query and sends a text with the results.
   */
  checkWorking = async (date, center) => {
    await this.searchSpecificDate(date);
    const available = await this.isSpecificCenterAvailable(center);
    for (const phone of this.phones) {
      sendMessage(
        `Tested with address ${this.address}, date ${date}, center ${center}. ${
          available
            ? "Appointments are available."
            : "No appointments available."
        }`,
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
    for (const date of this.dates) {
      await this.searchSpecificDate(date);
      for (const center of this.centers) {
        const isAvailable = await this.isSpecificCenterAvailable(center);
        if (isAvailable) {
          for (const phone of this.phones) {
            sendMessage(
              `There are appointments available with search location ${this.location} and search date ${date}.`,
              phone
            );
            call(phone);
          }
        }
      }
    }

    // every 750 queries (~3 hours), do a test to ensure that it's working
    if (counter % 750 === 0) {
      await this.checkWorking();
    }

    // re-call this function in eight seconds
    setTimeout(() => {
      this.loopSearch(counter + 1);
    }, 8_000);
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
 * Sends a specified message to a specified phone number.
 * @param {string} msg Message to be texted.
 * @param {string} number Phone number for text to be sent to.
 */
const sendMessage = (msg, number) => {
  client.messages.create({
    body: msg,
    from: secrets.twilio_number,
    to: number,
  });
};

/**
 * Calls a specified phone number.
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
