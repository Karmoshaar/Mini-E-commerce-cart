import { createRequire } from 'node:module';
import { config } from '../config.js';

const require = createRequire(import.meta.url);

function findFfmpeg() {
  if (config.ffmpegPath) return config.ffmpegPath;
  try {
    const bundled = require('ffmpeg-static');
    if (bundled) return bundled;
  } catch {
    // optional dependency not installed: fall back to the system ffmpeg
  }
  return 'ffmpeg';
}

export const ffmpegPath = findFfmpeg();
