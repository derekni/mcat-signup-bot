const Bot = require("./bot.js");
const secrets = require("./secrets.js");

const address = secrets.address;
const dates = ["Saturday 25th of March 2023"];
const centers = [1, 4];
const phones = [];

const TBot = new Bot(address, dates, centers, phones);
TBot.search();
