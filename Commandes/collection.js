const Discord = require("discord.js");
const { google } = require("googleapis");
const tools = require("../tools.js");

/* ===================== GOOGLE SHEETS ===================== */

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";

/* ===================== DATA ===================== */

async function getUserData(userId) {
    const sheetName = `user_${userId}`;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A1:H`,
        });

        const rows = response.data.values || [];

        return rows.map(row => ({
            id: row[0],
            pseudo: row[1],
            numero: row[2],
            nom: row[3],
            prix: row[4],
            realisateur: row[5],
            etat: row[6],
            provenance: row[7],
        }));
    } catch (err) {
        // Feuille inexistante = aucune collection
        return [];
    }
}

/* ===================== COMMAND ===================== */

module.exports = {
    name: "collection",
    description: "Affiche la collection de steelbooks d’un membre",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options: [
        {
            type: "user",
            name: "membre",
            description: "Voir la collection d’un membre",
            required: true,
            autocomplete: false,
        }
    ],

    async run(bot, interaction, args) {
        const logBotChannelId = "1394058036754255932";
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = interaction.user.id;
        const userCom = bot.users.cache.get(id);
        logChannel?.send(
            `Commande ping utilisée par ${userCom.tag}`
        );

        const user = args.getUser("membre");
        if (!user) {
            return interaction.reply({ content: "❌ Tu dois spécifier un membre.", ephemeral: true });
        }

        const collection = await getUserData(user.id);

        if (collection.length === 0) {
            return interaction.reply(
                `📦 **${user.username}** n’a pas encore ajouté de steelbook.`
            );
        }

        /* ===================== PAGINATION ===================== */

        const itemsPerPage = 10;
        const totalPages = Math.ceil(collection.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = collection.slice(start, end);

            return new Discord.EmbedBuilder()
                .setTitle(`📀 Collection de ${user.username}`)
                .setDescription(
                    currentItems.map((item, i) => {
                        const emoji = tools.randomEmoji();
                        return `${emoji} **#${item.numero} — ${item.nom}** - *${item.realisateur || "Inconnu"}*`;
                    }).join("\n\n")
                )
                .setFooter({ text: `Page ${page + 1} / ${totalPages}` })
                .setColor(tools.randomColor());
        };

        const backButton = new Discord.ButtonBuilder()
            .setCustomId("back")
            .setEmoji("⬅️")
            .setStyle(Discord.ButtonStyle.Secondary)
            .setDisabled(true);

        const nextButton = new Discord.ButtonBuilder()
            .setCustomId("next")
            .setEmoji("➡️")
            .setStyle(Discord.ButtonStyle.Secondary)
            .setDisabled(totalPages <= 1);

        const row = new Discord.ActionRowBuilder().addComponents(backButton, nextButton);

        const msg = await interaction.reply({
            embeds: [generateEmbed(currentPage)],
            components: [row],
            withResponse: true,
        });

        const collector = msg.resource.message.createMessageComponentCollector({
            componentType: Discord.ComponentType.Button,
            time: 60_000,
        });

        collector.on("collect", async (btn) => {
            if (btn.user.id !== interaction.user.id) {
                return btn.reply({ content: "❌ Ce menu ne t’appartient pas.", ephemeral: true });
            }

            if (btn.customId === "back") currentPage--;
            if (btn.customId === "next") currentPage++;

            backButton.setDisabled(currentPage === 0);
            nextButton.setDisabled(currentPage >= totalPages - 1);

            await btn.update({
                embeds: [generateEmbed(currentPage)],
                components: [new Discord.ActionRowBuilder().addComponents(backButton, nextButton)],
            });
        });

        collector.on("end", async () => {
            backButton.setDisabled(true);
            nextButton.setDisabled(true);

            await msg.resource.message.edit({
                components: [new Discord.ActionRowBuilder().addComponents(backButton, nextButton)],
            }).catch(() => {});
        });
    }
};
