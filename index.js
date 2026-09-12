require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'La Recaída 🌑' }],
    status: 'online',
  });

  // Cada 1 minuto, sumar XP a quienes estén en canales de voz (sin contar bots ni el canal AFK)
  setInterval(async () => {
    const guildId = process.env.GUILD_ID;
    if (!guildId) return;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const nivelesDb = require('./nivelesdb');
    const config = nivelesDb.getConfig();
    if (!config.xpPorMinutoVoz) return;

    const canalAfkId = guild.afkChannelId;

    guild.channels.cache.forEach(canal => {
      if (canal.type !== 2) return; // solo canales de voz
      if (canal.id === canalAfkId) return;

      canal.members.forEach(async member => {
        if (member.user.bot) return;
        const resultado = nivelesDb.agregarXP(member.id, config.xpPorMinutoVoz);
        if (resultado.subioDeNivel) await anunciarSubidaDeNivel(member, resultado.nuevoNivel);
      });
    });
  }, 60 * 1000);
});

async function anunciarSubidaDeNivel(member, nuevoNivel) {
  const nivelesDb = require('./nivelesdb');
  const config = nivelesDb.getConfig();
  const rolId = config.recompensasPorNivel[nuevoNivel];

  if (rolId) {
    try {
      await member.roles.add(rolId);
    } catch (err) {
      console.error(`Error asignando rol de nivel ${nuevoNivel}:`, err);
    }
  }
}

const construirEmbedLevelUp = require('./levelup-embed');

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const nivelesDb = require('./nivelesdb');
  const config = nivelesDb.getConfig();
  const usuario = nivelesDb.getUsuario(message.author.id);

  const ahora = Date.now();
  const cooldownMs = config.cooldownMensajeSegundos * 1000;
  if (ahora - (usuario.ultimoMensajeXP || 0) < cooldownMs) return;

  const xpGanada = Math.floor(Math.random() * (config.xpMensajeMax - config.xpMensajeMin + 1)) + config.xpMensajeMin;
  const resultado = nivelesDb.agregarXP(message.author.id, xpGanada);
  nivelesDb.guardarUsuario(message.author.id, { ultimoMensajeXP: ahora });

  if (resultado.subioDeNivel) {
    try {
      const member = await message.guild.members.fetch(message.author.id);
      await anunciarSubidaDeNivel(member, resultado.nuevoNivel);
      const embed = construirEmbedLevelUp(member, resultado.nuevoNivel);
      await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
    } catch (err) {
      console.error('Error procesando subida de nivel:', err);
    }
  }
});

