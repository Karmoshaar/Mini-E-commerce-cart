import {
  Client,
  Events,
  GatewayIntentBits,
  InteractionContextType,
  MessageFlags,
  OAuth2Scopes,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { createCommands, requireListener, slashName } from './commands.js';
import { config } from './config.js';
import { UserError } from './errors.js';
import { log } from './logger.js';
import { ffmpegPath } from './media/ffmpeg.js';
import { initYtDlp } from './media/ytdlp.js';
import { PlayerManager } from './player/manager.js';
import { queueEmbed } from './ui.js';

const DISALLOWED_INTENTS = 4014;
// Exit code for setup problems, so start.bat/start.sh don't restart in a loop.
const EXIT_CONFIG = 78;
const BOT_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
];

function messageContext(message, arg) {
  const ctx = {
    guild: message.guild,
    member: message.member,
    user: message.author,
    channel: message.channel,
    arg,
    attachment: message.attachments.first()?.url ?? null,
    reply(payload) {
      const body = typeof payload === 'string' ? { content: payload } : payload;
      return message.reply({ allowedMentions: { repliedUser: false }, ...body });
    },
    // A reaction keeps chat clean; fall back to text if reacting isn't allowed.
    ack(emoji, text) {
      return message.react(emoji).catch(() => ctx.reply(text));
    },
  };
  return ctx;
}

function interactionContext(interaction) {
  let answered = false;
  const ctx = {
    guild: interaction.guild,
    member: interaction.member,
    user: interaction.user,
    channel: interaction.channel,
    arg: interaction.options.getString('value')?.trim() ?? '',
    attachment: interaction.options.getAttachment('file')?.url ?? null,
    reply(payload) {
      const body = typeof payload === 'string' ? { content: payload } : payload;
      if (answered) return interaction.followUp(body);
      answered = true;
      return interaction.editReply(body);
    },
    ack(_emoji, text) {
      return ctx.reply(text);
    },
  };
  return ctx;
}

function slashDefinitions(commands) {
  return commands.map((command) => {
    const builder = new SlashCommandBuilder()
      .setName(slashName(command))
      .setDescription(command.description.slice(0, 100))
      .setContexts(InteractionContextType.Guild);
    if (command.arg) {
      builder.addStringOption((option) =>
        option
          .setName('value')
          .setDescription(command.arg.slice(0, 100))
          .setRequired(!command.optionalArg && !command.file),
      );
    }
    if (command.file) {
      builder.addAttachmentOption((option) => option.setName('file').setDescription('ملف صوتي بدل الرابط'));
    }
    return builder.toJSON();
  });
}

function createBot({ messageContent }) {
  const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages];
  if (messageContent) intents.push(GatewayIntentBits.MessageContent);
  const client = new Client({ intents, allowedMentions: { parse: ['users'], repliedUser: false } });
  const manager = new PlayerManager(client);
  const { commands, find } = createCommands(manager);

  async function run(command, ctx) {
    try {
      let player = manager.get(ctx.guild.id);
      if (command.voice) requireListener(ctx.member, player);
      if (player) player.textChannel = ctx.channel;
      await command.run(ctx, player);
    } catch (error) {
      if (!(error instanceof UserError)) log.error(`Command ${command.name} failed:`, error);
      const message = error instanceof UserError ? error.message : '❌ صار خطأ غير متوقع، جرب مرة ثانية.';
      await ctx.reply(message).catch(() => {});
    }
  }

  client.once(Events.ClientReady, async (ready) => {
    log.info(`Logged in as ${ready.user.tag} (${ready.guilds.cache.size} servers)`);
    const invite = ready.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: BOT_PERMISSIONS,
    });
    log.info(`Invite link: ${invite}`);
    manager.updatePresence();
    try {
      const body = slashDefinitions(commands);
      if (config.guildId) await ready.application.commands.set(body, config.guildId);
      else await ready.application.commands.set(body);
      log.info(`Registered ${body.length} slash commands${config.guildId ? ` on server ${config.guildId}` : ''}.`);
    } catch (error) {
      log.warn(`Could not register slash commands: ${error.message}`);
    }
    log.info(`Ready! Type ${config.prefix}h in your server.`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.inGuild()) return;
    let body = null;
    if (message.content.startsWith(config.prefix)) {
      body = message.content.slice(config.prefix.length);
    } else {
      const mention = message.content.match(new RegExp(`^<@!?${client.user.id}>\\s*`));
      if (mention) body = message.content.slice(mention[0].length) || 'h';
    }
    if (body === null) return;
    body = body.trim();
    const name = body.split(/\s+/, 1)[0];
    const command = find(name);
    if (!command) return;
    await run(command, messageContext(message, body.slice(name.length).trim()));
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.inCachedGuild()) return;
    if (interaction.isChatInputCommand()) {
      const command = find(interaction.commandName);
      if (!command) return;
      await interaction.deferReply().catch(() => {});
      await run(command, interactionContext(interaction));
    } else if (interaction.isButton() && interaction.customId.startsWith('mp:')) {
      await handleButton(interaction, manager);
    }
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const player = manager.get(newState.guild.id);
    if (!player) return;
    if (newState.id === client.user.id && !newState.channelId) {
      player.destroy(); // kicked/disconnected from voice
      return;
    }
    const channelId = player.voiceChannelId;
    if (channelId && (oldState.channelId === channelId || newState.channelId === channelId)) player.checkListeners();
  });

  client.on(Events.Error, (error) => log.error('Discord client error:', error));
  return { client, manager };
}

