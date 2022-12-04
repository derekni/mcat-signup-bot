const puppeteer = require("puppeteer");
const secrets = require("./secrets.js");

const accountSid = secrets.TWILIO_ACCOUNT_SID;
const authToken = secrets.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

let page = null;
let browser = null;

const login_url = "https://mcat.aamc.org/mrs/#/";
const search_date = "Friday 24th of March 2023";
const search_date2 = "Friday 25th of March 2023";

const login = async () => {
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
  await page.waitForSelector('input[name="testCentersNearAddress"]');
  await timeout(1_500);
  await page.$eval(
    'input[name="testCentersNearAddress"]',
    (el, address) => (el.value = address),
    secrets.address
  );

  let numQueries = 0;
  await checkWorking();

  // keep looping and selecting different dates
  setInterval(async () => {
    // search march 24
    searchSpecificDate(search_date);
    await timeout(3_000);
    numQueries += 1;
    const datesAvailable = await numberDatesAvailable();
    // console.log(`Dates available: ${datesAvailable}`);
    // console.log(`Number of queries: ${numQueries}`);
    if (datesAvailable > 0) {
      sendMessage(
        `There are ${datesAvailable} appointments available with search location ${secrets.address} and search date ${search_date}.`
      );
    }

    // search march 25
    await timeout(12_000);
    searchSpecificDate(search_date2);
    await timeout(3_000);
    numQueries += 1;
    const datesAvailable2 = await numberDatesAvailable();
    // console.log(`Dates available: ${datesAvailable2}`);
    // console.log(`Number of queries: ${numQueries}`);
    if (datesAvailable2 > 0) {
      sendMessage(
        `There are ${datesAvailable2} appointments available with search location ${secrets.address} and search date ${search_date}.`
      );
    }

    // every 600 queries (~3 hours), do a test to ensure that it's working
    if (numQueries % 600 === 0) {
      await checkWorking();
    }
  }, 12_000);
};
login();

const numberDatesAvailable = async () => {
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
  // fill in name
  await page.waitForSelector('input[name="testCentersNearAddress"]');
  await timeout(1_000);
  await page.$eval(
    'input[name="testCentersNearAddress"]',
    (el, address) => (el.value = address),
    secrets.address
  );

  // fill in date
  await page.click('img[id="calendarIcon"]');
  await page.evaluate((date) => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.ariaLabel === date)
      .click();
  }, date);
  await page.click('input[id="addressSearch"]');
};

// makes a query for texas, for march 24, sends a message
const checkWorking = async () => {
  // fill in address
  await page.waitForSelector('input[name="testCentersNearAddress"]');
  await timeout(1_500);
  await page.$eval(
    'input[name="testCentersNearAddress"]',
    (el, address) => (el.value = address),
    "Texas"
  );

  // fill in date
  await page.click('img[id="calendarIcon"]');
  await page.evaluate((date) => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.ariaLabel === date)
      .click();
  }, search_date);
  await page.click('input[id="addressSearch"]');

  // send message with results
  const available = await numberDatesAvailable();
  sendMessage(
    `Tested with input Texas and date ${search_date}, found ${available} test sites available`
  );
};

const sendMessage = (msg) => {
  client.messages.create({
    body: msg,
    from: secrets.twilio_number,
    to: secrets.phone,
  });
};
