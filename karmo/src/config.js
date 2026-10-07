import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function num(name, fallback, { min = -Infinity, max = Infinity } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function bool(name, fallback) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function str(name, fallback = '') {
  const raw = process.env[name]?.trim();
  return raw ? raw : fallback;
}

export const config = {
  token: str('DISCORD_TOKEN'),
  // The bot renames itself to this on startup (Discord allows 2 renames per hour).
  botName: str('BOT_NAME', 'Karmo'),
  prefix: str('PREFIX', '!'),
  // Register slash commands on one server only (instant) instead of globally.
  guildId: str('GUILD_ID'),
  defaultVolume: num('DEFAULT_VOLUME', 80, { min: 0, max: 200 }),
  autoplay: bool('AUTOPLAY', true),
  // Leave the voice channel after this long with nothing playing / nobody listening.
  idleTimeoutMs: num('IDLE_TIMEOUT_SECONDS', 180, { min: 10 }) * 1000,
  maxQueue: num('MAX_QUEUE', 500, { min: 1 }),
  maxPlaylist: num('MAX_PLAYLIST', 200, { min: 1 }),
  ytdlpPath: str('YTDLP_PATH'),
  ffmpegPath: str('FFMPEG_PATH'),
  cookiesFile: str('YTDLP_COOKIES'),
  cookiesFromBrowser: str('YTDLP_COOKIES_FROM_BROWSER'),
  ytdlpExtraArgs: str('YTDLP_EXTRA_ARGS')
    .split(/\s+/)
    .filter(Boolean),
  debug: bool('DEBUG', false),
};
