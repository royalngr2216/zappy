const express = require("express");

function keepAlive(client) {
  const app = express();

  app.get("/", (req, res) => {
    res.send(
      `Bot is alive. Logged in as ${client.user ? client.user.tag : "starting..."}`
    );
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`[keepAlive] Web server running on port ${port}`);
  });
}

module.exports = keepAlive;
