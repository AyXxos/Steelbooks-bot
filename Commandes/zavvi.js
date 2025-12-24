const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");



module.exports = {
  name: "zavvi",
  description: "📘 Steelbooks de chez Zavvi en fonction du pays sélectionné 📘",
  permission: "Aucune",
  dm: false,
  category: "Info | bot",
  options:[
    {
        type :"string",
        name :'pays',
        description: "Pays pour les steelbooks Zavvi (fr, uk...)",
        required: true,
        autocomplete: true,
    }
  ],

  async run(bot, message, args) {
    const logBotChannelId = '1394058036754255932'
    const logChannel = bot.channels.cache.get(logBotChannelId);
    const id = message.user.id;
    const user = bot.users.cache.get(id);
    logChannel.send("Commande zavvi utilisée par " + user.tag);
    const getZavvi = async () => {
        const url = args.getString("pays") || "";
        try {
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            const steelbooks = [];

            $(".productListProducts_product").each((index, element) => {
            const title = $(element).find(".productBlock_productName").text().trim();

            // ✅ Ne garde que les titres contenant "steelbook" (insensible à la casse)
            if (!title.toLowerCase().includes("steelbook")) return;

            const price = $(element)
                .find(".productBlock_priceValue")
                .attr("content")
                ?.trim();
            const relativeLink = $(element).find("a.productBlock_link").attr("href");
            const link = relativeLink ? `https://fr.zavvi.com${relativeLink}` : null;

            if (title && price && link) {
                steelbooks.push({
                title: `${title} - à partir de ${price}`,
                link,
                });
            }
            });

            return steelbooks;
        } catch (error) {
            console.error("Erreur lors du scraping :", error.message);
            return [];
        }
        };

    let steelbooks = await getZavvi();
    // Garde uniquement ceux qui contiennent "steelbook" (insensible à la casse)
    steelbooks = steelbooks.filter(sb =>
      sb.title.toLowerCase().includes("steelbook")
    );

    if (steelbooks.length === 0) {
      return await message.reply("Aucun steelbook trouvé sur Zavvi.");
    }

    const itemsPerPage = 5;
    let page = 0;
    const totalPages = Math.ceil(steelbooks.length / itemsPerPage);

    const generateEmbed = (page) => {
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Steelbooks Zavvi")
        .setDescription(`Page ${page + 1} / ${totalPages}`)
        .setFooter({
          text: "Steelbooks Bot",
          iconURL: "https://i.imgur.com/IPqJeRh.jpeg",
        })
        .setTimestamp();

      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const currentItems = steelbooks.slice(start, end);

      currentItems.forEach((steelbook) => {
        embed.addFields({
          name: steelbook.title.slice(0, 256),
          value: `[Voir le steelbook](${steelbook.link})\n\u200B`,
          inline: false,
        });
      });

      return embed;
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀️ Précédent")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("▶️ Suivant")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages - 1)
    );

    // ✅ Récupère l'ID de l'utilisateur qui a déclenché la commande
    const userId = message.author?.id ?? message.user?.id;

    const reply = await message.reply({
      embeds: [generateEmbed(page)],
      components: [row],
    });

    const collector = reply.createMessageComponentCollector({
      time: 120000, // 2 minute
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: "Tu ne peux pas utiliser ces boutons.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "prev" && page > 0) {
        page--;
      } else if (interaction.customId === "next" && page < totalPages - 1) {
        page++;
      }

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️ Précédent")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Suivant ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );

      await interaction.update({
        embeds: [generateEmbed(page)],
        components: [newRow],
      });
    });

    collector.on("end", () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️ Précédent")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Suivant ▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      reply.edit({
        components: [disabledRow],
      });
    });
  },
};