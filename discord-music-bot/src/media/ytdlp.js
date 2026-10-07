import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';
import { log } from '../logger.js';
import { ffmpegPath } from './ffmpeg.js';

const BIN_DIR = path.resolve(import.meta.dirname, '..', '..', 'bin');
const RELEASE_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
const UPDATE_EVERY_MS = 24 * 60 * 60 * 1000;
// First version that can use Node.js to solve YouTube's JS challenges (--js-runtimes).
const JS_RUNTIMES_SINCE = [2025, 11, 12];
// Prefer audio-only; for sites that only serve video, take a small one (we drop the video anyway).
const AUDIO_FORMAT = 'bestaudio/best[height<=480]/best';
// Lets yt-dlp download ahead of playback so long tracks don't stall the HTTP connection.
const DOWNLOAD_BUFFER_BYTES = 16 * 1024 * 1024;

let binary = null;
let jsRuntimes = false;

export class YtDlpError extends Error {
  constructor(message, stderr = '') {
    super(message);
    this.name = 'YtDlpError';
    this.stderr = stderr;
  }
}

function isMusl() {
  if (process.platform !== 'linux') return false;
  try {
    return !process.report.getReport().header.glibcVersionRuntime;
  } catch {
    return false;
  }
}

/** Name of the standalone yt-dlp executable on the GitHub release for this machine. */
export function releaseAssetName(platform = process.platform, arch = process.arch, musl = isMusl()) {
  if (platform === 'win32') {
    if (arch === 'arm64') return 'yt-dlp_arm64.exe';
    if (arch === 'ia32') return 'yt-dlp_x86.exe';
    return 'yt-dlp.exe';
  }
  if (platform === 'darwin') return 'yt-dlp_macos';
  if (platform === 'linux') {
    if (arch === 'x64') return musl ? 'yt-dlp_musllinux' : 'yt-dlp_linux';
    if (arch === 'arm64') return musl ? 'yt-dlp_musllinux_aarch64' : 'yt-dlp_linux_aarch64';
  }
  return null;
}

export function versionAtLeast(version, minimum) {
  const parts = String(version).trim().split('.').map(Number);
  for (let i = 0; i < minimum.length; i++) {
    const v = parts[i] || 0;
    if (v !== minimum[i]) return v > minimum[i];
  }
  return true;
}

/** Last "ERROR:" line from yt-dlp's stderr, without the "[extractor] id:" prefix. */
export function extractError(stderr) {
  const lines = String(stderr ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errorLine = lines.findLast((line) => line.startsWith('ERROR:'));
  if (!errorLine) return lines.at(-1) ?? '';
  return errorLine.replace(/^ERROR:\s*/, '').replace(/^\[[^\]]+\]\s*(?:[\w-]+:\s*)?/, '');
}

function run(command, args, { timeout = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const chunks = [];
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new YtDlpError('yt-dlp took too long to respond', stderr));
    }, timeout);
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-8000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
      else reject(new YtDlpError(extractError(stderr) || `yt-dlp exited with code ${code}`, stderr));
    });
  });
}

async function download(asset, destination) {
  log.info(`Downloading yt-dlp (${asset}) from GitHub...`);
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  const response = await fetch(RELEASE_URL + asset, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const temporary = `${destination}.download`;
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary, { mode: 0o755 }));
  await fsp.rename(temporary, destination);
  await fsp.chmod(destination, 0o755).catch(() => {});
  log.info('yt-dlp downloaded.');
}

async function selfUpdate() {
  try {
    const output = await run(binary, ['-U'], { timeout: 180_000 });
    const line = output.trim().split(/\r?\n/).at(-1);
    if (line) log.info(`yt-dlp update: ${line}`);
  } catch (error) {
    log.warn(`yt-dlp update failed: ${error.message}`);
  }
}

/**
 * Finds a working yt-dlp: YTDLP_PATH, then our own copy in ./bin (downloaded on first run and
 * kept up to date, since sites like YouTube break old versions), then a system-wide install.
 */
