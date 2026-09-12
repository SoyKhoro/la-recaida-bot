const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLOR_ACENTO } = require('../theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('id-usuario')
    .setDescription('Mostrar el ID de un usuario')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuario a consultar (por defecto: vos)')
        .setRequired(false)),

  async execute(interaction) {
    const usuario = interaction.options.getUser('usuario') || interaction.user;

    const embed = new EmbedBuilder()
      .setColor(COLOR_ACENTO)
      .setThumbnail(usuario.displayAvatarURL())
      .setDescription(`👤 **${usuario.username}**\nID: \`${usuario.id}\``);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
