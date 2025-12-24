const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
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

function removeFromJson(userId, steelbookName) {
    const collections = loadCollections();

    if (!collections[userId]) return;

    collections[userId] = collections[userId].filter(
        name => name !== steelbookName
    );

    if (collections[userId].length === 0) {
        delete collections[userId];
    }

    saveCollections(collections);
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
const SHEET_ID = 0; 

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
            return i;
        }
    }

    return -1;
}

async function getSteelbookName(rowIndex) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A${rowIndex + 1}:H${rowIndex + 1}`,
    });

    return res.data.values?.[0]?.[3] || null;
}

async function deleteRow(rowIndex) {
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: SHEET_ID,
                            dimension: "ROWS",
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1,
                        },
                    },
                },
            ],
        },
    });
}

/* =======================
   COMMANDE DISCORD
======================= */

module.exports = {
    name: "rmcollection",
    description: "Supprime un steelbook de ta collection",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options: [
        {
            type: "integer",
            name: "numero",
            description: "Numéro du steelbook à supprimer",
            required: true,
        },
    ],

    async run(bot, message, args) {
        const logBotChannelId = "1394058036754255932";
        const logChannel = bot.channels.cache.get(logBotChannelId);

        const userId = message.user.id;
        const numero = args.getInteger("numero");

        logChannel?.send(
            `Commande rmcollection utilisée par ${message.user.tag}`
        );

        const rowIndex = await findRowIndex(userId, numero);

        if (rowIndex === -1) {
            return message.reply(
                "❌ Aucun steelbook trouvé avec ce numéro."
            );
        }

        const steelbookName = await getSteelbookName(rowIndex);

        await deleteRow(rowIndex);

        if (steelbookName) {
            removeFromJson(userId, steelbookName);
        }

        await message.reply(
            `🗑️ **${steelbookName ?? "Steelbook"}** a été supprimé de ta collection.`
        );
    },
};
