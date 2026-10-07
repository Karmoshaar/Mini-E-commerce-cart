import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { config } from './config.js';
import { formatDuration, isHttpUrl, progressBar, truncate } from './util.js';

export const COLOR = 0x8b5cf6;
export const LOOP_LABELS = { off: 'مطفي', track: '🔂 الأغنية', queue: '🔁 القائمة' };

function safeTitle(title, max) {
  return escapeMarkdown(truncate(title, max)).replace(/\[/g, '(').replace(/\]/g, ')');
}

function linkOf(track) {
  const url = track.link || track.url;
  return isHttpUrl(url) ? url.replace(/\(/g, '%28').replace(/\)/g, '%29') : null;
}

export function trackLine(track, max = 60) {
  const url = linkOf(track);
  const title = safeTitle(track.title, max);
  const length = track.isLive ? 'LIVE' : formatDuration(track.duration);
  return `${url ? `[${title}](${url})` : `**${title}**`} \`${length}\``;
}

export function nowPlayingEmbed(player, { showProgress = false } = {}) {
  const track = player.current;
  const position = player.position();
  const next = player.queue[0];
  const length = track.isLive ? 'LIVE' : formatDuration(track.duration);
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor({ name: track.requester ? '🎶 يشتغل الآن' : '📻 يشتغل الآن (تشغيل تلقائي)' })
    .setTitle(truncate(track.title, 250))
    .setDescription(
      showProgress
        ? `${progressBar(position, track.duration)}\n\`${formatDuration(position)} / ${length}\``
        : `⏱️ \`${length}\`${track.author ? ` • 👤 ${escapeMarkdown(truncate(track.author, 60))}` : ''}`,
    )
    .addFields(
      { name: 'المصدر', value: track.source || '—', inline: true },
      { name: 'طلبها', value: track.requester ? `<@${track.requester.id}>` : 'تشغيل تلقائي', inline: true },
      { name: 'الصوت', value: `${player.volume}%`, inline: true },
      {
        name: 'التالي',
        value: next ? trackLine(next) : player.autoplay ? '📻 أغنية من نفس النمط (تلقائي)' : `ما في شي — ضيف بـ \`${config.prefix}p\``,
      },
    )
    .setFooter({
      text: `تكرار: ${LOOP_LABELS[player.loop]} • تشغيل تلقائي: ${player.autoplay ? 'شغال' : 'مطفي'} • بالقائمة: ${player.queue.length}`,
    });
  const url = linkOf(track);
  if (url) embed.setURL(url);
  if (isHttpUrl(track.thumbnail)) embed.setThumbnail(track.thumbnail);
  return embed;
}

const button = (id, emoji, style = ButtonStyle.Secondary) =>
  new ButtonBuilder().setCustomId(`mp:${id}`).setEmoji(emoji).setStyle(style);

export function controlRows(player) {
  const loopEmoji = player.loop === 'track' ? '🔂' : '🔁';
  return [
    new ActionRowBuilder().addComponents(
      button('prev', '⏮️'),
      button('pause', player.isPaused ? '▶️' : '⏸️', player.isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
      button('skip', '⏭️'),
      button('stop', '⏹️', ButtonStyle.Danger),
      button('queue', '📜'),
    ),
    new ActionRowBuilder().addComponents(
      button('loop', loopEmoji, player.loop === 'off' ? ButtonStyle.Secondary : ButtonStyle.Primary),
      button('autoplay', '📻', player.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary),
      button('shuffle', '🔀'),
      button('voldown', '🔉'),
      button('volup', '🔊'),
    ),
  ];
}

export const QUEUE_PAGE_SIZE = 10;

export function queueEmbed(player, page = 1) {
  const { queue } = player;
  const pages = Math.max(1, Math.ceil(queue.length / QUEUE_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * QUEUE_PAGE_SIZE;
  const lines = queue
    .slice(start, start + QUEUE_PAGE_SIZE)
    .map((track, i) => `\`${start + i + 1}.\` ${trackLine(track, 50)}${track.requester ? '' : ' 📻'}`);
  const total = queue.reduce((sum, t) => sum + (t.duration ?? 0), 0);

  const parts = [];
  if (player.current) parts.push(`**🎶 الآن:** ${trackLine(player.current)}`);
  parts.push(lines.length ? `**📜 التالي:**\n${lines.join('\n')}` : '📭 القائمة فاضية.');
  if (player.autoplay && start + QUEUE_PAGE_SIZE >= queue.length) parts.push('📻 لما تخلص القائمة بكمّل بأغاني من نفس النمط.');

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('قائمة التشغيل')
    .setDescription(parts.join('\n\n'))
    .setFooter({
      text: `صفحة ${current}/${pages} • ${queue.length} أغنية • ${formatDuration(total)} • تكرار: ${LOOP_LABELS[player.loop]}`,
    });
}

export function helpEmbed(commands, prefix) {
  const lines = commands.map((cmd) => {
    const names = cmd.keys.map((n) => `\`${prefix}${n}\``).join('  ');
    return `${names}${cmd.usage ? `  ${cmd.usage}` : ''}\n└ ${cmd.description}`;
  });
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`🎵 أوامر ${config.botName}`)
    .setDescription(
      `${lines.join('\n')}\n\n` +
        `💡 الأوامر شغالة كمان كـ Slash: \`/p\`, \`/s\`... وفيك تستعمل أزرار رسالة "يشتغل الآن".\n` +
        `🔗 بيشتغل من: YouTube, YouTube Music, SoundCloud, Spotify, Deezer, Apple Music, Bandcamp, Twitch, TikTok, ملفات mp3 وأكثر من 1000 موقع.`,
    );
}
