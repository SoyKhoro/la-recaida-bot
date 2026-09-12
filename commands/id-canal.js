const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLOR_ACENTO } = require('../theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('id-canal')
    .setDescription('Mostrar el ID de un canal')
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal a consultar (por defecto: este canal)')
        .setRequired(false)),

  async execute(interaction) {
    const canal = interaction.options.getChannel('canal') || interaction.channel;

    const embed = new EmbedBuilder()
      .setColor(COLOR_ACENTO)
      .setDescription(`📌 **${canal.name}**\nID: \`${canal.id}\``);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
