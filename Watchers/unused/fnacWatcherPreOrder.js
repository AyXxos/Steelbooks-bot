const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { AttachmentBuilder } = require("discord.js");

const CACHE_FILE = path.join(__dirname, "../data/caches/cacheFnacPreOrder.json");

const downloadImageWithPuppeteer = async (page, imageUrl, filepath) => {
  try {
    const viewSource = await page.goto(imageUrl, { timeout: 10000, waitUntil: "networkidle2" });
    const buffer = await viewSource.buffer();
    fs.writeFileSync(filepath, buffer);
  } catch (error) {
    throw new Error(`Erreur lors du téléchargement de l'image ${imageUrl} : ${error.message}`);
  }
};

const getFnacWatcherPreOrder = async () => {
  const url = "https://www.fnac.com/SearchResult/ResultList.aspx?Search=steelbooks&sft=1&sa=1";

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const steelbooks = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".f-search__main"));
      return items.map((el) => {
        const title = el.querySelector("a.Article-title")?.textContent?.trim() || null;
        let image = el.querySelector(".Article-itemVisualImg")?.getAttribute("src") || null;
        const price = el.querySelector(".userPrice")?.textContent?.trim() || null;
        const link = el.querySelector("a.Article-title")?.getAttribute("href") || null;
        const actionText = el.querySelector(".ff-button")?.textContent?.toLowerCase() || "";
        const now = new Date();
        const date = now.toLocaleDateString('fr-FR');
        const heure = now.getHours();
        const minutes = now.getMinutes();
        const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
        const status = actionText.includes("précommander")
          ? "**PRE-COMMANDE MAINTENANT CHEZ FNAC**"
          : "**DISPONIBLE MAINTENANT CHEZ FNAC**";

        if (!title?.toLowerCase().includes("steelbook") || !link || !price || !image) return null;
        if (image.startsWith("/")) image = "https://www.fnac.com" + image;

        return { title, link, image, price, status, date : dateFormatted  };
      }).filter(Boolean);
    });

    let cached = [];
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        cached = JSON.parse(raw || "[]");
      } catch {
        console.warn("⚠️ Cache Fnac corrompu, il sera réinitialisé.");
      }
    }

    const newSteelbooks = steelbooks.filter((sb) => !cached.some((old) => old.link === sb.link));

    if (newSteelbooks.length > 0) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(steelbooks, null, 2), "utf-8");
    }

    await browser.close();
    return { steelbooks: newSteelbooks, browser };
  } catch (error) {
    await browser.close();
    console.error("❌ Erreur avec Puppeteer :", error.message);
    return { steelbooks: [] };
  }
};

module.exports = async (bot) => {
  const channelId = "1391156346019385384";
  const roleId = "1391342206849122304";
  const channel = bot.channels.cache.get(channelId);

  if (!channel) {
    console.error("❌ Salon introuvable. Vérifie l'ID du salon.");
    return;
  }

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

  const { steelbooks: newSteelbooks } = await getFnacWatcherPreOrder();

  if (newSteelbooks.length === 0) {
    console.log("📭 Aucun nouveau steelbook trouvé sur FNAC.");
    await browser.close();
    return;
  }

  for (let i = 0; i < newSteelbooks.length; i++) {
    const sb = newSteelbooks[i];
    const filename = `steelbook_${i}.jpg`;
    const filepath = path.join(__dirname, filename);

    try {
      await downloadImageWithPuppeteer(page, sb.image, filepath);
      const attachment = new AttachmentBuilder(filepath).setName(filename);

      const messageText = `<@&${roleId}> ${sb.status}\n\n[${sb.title}](<${sb.link}>)`;

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

  await browser.close();
  console.log(`📦 ${newSteelbooks.length} steelbook(s) envoyé(s) individuellement dans #${channel.name}. De Chez la FNAC.`);
};
