const Bot = require("./bot.js");
const Query = require("./query.js");
const secrets = require("./secrets.js");

// tiff queries
const address = secrets.address;
const date = "Saturday 25th of March 2023";
const centers = [1, 4];
const phones = [secrets.phone];
const tQuery = new Query(address, date, centers, phones);

// pri queries
const PAddress = secrets.p_address;
const PDate1 = "Friday 24th of March 2023";
const PDate2 = "Saturday 25th of March 2023";
const PCenters = [1, 2];
const PPhones = [secrets.phone, secrets.p_phone];
const pQuery1 = new Query(PAddress, PDate1, PCenters, PPhones);
const pQuery2 = new Query(PAddress, PDate2, PCenters, PPhones);

const MCATBot = new Bot([tQuery, pQuery1, pQuery2]);

MCATBot.search(true);
