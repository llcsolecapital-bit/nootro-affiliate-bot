/**
 * Mock Data Provider
 * 
 * Use this for testing the bot before connecting Google Sheets.
 * Set DATA_SOURCE=mock in your .env to use this.
 * 
 * Data modeled after the leaderboard mockup.
 */

class MockProvider {
  async fetchAffiliateData() {
    const affiliates = [
      {
        handle: "@pouchwithpete",
        gmv: 3140.0,
        unitsSold: 84,
        views: 124300,
      },
      {
        handle: "@dailydosedylan",
        gmv: 1980.0,
        unitsSold: 53,
        views: 89200,
      },
      {
        handle: "@gymrat.grace",
        gmv: 1470.0,
        unitsSold: 39,
        views: 67400,
      },
      {
        handle: "@nootronation",
        gmv: 1040.0,
        unitsSold: 28,
        views: 41800,
      },
      {
        handle: "@focusfuel.sam",
        gmv: 782.5,
        unitsSold: 21,
        views: 33100,
      },
    ];

    const totalGMV = affiliates.reduce((sum, a) => sum + a.gmv, 0);
    return { affiliates, totalGMV };
  }
}

module.exports = MockProvider;
