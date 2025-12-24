const Discord = require("discord.js");
const fetch = require("node-fetch");
const config = require("../config.js");
const tools = require("../tools.js");


module.exports = {
    name: "infosfilm",
    description: "Donne des informations sur un film !",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    options:[
    {
        type :"string",
        name :'film',
        description: "Film à rechercher",
        required: true,
        autocomplete: false,
    }
  ],

    async run(bot, message, args) {
        const logBotChannelId = '1394058036754255932';
        const logChannel = bot.channels.cache.get(logBotChannelId);

        const filmTitle = args.getString("film");
        if (!filmTitle) {
            return message.reply("❌ Tu dois spécifier un titre de film !");
        }

        const apiKey = config.apiKey;
        const query = encodeURIComponent(filmTitle);

        try {
            // Recherche du film
            const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=fr-FR`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();

            if (!searchData.results || searchData.results.length === 0) {
                return message.reply("❌ Aucun film trouvé avec ce nom !");
            }

            const movie = searchData.results[0];
            const movieId = movie.id;

            // Détails du film
            const [detailsRes, creditsRes, videosRes] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=fr-FR`),
                fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}&language=fr-FR`),
                fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=fr-FR`)
            ]);

            const details = await detailsRes.json();
            const credits = await creditsRes.json();
            const videos = await videosRes.json();

            const director = credits.crew.find(p => p.job === "Director");
            const trailer = videos.results.find(v => v.type === "Trailer" && v.site === "YouTube");

            const color = tools.randomColor();

            // Création de l'embed
            const embed = new Discord.EmbedBuilder()
                .setColor(color)
                .setTitle(movie.title)
                .setDescription(details.overview || "Pas de description disponible.")
                .setThumbnail(`https://image.tmdb.org/t/p/w500${movie.poster_path}`)
                .addFields(
                    { name: "🎬 Réalisateur", value: director ? director.name : "Inconnu", inline: true },
                    { name: "🗓️ Sortie", value: movie.release_date || "Inconnue", inline: true },
                    { name: "⭐ Note", value: `${movie.vote_average}/10`, inline: true },
                    { name: "🎞️ Genres", value: details.genres.map(g => g.name).join(", ") || "Aucun", inline: false }
                )
                .setFooter({ text: "Données fournies par The Movie Database (TMDb)" });

            if (trailer) {
                embed.addFields({ name: "📺 Bande-annonce", value: `[Lien YouTube](https://www.youtube.com/watch?v=${trailer.key})` });
            }

            await message.reply({ embeds: [embed] });

            // Log de l'utilisation
            const user = bot.users.cache.get(message.user?.id || message.author?.id);
            if (logChannel && user) {
                logChannel.send(`🎥 Commande \`infosfilm\` utilisée par **${user.tag}** pour **${filmTitle}**`);
            }

        } catch (error) {
            console.error(error);
            message.reply("❌ Une erreur est survenue lors de la récupération des infos du film.");
        }
    }
};
