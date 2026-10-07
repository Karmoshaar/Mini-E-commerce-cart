import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from '@discordjs/voice';
import { config } from '../config.js';
import { UserError } from '../errors.js';
import { log } from '../logger.js';
import { findRelated } from '../media/autoplay.js';
import { prepareTrack } from '../media/resolve.js';
import { createAudioStream } from '../media/ytdlp.js';
import { controlRows, nowPlayingEmbed } from '../ui.js';
import { shuffleInPlace, songCore, truncate } from '../util.js';

const HISTORY_SIZE = 200;
const MAX_FAILURES_IN_A_ROW = 3;
// A skip before this point means "not this kind of song": don't base autoplay on it.
const EARLY_SKIP_MS = 30_000;

/** Queue and playback for one server. */
export class GuildPlayer {
  constructor(guild, { onDestroy, onTrackChange } = {}) {
    this.guild = guild;
    this.onDestroy = onDestroy;
    this.onTrackChange = onTrackChange;

    this.queue = [];
    this.history = [];
    this.current = null;
    this.loop = 'off'; // off | track | queue
    this.autoplay = config.autoplay;
    this.volume = config.defaultVolume;
    this.textChannel = null;
    this.connection = null;

    this.resource = null;
    this.stream = null;
    this.seekOffset = 0;
    this.nowPlayingMessage = null;
    this.announceToken = 0;
    this.announceOnStart = null;

    // Bumped by stop/destroy so in-flight work (searches, autoplay lookups) knows to give up.
    this.generation = 0;
    this.advancing = false;
    this.advanceAgain = false;
    this.failures = 0;
    this.skipRequested = false;
    this.backRequested = false;
    this.prefetch = null;
    this.autoPaused = false;
    this.idleTimer = null;
    this.aloneTimer = null;
    this.destroyed = false;

    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        this.onResourceEnd(oldState.resource);
      } else if (newState.status === AudioPlayerStatus.Playing && newState.resource === this.announceOnStart) {
        // Announce once audio actually flows, so links that fail never show a "now playing" card
        // (an empty stream also turns "playing" for a moment right before it ends).
        const { resource } = newState;
        this.announceOnStart = null;
        setTimeout(() => {
          if (resource === this.resource && !resource.ended) this.announce();
        }, 500);
      }
    });
    this.player.on('error', (error) => log.warn(`[${guild.name}] audio error: ${error.message}`));
  }

  get isPaused() {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }

  /** Seconds into the current track. */
  position() {
    if (!this.resource) return 0;
    return this.seekOffset + Math.floor(this.resource.playbackDuration / 1000);
  }

  get voiceChannelId() {
    return this.guild.members.me?.voice?.channelId ?? null;
  }

  // ---------------------------------------------------------------- voice connection

  async join(channel) {
    const existing = this.connection;
    if (
      existing &&
      existing.state.status !== VoiceConnectionStatus.Destroyed &&
      existing.joinConfig.channelId === channel.id
    ) {
      return;
    }
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    if (connection !== this.connection) this.attach(connection);
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (error) {
      log.warn(`[${this.guild.name}] voice connection failed: ${error.message}`);
      this.destroy();
      throw new UserError('🔇 ما قدرت أدخل الروم الصوتي. تأكد إنه عندي صلاحية **Connect** و **Speak** وجرب مرة ثانية.');
    }
    // Don't sit in the channel forever if nothing ends up playing (e.g. the link was bad).
    if (!this.current && !this.queue.length && !this.advancing) this.startIdleTimer();
  }

  attach(connection) {
    this.connection = connection;
    connection.subscribe(this.player);
    connection.on('error', (error) => log.warn(`[${this.guild.name}] voice error: ${error.message}`));
    connection.on('stateChange', async (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        // Moved to another channel → it reconnects by itself. Kicked → it doesn't, so clean up.
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
        }
      } else if (newState.status === VoiceConnectionStatus.Destroyed && this.connection === connection) {
        this.destroy();
      }
    });
  }

  // ---------------------------------------------------------------- queue

  /** Adds tracks; starts playing if idle. Returns how many were added. */
  add(tracks, { next = false } = {}) {
    const room = config.maxQueue - this.queue.length;
    if (room <= 0) throw new UserError(`📛 القائمة مليانة (${config.maxQueue} أغنية).`);
    const accepted = tracks.slice(0, room);
    if (next) this.queue.unshift(...accepted);
    else this.queue.push(...accepted);
    this.clearIdleTimer();
    if (!this.current) this.advance();
    else this.refreshNowPlaying();
    return accepted.length;
  }

  skip(count = 1) {
    if (!this.current) {
      if (!this.queue.length) throw new UserError('⏭️ ما في شي يشتغل.');
      this.advance();
      return null;
    }
    if (count > 1) this.queue.splice(0, count - 1);
    const skipped = this.current;
    this.skipRequested = true;
    this.player.stop(true);
    return skipped;
  }

  back() {
    const previous = this.history.pop();
    if (!previous) throw new UserError('⏮️ ما في أغنية قبل هي.');
    if (this.current) {
      this.queue.unshift(previous, this.current);
      this.backRequested = true;
      this.player.stop(true);
    } else {
      this.queue.unshift(previous);
      this.advance();
    }
    return previous;
  }

  /** Stops playback and clears the queue, but stays in the channel. */
  stop() {
    this.generation += 1;
    this.queue = [];
    this.prefetch = null;
    const wasPlaying = Boolean(this.current);
    this.current = null; // makes onResourceEnd ignore the stop below
    this.killStream();
    this.player.stop(true);
    this.resource = null;
    this.becomeIdle();
    return wasPlaying;
  }

  togglePause() {
    if (!this.current) throw new UserError('⏸️ ما في شي يشتغل.');
    this.autoPaused = false;
    if (this.isPaused) this.player.unpause();
    else this.player.pause();
    this.refreshNowPlaying();
    return this.isPaused;
  }

  resume() {
    if (!this.current) throw new UserError('▶️ ما في شي يشتغل.');
    this.autoPaused = false;
    this.player.unpause();
    this.refreshNowPlaying();
  }

  setVolume(volume) {
    this.volume = Math.round(Math.min(200, Math.max(0, volume)));
    this.resource?.volume?.setVolume(this.volume / 100);
    this.refreshNowPlaying();
    return this.volume;
  }

  setLoop(mode) {
    this.loop = mode;
    if (mode !== 'off') this.prefetch = null;
    else this.schedulePrefetch();
    this.refreshNowPlaying();
    return mode;
  }

  cycleLoop() {
    return this.setLoop({ off: 'track', track: 'queue', queue: 'off' }[this.loop]);
  }

  toggleAutoplay() {
    this.autoplay = !this.autoplay;
    if (this.autoplay) this.schedulePrefetch();
    else this.prefetch = null;
    this.refreshNowPlaying();
    return this.autoplay;
  }

  shuffle() {
    if (this.queue.length < 2) throw new UserError('🔀 لازم يكون في أغنيتين على الأقل بالقائمة.');
    shuffleInPlace(this.queue);
    this.refreshNowPlaying();
  }

  remove(position) {
    if (!Number.isInteger(position) || position < 1 || position > this.queue.length) {
      throw new UserError(`🔢 اكتب رقم بين 1 و ${this.queue.length || 1}.`);
    }
    const [removed] = this.queue.splice(position - 1, 1);
    this.refreshNowPlaying();
    return removed;
  }

  clear() {
    const count = this.queue.length;
    this.queue = [];
    this.refreshNowPlaying();
    return count;
  }

  seek(seconds) {
    const track = this.current;
    if (!track) throw new UserError('⏩ ما في شي يشتغل.');
    if (track.isLive) throw new UserError('⏩ ما بقدر قدّم بالبث المباشر.');
    if (track.duration && seconds >= track.duration) throw new UserError('⏩ هذا الوقت أطول من الأغنية.');
    this.startResource(track, seconds);
    this.refreshNowPlaying();
  }

  // ---------------------------------------------------------------- playback

  /** Plays the next queued track, or an autoplay pick when the queue is empty. */
  async advance() {
    if (this.destroyed) return;
    if (this.advancing) {
      this.advanceAgain = true;
      return;
    }
    this.advancing = true;
    const generation = this.generation;
    try {
      while (generation === this.generation && !this.destroyed) {
        let track = this.queue.shift() ?? null;
        if (!track && this.autoplay && this.history.length) {
          track = await this.nextAutoplay();
          if (generation !== this.generation) return;
          if (this.queue.length) continue; // someone queued a song meanwhile: that comes first
          if (!track) this.send('📻 ما لقيت أغاني مشابهة. ضيف أغنية بـ `' + config.prefix + 'p`.');
        }
        if (!track) {
          this.becomeIdle();
          return;
        }
        if (await this.play(track, generation)) return;
        this.failures += 1;
        if (this.failures >= MAX_FAILURES_IN_A_ROW) {
          this.failures = 0;
          this.send(`⚠️ فشل تشغيل ${MAX_FAILURES_IN_A_ROW} أغاني ورا بعض، وقفت. جرب \`${config.prefix}s\` أو رابط ثاني.`);
          this.becomeIdle();
          return;
        }
      }
    } finally {
      this.advancing = false;
      if (this.advanceAgain) {
        this.advanceAgain = false;
        if (!this.current && !this.destroyed) this.advance();
      }
    }
  }

  async play(track, generation) {
    try {
      await prepareTrack(track);
    } catch (error) {
      if (generation !== this.generation || this.destroyed) return true;
      this.send(error instanceof UserError ? error.message : `❌ ما قدرت جهّز **${truncate(track.title, 80)}**.`);
      return false;
    }
    if (generation !== this.generation || this.destroyed) return true;
    this.startResource(track, 0);
    this.announceOnStart = this.resource;
    this.schedulePrefetch();
    return true;
  }

  startResource(track, seek) {
    this.killStream();
    const stream = createAudioStream(track.url, { seek });
    const resource = createAudioResource(stream.stream, {
      inputType: StreamType.Raw,
      inlineVolume: true,
      metadata: track,
    });
    resource.volume.setVolume(this.volume / 100);
    this.stream = stream;
    this.resource = resource;
    this.current = track;
    this.seekOffset = seek;
    this.clearIdleTimer();
    this.player.play(resource);
    this.onTrackChange?.(this, track);
  }

  killStream() {
    this.stream?.kill();
    this.stream = null;
  }

  onResourceEnd(resource) {
    const track = resource?.metadata;
    // Ignore resources we replaced (seek) or threw away (stop).
    if (!track || track !== this.current || resource !== this.resource) return;
    const playedMs = resource.playbackDuration;
    const error = this.stream?.errorMessage() ?? '';
    this.killStream();
    this.current = null;
    this.resource = null;
    const skipped = this.skipRequested;
    const back = this.backRequested;
    this.skipRequested = false;
    this.backRequested = false;

    const failed = !skipped && !back && (playedMs === 0 || (playedMs < 1000 && error));
    if (failed) {
      log.warn(`[${this.guild.name}] could not play ${track.url}: ${error}`);
      this.send(`❌ ما قدرت شغّل **${truncate(track.title, 80)}**${error ? `\n\`${truncate(error, 200)}\`` : ''}`);
      this.failures += 1;
      if (this.failures >= MAX_FAILURES_IN_A_ROW) {
        this.failures = 0;
        this.send(`⚠️ فشل تشغيل ${MAX_FAILURES_IN_A_ROW} أغاني ورا بعض، وقفت. جرب \`${config.prefix}s\` أو رابط ثاني.`);
        this.becomeIdle();
        return;
      }
    } else {
      this.failures = 0;
      if (!back) this.remember(track, skipped && playedMs < EARLY_SKIP_MS);
      if (this.loop === 'track' && !skipped && !back) this.queue.unshift(track);
      else if (this.loop === 'queue' && !back) this.queue.push(track);
    }
    this.advance();
  }

  remember(track, skippedEarly) {
    track.skippedEarly = skippedEarly;
    this.history.push(track);
    if (this.history.length > HISTORY_SIZE) this.history.shift();
  }

  /** What autoplay must not pick again: everything played lately, playing, or queued. */
  recentlyPlayed() {
    const ids = new Set();
    const cores = new Set();
    for (const track of [...this.history, this.current, ...this.queue]) {
      if (!track) continue;
      if (track.youtubeId) ids.add(track.youtubeId);
      const core = songCore(track.title);
      if (core) cores.add(core);
    }
    return { ids, cores };
  }

  autoplaySeed() {
    return this.history.findLast((t) => !t.skippedEarly) ?? this.history.at(-1) ?? null;
  }

  /** Starts looking for the autoplay pick while the last song is still playing, so the switch is quick. */
  schedulePrefetch() {
    if (!this.autoplay || this.loop !== 'off' || this.queue.length || !this.current) return;
    const seed = this.current;
    if (this.prefetch?.seed === seed) return;
    this.prefetch = {
      seed,
      promise: findRelated(seed, this.recentlyPlayed()).catch((error) => {
        log.warn(`Autoplay prefetch failed: ${error.message}`);
        return null;
      }),
    };
  }

  async nextAutoplay() {
    const seed = this.autoplaySeed();
    if (!seed) return null;
    const prefetched = this.prefetch?.seed === seed ? this.prefetch.promise : null;
    this.prefetch = null;
    const track = await (prefetched ?? findRelated(seed, this.recentlyPlayed())).catch((error) => {
      log.warn(`Autoplay failed: ${error.message}`);
      return null;
    });
    // The prefetch may have picked something that has since been played or queued.
    if (track && prefetched && this.recentlyPlayed().ids.has(track.youtubeId)) {
      return findRelated(seed, this.recentlyPlayed()).catch(() => null);
    }
    return track;
  }

  becomeIdle() {
    this.current = null;
    this.resource = null;
    this.onTrackChange?.(this, null);
    this.disableNowPlaying();
    this.startIdleTimer();
  }

  // ---------------------------------------------------------------- idle / alone handling

  startIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.send('👋 طلعت من الروم لأنه ما في شي يشتغل.');
      this.destroy();
    }, config.idleTimeoutMs);
  }

  clearIdleTimer() {
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  /** Pauses when everyone leaves the channel, resumes when someone comes back. */
  checkListeners() {
    const channel = this.guild.members.me?.voice?.channel;
    if (!channel) return;
    const listeners = channel.members.filter((member) => !member.user.bot).size;
    if (listeners === 0) {
      if (this.aloneTimer) return;
      if (this.current && !this.isPaused) {
        this.player.pause();
        this.autoPaused = true;
        this.refreshNowPlaying();
      }
      this.aloneTimer = setTimeout(() => {
        this.send('👋 طلعت لأنه ما ضل حدا بالروم.');
        this.destroy();
      }, config.idleTimeoutMs);
    } else {
      clearTimeout(this.aloneTimer);
      this.aloneTimer = null;
      if (this.autoPaused) {
        this.autoPaused = false;
        this.player.unpause();
        this.refreshNowPlaying();
      }
    }
  }

  // ---------------------------------------------------------------- messages

  send(content) {
    return this.textChannel?.send(content).catch((error) => log.debug(`send failed: ${error.message}`));
  }

  async announce() {
    if (!this.textChannel || !this.current) return;
    const token = ++this.announceToken;
    const previous = this.nowPlayingMessage;
    this.nowPlayingMessage = null;
    previous?.delete().catch(() => {});
    try {
      const message = await this.textChannel.send({ embeds: [nowPlayingEmbed(this)], components: controlRows(this) });
      if (token !== this.announceToken) message.delete().catch(() => {});
      else this.nowPlayingMessage = message;
    } catch (error) {
      log.debug(`announce failed: ${error.message}`);
    }
  }

  refreshNowPlaying() {
    if (!this.nowPlayingMessage || !this.current) return;
    this.nowPlayingMessage
      .edit({ embeds: [nowPlayingEmbed(this)], components: controlRows(this) })
      .catch(() => {});
  }

  disableNowPlaying() {
    this.announceToken += 1;
    const message = this.nowPlayingMessage;
    this.nowPlayingMessage = null;
    message?.edit({ components: [] }).catch(() => {});
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.generation += 1;
    clearTimeout(this.idleTimer);
    clearTimeout(this.aloneTimer);
    this.queue = [];
    this.current = null;
    this.prefetch = null;
    this.killStream();
    this.player.stop(true);
    this.disableNowPlaying();
    const connection = this.connection;
    this.connection = null;
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
    this.onDestroy?.(this);
  }
}
