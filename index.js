const puppeteer = require("puppeteer");
const secrets = require("./secrets.js");

let page = null;
let browser = null;

const login_url = "https://auth.aamc.org/account/#/login";
const mcat_url = "https://mcat.aamc.org/mrs/#/dashboard";

const login = async () => {
  // launch new browser
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();

  // navigate to login, login
  await page.goto(login_url);
  await page.waitForSelector('input[name="IDToken1"]');
  await timeout(1500);
  await page.type('input[name="IDToken1"]', secrets.username);
  await page.type('input[name="IDToken2"]', secrets.password);
  await page.click('button[id="login-btn"]');
  await timeout(8000);

  // go to mcat signup url, click through to schedule query
  await page.goto(mcat_url);
  await timeout(4500);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll("span"))
      .find((el) => el.textContent === " Reschedule or Cancel Appointment ")
      .click();
  });
  await timeout(4500);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.textContent === "MCAT: Medical College Admission Test")
      .click();
  });
  await timeout(2500);
  await page.click(
    'input[aria-label="Reschedule MCAT: Medical College Admission Test"]'
  );
  await timeout(2500);

  // type in address and date
  await page.waitForSelector('input[name="testCentersNearAddress"]');
  await page.$eval(
    'input[name="testCentersNearAddress"]',
    (el) => (el.value = secrets.address)
  );
  await page.click('img[id="calendarIcon"]');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll("a"))
      .find((el) => el.ariaLabel === "Friday 24th of March 2023")
      .click();
  });
  await page.click('input[id="addressSearch"]');
  await timeout(3000);
  const datesAvailable = await numberDatesAvailable();
  console.log(datesAvailable);
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
