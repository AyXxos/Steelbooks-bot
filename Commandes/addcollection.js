const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const COLLECTION_FILE = path.join(__dirname, "../data/collections/collections.json");

function loadCollections() {
    if (!fs.existsSync(COLLECTION_FILE)) return {};
    try {
        const data = fs.readFileSync(COLLECTION_FILE, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Erreur lors du chargement des collections :", err);
        return {};
    }
}

function saveCollections(collections) {
    fs.writeFileSync(COLLECTION_FILE, JSON.stringify(collections, null, 2), "utf-8");
}

module.exports = {
    name: "addcollection",
    description: "Ajoute un steelbook à ta collection",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options:[
    {
        type :"string",
        name :'steelbook',
        description: "Nom du steelbook à ajouter",
        required: true,
        autocomplete: false,
    }
  ],

    async run(bot, message, args) {
        const logBotChannelId = '1394058036754255932'
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = message.user.id;
        const user = bot.users.cache.get(id);
        logChannel.send("Commande addcollection utilisée par " + user.tag);
        const steelbook = args.getString("steelbook") || "";
        toTitleCase(steelbook);
        if (!steelbook) {
            return message.reply("❌ Tu dois spécifier un steelbook à ajouter !");
        }

        const collections = loadCollections();
        const userId = message.user.id;

        if (!collections[userId]) {
            collections[userId] = [];
        }

        collections[userId].push(steelbook);
        saveCollections(collections);

        await message.reply(`<a:peepodj:1391693167904161892> **${steelbook}** a été ajouté à ta collection ! Tu peux voir ta collection avec la commande \`/collection\`.`);
    }
};
