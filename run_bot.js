const Bot = require("./bot.js");
const Query = require("./query.js");
const secrets = require("./secrets.js");

// pri queries
const PAddress = secrets.p_address;
const PDate = "Friday 24th of March 2023";
const PCenters = [1, 2];
const PPhones = [secrets.phone, secrets.p_phone];
const pQuery = new Query(PAddress, PDate, PCenters, PPhones);

const MCATBot = new Bot([pQuery]);

MCATBot.search();
