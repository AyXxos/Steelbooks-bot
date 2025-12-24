const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");

const COLLECTION_FILE = path.join(__dirname, "../data/collections/collections.json");
const EMOJI_FILE = path.join(__dirname, "../data/emojis.json");
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
function loadEmojis() {
    if (!fs.existsSync(EMOJI_FILE)) return {};
    try {
        const data = fs.readFileSync(EMOJI_FILE, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Erreur lors du chargement des collections :", err);
        return {};
    }
}
function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomColor() {
    const num = randint(1, 32);
    const couleurs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
    let randomColor = '#'
    for (i = 0; i < 6; i++) {
        randomColor += couleurs[randint(0, 15)];
    }
    return randomColor;
}
function randomEmoji(){
    emojis = loadEmojis();
    return emojis[randint(0, emojis.length - 1)];
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
            autocomplete: false,
        }
    ],

    async run(bot, message, args) {
        const logBotChannelId = '1394058036754255932'
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = message.user.id;
        const usr = bot.users.cache.get(id);
        logChannel.send("Commande collection utilisée par " + usr.tag);
        const user = await args.getUser("membre");
        if (!user) {
            return message.reply("<:peepoboxing:1391691687385895045> Tu dois spécifier un membre pour voir sa collection !");
        }

        const collections = loadCollections();
        const userId = user.id;
        const userCollection = collections[userId] || [];

        if (userCollection.length === 0) {
            return message.reply(`<:peppoishrug:1391693146966065213> ${user.username} n’a pas encore ajouté de steelbook à sa collection.`);
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
                .setDescription(currentItems.map((s, i) => {
                    const emoji = randomEmoji(); 
                    return `${emoji} \`${start + i + 1}.\` ${s}`;
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
