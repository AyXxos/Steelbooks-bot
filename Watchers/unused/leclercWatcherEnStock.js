const axios = require("axios");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder } = require("discord.js");

const CACHE_FILE = path.join(__dirname, "../data/cacheLeclercEnStock.json");

const downloadImage = async (url, filepath) => {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

const getLeclercEnStock = async () => {
  console.log("🔁 Lancement de la vérification Leclerc", new Date().toISOString());

  const url = "https://www.e.leclerc/pr/selection-blu-ray-steelbook?page=1&code=PROMO_selection-blu-ray-steelbook#availability_status=in-stock";
  const browser = await puppeteer.launch({ headless: true });
  console.log("Ouverture du navigateur pour Leclerc");
  const page = await browser.newPage();
  console.log("Chargement de la page Leclerc");
  await page.goto(url, { waitUntil: "networkidle2" });

  try {

    console.log("Ca a passé la page goto, on est sur la page Leclerc");
    const html = await page.content();
    const $ = cheerio.load(html);
    const steelbooks = [];

    $("ul.list-container.search-results li").each((index, element) => {
      const titleRaw = $(element).find(".product-label").text().trim();
      const image = $(element).find("img.img-fluid").attr("src") || $(element).find("img.img-fluid").attr("data-src");
      const unite = $(element).find(".price-unit").text().trim();
      const cent = $(element).find(".price-cents").text().trim();
      const symbol = $(element).find(".price-symbol").text().trim();
      const price = ` ${unite}${cent} ${symbol}`.trim();
      const relativeLink = $(element).find("a.product-card-link").attr("href");
      const link = relativeLink ? `https://www.e.leclerc${relativeLink}` : null;
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
      if (titleRaw && link && image) {
        steelbooks.push({
          title: titleRaw,
          link,
          image,
          price,
          status: "**DISPONIBLE MAINTENANT CHEZ LECLERC**",
          date : dateFormatted 
        });
      }
    });

    let cached = [];
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        cached = JSON.parse(raw || "[]");
      } catch (err) {
        console.warn("⚠️ Cache Leclerc En Stock corrompu, il sera réinitialisé.");
        cached = [];
      }
    }

    const newSteelbooks = steelbooks.filter(
      (sb) => !cached.some((old) => old.link === sb.link)
    );

    if (newSteelbooks.length > 0) {
      const updatedCache = [...newSteelbooks, ...cached].slice(0, 100);
      fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
    }

    
    return newSteelbooks;

  } catch (err) {
    console.error("❌ Erreur lors de la récupération Leclerc :", err.message);
    return [];
  }
  finally {
    await browser.close();
    console.log("Fermeture du navigateur Leclerc");
  }
};

module.exports = async (bot) => {
  const channelId = "1391156346019385384"; // ID du salon Discord
  const roleId = "1391342206849122304"; // ID du rôle à mentionner
  const channel = bot.channels.cache.get(channelId);

  if (!channel) {
    console.error("❌ Salon introuvable. Vérifie l'ID du salon.");
    return;
  }

  const newSteelbooks = await getLeclercEnStock();

  if (newSteelbooks.length === 0) {
    console.log("📭 Aucun nouveau steelbook trouvé sur Leclerc en stock.");
    return;
  }

  for (let i = 0; i < newSteelbooks.length; i++) {
    const sb = newSteelbooks[i];
    const filename = `steelbook_${i}.jpg`;
    const filepath = path.join(__dirname, filename);

    try {
      await downloadImage(sb.image, filepath);
      const attachment = new AttachmentBuilder(filepath).setName(filename);
      const messageText = `<@&${roleId}> ${sb.status}\n\n**[${sb.title}](<${sb.link}>)**`;

      await channel.send({
        content: messageText,
        files: [attachment],
        allowedMentions: { roles: [roleId] },
      });
    } catch (err) {
      console.error(`❌ Erreur pour ${sb.title} :`, err.message);
    } finally {
      fs.unlink(filepath, (err) => {
        if (err) console.warn(`⚠️ Erreur suppression ${filename}`, err.message);
      });
    }
  }

  console.log(`📦 ${newSteelbooks.length} steelbook(s) envoyé(s) dans #${channel.name}. De chez leclerc en stock.`);
};
