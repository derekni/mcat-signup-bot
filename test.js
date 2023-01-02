const Bot = require("./bot.js");
const secrets = require("./secrets.js");

const address = "57103";
const dates = ["Friday 24th of March 2023"];
const centers = [1, 2];
const phones = [secrets.phone];

const TBot = new Bot(address, dates, centers, phones);

TBot.search();
