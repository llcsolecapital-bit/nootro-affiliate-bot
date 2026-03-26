const express = require("express");
const crypto = require("crypto");

const app = express();

// ─── Discord OAuth2 Config ────────────────────────────────────
const DISCORD_API = "https://discord.com/api/v10";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const COOKIE_SECRET = process.env.COOKIE_SECRET;

// In-memory token store (good enough for this use case)
const tokenStore = new Map();

// ─── Register Metadata Schema ─────────────────────────────────
// Run this ONCE to tell Discord about your linked role metadata
async function registerMetadata() {
  const url = `${DISCORD_API}/applications/${CLIENT_ID}/role-connections/metadata`;
  const body = [
    {
      key: "ntro_verified",
      name: "NTRO",
      description: "Verified Nootro Energy community member",
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

  if (response.ok) {
    console.log("✅ Linked role metadata registered successfully");
  } else {
    const text = await response.text();
    console.error("❌ Failed to register metadata:", response.status, text);
  }
}

// ─── OAuth2 Routes ────────────────────────────────────────────

// Step 1: User clicks "Connect" in Discord → redirected here
app.get("/linked-role", (req, res) => {
  const state = crypto.randomUUID();

  // Store state for verification
  tokenStore.set(`state:${state}`, Date.now());

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state: state,
    scope: "role_connections.write identify",
    prompt: "consent",
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Step 2: Discord redirects back with a code
app.get("/discord-oauth-callback", async (req, res) => {
  const { code, state } = req.query;

  // Verify state
  if (!tokenStore.has(`state:${state}`)) {
    return res.status(403).send("Invalid state");
  }
  tokenStore.delete(`state:${state}`);

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return res.status(500).send("Authentication failed");
    }

    // Push the linked role metadata for this user
    const metadataResponse = await fetch(
      `${DISCORD_API}/users/@me/applications/${CLIENT_ID}/role-connection`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          platform_name: "NTRO",
          metadata: {
            ntro_verified: 1,
          },
        }),
      }
    );

    if (metadataResponse.ok) {
      res.send(`
        <html>
        <body style="background: #1a1a2e; color: #00e5ff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h1>⚡ Connected!</h1>
            <p style="color: #ccc;">You're now verified as an NTRO member. You can close this tab and return to Discord.</p>
          </div>
        </body>
        </html>
      `);
    } else {
      const text = await metadataResponse.text();
      console.error("Failed to set role connection:", text);
      res.status(500).send("Failed to update role connection");
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Something went wrong");
  }
});

// Health check (pinged by UptimeRobot to keep Railway alive)
const startedAt = new Date();
app.get("/", (req, res) => {
  const uptime = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  res.send(`⚡ Nooty is running | Uptime: ${hours}h ${mins}m | Started: ${startedAt.toISOString()}`);
});

// ─── Start Server ─────────────────────────────────────────────
function startLinkedRolesServer() {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌐 Linked roles server running on port ${PORT}`);
    // Register metadata on first boot
    registerMetadata();
  });
}

module.exports = { startLinkedRolesServer };
