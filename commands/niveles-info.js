const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('niveles-info')
    .setDescription('Envía la info del Pase Doomsday y sus recompensas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const embedImagen = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setImage('https://i.imgur.com/dDxiQkP.png');

    const embedTexto = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setDescription(
        '☆ A la hora de subir de nivel comprando con Lunas recibirás roles y Lunas como recompensa :3\n\n' +
        '**Niveles:**\n\n' +
        `<:1526649755302756472:1548173621833498714> Nivel 9 → <@&1537193999528370206>\n\n` +
        `<:1528937168813293709:1548173574387277834> Nivel 12 → 250 🌑 Lunas\n\n` +
        `<:1526649755302756472:1548173621833498714> Nivel 15 → <@&1537193821513846825>\n\n` +
        `<:1528937168813293709:1548173574387277834> Nivel 18 → 500 🌑 Lunas\n\n` +
        `<:1526649755302756472:1548173621833498714> Nivel 21 → <@&1537194745330147461>\n\n` +
        `<:1528937168813293709:1548173574387277834> Nivel 24 → 1.000 🌑 Lunas\n\n` +
        `<:1526649755302756472:1548173621833498714> Nivel 27 → <@&1537194632922796105>\n\n` +
        `<:1528937168813293709:1548173574387277834> Nivel 30 → 1.500 🌑 Lunas\n\n` +
        `<:1526649755302756472:1548173621833498714> Nivel 33 → <@&1537193171958759434>\n\n` +
        `<:1528937168813293709:1548173574387277834> Nivel 36 → 2.000 🌑 Lunas\n\n` +
        `<:1526649755302756472:1548173621833498714> Nivel 40 → <@&1538443039767531590>`
      );

    await interaction.channel.send({ embeds: [embedImagen, embedTexto] });
    await interaction.reply({ content: '✅ Info de niveles enviada.', ephemeral: true });
  },
};
