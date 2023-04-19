const Bot = require("../classes/bot.js");
const secrets = require("../classes/secrets.js");

const MCATBot = new Bot(secrets.queries);

MCATBot.search(true);
