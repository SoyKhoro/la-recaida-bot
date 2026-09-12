const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reglas')
    .setDescription('Envía el mensaje de reglas del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setTitle('⚪ REGLAS DE LA RECAÍDA')
      .setDescription(
        '**(1) Respetá a los demás**\n→ Cualquier actitud discriminatoria, acoso o falta de respeto hacia otro miembro está prohibida.\n\n' +
        '**(2) Usá bien los canales**\n→ Cada canal tiene su propósito. Memes en #memes, charla en #general, links/archivos en #compartir.\n\n' +
        '**(3) Nada de Spam ni Flood**\n→ No publicites otros servers, redes o productos sin permiso.\n→ No inundes los canales con mensajes repetidos, emojis o cadenas.\n\n' +
        '**(4) Protegé tu info y la de los demás**\n→ No compartas datos personales (teléfono, contraseñas, ubicación) tuyos ni de otros. Compartir info ajena sin permiso es baneo directo.\n\n' +
        '**(5) Contenido no apto**\n→ Nada de NSFW, gore, ni contenido violento o explícito. Sanción: baneo permanente.\n\n' +
        '**(6) Nada de autopromoción por MD**\n→ No mandes invitaciones a otros servers ni redes por mensaje privado a los miembros.\n\n' +
        '**(7) Buen vocabulario**\n→ El insulto liviano entre amigos está bien, pero evitá lenguaje excesivamente ofensivo hacia otros.\n\n' +
        'Las sanciones van desde advertencia → mute → kick → ban permanente, según la gravedad.'
      );

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Reglas enviadas.', ephemeral: true });
  },
};
