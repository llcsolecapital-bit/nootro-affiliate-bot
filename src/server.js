const express = require("express");
const crypto = require("crypto");

const app = express();

/**
 * Linked Roles OAuth2 Server for Nooty
 *
 * Flow:
 * 1. User clicks "Connect" on the linked role in Discord
 * 2. Discord sends them to our /linked-role route
 * 3. We redirect to Discord OAuth2 with role_connections.write scope
 * 4. User authorizes, Discord redirects to /discord-oauth-callback
 * 5. We exchange the code for a token, then push metadata (ntro_verified: true)
 * 6. User gets the NTRO badge
 */

const DISCORD_API = "https://discord.com/api/v10";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

// Simple in-memory state store for OAuth2 CSRF protection
const stateStore = new Map();

// ─── Route: Start linked role verification ───────────────────
app.get("/linked-role", (req, res) => {
  const state = crypto.randomUUID();
  stateStore.set(state, Date.now());

  // Clean up old states (older than 10 min)
  for (const [key, timestamp] of stateStore) {
    if (Date.now() - timestamp > 600000) stateStore.delete(key);
  }

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

// ─── Route: OAuth2 callback ──────────────────────────────────
app.get("/discord-oauth-callback", async (req, res) => {
  const { code, state } = req.query;

  // Verify state
  if (!state || !stateStore.has(state)) {
    return res.status(403).send("Invalid state. Please try again.");
  }
  stateStore.delete(state);

  if (!code) {
    return res.status(400).send("No authorization code received.");
  }

  try {
    // Exchange code for access token
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

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("Token exchange failed:", err);
      return res.status(500).send("Failed to authenticate with Discord.");
    }

    const tokens = await tokenResponse.json();

    // Push role connection metadata — mark as NTRO verified
    const metadataResponse = await fetch(
      `${DISCORD_API}/users/@me/applications/${CLIENT_ID}/role-connection`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform_name: "Nootro Energy",
          platform_username: "NTRO",
          metadata: {
            ntro_verified: true,
          },
        }),
      }
    );

    if (!metadataResponse.ok) {
      const err = await metadataResponse.text();
      console.error("Metadata push failed:", err);
      return res.status(500).send("Failed to update role connection.");
    }

    console.log("✅ NTRO badge granted to user");

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nootro Energy</title>
        <style>
          body {
            background: #1a1a2e;
            color: #f2f2f2;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .card {
            text-align: center;
            padding: 3rem;
            background: #16213e;
            border-radius: 16px;
            border: 1px solid #00e5ff33;
          }
          h1 { color: #00e5ff; font-size: 2rem; margin-bottom: 0.5rem; }
          p { color: #b0b0b0; font-size: 1.1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚡ NTRO Verified</h1>
          <p>You're connected! Head back to Discord — your badge is live.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

// ─── Health check ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("⚡ Nooty is running");
});

function startServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`  Linked roles server: http://localhost:${port}`);
  });
}

module.exports = { startServer };