async function handleButton(interaction, manager) {
  const ephemeral = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
  const player = manager.get(interaction.guildId);
  if (!player) return ephemeral('🔇 ما في شي يشتغل.');
  try {
    requireListener(interaction.member, player);
    const who = interaction.member.displayName;
    switch (interaction.customId.slice(3)) {
      case 'queue':
        return interaction.reply({ embeds: [queueEmbed(player)], flags: MessageFlags.Ephemeral });
      case 'pause':
        player.togglePause();
        break;
      case 'skip':
        player.skip();
        player.send(`⏭️ **${who}** تخطّى الأغنية.`);
        break;
      case 'prev':
        player.back();
        break;
      case 'stop':
        player.stop();
        player.send(`⏹️ **${who}** وقّف التشغيل.`);
        break;
      case 'loop':
        player.cycleLoop();
        break;
      case 'autoplay':
        player.toggleAutoplay();
        break;
      case 'shuffle':
        player.shuffle();
        break;
      case 'voldown':
        player.setVolume(player.volume - 10);
        break;
      case 'volup':
        player.setVolume(player.volume + 10);
        break;
      default:
        return ephemeral('؟');
    }
    await interaction.deferUpdate().catch(() => {});
  } catch (error) {
    if (!(error instanceof UserError)) log.error('Button failed:', error);
    await ephemeral(error instanceof UserError ? error.message : '❌ صار خطأ.');
  }
}

async function start({ messageContent }) {
  const { client, manager } = createBot({ messageContent });
  let restarting = false;

  client.on(Events.ShardDisconnect, async (event) => {
    if (event.code !== DISALLOWED_INTENTS || !messageContent || restarting) return;
    restarting = true;
    log.warn(
      'Message Content Intent is not enabled, so prefix commands (!p ...) are off. Slash commands (/p ...) and ' +
        '@mentions still work. To enable it: https://discord.com/developers/applications → your app → Bot → ' +
        'Privileged Gateway Intents → Message Content Intent.',
    );
    manager.destroyAll();
    await client.destroy();
    await start({ messageContent: false });
  });

  const shutdown = async () => {
    log.info('Shutting down...');
    manager.destroyAll();
    await client.destroy().catch(() => {});
    process.exit(0);
  };
  process.removeAllListeners('SIGINT').removeAllListeners('SIGTERM');
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  try {
    await client.login(config.token);
  } catch (error) {
    if (restarting) return;
    if (error.code === 'TokenInvalid') {
      log.error('DISCORD_TOKEN is invalid. Copy the token again from the Developer Portal (Bot → Reset Token).');
      process.exit(EXIT_CONFIG);
    }
    log.error('Could not log in to Discord:', error.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => log.error('Unhandled promise rejection:', error));
process.on('uncaughtException', (error) => log.error('Uncaught exception:', error));

if (!config.token) {
  log.error('DISCORD_TOKEN is missing. Copy .env.example to .env and paste your bot token into it.');
  process.exit(EXIT_CONFIG);
}
try {
  await initYtDlp();
} catch (error) {
  log.error(error.message);
  process.exit(EXIT_CONFIG);
}
log.info(`Using ffmpeg: ${ffmpegPath}`);
await start({ messageContent: true });
