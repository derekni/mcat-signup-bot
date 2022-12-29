const puppeteer = require("puppeteer");
const secrets = require("./secrets.js");

const accountSid = secrets.TWILIO_ACCOUNT_SID;
const authToken = secrets.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

let page = null;
let browser = null;

const login_url = "https://mcat.aamc.org/mrs/#/";
const search_date = "Friday 24th of March 2023";
const search_date2 = "Saturday 25th of March 2023";

let numQueries = 0;

const search = async () => {
  // launch new browser
  browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
  });
  page = await browser.newPage();

  // navigate to login, login
  await page.goto(login_url);
  await page.waitForSelector('input[name="IDToken1"]');
  await timeout(1_500);
  await page.type('input[name="IDToken1"]', secrets.username);
  await page.type('input[name="IDToken2"]', secrets.password);
  await page.click('button[id="login-btn"]');
  await timeout(5_000);

  // go to mcat signup url, click through to schedule query
  await page.evaluate(() => {
    Array.from(document.querySelectorAll("span"))
      .find((el) => el.textContent === " Reschedule or Cancel Appointment ")
      .click();
  });
  await timeout(4_500);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.textContent === "MCAT: Medical College Admission Test")
      .click();
  });
  await timeout(2_500);
  await page.click(
    'input[aria-label="Reschedule MCAT: Medical College Admission Test"]'
  );
  await timeout(2_500);

  // type in address
  await checkWorking();

  // keep looping and selecting different dates
  await loopSearchTwoDates(search_date);
};
search();

const numberDatesAvailable = async () => {
  await page.waitForSelector("input");
  const avail = await page.evaluate(() => {
    const available = Array.from(document.querySelectorAll("input")).filter(
      (el) => el.className === "btn_select"
    );
    return available.length / 2;
  });
  return avail;
};

const timeout = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const searchSpecificDate = async (date) => {
  // fill in address
  await page.waitForSelector('input[name="testCentersNearAddress"]');
  await timeout(1_500);
  await page.$eval(
    'input[name="testCentersNearAddress"]',
    (el, address) => (el.value = address),
    secrets.p_address
  );
  await timeout(500);

  // fill in date
  await page.click('img[id="calendarIcon"]');
  await timeout(500);
  await page.evaluate((d) => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.ariaLabel === d)
      .click();
  }, date);
  await timeout(500);
  await Promise.all([
    page.click('input[id="addressSearch"]'),
    page.waitForNavigation(),
  ]);
};

// makes a query for march 24 and secrets address, sends a message
const checkWorking = async () => {
  // fill in address
  await page.waitForSelector('input[name="testCentersNearAddress"]');
  await timeout(1_500);
  await page.$eval(
    'input[name="testCentersNearAddress"]',
    (el, address) => (el.value = address),
    "minnesota"
  );

  // fill in date
  await page.click('img[id="calendarIcon"]');
  await timeout(300);
  await page.evaluate((date) => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.ariaLabel === date)
      .click();
  }, search_date);
  await page.click('input[id="addressSearch"]');

  await timeout(2_500);

  // send message with results
  const available = await checkSpecificCenter(0);
  sendMessageD(
    `Pri: Tested with input minnesota, date ${search_date}, index 0. ${
      available ? "Appointments are available." : "No appointments available."
    }`
  );
};

const sendMessageD = (msg) => {
  client.messages.create({
    body: msg,
    from: secrets.twilio_number,
    to: secrets.phone,
  });
};

const sendMessageP = (msg) => {
  client.messages.create({
    body: msg,
    from: secrets.twilio_number,
    to: secrets.p_phone,
  });
};

const callP = () => {
  client.calls.create({
    url: "http://demo.twilio.com/docs/voice.xml",
    from: secrets.twilio_number,
    to: secrets.p_phone,
  });
};

// indices start at 0
const checkSpecificCenter = async (index) => {
  const available = await page.evaluate((i) => {
    const arr = Array.from(
      document
        .querySelector(`tr#testCenter_${i}`)
        .querySelector("td.searchByDateApptCol")
        .querySelectorAll("span")
    ).slice(1);

    for (let i = 0; i < arr.length; i++) {
      const elt = arr[i];
      if (elt.id.slice(0, 4) === "hour") {
        return true;
      }
    }
    return false;
  }, index);
  return available;
};

// constantly searches for whatever search date is passed in
const loopSearchOneDate = async (date) => {
  await searchSpecificDate(date);
  numQueries += 1;

  // only check for index 0-3
  for (let i = 0; i < 4; i++) {
    const available = await checkSpecificCenter(i);
    if (available) {
      sendMessageP(
        `There are appointments available with search zip code ${
          secrets.p_address
        } and search date ${date}, at appointment center ${i + 1}`
      );
      sendMessageD(
        `Pri: There are appointments available with search zip code ${
          secrets.p_address
        } and search date ${date}, at appointment center ${i + 1}`
      );
      callP();
    }
  }

  // every 750 queries (~3 hours), do a test to ensure that it's working
  if (numQueries % 750 === 0) {
    await checkWorking();
  }

  // re-call this function in ten seconds
  setTimeout(async () => {
    await loopSearchOneDate(date);
  }, 10_000);
};

// loops between two search dates, search_date and search_date2
const loopSearchTwoDates = async (date) => {
  await searchSpecificDate(date);
  numQueries += 1;

  // only check for index 0-3
  for (let i = 0; i < 4; i++) {
    const available = await checkSpecificCenter(i);
    if (available) {
      sendMessageP(
        `There are appointments available with search zip code ${
          secrets.p_address
        } and search date ${date}, at appointment center ${i + 1}`
      );
      sendMessageD(
        `Pri: There are appointments available with search zip code ${
          secrets.p_address
        } and search date ${date}, at appointment center ${i + 1}`
      );
      // callP();
    }
  }

  // every 750 queries (~3 hours), do a test to ensure that it's working
  if (numQueries % 750 === 0) {
    await checkWorking();
  }

  // re-call this function in ten seconds
  setTimeout(async () => {
    if (date === search_date) {
      await loopSearchTwoDates(search_date2);
    } else {
      await loopSearchTwoDates(search_date);
    }
  }, 10_000);
};
