const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción de YouTube o Spotify')
    .addStringOption(opt =>
      opt.setName('cancion')
        .setDescription('Nombre, link de YouTube o link de Spotify')
        .setRequired(true)),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Tenés que estar en un canal de voz para usar este comando.', ephemeral: true });
    }

    const query = interaction.options.getString('cancion');
    await interaction.deferReply();

    try {
      const cancion = await musicManager.agregarCancion(voiceChannel, interaction.channel, query, interaction.user.id);
      const estado = musicManager.getCola(interaction.guild.id);

      if (!estado.panelMessage) {
        const panel = await interaction.channel.send({
          embeds: [musicManager.crearEmbed(estado)],
          components: musicManager.crearBotones(estado),
        });
        estado.panelMessage = panel;
      } else {
        await musicManager.actualizarPanel(interaction.guild.id);
      }

      await interaction.editReply({ content: `✅ Agregada a la cola: **${cancion.titulo}**` });
    } catch (err) {
      console.error('Error en /play:', err);
      await interaction.editReply({ content: `❌ Error: ${err.message}` });
    }
  },
};
