const crypto = require("crypto");

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Register the role connection metadata schema with Discord.
 * Run this ONCE to tell Discord what metadata fields your app provides.
 */
async function registerMetadata(clientId, token) {
  const url = `${DISCORD_API}/applications/${clientId}/role-connections/metadata`;

  const body = [
    {
      key: "verified",
      name: "NTRO",
      description: "Verified Nootro Energy community member",
      type: 7, // boolean_equal
    },
  ];

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to register metadata: ${response.status} ${text}`);
  }

  return await response.json();
}

/**
 * Exchange an OAuth2 code for tokens
 */
async function getOAuthTokens(code, clientId, clientSecret, redirectUri) {
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token exchange failed: ${response.status} ${text}`);
  }

  return await response.json();
}

/**
 * Push the role connection metadata for a user
 * This is what actually gives them the NTRO badge
 */
async function pushMetadata(accessToken, clientId) {
  const url = `${DISCORD_API}/users/@me/applications/${clientId}/role-connection`;

  const body = {
    platform_name: "Nootro Energy",
    platform_username: "Verified Member",
    metadata: {
      verified: 1,
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

  return await response.json();
}

/**
 * Generate the OAuth2 URL to redirect users to
 */
function getOAuthUrl(clientId, redirectUri) {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "role_connections.write identify",
    state,
  });

  return {
    url: `https://discord.com/api/oauth2/authorize?${params.toString()}`,
    state,
  };
}

module.exports = {
  registerMetadata,
  getOAuthTokens,
  pushMetadata,
  getOAuthUrl,
};
