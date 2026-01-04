const Discord = require("discord.js");
const tools = require("../tools.js");
const { google } = require("googleapis");

/* ===================== GOOGLE SHEETS ===================== */

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";

/* ===================== HELPERS ===================== */

async function findRowIndex(userId, numero) {
    const sheetName = `user_${userId}`;

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A1:H`,
        });

        const rows = res.data.values || [];

        for (let i = 0; i < rows.length; i++) {
            if (Number(rows[i][2]) === numero) {
                return {
                    rowIndex: i + 1, // +1 car A1
                    row: rows[i],
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

async function updateRow(userId, rowIndex, values) {
    const sheetName = `user_${userId}`;

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A${rowIndex}:H${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [values],
        },
    });
}

/* ===================== COMMAND ===================== */

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
            description: "Numéro du steelbook à modifier",
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
            autocomplete: true,
        },
        {
            type: "string",
            name: "provenance",
            description: "Nouvelle provenance",
            required: false,
            autocomplete: false,
        },
    ],

    async run(bot, interaction, args) {
        const logBotChannelId = "1394058036754255932";
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = interaction.user.id;
        const user = bot.users.cache.get(id);
        logChannel?.send(
            `Commande modifcollection utilisée par ${user.tag}`
        );

        const userId = interaction.user.id;
        const numero = args.getInteger("nom");

        const found = await findRowIndex(userId, numero);

        if (!found) {
            return interaction.reply({
                content: "❌ Aucun steelbook trouvé avec ce numéro.",
                ephemeral: true,
            });
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
                return interaction.reply({
                    content: "❌ Le prix ne peut pas être négatif.",
                    ephemeral: true,
                });
            }
            newRow[4] = newPrix;
        }

        if (newReal) newRow[5] = newReal;
        if (newEtat) newRow[6] = newEtat;
        if (newProv) newRow[7] = newProv;

        await updateRow(userId, rowIndex, newRow);

        const emoji = tools.randomEmoji();
        await interaction.reply(
            `${emoji} **${row[3]}** a bien été modifié !`
        );
    },
};
