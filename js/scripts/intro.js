const secrets = require("../secrets.js");

const accountSid = secrets.TWILIO_ACCOUNT_SID;
const authToken = secrets.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const both_intro =
  "Hi! I am your MCAT Bot. I will send you texts periodically to confirm that I am running, and will call and text you when a spot opens up.";
const call_intro =
  "Hi! I am your MCAT Bot. I will send you texts periodically to confirm that I am running, and will call you when a spot opens up.";
const text_intro =
  "Hi! I am your MCAT Bot. I will send you texts periodically to confirm that I am running, and will text you when a spot opens up.";
let introducedCustomers = secrets.introducedCustomers;

console.log("introduced customers at start", introducedCustomers);

for (const query of secrets.queries) {
  let phone_intros = {
    call: [],
    text: [],
    both: [],
  };
  for (const callPhone of query.call_phones) {
    if (!introducedCustomers.includes(callPhone)) {
      phone_intros.call.push(callPhone);
    }
  }

  for (const textPhone of query.text_phones) {
    if (!introducedCustomers.includes(textPhone)) {
      if (phone_intros.call.includes(textPhone)) {
        phone_intros.both.push(textPhone);
        phone_intros.call.filter((p) => p != textPhone);
      }
    }
  }

  console.log("phone intros:");
  console.log("call", phone_intros.call);
  console.log("text", phone_intros.text);
  console.log("both", phone_intros.both);

  for (const number of phone_intros.call) {
    introducedCustomers.push(number);
    sendText(call_intro, number);
  }
  for (const number of phone_intros.text) {
    introducedCustomers.push(number);
    sendText(text_intro, number);
  }
  for (const number of phone_intros.both) {
    introducedCustomers.push(number);
    sendText(both_intro, number);
  }
}

console.log("introduced customers at end", introducedCustomers);
console.log("*** REMEMBER TO UPDATE INTRODUCED CUSTOMERS IN SECRETS.JS ***");

const sendText = (msg, number) => {
  client.messages.create({
    body: msg,
    from: secrets.twilio_number,
    to: number,
  });
};
