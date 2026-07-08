// Lavalink nodes the bot connects to.
// These are FREE PUBLIC nodes meant for testing / small bots — they can go down or
// get overloaded without warning. If your bot randomly stops playing music, it's
// almost always a dead node, NOT a bug in the code.
//
// To fix: swap the entries below for currently-live ones from:
//   https://freelavalink.serenetia.com/list
//   https://lavainfo.netlify.app/
//
// For a bot you actually care about staying up, get your own free Lavalink node
// (e.g. from a host that offers Pterodactyl + Lavalink eggs) — it's more reliable
// than any public node, and you control the password.

module.exports = [
  {
    name: "main-node",
    host: "lava-v4.ajieblogs.eu.org",
    port: 443,
    password: "https://dsc.gg/ajidevserver",
    secure: true,
  },
  {
    // Backup node — Riffy will fail over to this if the first one is unreachable
    name: "backup-node",
    host: "lavalink.heavencloud.in",
    port: 443,
    password: "heavencloud",
    secure: true,
  },
];
