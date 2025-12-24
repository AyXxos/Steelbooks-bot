const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require('discord.js');
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheZavviUKPreOrder.json");

const downloadImage = async (url, filepath) => {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

const getZavvi = async () => {
  const url = "https://www.zavvi.com/pre-orders.list?pageNumber=1&facetFilters=categoryLevel2:DVD+and+Blu-Ray";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const steelbooks = [];

    $('.productListProducts_product').each((index, element) => {
      const titleRaw = $(element).find('.productBlock_productName').text().trim();
      const image = $(element).find('.productBlock_image').attr('src');
      const price = $(element).find('.productBlock_priceValue').attr('content')?.trim();
      const relativeLink = $(element).find('a.productBlock_link').attr('href');
      const link = relativeLink ? `https://zavvi.com${relativeLink}` : null;
      const status ="**PRE-COMMANDE MAINTENANT CHEZ ZAVVI UK**"
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
      if (!titleRaw.toLowerCase().includes("steelbook")) return;
      if (!link || !price || !titleRaw) return;

      steelbooks.push({
        title: titleRaw,
        link,
        image,
        price,
        status,
        date : dateFormatted 
      });
    });

    let cached = [];
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        cached = JSON.parse(raw || "[]");
      } catch (err) {
        console.warn("⚠️ Cache Zavvi corrompu, il sera réinitialisé.");
        cached = [];
      }
    }

    const newSteelbooks = steelbooks.filter(
      (sb) => !cached.some((old) => old.link === sb.link)
    );

    if (newSteelbooks.length > 0) {
      const updatedCache = [...cached, ...newSteelbooks];
      fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
    }

    return newSteelbooks;
  } catch (error) {
    console.error("❌ Erreur lors du scraping de Zavvi :", error.message);
    return [];
  }
};

module.exports = async (bot) => {
  const logBotChannelId = '1394058036754255932'
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const channelId = "1394265597994467460"; // ID du salon Discord
  const roleId = "1391370589385523280"; // ID du rôle à mentionner
  const channel = bot.channels.cache.get(channelId);

  if (!channel) {
    console.error("❌ Salon introuvable pour ZavviUK Pre Order. Vérifie l'ID du salon.");
    return;
  }

  const newSteelbooks = await getZavvi();

  if (newSteelbooks.length === 0) {
    logChannel.send("📭 Aucun nouveau steelbook trouvé sur ZavviUK pour les précommandes.");
    return;
  }

  for (let i = 0; i < newSteelbooks.length; i++) {
    const sb = newSteelbooks[i];
    const filename = `steelbook_${i}.jpg`;
    const filepath = path.join(__dirname, filename);

    try {
      await downloadImage(sb.image, filepath);
      const attachment = new AttachmentBuilder(filepath).setName(filename);

      const messageText = `<:zavvi:1391700534876180522> <@&${roleId}> ${sb.status}\n\n[${sb.title}](<${sb.link}>)`;

      await channel.send({
        content: messageText,
        files: [attachment],
        allowedMentions: { roles: [roleId] }
      });
    } catch (err) {
      console.error(`❌ Erreur pour ${sb.title} :`, err.message);
    } finally {
      // Nettoyage de l'image locale
      fs.unlink(filepath, (err) => {
        if (err) console.warn(`⚠️ Erreur suppression ${filename}`, err.message);
      });
    }
  }
  logChannel.send(`📦 ${newSteelbooks.length} steelbook(s) envoyé(s) individuellement dans #${channel.name}. De chez zavvi Uk.`);

};
