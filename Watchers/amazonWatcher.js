const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require("discord.js");
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheAmazonFR.json");

const downloadImage = async (url, filepath) => {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

const cleanAmazonUrl = (url) => {
  try {
    const asinMatch = url.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);
    return asinMatch ? `https://www.amazon.fr/dp/${asinMatch[2]}` : url;
  } catch {
    return url;
  }
};

const getAmazon = async () => {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Referer": "https://www.amazon.fr/",
  };
  const url = "https://www.amazon.fr/s?k=steelbook&__mk_fr_FR=ÅMÅŽÕÑ&crid=1LXWSJ88VVP9E&sprefix=steelbook%2Caps%2C94&ref=nb_sb_noss";

    const { data } = await axios.get(url, { headers });
    
    const $ = cheerio.load(data);
    const steelbooks = [];

    $("div.s-result-item").each((_, el) => {
      const title = $(el).find("h2.a-size-base-plus span").text().trim();
      console.log("TITLE:", title);
      const linkRel = $(el).find("a.a-link-normal").attr("href");
      const rawLink = linkRel ? `https://www.amazon.fr${linkRel}` : null;
      const link = rawLink ? cleanAmazonUrl(rawLink) : null;
      const image = $(el).find("img.s-image").attr("src");
      const priceWhole = $(el).find(".a-price-whole").first().text().replace(/[^\d]/g, "");
      const priceFraction = $(el).find(".a-price-fraction").first().text().replace(/[^\d]/g, "");
      const price = priceWhole ? `${priceWhole},${priceFraction} €` : "Non disponible";
      const hasReviews = $(el).find('[data-cy="reviews-block"]').length > 0;
      const actionButtonText = $(el).find(".a-row a-size-base a-color-secondary").text().toLowerCase();
      const status = actionButtonText.includes("précommande")
        ? "**PRE-COMMANDE MAINTENANT CHEZ AMAZON**"
        : "**DISPONIBLE MAINTENANT CHEZ AMAZON**";
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
      console.log(link);
      if ((!title.toLowerCase().includes("steelbook")) || (title.toLowerCase().includes("jeu")) || (title.toLowerCase().includes("ps4")) || (title.toLowerCase().includes("ps5")) || (title.toLowerCase().includes("xbox"))) return;
      if (!title || !link || !image || !priceWhole || link == "https://www.amazon.fr#" || image == "https://m.media-amazon.com/images/I/61DTa6sdzsL._AC_UL320_.jpg" || link.includes("sspa")) {
        console.log("❌ Produit ignoré :", { title, link, image, price });
        return;
      }
      steelbooks.push({
        title : title,
        link  : link,
        image : image,
        price : price,
        status : status,
        hasReviews : hasReviews,
        date : dateFormatted 
      });
      
    })
    let cached = [];
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        cached = JSON.parse(raw || "[]");
      } catch (err) {
        console.warn("⚠️ Cache Amazon corrompu, il sera réinitialisé.");
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
};

module.exports = async (bot) => {
  
  const logBotChannelId = '1394058036754255932'
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const newSteelbooks = await getAmazon();

  if (newSteelbooks.length === 0) {
    logChannel.send("📭 Aucun nouveau steelbook trouvé sur Amazon.fr.");
    return;
  }

  const sb = newSteelbooks[0];
  const filename = `amazon_steelbook_${0}.jpg`;
  const filepath = path.join(__dirname, filename);
  const roleId = "1391342206849122304"; // ID du rôle à mentionner
  

  try {
    const channelId = sb.hasReviews == true
      ? '1394265783810392165'
      : "1394265558689779813";
    const channel = bot.channels.cache.get(channelId);

    if (!channel) {
      console.error("❌ Salon introuvable pour amazon. Vérifie l'ID du salon.");
      return;
    }

    await downloadImage(sb.image, filepath);
    const attachment = new AttachmentBuilder(filepath).setName(filename);

    const messageText = `<:amazon:1391706784837664828> ${sb.status}\n\n[${sb.title} – ${sb.price}](<${sb.link}>)`;

    await channel.send({
      content: messageText,
      files: [attachment],
      allowedMentions: { roles: [roleId] },
    });
    logChannel.send(`📦 ${newSteelbooks.length} steelbook(s) envoyé(s) individuellement dans #${channel.name}. De chez amazon.`);
  } catch (err) {
    console.error(`❌ Erreur pour ${sb.title} :`, err.message);
  } finally {
    fs.unlink(filepath, (err) => {
      if (err) console.warn(`⚠️ Erreur suppression ${filename}`, err.message);
    });
  }

  for (let i = 1; i < newSteelbooks.length; i++) {
    
    const sb = newSteelbooks[i];
    const filename = `amazon_steelbook_${i}.jpg`;
    const filepath = path.join(__dirname, filename);
    const roleId = "1391342206849122304"; // ID du rôle à mentionner
    

    try {
      const channelId = sb.hasReviews == true
        ? '1394265783810392165'
        : "1394265558689779813";
      const channel = bot.channels.cache.get(channelId);

      if (!channel) {
        console.error("❌ Salon introuvable pour amazon. Vérifie l'ID du salon.");
        return;
      }

      await downloadImage(sb.image, filepath);
      const attachment = new AttachmentBuilder(filepath).setName(filename);

      const messageText = `<:amazon:1391706784837664828> ${sb.status}\n\n[${sb.title} – ${sb.price}](<${sb.link}>)`;

      await channel.send({
        content: messageText,
        files: [attachment],
        allowedMentions: { roles: [roleId] },
      });
      logChannel.send(`📦 ${newSteelbooks.length} steelbook(s) envoyé(s) individuellement dans #${channel.name}. De chez amazon.`);
    } catch (err) {
      console.error(`❌ Erreur pour ${sb.title} :`, err.message);
    } finally {
      fs.unlink(filepath, (err) => {
        if (err) console.warn(`⚠️ Erreur suppression ${filename}`, err.message);
      });
    }
  };

};
