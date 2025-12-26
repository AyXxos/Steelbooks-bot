const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
    ],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";

module.exports = {
    name: "macollec",
    description: "Obtiens le lien vers ta feuille Google Sheets",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options: [],

    async run(bot, interaction) {
        const logBotChannelId = "1394058036754255932";
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = interaction.user.id;
        const user = bot.users.cache.get(id);
        logChannel?.send(
            `Commande ping utilisée par ${user.tag}`
        );

        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const sheetName = `user_${userId}`;


        const meta = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        let exists = meta.data.sheets.some(
            s => s.properties.title === sheetName
        );

        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: { title: sheetName },
                            },
                        },
                    ],
                },
            });
        }

        const sheet = (await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID }))
            .data.sheets.find(s => s.properties.title === sheetName);
        const gid = sheet.properties.sheetId;

        const link = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${gid}`;

        
        await interaction.editReply({
            content: `📄 Voici le lien vers ta feuille : ${link}`
        });
    },
};