client.on('guildMemberAdd', async member => {
     // Asignar los roles automáticos (independiente de la bienvenida)
    const rolesAutoIds = (process.env.AUTO_ROLE_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
    for (const rolId of rolesAutoIds) {
      try {
        await member.roles.add(rolId);
      } catch (err) {
        console.error('Error asignando el rol automático:', rolId, err);
      }
    }

  // Mandar el mensaje de bienvenida
  const canalId = process.env.WELCOME_CHANNEL_ID;
  const imagenUrl = process.env.WELCOME_IMAGE_URL;

  if (!canalId) return; // bienvenida no configurada, no hace nada

  try {
    const canal = await member.guild.channels.fetch(canalId);
    if (!canal || !canal.isTextBased()) return;

    const { EmbedBuilder } = require('discord.js');
    const { COLOR_PRINCIPAL } = require('./theme');

    const fechaIngreso = new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    const descripcion =
      `¡Bienvenid@! <@${member.id}>\n\n` +
      `**¡Bienvenid@!** 🎉\n` +
      `Esperamos que disfrutes tu estadía en **La Recaída**.\n` +
      `Eres nuestro usuario: **${member.guild.memberCount}**\n` +
      `Fecha de ingreso: ${fechaIngreso}`;

    const embed = new EmbedBuilder()
      .setColor(COLOR_PRINCIPAL)
      .setThumbnail(member.displayAvatarURL())
      .setDescription(descripcion);

    if (imagenUrl) embed.setImage(imagenUrl);

    await canal.send({ content: `<@${member.id}>`, embeds: [embed] });
  } catch (err) {
    console.error('Error enviando bienvenida:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId.startsWith('rolbtn_')) {
    const rolId = interaction.customId.replace('rolbtn_', '');
    try {
      const tieneRol = interaction.member.roles.cache.has(rolId);
      if (tieneRol) {
        await interaction.member.roles.remove(rolId);
        await interaction.reply({ content: `➖ Te saqué el rol <@&${rolId}>.`, ephemeral: true });
      } else {
        await interaction.member.roles.add(rolId);
        await interaction.reply({ content: `➕ Te di el rol <@&${rolId}>.`, ephemeral: true });
      }
    } catch (err) {
      console.error('Error asignando/quitando rol por botón:', err);
      await interaction.reply({ content: '❌ No pude darte/sacarte ese rol. Avisale a un admin (puede ser un problema de orden de roles).', ephemeral: true });
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === 'ticket_abrir') {
    const ticketsDb = require('./ticketsdb');
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
    const { COLOR_PRINCIPAL } = require('./theme');

    const config = ticketsDb.getConfig();
    if (!config.staffRoleId) {
      return interaction.reply({ content: '❌ El sistema de tickets todavía no está configurado. Avisale a un admin (/ticket-admin config).', ephemeral: true });
    }

    const ticketExistente = ticketsDb.getTicketDeUsuario(interaction.user.id);
    if (ticketExistente && interaction.guild.channels.cache.has(ticketExistente)) {
      return interaction.reply({ content: `❌ Ya tenés un ticket abierto: <#${ticketExistente}>`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const numero = ticketsDb.siguienteNumero();
      const nombreCanal = `ticket-${numero}-${interaction.user.username}`.toLowerCase().slice(0, 90);

      const opcionesCanal = {
        name: nombreCanal,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          { id: config.staffRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        ],
      };
      const esVip = process.env.VIP_ROLE_ID && interaction.member.roles.cache.has(process.env.VIP_ROLE_ID);
      const categoriaElegida = (esVip && config.categoriaVipId) ? config.categoriaVipId : config.categoriaId;
      if (categoriaElegida) opcionesCanal.parent = categoriaElegida;

      const canal = await interaction.guild.channels.create(opcionesCanal);
      ticketsDb.registrarTicket(interaction.user.id, canal.id);

      const embed = new EmbedBuilder()
        .setColor(COLOR_PRINCIPAL)
        .setTitle(`🎫 Ticket #${numero}${esVip ? ' 👑 VIP' : ''}`)
        .setDescription(`Hola <@${interaction.user.id}>, contanos en qué te podemos ayudar. El staff (<@&${config.staffRoleId}>) va a responder acá.`);

      const botonCerrar = new ButtonBuilder()
        .setCustomId('ticket_cerrar')
        .setLabel('Cerrar Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const fila = new ActionRowBuilder().addComponents(botonCerrar);

      await canal.send({ content: `<@${interaction.user.id}> <@&${config.staffRoleId}>`, embeds: [embed], components: [fila] });
      await interaction.editReply({ content: `✅ Se abrió tu ticket: <#${canal.id}>` });
    } catch (err) {
      console.error('Error creando ticket:', err);
      await interaction.editReply({ content: '❌ No pude crear el ticket. Puede ser un problema de permisos del bot.' });
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === 'ticket_cerrar') {
    const ticketsDb = require('./ticketsdb');

    await interaction.reply({ content: '🔒 Cerrando el ticket en 5 segundos...' });
    ticketsDb.cerrarTicketPorCanal(interaction.channel.id);

    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (err) {
        console.error('Error borrando canal de ticket:', err);
      }
    }, 5000);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error ejecutando /${interaction.commandName}:`, error);
    const respuesta = { content: '❌ Hubo un error al ejecutar el comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(respuesta);
    } else {
      await interaction.reply(respuesta);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
