const Bot = require("./bot.js");
const secrets = require("./secrets.js");

const address = secrets.address;
const dates = ["Saturday 25th of March 2023"];
const centers = [1, 4];
const phones = [secrets.phone];

const PAddress = secrets.p_address;
const PDates = ["Friday 24th of March 2023", "Saturday 25th of March 2023"];
const PCenters = [1, 2, 3, 4];
const PPhones = [secrets.phone, secrets.p_phone];

const TBot = new Bot(address, dates, centers, phones);
const PriBot = new Bot(PAddress, PDates, PCenters, PPhones);

TBot.search();
PriBot.search();
