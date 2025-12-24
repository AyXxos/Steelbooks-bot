const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require('discord.js');
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheEscPreOrder.json");

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

const getEscPreorder = async () => {
  const url = "https://www.esc-distribution.com/4-a-venir";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const steelbooks = [];

    $('li.ajax_block_product').each((index, element) => {
      const titleRaw = $(element).find('a.product-name').text().trim();
      const image = $(element).find('img').attr('src');
      const link = $(element).find('a.ajax_add_to_cart_button').attr('href');
      const status = "**PRE-COMMANDE MAINTENANT CHEZ ESC DISTRIBUTION**"
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;

      steelbooks.push({
        title: titleRaw,
        link,
        image,
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
      console.warn("⚠️ Cache corrompu, réinitialisé.");
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
    console.error("❌ Erreur lors du scraping de Esc distribution PreOrder :", error.message);
    return [];
  }
};

module.exports = async (bot) => {
  const logBotChannelId = '1394058036754255932'
  const logChannel = bot.channels.cache.get(logBotChannelId);
  
  const newSteelbooks = await getEscPreorder();

  if (newSteelbooks.length === 0) {
    logChannel.send("📭 Aucun nouveau steelbook trouvé sur  Esc distribution PreOrder.");
    return;
  }
  const sb = newSteelbooks[0];
  const filename = `steelbook_${0}.jpg`;
  const filepath = path.join(__dirname, filename);

  try {
    const channelId = "1394265558689779813"; // ID du salon Discord
    const roleId = "1391342206849122304"; // ID du rôle à mentionner
    const channel = bot.channels.cache.get(channelId);

    if (!channel) {
      console.error("❌ Salon introuvable pour Esc distribution PreOrder. Vérifie l'ID du salon.");
      return;
    }

    await downloadImage(sb.image, filepath);
    const attachment = new AttachmentBuilder(filepath).setName(filename);

    const messageText = `<a:peppoganzo:1391693145044947025> <@&${roleId}> ${sb.status}\n\n[${sb.title}](<${sb.link}>)`;

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



  for (let i = 1; i < newSteelbooks.length; i++) {
    const sb = newSteelbooks[i];
    const filename = `steelbook_${i}.jpg`;
    const filepath = path.join(__dirname, filename);

    try {
      const channelId = "1394265558689779813"; // ID du salon Discord
      const roleId = "1391342206849122304"; // ID du rôle à mentionner
      const channel = bot.channels.cache.get(channelId);

      if (!channel) {
        console.error("❌ Salon introuvable pour Esc distribution PreOrder. Vérifie l'ID du salon.");
        return;
      }
      await downloadImage(sb.image, filepath);
      const attachment = new AttachmentBuilder(filepath).setName(filename);

      const messageText = `<a:peppoganzo:1391693145044947025> ${sb.status}\n\n[${sb.title}](<${sb.link}>)`;

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

  logChannel.send(`📦 ${newSteelbooks.length} steelbook(s) envoyé(s) individuellement. De chez  Esc distribution PreOrder.`);
};
