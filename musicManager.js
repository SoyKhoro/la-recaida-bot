const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const play = require('play-dl');

// Guarda el estado de música de cada servidor (guild) por separado
const colas = new Map();

function getCola(guildId) {
  if (!colas.has(guildId)) {
    colas.set(guildId, {
      connection: null,
      player: null,
      canciones: [],
      historial: [],
      actual: null,
      volumen: 100,
      loop: 'off', // 'off' | 'cancion' | 'cola'
      autoplay: false,
      textChannel: null,
      panelMessage: null,
    });
  }
  return colas.get(guildId);
}

function crearBotones(estado) {
  const pausado = estado.player?.state?.status === AudioPlayerStatus.Paused;
  const fila1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('musica_volDown').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('musica_back').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('musica_pausa').setEmoji(pausado ? '▶️' : '⏸️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('musica_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('musica_volUp').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
  );
  const fila2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('musica_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('musica_loop').setEmoji('🔁').setStyle(estado.loop !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('musica_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('musica_autoplay').setEmoji('🔄').setStyle(estado.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('musica_cola').setEmoji('📋').setStyle(ButtonStyle.Secondary),
  );
  return [fila1, fila2];
}

function crearEmbed(estado) {
  const cancion = estado.actual;
  if (!cancion) {
    return new EmbedBuilder().setColor('#8B5CF6').setTitle('🎵 Panel de Música').setDescription('No hay nada sonando ahora mismo.');
  }
  return new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle('🎵 Panel de Música')
    .setDescription(`[${cancion.titulo}](${cancion.url})`)
    .addFields(
      { name: '👤 Pedido por', value: `<@${cancion.pedidoPor}>`, inline: true },
      { name: '⏱️ Duración', value:
