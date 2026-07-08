require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const { Riffy } = require("riffy");

const keepAlive = require("./keepAlive");
const nodes = require("./lavalinkNodes");

const PREFIX = "z.";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---------- Riffy (Lavalink) setup ----------
client.riffy = new Riffy(client, nodes, {
  send: (payload) => {
    const guild = client.guilds.cache.get(payload.d.guild_id);
    if (guild) guild.shard.send(payload);
  },
  defaultSearchPlatform: "ytsearch",
  restVersion: "v4",
});

client.on("raw", (d) => client.riffy.updateVoiceState(d));

client.riffy.on("nodeConnect", (node) => {
  console.log(`[Riffy] Node "${node.name}" connected.`);
});

client.riffy.on("nodeError", (node, error) => {
  console.log(`[Riffy] Node "${node.name}" hit an error: ${error.message}`);
});

client.riffy.on("trackStart", (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("Now Playing")
    .setDescription(`**${track.info.title}**\nby ${track.info.author}`)
    .setThumbnail(track.info.thumbnail || null)
    .addFields(
      { name: "Duration", value: formatDuration(track.info.length), inline: true },
      { name: "Requested by", value: `${track.info.requester}`, inline: true }
    );

  channel.send({ embeds: [embed] }).catch(() => {});
});

client.riffy.on("queueEnd", (player) => {
  const channel = client.channels.cache.get(player.textChannel);
  if (channel) channel.send("Queue finished — leaving the voice channel.").catch(() => {});
  player.destroy();
});

client.riffy.on("playerDisconnect", (player) => {
  player.destroy();
});

// ---------- Discord client ----------
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.riffy.init(client.user.id);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    if (command === "play" || command === "p") {
      await handlePlay(message, args);
    } else if (command === "search") {
      await handleSearch(message, args);
    } else if (command === "skip") {
      const player = client.riffy.players.get(message.guild.id);
      if (!player) return message.reply("Nothing is playing right now.");
      player.stop();
      message.reply("Skipped.");
    } else if (command === "stop") {
      const player = client.riffy.players.get(message.guild.id);
      if (!player) return message.reply("Nothing is playing right now.");
      player.destroy();
      message.reply("Stopped and left the voice channel.");
    } else if (command === "pause") {
      const player = client.riffy.players.get(message.guild.id);
      if (!player) return message.reply("Nothing is playing right now.");
      player.pause(true);
      message.reply("Paused.");
    } else if (command === "resume") {
      const player = client.riffy.players.get(message.guild.id);
      if (!player) return message.reply("Nothing is playing right now.");
      player.pause(false);
      message.reply("Resumed.");
    } else if (command === "queue" || command === "q") {
      const player = client.riffy.players.get(message.guild.id);
      if (!player || (!player.current && player.queue.length === 0)) {
        return message.reply("The queue is empty.");
      }
      const upcoming = player.queue
        .slice(0, 10)
        .map((t, i) => `**${i + 1}.** ${t.info.title}`)
        .join("\n") || "Nothing queued up next.";
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("Queue")
        .setDescription(
          `**Now playing:** ${player.current ? player.current.info.title : "Nothing"}\n\n${upcoming}`
        );
      message.reply({ embeds: [embed] });
    } else if (command === "nowplaying" || command === "np") {
      const player = client.riffy.players.get(message.guild.id);
      if (!player || !player.current) return message.reply("Nothing is playing right now.");
      const track = player.current;
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("Now Playing")
        .setDescription(`**${track.info.title}**\nby ${track.info.author}`)
        .setThumbnail(track.info.thumbnail || null);
      message.reply({ embeds: [embed] });
    } else if (command === "volume" || command === "vol") {
      const player = client.riffy.players.get(message.guild.id);
      if (!player) return message.reply("Nothing is playing right now.");
      const vol = parseInt(args[0]);
      if (isNaN(vol) || vol < 0 || vol > 150) {
        return message.reply("Give me a number between 0 and 150. Usage: `z.volume 80`");
      }
      player.setVolume(vol);
      message.reply(`Volume set to ${vol}%.`);
    }
  } catch (err) {
    console.error(err);
    message.reply("Something went wrong running that command.").catch(() => {});
  }
});

// ---------- Command handlers ----------
async function handlePlay(message, args) {
  const query = args.join(" ");
  if (!query) return message.reply("Usage: `z.play <song name or link>`");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply("Join a voice channel first!");

  const player = client.riffy.createConnection({
    guildId: message.guild.id,
    voiceChannel: voiceChannel.id,
    textChannel: message.channel.id,
    deaf: true,
  });

  const resolve = await client.riffy.resolve({ query, requester: message.author });
  const { loadType, tracks, playlist } = resolve;

  if (loadType === "playlist") {
    for (const track of tracks) {
      track.info.requester = message.author;
      player.queue.add(track);
    }
    message.reply(`Queued playlist **${playlist.name}** — ${tracks.length} tracks.`);
    if (!player.playing && !player.paused) player.play();
  } else if (loadType === "search" || loadType === "track") {
    const track = tracks.shift();
    track.info.requester = message.author;
    player.queue.add(track);
    message.reply(`Queued **${track.info.title}**`);
    if (!player.playing && !player.paused) player.play();
  } else {
    message.reply("Couldn't find anything for that query.");
    if (!player.playing && !player.queue.length) player.destroy();
  }
}

async function handleSearch(message, args) {
  const query = args.join(" ");
  if (!query) return message.reply("Usage: `z.search <song name>`");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply("Join a voice channel first!");

  const resolve = await client.riffy.resolve({ query, requester: message.author });
  const { loadType, tracks } = resolve;

  if ((loadType !== "search" && loadType !== "track") || !tracks.length) {
    return message.reply("No results found for that query.");
  }

  const top = tracks.slice(0, 10);

  const options = top.map((track, i) => ({
    label: track.info.title.slice(0, 100),
    description: `${track.info.author} • ${formatDuration(track.info.length)}`.slice(0, 100),
    value: String(i),
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`search-select-${message.id}`)
      .setPlaceholder("Select a song to play")
      .addOptions(options)
  );

  const listText = top
    .map((t, i) => `**${i + 1}.** ${t.info.title} — ${t.info.author}`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`Search results for "${query}"`)
    .setDescription(listText)
    .setFooter({ text: "Pick a track from the dropdown below — 30s to choose" });

  const searchMsg = await message.reply({ embeds: [embed], components: [row] });

  const collector = searchMsg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 30000,
    filter: (i) => i.user.id === message.author.id,
  });

  collector.on("collect", async (interaction) => {
    const idx = parseInt(interaction.values[0]);
    const chosen = top[idx];
    chosen.info.requester = message.author;

    const player = client.riffy.createConnection({
      guildId: message.guild.id,
      voiceChannel: voiceChannel.id,
      textChannel: message.channel.id,
      deaf: true,
    });

    player.queue.add(chosen);
    if (!player.playing && !player.paused) player.play();

    await interaction.update({
      content: `Queued **${chosen.info.title}**`,
      embeds: [],
      components: [],
    });
    collector.stop();
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      searchMsg.edit({ content: "Search timed out.", embeds: [], components: [] }).catch(() => {});
    }
  });
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "Live";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ---------- Start ----------
keepAlive(client);
client.login(process.env.DISCORD_TOKEN);
