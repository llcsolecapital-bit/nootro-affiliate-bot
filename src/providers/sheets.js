const { google } = require("googleapis");

/**
 * Google Sheets Data Provider
 *
 * Expected Sheet Layout (Sheet1):
 * Row 1: Headers
 * Col A: Creator Handle (e.g. @pouchwithpete)
 * Col B: GMV ($) - total revenue driven
 * Col C: Units Sold - number of units
 * Col D: Views - total video views
 */

class SheetsProvider {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    this.sheetId = process.env.GOOGLE_SHEET_ID;
  }

  async fetchAffiliateData() {
    try {
      const sheets = google.sheets({ version: "v4", auth: this.auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: "Sheet1!A2:D50", // Skip header row, up to 50 affiliates
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log("No data found in sheet.");
        return { affiliates: [], totalGMV: 0 };
      }

      const affiliates = rows
        .map((row) => ({
          handle: row[0] || "Unknown",
          gmv: parseFloat(row[1]?.replace(/[$,]/g, "") || 0),
          unitsSold: parseInt(row[2] || 0),
          views: parseInt(row[3]?.replace(/[,]/g, "") || 0),
        }))
        .filter((a) => a.gmv > 0)
        .sort((a, b) => b.gmv - a.gmv)
        .slice(0, 5); // Top 5

      const totalGMV = affiliates.reduce((sum, a) => sum + a.gmv, 0);

      return { affiliates, totalGMV };
    } catch (error) {
      console.error("Error fetching from Google Sheets:", error.message);
      throw error;
    }
  }
}

module.exports = SheetsProvider;
