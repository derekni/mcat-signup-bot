/**
 * A specific MCAT search query of address, date, centers, phones.
 */
class Query {
  /**
   * Create an MCAT search query.
   * @param {string} address address to query for.
   * @param {string} month month to query for.
   * @param {string} day day to query for.
   * @param {int[]} centers centers to check for.
   * @param {string[]} text_phones phones to text.
   * @param {string[]} call_phones phones to call.
   */
  constructor(address, month, day, centers, text_phones, call_phones) {
    this.address = address;
    this.month = month;
    this.day = day;
    this.centers = centers;
    this.text_phones = text_phones;
    this.call_phones = call_phones;
    this.time = Date.now();
  }

  updateNotification() {
    this.time = Date.now();
  }
}

module.exports = Query;
