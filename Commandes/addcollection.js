const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
const { google } = require("googleapis");

/* ===================== UTILS ===================== */

function toTitleCase(text) {
    return text
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

const COLLECTION_FILE = path.join(__dirname, "../data/collections/collections.json");

function loadCollections() {
    if (!fs.existsSync(COLLECTION_FILE)) return {};
    return JSON.parse(fs.readFileSync(COLLECTION_FILE, "utf-8"));
}

function saveCollections(collections) {
    fs.writeFileSync(COLLECTION_FILE, JSON.stringify(collections, null, 2));
}

/* ===================== GOOGLE SHEETS ===================== */

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";

/* ===================== SHEET HELPERS ===================== */

async function getOrCreateUserSheet(sheetName) {
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });

    let sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);

    if (!sheet) {
        // Créer la feuille si elle n'existe pas
        const addSheetResponse = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    addSheet: { properties: { title: sheetName } }
                }]
            }
        });

        sheet = addSheetResponse.data.replies[0].addSheet;
    }
}


async function getNextNumero(sheetName) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!C1:C`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return 1;

    const nums = rows.map(r => Number(r[0])).filter(n => !isNaN(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
}

async function addcollection(bot, userId, titre, prix, real, etat, provenance) {
    const user = await bot.users.fetch(userId);
    const pseudo = user.globalName || user.username;

    const sheetName = `user_${userId}`;
    await getOrCreateUserSheet(sheetName);
    const numero = await getNextNumero(sheetName);

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:H`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[userId, pseudo, numero, titre, prix, real, etat, provenance]]
        }
    });
}

/* ===================== COMMAND ===================== */

module.exports = {
    name: "addcollection",
    description: "Ajoute un steelbook à ta collection",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options: [
        { type: "string", name: "titre", description: "Titre du steelbook", required: true, autocomplete: false },
        { type: "string", name: "realisateur", description: "Réalisateur", required: true, autocomplete: false },
        { type: "string", name: "etat", description: "État du steelbook", required: true, autocomplete: true },
        { type: "string", name: "provenance", description: "Provenance", required: true, autocomplete: false },
        { type: "integer", name: "prix", description: "Prix du steelbook", required: false, autocomplete: false },
    ],

    async run(bot, interaction, args) {
        const logBotChannelId = "1394058036754255932";
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = interaction.user.id;
        const user = bot.users.cache.get(id);
        logChannel?.send(
            `Commande ping utilisée par ${user.tag}`
        );

        const userId = interaction.user.id;

        // Déférer la réponse pour éviter l'erreur 10062
        await interaction.deferReply();

        const titre = toTitleCase(args.getString("titre"));
        const prix = args.getInteger("prix") ?? 0;
        const real = args.getString("realisateur");
        const etat = args.getString("etat");
        const provenance = args.getString("provenance");

        if (prix < 0) {
            return interaction.editReply({ content: "❌ Prix invalide" });
        }

        // JSON local
        const collections = loadCollections();
        if (!collections[userId]) collections[userId] = [];
        collections[userId].push(titre);
        saveCollections(collections);

        // Google Sheets
        await addcollection(bot, userId, titre, prix, real, etat, provenance);

        await interaction.editReply(
            `<a:peepodj:1391693167904161892> **${titre}** ajouté à ta collection !`
        );
    }
};
