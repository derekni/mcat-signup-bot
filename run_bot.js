const Bot = require("./bot.js");
const Query = require("./query.js");
const secrets = require("./secrets.js");

// test query
const Address = secrets.address;
const Month = "June";
const Day = 3;
const Centers = [1, 2];
const TextPhones = [secrets.phone];
const CallPhones = [];
const query = new Query(Address, Month, Day, Centers, TextPhones, CallPhones);

const MCATBot = new Bot([query]);

MCATBot.search(true);
