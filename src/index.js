require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const cron = require("node-cron");
const { buildLeaderboardEmbed, buildNoDataEmbed } = require("./embed");
const {
  sendTicketPanel,
  handleTicketOpen,
  handleTicketCategory,
  handleTicketClose,
  handleTicketConfirmClose,
  handleTicketCancelClose,
} = require("./tickets");

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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
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

  new SlashCommandBuilder()
    .setName("nootysay")
    .setDescription("Send a message as Nooty")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("The message Nooty will send")
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to send in (defaults to current)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Post the support ticket panel in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("set-welcome")
    .setDescription("Set this channel as the welcome channel")
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
      console.log(`[${new Date().toISOString()}] ⏰ Cron job triggered!`);

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

  console.log(`Daily leaderboard cron job scheduled for: ${schedule} (${process.env.TZ || "America/New_York"})`);
});

// ─── Interaction Handler ─────────────────────────────────────
client.on("interactionCreate", async (interaction) => {

  // ── Button Interactions (tickets) ──
  if (interaction.isButton()) {
    switch (interaction.customId) {
      case "ticket_open":
        return handleTicketOpen(interaction);
      case "ticket_close":
        return handleTicketClose(interaction);
      case "ticket_confirm_close":
        return handleTicketConfirmClose(interaction);
      case "ticket_cancel_close":
        return handleTicketCancelClose(interaction);
    }
    return;
  }

  // ── Select Menu Interactions (ticket category) ──
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket_category") {
      return handleTicketCategory(interaction);
    }
    return;
  }

  // ── Slash Commands ──
  if (!interaction.isChatInputCommand()) return;

  // Leaderboard commands
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

  // Nooty Say command
  if (interaction.commandName === "nootysay") {
    const message = interaction.options.getString("message");
    const targetChannel =
      interaction.options.getChannel("channel") || interaction.channel;

    try {
      const nootyEmbed = new EmbedBuilder()
        .setColor(0x00e5ff)
        .setDescription(message)
        .setFooter({ text: "⚡ Nooty" })
        .setTimestamp();

      await targetChannel.send({ embeds: [nootyEmbed] });

      await interaction.reply({
        content: `✅ Message sent to ${targetChannel}`,
        flags: 64, // ephemeral — only you see this confirmation
      });

      console.log(
        `[${new Date().toISOString()}] 📢 Nootysay by ${interaction.user.tag} in #${targetChannel.name}`
      );
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to send message: ${error.message}`,
        flags: 64,
      });
    }
  }

  // Ticket Panel command
  if (interaction.commandName === "ticket-panel") {
    await sendTicketPanel(interaction.channel);
    await interaction.reply({
      content: "✅ Ticket panel posted!",
      flags: 64,
    });
  }

  // Set Welcome Channel command
  if (interaction.commandName === "set-welcome") {
    // Store the welcome channel ID in an env-like way
    // Since we can't write to .env at runtime, we use a simple in-memory store
    // that also checks the env var
    client.welcomeChannelId = interaction.channel.id;

    await interaction.reply({
      content: `✅ Welcome channel set to ${interaction.channel}!\n\n` +
        `**Note:** For this to persist across restarts, add this to your Railway env vars:\n` +
        `\`WELCOME_CHANNEL_ID=${interaction.channel.id}\``,
      flags: 64,
    });

    console.log(
      `[${new Date().toISOString()}] 👋 Welcome channel set to #${interaction.channel.name} (${interaction.channel.id})`
    );
  }
});

// ─── Welcome New Members ─────────────────────────────────────
client.on("guildMemberAdd", async (member) => {
  const channelId = client.welcomeChannelId || process.env.WELCOME_CHANNEL_ID;
  if (!channelId) return;

  const channel = await member.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x00e5ff)
    .setTitle("⚡ Welcome to Nootro Energy!")
    .setDescription(
      `Hey ${member}, welcome to the squad! 🎉\n\n` +
        `We're stoked to have you here. Here's how to get started:\n\n` +
        `> 🏆 Check out the **affiliate leaderboard** to see top performers\n` +
        `> 🎫 Need help? Open a **support ticket**\n` +
        `> 💬 Introduce yourself and jump into the conversation!\n\n` +
        `Let's get it. ⚡`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "Nootro Energy" })
    .setTimestamp();

  try {
    await channel.send({ embeds: [welcomeEmbed] });
    console.log(
      `[${new Date().toISOString()}] 👋 Welcomed ${member.user.tag}`
    );
  } catch (error) {
    console.error("Failed to send welcome message:", error.message);
  }
});

// ─── Launch ───────────────────────────────────────────────────
if (!process.env.DISCORD_TOKEN) {
  console.error("ERROR: DISCORD_TOKEN is required. Copy .env.example to .env and fill in your values.");
  process.exit(1);
}

// Start the linked roles OAuth2 server
const { startLinkedRolesServer } = require("./linked-roles");
startLinkedRolesServer();

client.login(process.env.DISCORD_TOKEN);
