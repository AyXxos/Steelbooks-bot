const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require('discord.js');
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheChoco.json");

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


const getChoco = async () => {
    const url ="https://chocobonplan.com/bons-plans/c/steelbook-blu-ray-4k-pas-cher-en-promo-qualite/?orderby=date"

    try{
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const steelbooks = [];

      $(".box-corner__content").each((index, element) => {
        const site = $(element).find('.box-corner__subtitle').text().trim();
        const siteCleaned = site.replace(/@/g, "");
        const title = $(element).find('.box-corner__title').contents().filter(function() {
          return this.nodeType === 3;
        }).text().trim();
        const titleCleaned = title + " sur" + siteCleaned;
        const image = $(element).find('.img-responsive').attr('src');
        const price = $(element).find('.price__promotion').text().trim();
        const priceDel = $(element).find('.price__del').text().trim();
        const priceDelCleaned = '~~' + priceDel + '~~';
        const priceFinal = priceDel ? `${price} ${priceDelCleaned}` : price;
        const link = $(element).find('a.visite').attr('href');
        const titlePrecoAsk = $(element).find('.box-corner__title').text().trim();
        const status = titlePrecoAsk.toLocaleLowerCase().includes("précommande")
          ? "**PRE-COMMANDE MAINTENANT**"
          : "**DISPONIBLE MAINTENANT**";
        const now = new Date();
        const date = now.toLocaleDateString('fr-FR');
        const heure = now.getHours();
        const minutes = now.getMinutes();
        const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;

        if (!titleCleaned || !link || !image) {
          console.log("❌ Produit ignoré :", { titleCleaned, link, image, priceFinal });
          return;
        }

        steelbooks.push({
        title : titleCleaned,
        link  : link,
        image : image,
        price : priceFinal,
        status : status,
        date : dateFormatted 
      });
      });
      let cached = [];
        if (fs.existsSync(CACHE_FILE)) {
          try {
            const raw = fs.readFileSync(CACHE_FILE, "utf-8");
            cached = JSON.parse(raw || "[]");
          } catch (err) {
            console.warn("⚠️ Cache Choco corrompu, il sera réinitialisé.");
            cached = [];
          }
        }
    
        const newSteelbooks = steelbooks.filter(
            (sb) => !cached.some((old) => old.image === sb.image && old.title.toLowerCase().includes(sb.title.toLowerCase()))
        );
    
    
        if (newSteelbooks.length > 0) {
            const updatedCache = [...cached, ...newSteelbooks];
            fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
        }
    
        return newSteelbooks;
    }
    catch (error) {
        console.error("Erreur pendant la récupération des précommandes Choco:", error);
    }
}

module.exports = async (bot) => {
  
  const logBotChannelId = '1394058036754255932'
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const newSteelbooks = await getChoco();

  if (newSteelbooks.length === 0) {
    logChannel.send("📭 Aucun nouveau steelbook trouvé sur Choco.");
    return;
  }
  

  for (let i = 0; i < newSteelbooks.length; i++) {
    
    const sb = newSteelbooks[i];
    const filename = `choco_steelbook_${i}.jpg`;
    const filepath = path.join(__dirname, filename);
    

    try {
      const channelId = sb.status === "**PRE-COMMANDE MAINTENANT**"
        ? '1394265558689779813'
        : "1394265783810392165";
      const channel = bot.channels.cache.get(channelId);

      if (!channel) {
        console.error("❌ Salon introuvable pour choco. Vérifie l'ID du salon.");
        return;
      }

      
      let emoji
      if (sb.title.toLocaleLowerCase().includes("fnac")) emoji = "<:fnac:1394274929813356586>";
      if (sb.title.toLocaleLowerCase().includes("cultura")) emoji = "<:cultura:1408425274722222203>";
      if (sb.title.toLocaleLowerCase().includes("amazon")) emoji = "<:amazon:1391706784837664828>";
      if (sb.title.toLocaleLowerCase().includes("leclerc")) emoji = "<:leclerc:1408425276140163144>";

      await downloadImage(sb.image, filepath);
      const attachment = new AttachmentBuilder(filepath).setName(filename);
      let messageText;
      if (channelId === '1394265558689779813'){
        const roleId = '1391342206849122304'; // ID du rôle à mentionner
        messageText = `${emoji} <@&${roleId}> ${sb.status}\n\n[${sb.title} – ${sb.price}](<${sb.link}>)`;
      }
      else {
        messageText = `${emoji} ${sb.status}\n\n[${sb.title} – ${sb.price}](<${sb.link}>)`;
      }
      
      await channel.send({
        content: messageText,
        files: [attachment],
        allowedMentions: { roles: [] },
      });
      
    } catch (err) {
      console.error(`❌ Erreur pour ${sb.title} :`, err.message);
    } finally {
      fs.unlink(filepath, (err) => {
        if (err) console.warn(`⚠️ Erreur suppression ${filename}`, err.message);
      });
    }
    
  };
  logChannel.send(`📦 ${newSteelbooks.length} steelbook(s) envoyé(s) individuellement de chez choco.`);

};
