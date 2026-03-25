const crypto = require("crypto");

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Register the role connection metadata schema with Discord.
 * Run this ONCE to tell Discord what metadata your app provides.
 */
async function registerMetadata() {
  const url = `${DISCORD_API}/applications/${process.env.DISCORD_CLIENT_ID}/role-connections/metadata`;

  const body = [
    {
      key: "is_member",
      name: "NTRO",
      description: "Connected to Nootro Energy",
      type: 7, // boolean_equal
    },
  ];

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to register metadata: ${response.status} ${text}`);
  }

  console.log("Role connection metadata registered successfully.");
  return response.json();
}

/**
 * Generate the OAuth2 URL to redirect users to Discord for authorization.
 */
function getOAuthUrl() {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "role_connections.write identify",
    state: state,
  });

  return {
    url: `https://discord.com/api/oauth2/authorize?${params.toString()}`,
    state,
  };
}

/**
 * Exchange an OAuth2 code for an access token.
 */
async function getAccessToken(code) {
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * Push the role connection metadata to a user's profile.
 * This is what gives them the NTRO badge.
 */
async function pushMetadata(accessToken) {
  const url = `${DISCORD_API}/users/@me/applications/${process.env.DISCORD_CLIENT_ID}/role-connection`;

  const body = {
    platform_name: "Nootro Energy",
    platform_username: "Member",
    metadata: {
      is_member: 1,
    },
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to push metadata: ${response.status} ${text}`);
  }

  return response.json();
}

module.exports = { registerMetadata, getOAuthUrl, getAccessToken, pushMetadata };
