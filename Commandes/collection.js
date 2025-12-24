const Discord = require("discord.js");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

const EMOJI_FILE = path.join(__dirname, "../data/emojis.json");

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

function loadEmojis() {
    if (!fs.existsSync(EMOJI_FILE)) return [];
    try {
        const data = fs.readFileSync(EMOJI_FILE, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Erreur lors du chargement des emojis :", err);
        return [];
    }
}

function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor() {
    const couleurs = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
    let color = '#';
    for (let i = 0; i < 6; i++) color += couleurs[randint(0, 15)];
    return color;
}

function randomEmoji(){
    const emojis = loadEmojis();
    return emojis[randint(0, emojis.length - 1)];
}


async function getUserData(userId) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4",
        range: "'Feuille 1'!A:G",
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows
        .filter(row => row[0] === userId)
        .map(row => ({
            id: row[0],
            pseudo: row[1],
            nom: row[2],
            prix: row[3],
            realisateur: row[4],
            etat: row[5],
            provenance: row[6],
        }));
}

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
        }
    ],

    async run(bot, message, args) {
        const logBotChannelId = '1394058036754255932';
        const logChannel = bot.channels.cache.get(logBotChannelId);
        logChannel?.send(`Commande collection utilisée par ${message.user.tag}`);

        const user = await args.getUser("membre");
        if (!user) return message.reply("❌ Tu dois spécifier un membre !");

        const userCollection = await getUserData(user.id);
        if (userCollection.length === 0) {
            return message.reply(`📦 ${user.username} n’a pas encore ajouté de steelbook à sa collection.`);
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(userCollection.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = userCollection.slice(start, end);

            return new Discord.EmbedBuilder()
                .setTitle(`📀 Collection de ${user.username} 📀`)
                .setDescription(currentItems.map((item, i) => {
                    const emoji = randomEmoji();
                    return `${emoji} \`${start + i + 1}.\` ${item.nom} - Réalisateur: ${item.realisateur || "N/A"}`;
                }).join("\n\n"))
                .setFooter({ text: `Page ${page + 1} / ${totalPages}` })
                .setColor(randomColor());
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

        const msg = await message.reply({
            embeds: [generateEmbed(currentPage)],
            components: [row],
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            componentType: Discord.ComponentType.Button,
            time: 60_000
        });

        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.user.id) {
                return interaction.reply({ content: "❌ Ce menu ne t’appartient pas.", ephemeral: true });
            }

            if (interaction.customId === "back") currentPage--;
            else if (interaction.customId === "next") currentPage++;

            backButton.setDisabled(currentPage === 0);
            nextButton.setDisabled(currentPage >= totalPages - 1);

            await interaction.update({
                embeds: [generateEmbed(currentPage)],
                components: [new Discord.ActionRowBuilder().addComponents(backButton, nextButton)]
            });
        });

        collector.on("end", async () => {
            backButton.setDisabled(true);
            nextButton.setDisabled(true);
            await msg.edit({
                components: [new Discord.ActionRowBuilder().addComponents(backButton, nextButton)]
            }).catch(() => {});
        });
    }
};
