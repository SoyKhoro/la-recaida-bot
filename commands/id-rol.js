const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLOR_ACENTO } = require('../theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('id-rol')
    .setDescription('Mostrar el ID de un rol')
    .addRoleOption(opt =>
      opt.setName('rol')
        .setDescription('Rol a consultar')
        .setRequired(true)),

  async execute(interaction) {
    const rol = interaction.options.getRole('rol');

    const embed = new EmbedBuilder()
      .setColor(COLOR_ACENTO)
      .setDescription(`🏷️ **${rol.name}**\nID: \`${rol.id}\``);

   await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
