require("dotenv").config();

/**
 * Register role connection metadata with Discord.
 * Run this ONCE: node src/register-metadata.js
 *
 * This tells Discord what metadata fields your app provides
 * for linked roles. For Nootro, we just need a simple boolean
 * "verified" check — if they connect, they get the NTRO badge.
 */

async function registerMetadata() {
  const appId = process.env.DISCORD_CLIENT_ID;
  const token = process.env.DISCORD_TOKEN;

  if (!appId || !token) {
    console.error("Missing DISCORD_CLIENT_ID or DISCORD_TOKEN in .env");
    process.exit(1);
  }

  const metadata = [
    {
      key: "ntro_verified",
      name: "NTRO Verified",
      description: "Connected to Nootro Energy",
      type: 7, // boolean_equal — user must have this set to true
    },
  ];

  const url = `https://discord.com/api/v10/applications/${appId}/role-connections/metadata`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify(metadata),
  });

  if (response.ok) {
    const data = await response.json();
    console.log("✅ Role connection metadata registered successfully!");
    console.log(JSON.stringify(data, null, 2));
  } else {
    const text = await response.text();
    console.error(`❌ Failed to register metadata: ${response.status}`);
    console.error(text);
  }
}

registerMetadata();
