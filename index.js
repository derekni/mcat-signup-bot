const puppeteer = require("puppeteer");
const secrets = require("./secrets.js");

const accountSid = secrets.TWILIO_ACCOUNT_SID;
const authToken = secrets.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

let page = null;
let browser = null;

const login_url = "https://mcat.aamc.org/mrs/#/";
const search_date = "Friday 24th of March 2023";

const login = async () => {
  // launch new browser
  browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser' });
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

  // type in address and date
  await page.waitForSelector('input[name="testCentersNearAddress"]');
  await page.$eval(
    'input[name="testCentersNearAddress"]',
    (el, address) => (el.value = address),
    secrets.address
  );
  await page.click('img[id="calendarIcon"]');
  await page.evaluate((search_date) => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.ariaLabel === search_date)
      .click();
  }, search_date);
  await page.click('input[id="addressSearch"]');
  await timeout(3_000);
  let numQueries = 0;
  client.messages
    .create({
      body: "Began searching for mcat locations.",
      from: secrets.twilio_number,
      to: secrets.phone,
    })
    .then((message) => console.log(message.sid));
  setInterval(async () => {
    await page.click('input[id="addressSearch"]');
    await timeout(3_000);
    numQueries += 1;
    const datesAvailable = await numberDatesAvailable();
    console.log(`Dates available: ${datesAvailable}`);
    console.log(`Number of queries: ${numQueries}`);
    if (datesAvailable > 0) {
      client.messages
        .create({
          body: `There are ${datesAvailable} appointments available with search location ${secrets.address} and search date ${search_date}.`,
          from: secrets.twilio_number,
          to: secrets.phone,
        })
        .then((message) => console.log(message.sid));
    } else if (numQueries % 6_000 == 0) {
      client.messages
        .create({
          body: `Twilio has queried ${numQueries} times for MCAT dates.`,
          from: secrets.twilio_number,
          to: secrets.phone,
        })
        .then((message) => console.log(message.sid));
    }
  }, 15_000);
};
login();

const numberDatesAvailable = async () => {
  const avail = await page.evaluate(() => {
    const available = Array.from(document.querySelectorAll("input")).filter(
      (el) => el.className === "btn_select"
    );
    return available.length;
  });
  return avail;
};

const timeout = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
