const Discord = require("discord.js");
const { google } = require("googleapis");

/* ===================== GOOGLE SHEETS ===================== */

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";

/* ===================== HELPERS ===================== */

async function getSheetMeta(sheetName) {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });

    return meta.data.sheets.find(
        s => s.properties.title === sheetName
    );
}

async function findRow(userId, numero) {
    const sheetName = `user_${userId}`;

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A1:F`,
        });

        const rows = res.data.values || [];

        for (let i = 0; i < rows.length; i++) {
            if (Number(rows[i][0]) === numero) {
                return {
                    rowIndex: i + 1, // ligne réelle dans Sheets
                    row: rows[i],
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

async function deleteRow(sheetId, rowIndex) {
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex,
                        },
                    },
                },
            ],
        },
    });
}

async function renumberSheet(userId) {
    const sheetName = `user_${userId}`;

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A1:F`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return;

    const updated = rows.map((row, index) => {
        row[0] = index + 1; // colonne NUMÉRO
        return row;
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A1:F${rows.length}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: updated,
        },
    });
}

/* ===================== COMMAND ===================== */

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
            autocomplete: true,
        },
    ],

    async run(bot, interaction, args) {
        const logBotChannelId = "1394058036754255932";
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = interaction.user.id;
        const user = bot.users.cache.get(id);
        logChannel?.send(
            `Commande rmcollection utilisée par ${user.tag}`
        );

        await interaction.deferReply();

        const userId = interaction.user.id;
        const numero = args.getInteger("numero");
        const sheetName = `user_${userId}`;

        const sheet = await getSheetMeta(sheetName);
        if (!sheet) {
            return interaction.editReply(
                "❌ Tu n’as encore aucun steelbook."
            );
        }

        const found = await findRow(userId, numero);
        if (!found) {
            return interaction.editReply(
                "❌ Aucun steelbook trouvé avec ce numéro."
            );
        }

        const { rowIndex, row } = found;
        const steelbookName = row[1];

        await deleteRow(sheet.properties.sheetId, rowIndex);
        await renumberSheet(userId);

        await interaction.editReply(
            `🗑️ **${steelbookName}** a été supprimé de ta collection.`
        );
    },
};
