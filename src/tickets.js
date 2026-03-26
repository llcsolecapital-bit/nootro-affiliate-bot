const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require("discord.js");

// ─── Ticket Categories ──────────────────────────────────────
const TICKET_CATEGORIES = [
  { label: "General Question", value: "general", emoji: "❓" },
  { label: "Order Issue", value: "order", emoji: "📦" },
  { label: "Affiliate Support", value: "affiliate", emoji: "🤝" },
  { label: "Product Feedback", value: "feedback", emoji: "💬" },
  { label: "Other", value: "other", emoji: "📝" },
];

// ─── Send Ticket Panel ──────────────────────────────────────
// Posts the "Open a Ticket" embed + button in a channel
async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(0x00e5ff)
    .setTitle("⚡ Nootro Support")
    .setDescription(
      "Need help? Click the button below to open a private ticket.\n\n" +
        "A team member will get back to you as soon as possible."
    )
    .setFooter({ text: "Nootro Energy · Support" });

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open")
      .setLabel("Open a Ticket")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎫")
  );

  await channel.send({ embeds: [embed], components: [button] });
}

// ─── Handle Ticket Button Click ─────────────────────────────
async function handleTicketOpen(interaction) {
  // Check if user already has an open ticket
  const guild = interaction.guild;
  const existingTicket = guild.channels.cache.find(
    (ch) =>
      ch.name === `ticket-${interaction.user.username.toLowerCase()}` &&
      ch.type === ChannelType.GuildText
  );

  if (existingTicket) {
    await interaction.reply({
      content: `You already have an open ticket: ${existingTicket}`,
      flags: 64, // ephemeral
    });
    return;
  }

  // Show category selection
  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_category")
      .setPlaceholder("What do you need help with?")
      .addOptions(
        TICKET_CATEGORIES.map((cat) => ({
          label: cat.label,
          value: cat.value,
          emoji: cat.emoji,
        }))
      )
  );

  await interaction.reply({
    content: "**What's your ticket about?**",
    components: [select],
    flags: 64, // ephemeral
  });
}

// ─── Handle Category Selection → Create Ticket Channel ──────
async function handleTicketCategory(interaction) {
  const category = interaction.values[0];
  const categoryLabel = TICKET_CATEGORIES.find(
    (c) => c.value === category
  )?.label;
  const guild = interaction.guild;
  const user = interaction.user;

  await interaction.update({
    content: "🔄 Creating your ticket...",
    components: [],
  });

  try {
    // Find or create a "Tickets" category channel
    let ticketParent = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildCategory &&
        ch.name.toLowerCase() === "tickets"
    );

    if (!ticketParent) {
      ticketParent = await guild.channels.create({
        name: "Tickets",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });
    }

    // Create the ticket channel — only visible to the user + admins
    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: ticketParent.id,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone — deny
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id, // ticket creator — allow
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: interaction.client.user.id, // bot — allow
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    });

    // Also grant access to anyone with ManageMessages (admins/mods)
    // This is handled by the category permission — admins with Administrator
    // perm automatically see all channels. For roles with ManageMessages,
    // we add them explicitly:
    const adminRoles = guild.roles.cache.filter(
      (role) =>
        role.permissions.has(PermissionFlagsBits.ManageMessages) ||
        role.permissions.has(PermissionFlagsBits.Administrator)
    );

    for (const [, role] of adminRoles) {
      if (role.id === guild.id) continue; // skip @everyone
      await ticketChannel.permissionOverwrites.edit(role, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    }

    // Send welcome message in the ticket
    const ticketEmbed = new EmbedBuilder()
      .setColor(0x00e5ff)
      .setTitle(`🎫 Ticket — ${categoryLabel}`)
      .setDescription(
        `Hey ${user}, thanks for reaching out!\n\n` +
          `**Category:** ${categoryLabel}\n` +
          `**Opened by:** ${user}\n` +
          `**Opened at:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n` +
          `Please describe your issue below. A team member will respond shortly.`
      )
      .setFooter({ text: "Nootro Energy · Support" });

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒")
    );

    await ticketChannel.send({
      embeds: [ticketEmbed],
      components: [closeButton],
    });

    // Update the ephemeral reply
    await interaction.editReply({
      content: `✅ Your ticket has been created: ${ticketChannel}`,
      components: [],
    });

    console.log(
      `[${new Date().toISOString()}] 🎫 Ticket opened by ${user.tag} (${category})`
    );
  } catch (error) {
    console.error("Failed to create ticket:", error);
    await interaction.editReply({
      content: "❌ Failed to create ticket. Please try again or contact an admin.",
      components: [],
    });
  }
}

// ─── Handle Ticket Close ────────────────────────────────────
async function handleTicketClose(interaction) {
  const channel = interaction.channel;

  // Confirm close
  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_confirm_close")
      .setLabel("Yes, close it")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_cancel_close")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: "Are you sure you want to close this ticket?",
    components: [confirmRow],
  });
}

async function handleTicketConfirmClose(interaction) {
  const channel = interaction.channel;

  await interaction.update({
    content: "🔒 Ticket closed. This channel will be deleted in 5 seconds...",
    components: [],
  });

  console.log(
    `[${new Date().toISOString()}] 🎫 Ticket closed: #${channel.name} by ${interaction.user.tag}`
  );

  setTimeout(async () => {
    try {
      await channel.delete("Ticket closed");
    } catch (err) {
      console.error("Failed to delete ticket channel:", err.message);
    }
  }, 5000);
}

async function handleTicketCancelClose(interaction) {
  await interaction.update({
    content: "Ticket will remain open.",
    components: [],
  });
}

// ─── Export ──────────────────────────────────────────────────
module.exports = {
  sendTicketPanel,
  handleTicketOpen,
  handleTicketCategory,
  handleTicketClose,
  handleTicketConfirmClose,
  handleTicketCancelClose,
};
