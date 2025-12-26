const Discord = require("discord.js");
const { google } = require("googleapis");

/* =======================
   GOOGLE SHEETS
======================= */

const auth = new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1vYup3J8eCphhY48HjPWI1LK7YmLbfRnbDkrr08TF7G4";
const SHEET_NAME = "Feuille 1";

module.exports = async (bot, interaction) => {
    if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
        let entry = interaction.options.getFocused();
        let countries = require("../data/countries.json"); 
        let etats = require("../data/etats.json");
        
        if (interaction.commandName === "zavvi") {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === "pays") {
                let countryChoices = countries.filter(country => country.name.toLowerCase().includes(entry.toLowerCase())).slice(0, 25);
                await interaction.respond(countryChoices.map(country => ({ name: country.name, value: country.value })));
            }
        }

        if (interaction.commandName === "addcollection") {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === "etat") {
                let etatChoices = etats.filter(etat => etat.name.toLowerCase().includes(entry.toLowerCase())).slice(0, 25);
                await interaction.respond(etatChoices.map(etat => ({ name: etat.name, value: etat.value })));
            }
        }

        if (interaction.commandName === "modifcollection") {
            const focusedOption = interaction.options.getFocused(true);
            if (focusedOption.name === "nom") {
                const userId = interaction.user.id;
                const res = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `'${SHEET_NAME}'!A:H`,
                });

                const rows = res.data.values || [];

                const choices = rows
                    .slice(1)
                    .filter(row => row[0] === userId && row[3])
                    .map(row => ({
                        name: row[3],
                        value: Number(row[2]),
                    }))
                    .filter(choice =>
                        choice.name.toLowerCase().includes(entry.toLowerCase())
                    )
                    .slice(0, 25);

                await interaction.respond(choices);
            }
            if (focusedOption.name === "etat") {
                let etatChoices = etats.filter(etat => etat.name.toLowerCase().includes(entry.toLowerCase())).slice(0, 25);
                await interaction.respond(etatChoices.map(etat => ({ name: etat.name, value: etat.value })));
            }
        }
    }

    if (interaction.type === Discord.InteractionType.ApplicationCommand) { 
        let command = require(`../Commandes/${interaction.commandName}`);
        command.run(bot, interaction, interaction.options);
    }
};
