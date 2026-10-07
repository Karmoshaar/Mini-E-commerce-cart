import { ChannelType } from 'discord.js';
import { config } from './config.js';
import { UserError } from './errors.js';
import { resolve } from './media/resolve.js';
import { controlRows, helpEmbed, LOOP_LABELS, nowPlayingEmbed, queueEmbed, trackLine } from './ui.js';
import { formatDuration, parseTime, truncate } from './util.js';

const LOOP_WORDS = {
  off: 'off', none: 'off', 0: 'off', مطفي: 'off', لا: 'off',
  song: 'track', track: 'track', one: 'track', s: 'track', t: 'track', 1: 'track', اغنية: 'track',
  queue: 'queue', all: 'queue', q: 'queue', a: 'queue', 2: 'queue', قائمة: 'queue', الكل: 'queue',
};

/** The user must be in the same voice channel as the bot. */
export function requireListener(member, player) {
  if (!player?.voiceChannelId) throw new UserError('🔇 أنا مش موجود بأي روم صوتي.');
  if (member.voice?.channelId !== player.voiceChannelId) {
    throw new UserError(`🎧 لازم تكون معي بـ <#${player.voiceChannelId}>.`);
  }
}

async function joinMember(ctx, manager) {
  const channel = ctx.member.voice?.channel;
  if (!channel) throw new UserError('🔇 فوت على روم صوتي أول.');
  const player = manager.obtain(ctx.guild);
  const botChannelId = player.voiceChannelId;
  if (botChannelId && botChannelId !== channel.id && player.current) {
    const listeners = ctx.guild.channels.cache.get(botChannelId)?.members.filter((m) => !m.user.bot).size ?? 0;
    if (listeners > 0) throw new UserError(`🎧 أنا شغال بـ <#${botChannelId}> هلق، تعال لعندي.`);
  }
  if (!channel.joinable) throw new UserError('🔒 ما عندي صلاحية أدخل هذا الروم.');
  if (channel.type === ChannelType.GuildVoice && !channel.speakable) {
    throw new UserError('🔇 ما عندي صلاحية **Speak** بهذا الروم.');
  }
  player.textChannel = ctx.channel;
  await player.join(channel);
  return player;
}

function parsePositiveInt(text, fallback) {
  if (!text) return fallback;
  const value = Number.parseInt(text, 10);
  if (!Number.isInteger(value) || value < 1) throw new UserError('🔢 اكتب رقم صحيح.');
  return value;
}

