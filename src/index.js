require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
} = require("discord.js");
const cron = require("node-cron");
const { buildLeaderboardEmbed, buildNoDataEmbed } = require("./embed");

// ─── Data Provider Factory ────────────────────────────────────
function getProvider() {
  const source = process.env.DATA_SOURCE || "mock";

  switch (source) {
    case "sheets":
      const SheetsProvider = require("./providers/sheets");
      return new SheetsProvider();

    case "tiktok_api":
      const TikTokProvider = require("./providers/tiktok");
      return new TikTokProvider();

    case "mock":
    default:
      const MockProvider = require("./providers/mock");
      return new MockProvider();
  }
}

// ─── Bot Setup ────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const provider = getProvider();

// ─── Post Leaderboard ─────────────────────────────────────────
async function postLeaderboard(channel) {
  try {
    const data = await provider.fetchAffiliateData();

    if (!data.affiliates || data.affiliates.length === 0) {
      await channel.send({ embeds: [buildNoDataEmbed()] });
      return;
    }

    const embed = buildLeaderboardEmbed(data);
    await channel.send({
      content: "@everyone",
      embeds: [embed],
    });

    console.log(
      `[${new Date().toISOString()}] Leaderboard posted to #${channel.name}`
    );
  } catch (error) {
    console.error("Failed to post leaderboard:", error.message);
  }
}

// ─── Slash Command Registration ───────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Post the affiliate leaderboard now")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("leaderboard-refresh")
    .setDescription("Refresh data and post an updated leaderboard")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map((cmd) => cmd.toJSON()),
    });
    console.log("Slash commands registered.");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
}

// ─── Event Handlers ───────────────────────────────────────────
client.once("ready", async () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ⚡ Nootro Affiliate Bot Online`);
  console.log(`  Logged in as: ${client.user.tag}`);
  console.log(`  Data source:  ${process.env.DATA_SOURCE || "mock"}`);
  console.log(`  Cron:         ${process.env.CRON_SCHEDULE || "0 9 * * *"}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Register slash commands
  await registerCommands();

  // Schedule daily leaderboard post
  const schedule = process.env.CRON_SCHEDULE || "0 9 * * *";
  cron.schedule(
    schedule,
    async () => {
      const channelId = process.env.LEADERBOARD_CHANNEL_ID;
      if (!channelId) {
        console.error("No LEADERBOARD_CHANNEL_ID set in .env");
        return;
      }

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        console.error(`Could not find channel: ${channelId}`);
        return;
      }

      await postLeaderboard(channel);
    },
    { timezone: process.env.TZ || "America/New_York" }
  );

  console.log("Daily leaderboard cron job scheduled.");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (
    interaction.commandName === "leaderboard" ||
    interaction.commandName === "leaderboard-refresh"
  ) {
    await interaction.deferReply();

    try {
      const data = await provider.fetchAffiliateData();

      if (!data.affiliates || data.affiliates.length === 0) {
        await interaction.editReply({ embeds: [buildNoDataEmbed()] });
        return;
      }

      const embed = buildLeaderboardEmbed(data);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Error fetching leaderboard data: ${error.message}`,
      });
    }
  }
});

// ─── Launch ───────────────────────────────────────────────────
if (!process.env.DISCORD_TOKEN) {
  console.error("ERROR: DISCORD_TOKEN is required. Copy .env.example to .env and fill in your values.");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
