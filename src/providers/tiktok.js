/**
 * TikTok Shop API Data Provider
 *
 * Swap to this once your app scopes are approved:
 *   - seller.authorization.info
 *   - data.shop_analytics.public.read
 *
 * Change DATA_SOURCE=tiktok_api in your .env to activate.
 *
 * TikTok Shop API Docs:
 * https://partner.tiktokshop.com/docv2/page/affiliate-seller-api-overview
 */

class TikTokProvider {
  constructor() {
    this.appKey = process.env.TIKTOK_APP_KEY;
    this.appSecret = process.env.TIKTOK_APP_SECRET;
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    this.baseUrl = "https://open-api.tiktokglobalshop.com";
  }

  /**
   * Generate the request signature for TikTok Shop API
   * See: https://partner.tiktokshop.com/docv2/page/generating-request-sign
   */
  _generateSign(path, params, body = "") {
    const crypto = require("crypto");
    const timestamp = Math.floor(Date.now() / 1000);

    // Sort params alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

    const baseString = `${this.appSecret}${path}${sortedParams}${body}${this.appSecret}`;
    const sign = crypto
      .createHmac("sha256", this.appSecret)
      .update(baseString)
      .digest("hex");

    return { sign, timestamp };
  }

  async fetchAffiliateData() {
    try {
      // TODO: Implement once API scopes are approved
      // 
      // The flow will be:
      // 1. Call the Affiliate Seller API to get creator performance data
      //    Endpoint: GET /affiliate/seller/open_collaboration/creator/search
      //    This returns creators promoting your products with their sales data
      //
      // 2. For each creator, pull their GMV, order count, and top product
      //    Endpoint: GET /affiliate/seller/open_collaboration/creator/performance
      //
      // 3. Alternatively, use the Analytics API:
      //    Endpoint: GET /data/shop_analytics
      //    With dimension=CREATOR to get per-creator breakdowns
      //
      // Example request structure:
      //
      // const params = {
      //   app_key: this.appKey,
      //   access_token: this.accessToken,
      //   shop_cipher: "YOUR_SHOP_CIPHER",
      //   timestamp: Math.floor(Date.now() / 1000),
      // };
      //
      // const response = await fetch(
      //   `${this.baseUrl}/affiliate/202309/sellers/open_collaborations/creators/search`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       "x-tts-access-token": this.accessToken,
      //     },
      //     body: JSON.stringify({
      //       page_size: 10,
      //       sort_field: "total_gmv",
      //       sort_order: "DESC",
      //     }),
      //   }
      // );

      throw new Error(
        "TikTok API provider not yet implemented. Waiting for scope approval. Use DATA_SOURCE=sheets for now."
      );
    } catch (error) {
      console.error("Error fetching from TikTok API:", error.message);
      throw error;
    }
  }
}

module.exports = TikTokProvider;
