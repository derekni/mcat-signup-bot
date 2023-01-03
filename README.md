# mcat-signup-bot
Bot hosted on EC2 instance to keep checking for MCAT location availabilities. Sends texts and calls to a specified number through Twilio when an appointment is available.

To use, first create a Twilio account, and get a Twilio phone number as well. Create a `secrets.js` file that contains the following parameters:
```
exports.TWILIO_ACCOUNT_SID = ...
exports.TWILIO_AUTH_TOKEN = ...
exports.twilio_number = ...
```

From there, create a bot using your address you want to search for, dates that you may be interested in (in the same format as "Saturday 25th of March 2023"), specific centers you are interested in with that search query (based on index), and the phone numbers you want the bot to text and call when there is an availability.

To run this bot locally, you can simply use `node run_bot.js`, or if you want to run it on an EC2 instance, you can use `forever start run_bot.js`, which will keep re-starting the process if there are any issues that stop it from running.