export function createCommands(manager) {
  async function play(ctx, { next = false } = {}) {
    const input = ctx.arg || ctx.attachment;
    if (!input) throw new UserError(`🎵 اكتب رابط أو اسم أغنية: \`${config.prefix}p <رابط أو اسم>\``);
    // Join and look up the link at the same time.
    const [player, result] = await Promise.all([joinMember(ctx, manager), resolve(input)]);
    const requester = { id: ctx.user.id, name: ctx.member.displayName };
    for (const track of result.tracks) track.requester = requester;

    const startsNow = !player.current && !player.advancing && !player.queue.length;
    const added = player.add(result.tracks, { next });
    if (result.playlist) {
      const skipped = result.tracks.length - added;
      return ctx.reply(
        `📃 أضفت **${added}** أغنية من **${truncate(result.playlist.title, 80)}**` +
          (skipped ? ` (القائمة امتلأت، ما انضاف ${skipped}).` : '.'),
      );
    }
    const [track] = result.tracks;
    if (startsNow) return ctx.ack('🎶', `🎶 جاري تشغيل ${trackLine(track)}`);
    const position = next ? 1 : player.queue.length;
    return ctx.reply(`✅ انضافت للقائمة **#${position}**: ${trackLine(track)}`);
  }

  const commands = [
    {
      name: 'play',
      aliases: ['p', 'شغل'],
      usage: '<رابط أو اسم>',
      description: 'شغّل أي رابط (يوتيوب، سبوتيفاي، ساوندكلاود...) أو ابحث باسم الأغنية',
      arg: 'الرابط أو اسم الأغنية',
      file: true,
      run: (ctx) => play(ctx),
    },
    {
      name: 'playnext',
      aliases: ['pn'],
      usage: '<رابط أو اسم>',
      description: 'متل p بس بتشتغل بعد الأغنية الحالية مباشرة',
      arg: 'الرابط أو اسم الأغنية',
      file: true,
      run: (ctx) => play(ctx, { next: true }),
    },
    {
      name: 'skip',
      aliases: ['s', 'n', 'تخطي'],
      usage: '[عدد]',
      description: 'تخطّى الأغنية (أو عدة أغاني)',
      arg: 'كم أغنية بدك تتخطى',
      optionalArg: true,
      voice: true,
      run(ctx, player) {
        const skipped = player.skip(parsePositiveInt(ctx.arg, 1));
        return ctx.ack('⏭️', skipped ? `⏭️ تخطيت **${truncate(skipped.title, 80)}**` : '⏭️ تمام');
      },
    },
    {
      name: 'back',
      aliases: ['b', 'prev'],
      description: 'رجّع الأغنية اللي قبل',
      voice: true,
      run(ctx, player) {
        const previous = player.back();
        return ctx.ack('⏮️', `⏮️ رجعت لـ **${truncate(previous.title, 80)}**`);
      },
    },
    {
      name: 'pause',
      aliases: ['ps'],
      description: 'إيقاف مؤقت / كمّل (نفس الأمر)',
      voice: true,
      run(ctx, player) {
        const paused = player.togglePause();
        return ctx.ack(paused ? '⏸️' : '▶️', paused ? '⏸️ وقفت مؤقتاً' : '▶️ كمّلت');
      },
    },
    {
      name: 'resume',
      aliases: ['r'],
      description: 'كمّل التشغيل',
      voice: true,
      run(ctx, player) {
        player.resume();
        return ctx.ack('▶️', '▶️ كمّلت');
      },
    },
    {
      name: 'stop',
      aliases: ['st', 'وقف'],
      description: 'وقّف التشغيل وفضّي القائمة',
      voice: true,
      run(ctx, player) {
        player.stop();
        return ctx.ack('⏹️', '⏹️ وقفت وفضيت القائمة.');
      },
    },
    {
      name: 'nowplaying',
      aliases: ['np'],
      description: 'شو عم يشتغل هلق',
      run(ctx, player) {
        if (!player?.current) throw new UserError('🔇 ما في شي يشتغل.');
        return ctx.reply({ embeds: [nowPlayingEmbed(player, { showProgress: true })], components: controlRows(player) });
      },
    },
    {
      name: 'queue',
      aliases: ['q', 'قائمة'],
      usage: '[صفحة]',
      description: 'اعرض قائمة التشغيل',
      arg: 'رقم الصفحة',
      optionalArg: true,
      run(ctx, player) {
        if (!player || (!player.current && !player.queue.length)) throw new UserError('📭 القائمة فاضية.');
        return ctx.reply({ embeds: [queueEmbed(player, parsePositiveInt(ctx.arg, 1))] });
      },
    },
    {
      name: 'autoplay',
      aliases: ['ap'],
      description: 'شغّل/طفّي التشغيل التلقائي (لما تخلص الأغاني بكمّل بأغاني من نفس النمط)',
      voice: true,
      run(ctx, player) {
        const on = player.toggleAutoplay();
        if (on && !player.current && !player.queue.length && player.history.length) player.advance();
        return ctx.reply(
          on
            ? '📻 التشغيل التلقائي **شغال** — لما تخلص القائمة بشغّل أغاني من نفس النمط.'
            : '📻 التشغيل التلقائي **مطفي**.',
        );
      },
    },
    {
      name: 'loop',
      aliases: ['l', 'تكرار'],
      usage: '[off | song | queue]',
      description: 'التكرار: مطفي ← الأغنية ← القائمة',
      arg: 'off / song / queue',
      optionalArg: true,
      voice: true,
      run(ctx, player) {
        let mode;
        if (ctx.arg) {
          mode = LOOP_WORDS[ctx.arg.toLowerCase()];
          if (!mode) throw new UserError('🔁 اختار: `off` أو `song` أو `queue`.');
          player.setLoop(mode);
        } else {
          mode = player.cycleLoop();
        }
        return ctx.reply(`🔁 التكرار: **${LOOP_LABELS[mode]}**`);
      },
    },
    {
      name: 'volume',
      aliases: ['v', 'vol', 'صوت'],
      usage: '[0-200]',
      description: 'اعرض أو غيّر الصوت',
      arg: 'من 0 لـ 200',
      optionalArg: true,
      voice: true,
      run(ctx, player) {
        if (!ctx.arg) return ctx.reply(`🔊 الصوت: **${player.volume}%**`);
        const value = Number.parseInt(ctx.arg, 10);
        if (!Number.isInteger(value) || value < 0 || value > 200) throw new UserError('🔊 اكتب رقم من 0 لـ 200.');
        return ctx.reply(`🔊 الصوت: **${player.setVolume(value)}%**`);
      },
    },
    {
      name: 'shuffle',
      aliases: ['sh'],
      description: 'اخلط القائمة',
      voice: true,
      run(ctx, player) {
        player.shuffle();
        return ctx.ack('🔀', '🔀 خلطت القائمة.');
      },
    },
    {
      name: 'remove',
      aliases: ['rm'],
      usage: '<رقم>',
      description: 'شيل أغنية من القائمة برقمها',
      arg: 'رقم الأغنية بالقائمة',
      voice: true,
      run(ctx, player) {
        const removed = player.remove(parsePositiveInt(ctx.arg, NaN));
        return ctx.reply(`🗑️ شلت **${truncate(removed.title, 80)}**`);
      },
    },
    {
      name: 'clear',
      aliases: ['c'],
      description: 'فضّي القائمة (الأغنية الحالية بتكمّل)',
      voice: true,
      run(ctx, player) {
        return ctx.reply(`🧹 فضيت القائمة (${player.clear()} أغنية).`);
      },
    },
    {
      name: 'seek',
      aliases: ['sk'],
      usage: '<1:30>',
      description: 'روح لوقت معيّن بالأغنية',
      arg: 'الوقت، مثلاً 1:30 أو 90',
      voice: true,
      run(ctx, player) {
        const seconds = parseTime(ctx.arg);
        if (seconds === null) throw new UserError('⏩ اكتب الوقت متل `1:30` أو `90`.');
        player.seek(seconds);
        return ctx.ack('⏩', `⏩ رحت لـ \`${formatDuration(seconds)}\``);
      },
    },
    {
      name: 'join',
      aliases: ['j'],
      description: 'فوت على رومك الصوتي',
      async run(ctx) {
        const player = await joinMember(ctx, manager);
        return ctx.ack('👋', `👋 دخلت <#${player.voiceChannelId ?? ctx.member.voice.channelId}>`);
      },
    },
    {
      name: 'leave',
      aliases: ['dc', 'اطلع'],
      description: 'اطلع من الروم الصوتي',
      voice: true,
      run(ctx, player) {
        player.destroy();
        return ctx.ack('👋', '👋 طلعت.');
      },
    },
    {
      name: 'help',
      aliases: ['h', 'مساعدة'],
      description: 'قائمة الأوامر',
      run(ctx) {
        return ctx.reply({ embeds: [helpEmbed(commands, config.prefix)] });
      },
    },
  ];

  const byName = new Map();
  for (const command of commands) {
    for (const name of [command.name, ...command.aliases]) {
      if (byName.has(name)) throw new Error(`Duplicate command name: ${name}`);
      byName.set(name, command);
    }
  }

  return { commands, find: (name) => byName.get(name?.toLowerCase()) ?? null };
}

/** Slash command names: the short alias (e.g. /p, /s, /q). */
export const slashName = (command) => command.aliases.find((a) => /^[a-z]+$/.test(a)) ?? command.name;
