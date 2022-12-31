const Bot = require("./bot.js");
const secrets = require("./secrets.js");

const address = secrets.p_address;
const dates = ["Friday 24th of March 2023", "Saturday 25th of March 2023"];
const centers = [1, 2, 3, 4];
const phones = [secrets.phone, secrets.p_phone];

const PriBot = new Bot(address, dates, centers, phones);
PriBot.search();
