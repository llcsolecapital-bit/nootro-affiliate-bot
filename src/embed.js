const { EmbedBuilder } = require("discord.js");

// Rank icons matching the mockup exactly
const RANK_ICONS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

function formatGMV(amount) {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("en-US");
}

/**
 * Builds the affiliate leaderboard embed
 *
 * Layout per affiliate:
 *   🥇  @handle ∙ $3,140.00
 *   > 🛒 84 units sold  ∙  👁 12.4K views
 */
function buildLeaderboardEmbed(data) {
  const { affiliates } = data;

  // Build each affiliate block
  const affiliateBlocks = affiliates.map((a, i) => {
    const rank = RANK_ICONS[i] || `**${i + 1}.**`;
    const gmv = formatGMV(a.gmv);
    const units = formatNumber(a.unitsSold);
    const views = formatNumber(a.views);

    return [
      `${rank}  **${a.handle}** ∙ ${gmv}`,
      `> 🛒 ${units} units sold  ∙  👁 ${views} views`,
    ].join("\n");
  });

  const embed = new EmbedBuilder()
    .setColor(0x00e5ff)
    .setTitle("⚡ Top 5 Affiliates")
    .setDescription(
      affiliateBlocks.map((block, i) =>
        i < affiliateBlocks.length - 1 ? block + "\n" : block
      ).join("\n")
    )
    .setFooter({
      text: "Nootro Energy · TikTok Shop",
    })
    .setTimestamp();

  return embed;
}

/**
 * No-data fallback embed
 */
function buildNoDataEmbed() {
  return new EmbedBuilder()
    .setColor(0xff6b6b)
    .setTitle("⚡ Affiliate Leaderboard")
    .setDescription("No affiliate data available yet. Check back soon!")
    .setFooter({ text: "Nootro Energy · TikTok Shop" })
    .setTimestamp();
}

module.exports = { buildLeaderboardEmbed, buildNoDataEmbed };
