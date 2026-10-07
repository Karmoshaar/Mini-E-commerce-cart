import { config } from './config.js';

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export const log = {
  info: (...args) => console.log(`[${stamp()}]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] WARN`, ...args),
  error: (...args) => console.error(`[${stamp()}] ERROR`, ...args),
  debug: (...args) => {
    if (config.debug) console.log(`[${stamp()}] DEBUG`, ...args);
  },
};
