const Discord = require("discord.js");
const { google } = require("googleapis");

/* ===================== GOOGLE SHEETS ===================== */

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";

module.exports = async (bot, interaction) => {
  if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
    let entry = interaction.options.getFocused();
    let countries = require("../data/countries.json");
    let etats = require("../data/etats.json");

    if (interaction.commandName === "zavvi") {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "pays") {
        const countryChoices = countries
          .filter(c => c.name.toLowerCase().includes(entry.toLowerCase()))
          .slice(0, 25);
        await interaction.respond(
          countryChoices.map(c => ({ name: c.name, value: c.value }))
        );
      }
    }

    if (interaction.commandName === "addcollection") {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "etat") {
        const etatChoices = etats
          .filter(e => e.name.toLowerCase().includes(entry.toLowerCase()))
          .slice(0, 25);
        await interaction.respond(
          etatChoices.map(e => ({ name: e.name, value: e.value }))
        );
      }
    }

    if (interaction.commandName === "modifcollection" || interaction.commandName === "rmcollection") {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "nom" || focusedOption.name === "numero") {
        const userId = interaction.user.id;
        const sheetName = `user_${userId}`;

        try {
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A1:H`,
          });

          const rows = res.data.values || [];

          const choices = rows
            .filter(row => row[3]) // titre existe
            .map(row => ({ name: `${row[2]} — ${row[3]}`, value: Number(row[2]) }))
            .filter(choice => choice.name.toLowerCase().includes(entry.toLowerCase()))
            .slice(0, 25);

          await interaction.respond(choices);
        } catch {
          // Si la feuille n'existe pas, on renvoie rien
          await interaction.respond([]);
        }
      }

      if (interaction.commandName === "modifcollection" && focusedOption.name === "etat") {
        const etatChoices = etats
          .filter(e => e.name.toLowerCase().includes(entry.toLowerCase()))
          .slice(0, 25);

        await interaction.respond(
          etatChoices.map(e => ({ name: e.name, value: e.value }))
        );
      }
    }
  }

  if (interaction.type === Discord.InteractionType.ApplicationCommand) {
    const command = require(`../Commandes/${interaction.commandName}`);
    command.run(bot, interaction, interaction.options);
  }
};
