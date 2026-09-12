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
      { name: '⏱️ Duración', value: cancion.duracion || 'En vivo', inline: true },
      { name: '🎤 Autor', value: cancion.autor || 'Desconocido', inline: true },
    )
    .setThumbnail(cancion.miniatura || null)
    .setFooter({ text: `Volumen: ${estado.volumen}% · Loop: ${estado.loop === 'off' ? 'Apagado' : estado.loop === 'cancion' ? 'Canción' : 'Cola'} · Autoplay: ${estado.autoplay ? 'Activado' : 'Apagado'}` });
}

async function actualizarPanel(guildId) {
  const estado = getCola(guildId);
  if (!estado.panelMessage) return;
  try {
    await estado.panelMessage.edit({ embeds: [crearEmbed(estado)], components: crearBotones(estado) });
  } catch (err) {
    console.error('Error actualizando panel de música:', err);
  }
}

function formatearResultado(video, pedidoPor) {
  return {
    titulo: video.title,
    url: video.url,
    autor: video.channel?.name,
    duracion: video.durationRaw,
    miniatura: video.thumbnails?.[0]?.url,
    pedidoPor,
  };
}

async function resolverCancion(query, pedidoPor) {
  if (play.sp_validate(query) === 'track') {
    const info = await play.spotify(query);
    const busqueda = `${info.name} ${info.artists.map(a => a.name).join(' ')}`;
    const resultados = await play.search(busqueda, { limit: 1, source: { youtube: 'video' } });
    if (!resultados.length) throw new Error('No se encontró en YouTube la canción de Spotify.');
    return formatearResultado(resultados[0], pedidoPor);
  }

  const tipo = play.yt_validate(query);
  if (tipo === 'video') {
    const info = await play.video_basic_info(query);
    return formatearResultado(info.video_details, pedidoPor);
  }

  const resultados = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  if (!resultados.length) throw new Error('No encontré ningún resultado para esa búsqueda.');
  return formatearResultado(resultados[0], pedidoPor);
}

async function conectar(voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });
  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  return connection;
}

async function reproducirSiguiente(guildId) {
  const estado = getCola(guildId);

  if (estado.loop === 'cancion' && estado.actual) {
    estado.canciones.unshift(estado.actual);
  } else if (estado.actual) {
    estado.historial.push(estado.actual);
    if (estado.loop === 'cola') estado.canciones.push(estado.actual);
  }

  const siguiente = estado.canciones.shift();

  if (!siguiente) {
    if (estado.autoplay && estado.actual) {
      try {
        const resultados = await play.search(estado.actual.titulo, { limit: 5, source: { youtube: 'video' } });
        const opciones = resultados.filter(r => r.url !== estado.actual.url);
        if (opciones.length) {
          estado.canciones.push(formatearResultado(opciones[0], estado.actual.pedidoPor));
          return reproducirSiguiente(guildId);
        }
      } catch (err) {
        console.error('Error en autoplay:', err);
      }
    }
    estado.actual = null;
    await actualizarPanel(guildId);
    return;
  }

  estado.actual = siguiente;
  const streamInfo = await play.stream(siguiente.url);
  const resource = createAudioResource(streamInfo.stream, { inputType: streamInfo.type, inlineVolume: true });
  resource.volume.setVolume(estado.volumen / 100);
  estado.player.play(resource);
  await actualizarPanel(guildId);
}

async function agregarCancion(voiceChannel, textChannel, query, pedidoPor) {
  const guildId = voiceChannel.guild.id;
  const estado = getCola(guildId);
  estado.textChannel = textChannel;

  const cancion = await resolverCancion(query, pedidoPor);

  if (!estado.connection) {
    estado.connection = await conectar(voiceChannel);
    estado.player = createAudioPlayer();
    estado.connection.subscribe(estado.player);

    estado.player.on(AudioPlayerStatus.Idle, () => reproducirSiguiente(guildId));
    estado.player.on('error', (err) => {
      console.error('Error en el reproductor:', err);
      reproducirSiguiente(guildId);
    });
  }

  estado.canciones.push(cancion);
  if (!estado.actual) await reproducirSiguiente(guildId);

  return cancion;
}

function pausarOReanudar(guildId) {
  const estado = getCola(guildId);
  if (!estado.player) return null;
  if (estado.player.state.status === AudioPlayerStatus.Paused) {
    estado.player.unpause();
    return 'resumido';
  } else {
    estado.player.pause();
    return 'pausado';
  }
}

function saltar(guildId) {
  const estado = getCola(guildId);
  if (!estado.player) return false;
  estado.player.stop();
  return true;
}

function anterior(guildId) {
  const estado = getCola(guildId);
  if (!estado.historial.length) return false;
  const previa = estado.historial.pop();
  if (estado.actual) estado.canciones.unshift(estado.actual);
  estado.canciones.unshift(previa);
  estado.player.stop();
  return true;
}

function detener(guildId) {
  const estado = getCola(guildId);
  estado.canciones = [];
  estado.historial = [];
  estado.actual = null;
  estado.autoplay = false;
  if (estado.player) estado.player.stop();
  if (estado.connection) estado.connection.destroy();
  colas.delete(guildId);
}

function cambiarVolumen(guildId, delta) {
  const estado = getCola(guildId);
  estado.volumen = Math.max(0, Math.min(150, estado.volumen + delta));
  if (estado.player?.state?.resource?.volume) {
    estado.player.state.resource.volume.setVolume(estado.volumen / 100);
  }
  return estado.volumen;
}

function alternarLoop(guildId) {
  const estado = getCola(guildId);
  estado.loop = estado.loop === 'off' ? 'cola' : estado.loop === 'cola' ? 'cancion' : 'off';
  return estado.loop;
}

function alternarAutoplay(guildId) {
  const estado = getCola(guildId);
  estado.autoplay = !estado.autoplay;
  return estado.autoplay;
}

function mezclar(guildId) {
  const estado = getCola(guildId);
  for (let i = estado.canciones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [estado.canciones[i], estado.canciones[j]] = [estado.canciones[j], estado.canciones[i]];
  }
}

module.exports = {
  getCola,
  crearEmbed,
  crearBotones,
  actualizarPanel,
  agregarCancion,
  pausarOReanudar,
  saltar,
  anterior,
  detener,
  cambiarVolumen,
  alternarLoop,
  alternarAutoplay,
  mezclar,
};
