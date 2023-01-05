/**
 * A specific MCAT search query of address, date, centers, phones.
 */
class Query {
  /**
   * Create an MCAT search query.
   * @param {string} address address to query for.
   * @param {string} date date to query for.
   * @param {int[]} centers centers to check for.
   * @param {string[]} phones phones to call / text.
   */
  constructor(address, date, centers, phones) {
    this.address = address;
    this.date = date;
    this.centers = centers;
    this.phones = phones;
  }
}

module.exports = Query;
