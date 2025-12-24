const Discord = require("discord.js");

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
    }

    if (interaction.type === Discord.InteractionType.ApplicationCommand) { 
        let command = require(`../Commandes/${interaction.commandName}`);
        command.run(bot, interaction, interaction.options);
    }
};
