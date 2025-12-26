const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
const tools = require("../tools.js");
const { google } = require("googleapis");

const COLLECTION_FILE = path.join(__dirname, "../data/collections/collections.json");

/* =======================
   JSON LOCAL
======================= */

function loadCollections() {
    if (!fs.existsSync(COLLECTION_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(COLLECTION_FILE, "utf-8"));
    } catch (err) {
        console.error("Erreur chargement collections :", err);
        return {};
    }
}

function saveCollections(collections) {
    fs.writeFileSync(
        COLLECTION_FILE,
        JSON.stringify(collections, null, 2),
        "utf-8"
    );
}

function updateJson(userId, oldTitle, newTitle) {
    if (!newTitle || oldTitle === newTitle) return;

    const collections = loadCollections();
    if (!collections[userId]) return;

    const index = collections[userId].indexOf(oldTitle);
    if (index !== -1) {
        collections[userId][index] = newTitle;
        saveCollections(collections);
    }
}

/* =======================
   GOOGLE SHEETS
======================= */

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";
const SHEET_NAME = "Feuille 1";

async function findRowIndex(userId, numero) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:H`,
    });

    const rows = res.data.values || [];

    for (let i = 1; i < rows.length; i++) {
        if (
            rows[i][0] === userId &&
            Number(rows[i][2]) === numero
        ) {
            return { rowIndex: i, row: rows[i] };
        }
    }

    return null;
}

async function updateRow(rowIndex, values) {
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A${rowIndex + 1}:H${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [values],
        },
    });
}

/* =======================
   COMMANDE DISCORD
======================= */

module.exports = {
    name: "modifcollection",
    description: "Modifie un steelbook de ta collection",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options: [
        {
            type: "integer",
            name: "nom",
            description: "Nom du steelbook à modifier",
            required: true,
            autocomplete: true,
        },
        {
            type: "string",
            name: "titre",
            description: "Nouveau titre",
            required: false,
            autocomplete: false,
        },
        {
            type: "integer",
            name: "prix",
            description: "Nouveau prix",
            required: false,
            autocomplete: false,
        },
        {
            type: "string",
            name: "realisateur",
            description: "Nouveau réalisateur",
            required: false,
            autocomplete: false,
        },
        {
            type: "string",
            name: "etat",
            description: "Nouvel état",
            required: false,
            autocomplete: false,
        },
        {
            type: "string",
            name: "provenance",
            description: "Nouvelle provenance",
            required: false,
            autocomplete: false,
        },
    ],

    async run(bot, message, args) {
        const logBotChannelId = "1394058036754255932";
        const logChannel = bot.channels.cache.get(logBotChannelId);

        const userId = message.user.id;
        const numero = args.getInteger("nom");

        logChannel?.send(
            `Commande modifcollection utilisée par ${message.user.tag}`
        );

        const found = await findRowIndex(userId, numero);

        if (!found) {
            return message.reply("❌ Aucun steelbook trouvé avec ce numéro.");
        }

        const { rowIndex, row } = found;

        const newRow = [...row];

        const newTitle = args.getString("titre");
        const newPrix = args.getInteger("prix");
        const newReal = args.getString("realisateur");
        const newEtat = args.getString("etat");
        const newProv = args.getString("provenance");

        if (newTitle) newRow[3] = newTitle;
        if (newPrix !== null) {
            if (newPrix < 0) {
                return message.reply("❌ Le prix ne peut pas être négatif.");
            }
            newRow[4] = newPrix;
        }
        if (newReal) newRow[5] = newReal;
        if (newEtat) newRow[6] = newEtat;
        if (newProv) newRow[7] = newProv;

        await updateRow(rowIndex, newRow);

        updateJson(userId, row[3], newTitle);
        
        const randomEmoji = tools.randomEmoji();
        const oldTitle = row[3];
        await message.reply(
            `${randomEmoji} **${oldTitle}** a bien été modifié !`
        );
    },
};
