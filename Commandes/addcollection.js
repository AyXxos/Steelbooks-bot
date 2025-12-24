const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
const { google } = require("googleapis");
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

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function addcollection(bot, id_user, steelbookName, prix, real, etat, provenance) {
    const user = await bot.users.fetch(id_user);
    const pseudo = user.globalName || user.username;

    const numero = await getNextNumero(id_user);

    await sheets.spreadsheets.values.append({
        spreadsheetId: "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4",
        range: "'Feuille 1'!A:H",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[
                id_user,
                pseudo,
                numero,
                steelbookName,
                prix,
                real,
                etat,
                provenance
            ]],
        },
    });
}


async function getNextNumero(userId) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4",
        range: "'Feuille 1'!A:H",
    });

    const rows = response.data.values || [];

    const userRows = rows.slice(1).filter(row => row[1] === userId);

    if (userRows.length === 0) return 1;

    const numeros = userRows
        .map(row => Number(row[0]))
        .filter(n => !isNaN(n));

    return Math.max(...numeros) + 1;
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
        name :'titre',
        description: "Titre du steelbook à ajouter",
        required: true,
        autocomplete: false,
    },
    
    {
        type :"string",
        name :'realisateur',
        description: "Réalisateur du film",
        required: true,
        autocomplete: false,
    },
    {
        type :"string",
        name :'etat',
        description: "État du steelbook",
        required: true,
        autocomplete: true,
    },
    {
        type :"string",
        name :'provenance',
        description: "Provenance du steelbook",
        required: true,
        autocomplete: false,
    },
    {
        type :"integer",
        name :'prix',
        description: "Prix du steelbook",
        required: false,
        autocomplete: false,
    },
  ],

    async run(bot, message, args) {
        const logBotChannelId = '1394058036754255932'
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = message.user.id;
        const user = bot.users.cache.get(id);
        logChannel.send("Commande addcollection utilisée par " + user.tag);
        const steelbook = args.getString("titre") || "";
        const prix = args.getInteger("prix") || 0;
        const real = args.getString("realisateur") || "";
        const etat = args.getString("etat") || "";
        const provenance = args.getString("provenance") || "";
        toTitleCase(steelbook);
        if (!steelbook) {
            return message.reply("❌ Tu dois spécifier un steelbook à ajouter !");
        }

        const collections = loadCollections();
        const userId = message.user.id;

        if (!collections[userId]) {
            collections[userId] = [];
        }

        if (prix < 0) {
            return message.reply("❌ Le prix ne peut pas être négatif !");
        }

        collections[userId].push(steelbook);
        saveCollections(collections);
        await addcollection(bot, userId, steelbook, prix, real, etat, provenance);

        await message.reply(`<a:peepodj:1391693167904161892> **${steelbook}** a été ajouté à ta collection ! Tu peux voir ta collection avec la commande \`/collection\`.`);
    }
};
