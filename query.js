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
   * @param {string[]} call_phones phones to call.
   * @param {string[]} text_phones phones to text.
   */
  constructor(address, month, day, centers, call_phones, text_phones) {
    this.address = address;
    this.month = month;
    this.day = day;
    this.centers = centers;
    this.call_phones = call_phones;
    this.text_phones = text_phones;
  }
}

module.exports = Query;
