const Discord = require("discord.js");
const config = require("./config.js");
const bot = new Discord.Client({ intents: 53608447 });
const loadCommands = require("./Loaders/loadCommands");
const loadEvents = require("./Loaders/loadEvents");
bot.commands = new Discord.Collection();
const { EmbedBuilder } = require("discord.js");

// WATCHERS
const zavviWatcherFR = require("./Watchers/zavviWatcherFR.js");
const zavviWatcherUKPreOrder = require("./Watchers/zavviWatcherPreOrder.js");
const amazonWatcher = require("./Watchers/amazonWatcher.js");
const steelbookProWatcher = require("./Watchers/steelbookWatcher.js");
const zavviWatcherFRPreOrder = require("./Watchers/zavviWatcherFrPreOrder.js");
const escWatcherPreOrder = require("./Watchers/unused/escWatcherPreOrder.js");
const chocoWatcher = require("./Watchers/chocoWatcher.js");
const cleanOldCacheEntries = require("./tools/cleanOldCacheEntries.js");


bot.login(config.token);
loadCommands(bot);
loadEvents(bot);

bot.on("guildMemberAdd", async (member) => {
  const roleId = "1391160831638503526"; 
  const role = member.guild.roles.cache.get(roleId);

  if (!role) {
    console.error("❌ Rôle introuvable !");
    return;
  }

  try {
    await member.roles.add(role);
    console.log(`✅ Rôle ${role.name} donné à ${member.user.tag}`);
  } catch (err) {
    console.error("Erreur en ajoutant le rôle :", err);
  }
  const channelId = "1391168142721683487";
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#00b0f4")
    .setTitle("🎉 Bienvenue sur le serveur !")
    .setDescription(`Salut ${member}, ravi de te voir parmi nous !`)
    .addFields(
      { name: "👥 Membre n°", value: `${member.guild.memberCount}`, inline: true },
      { name: "📜 Pense à lire :", value: "<#1391168855065231370>", inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `${member.guild.name}`, iconURL: member.guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
});

const allowedGuilds = ['1391151609194479777', '885931233010401290'];

bot.on('guildCreate', async (guild) => {
  if (!allowedGuilds.includes(guild.id)) {
    await guild.leave();
  }
});


bot.on("ready", async () => {
  // Lancer le watcher pour Zavvi FR
  await zavviWatcherFR(bot); 
  // Lancer le watcher pour les précommandes Zavvi UK
  await zavviWatcherUKPreOrder(bot);
  // Lancer le watcher pour les steelbooks Amazon
  await amazonWatcher(bot);
  // Lancer le watcher pour SteelbookPro
  await steelbookProWatcher(bot);
  // Lancer le watcher pour Zavvi FR Pre Order
  await zavviWatcherFRPreOrder(bot);
  // Lancer le watcher pour Choco
  await chocoWatcher(bot);
  // Nettoyage des caches au démarrage
  await cleanOldCacheEntries(bot);
  // Puis répéter toutes les heures
  setInterval(() => {
    const logBotChannelId = '1394058036754255932'
    const logChannel = bot.channels.cache.get(logBotChannelId);
    logChannel.send("------------------------");
    const currentTime = new Date();
    logChannel.send(`Heure actuelle : ${currentTime.toLocaleTimeString()}`);
    logChannel.send("------------------------");

    zavviWatcherFR(bot);
    zavviWatcherUKPreOrder(bot);
    amazonWatcher(bot);
    steelbookProWatcher(bot);
    zavviWatcherFRPreOrder(bot);
    chocoWatcher(bot);
    cleanOldCacheEntries(bot); // Nettoyage périodique
  }, 1000 * 60 * 30); // Toutes les 1/2h
});