export async function initYtDlp() {
  const candidates = [];
  if (config.ytdlpPath) {
    candidates.push({ path: config.ytdlpPath, managed: false });
  } else {
    const local = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    const asset = releaseAssetName();
    if (!fs.existsSync(local) && asset) {
      await download(asset, local).catch((error) => log.warn(`Could not download yt-dlp: ${error.message}`));
    }
    if (fs.existsSync(local)) candidates.push({ path: local, managed: true });
    candidates.push({ path: 'yt-dlp', managed: false });
  }

  for (const candidate of candidates) {
    const version = await run(candidate.path, ['--version'], { timeout: 30_000 })
      .then((out) => out.trim())
      .catch(() => null);
    if (!version) continue;

    binary = candidate.path;
    jsRuntimes = versionAtLeast(version, JS_RUNTIMES_SINCE);
    log.info(`Using yt-dlp ${version} (${binary})`);
    if (!jsRuntimes) log.warn('This yt-dlp is too old for YouTube. Update it or remove YTDLP_PATH.');
    if (candidate.managed) {
      setTimeout(selfUpdate, 5_000).unref();
      setInterval(selfUpdate, UPDATE_EVERY_MS).unref();
    }
    return version;
  }
  throw new Error('yt-dlp was not found and could not be downloaded. Install it or set YTDLP_PATH in .env');
}

function requireBinary() {
  if (!binary) throw new Error('initYtDlp() has not been called');
  return binary;
}

function baseArgs() {
  const args = ['--ignore-config', '--no-warnings', '--no-progress', '--socket-timeout', '20'];
  if (path.isAbsolute(ffmpegPath)) args.push('--ffmpeg-location', ffmpegPath);
  // yt-dlp needs a JS runtime for YouTube; reuse the Node.js that runs this bot.
  if (jsRuntimes) args.push('--js-runtimes', `node:${process.execPath}`);
  if (config.cookiesFile) args.push('--cookies', config.cookiesFile);
  else if (config.cookiesFromBrowser) args.push('--cookies-from-browser', config.cookiesFromBrowser);
  args.push(...config.ytdlpExtraArgs);
  return args;
}

/**
 * Runs `yt-dlp -J` on a URL or "ytsearchN:query" and returns the parsed info.
 * With `flat`, playlist entries are listed without extracting each one (fast).
 */
export async function getInfo(target, { flat = true, noPlaylist = false, playlistEnd, timeout = 60_000 } = {}) {
  const args = [...baseArgs(), '-J'];
  if (flat) args.push('--flat-playlist');
  if (noPlaylist) args.push('--no-playlist');
  if (playlistEnd) args.push('--playlist-end', String(playlistEnd));
  // "--" so user input can never be read as a yt-dlp option.
  args.push('--', target);
  const output = await run(requireBinary(), args, { timeout });
  return JSON.parse(output);
}

/**
 * yt-dlp downloads the audio and pipes it into ffmpeg, which outputs raw 48kHz stereo PCM
 * for @discordjs/voice. Works for every site yt-dlp supports, including live streams.
 */
export function createAudioStream(url, { seek = 0 } = {}) {
  const ytdlp = spawn(
    requireBinary(),
    [...baseArgs(), '--quiet', '--no-playlist', '-f', AUDIO_FORMAT, '-o', '-', '--', url],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0'];
  if (seek > 0) ffmpegArgs.push('-ss', String(seek));
  ffmpegArgs.push('-vn', '-ac', '2', '-ar', '48000', '-f', 's16le', 'pipe:1');
  const ffmpeg = spawn(ffmpegPath, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

  let stderr = '';
  const appendError = (text) => {
    stderr = (stderr + text).slice(-8000);
  };
  ytdlp.stderr.on('data', appendError);
  ffmpeg.stderr.on('data', (chunk) => appendError(`\nffmpeg: ${chunk}`));
  ytdlp.on('error', (error) => {
    appendError(`\nERROR: could not start yt-dlp: ${error.message}`);
    ffmpeg.stdin.end();
  });
  ffmpeg.on('error', (error) => {
    appendError(`\nERROR: could not start ffmpeg (${ffmpegPath}): ${error.message}`);
    ytdlp.kill('SIGKILL');
  });

  const buffer = new PassThrough({ highWaterMark: DOWNLOAD_BUFFER_BYTES });
  ytdlp.stdout.pipe(buffer).pipe(ffmpeg.stdin);
  // EPIPE once ffmpeg exits (skip/stop) is expected.
  for (const stream of [ytdlp.stdout, buffer, ffmpeg.stdin, ffmpeg.stdout]) stream.on('error', () => {});
  ffmpeg.on('close', () => {
    if (ytdlp.exitCode === null) ytdlp.kill('SIGKILL');
  });

  return {
    stream: ffmpeg.stdout,
    kill() {
      ytdlp.kill('SIGKILL');
      ffmpeg.kill('SIGKILL');
    },
    errorMessage: () => extractError(stderr),
  };
}
