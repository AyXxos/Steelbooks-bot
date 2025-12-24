const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");

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
    name: "rmcollection",
    description: "Supprime un steelbook de ta collection selon son numéro",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options: [
        {
            type: "integer",
            name: "numero",
            description: "Numéro du steelbook dans ta collection",
            required: true,
            min_value: 1
        }
    ],

    async run(bot, message, args) {
        const logBotChannelId = '1394058036754255932'
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = message.user.id;
        const user = bot.users.cache.get(id);
        logChannel.send("Commande rmcollection utilisée par " + user.tag);
        const index = args.getInteger("numero");
        const userId = message.user.id;

        const collections = loadCollections();

        if (!collections[userId] || collections[userId].length === 0) {
            return message.reply("❌ Tu n’as aucun steelbook dans ta collection.");
        }

        const collection = collections[userId];

        if (index < 1 || index > collection.length) {
            return message.reply(`❌ Numéro invalide. Ta collection contient actuellement ${collection.length} steelbook(s).`);
        }

        const removed = collection.splice(index - 1, 1)[0];
        saveCollections(collections);

        await message.reply(`🗑️ Le steelbook **"${removed}"** a été supprimé de ta collection.`);
    }
};
