const Discord =require("discord.js")
const loadSlashCommands = require("../Loaders/loadSlashCommands")


module.exports = async bot => {

    await loadSlashCommands(bot);
    const logBotChannelId = '1394058036754255932'
    const logChannel = bot.channels.cache.get(logBotChannelId);
    logChannel.send(`Le bot est bien en ligne à ${new Date().toLocaleString()}`);
}