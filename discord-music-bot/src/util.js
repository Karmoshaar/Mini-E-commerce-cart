const pad = (n) => String(n).padStart(2, '0');

export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '??:??';
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Parses "90", "1:30", "1:02:03", "1m30s", "2m", "45s" into seconds. Returns null when invalid. */
export function parseTime(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (/^\d+(:\d{1,2}){0,2}$/.test(s)) {
    return s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
  }
  const m = s.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) {
    return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  }
  return null;
}

export function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function progressBar(position, total, size = 18) {
  if (!total || !Number.isFinite(total)) return '🔴 بث مباشر';
  const ratio = Math.min(1, Math.max(0, position / total));
  const index = Math.round(ratio * (size - 1));
  return `${'▬'.repeat(index)}🔘${'▬'.repeat(size - 1 - index)}`;
}

/** Lowercase, strip accents/harakat and punctuation. Works for Arabic and Latin text. */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const NOISE_WORDS = new Set([
  'official', 'music', 'video', 'audio', 'lyrics', 'lyric', 'hd', 'hq', '4k', 'mv', 'visualizer',
  'visualiser', 'remastered', 'remaster', 'clip', 'explicit', 'topic', 'ft', 'feat', 'featuring',
  'فيديو', 'كليب', 'كلمات', 'بالكلمات', 'حصريا', 'اوديو', 'رسمي', 'الرسمي',
]);

/**
 * Reduces a video title to the name of the song, so different uploads of the same song
 * ("Artist - Song (Official Video)", "Artist - Song [Lyrics]", "Song") compare equal.
 */
export function songCore(title) {
  if (!title) return '';
  let t = String(title).replace(/[([{【「].*?[)\]}】」]/g, ' ');
  t = t.split(/\s+\|\s+/)[0];
  const dashed = t.split(/\s+[-–—~]\s+/);
  if (dashed.length > 1 && dashed.slice(1).join(' ').trim()) t = dashed.slice(1).join(' ');
  t = t.replace(/\s(ft|feat|featuring)\.?\s.*$/i, ' ');
  return normalizeText(t)
    .split(' ')
    .filter((w) => w && !NOISE_WORDS.has(w))
    .join(' ');
}

export function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const YT_ID_RE = /(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/|\/v\/)([\w-]{11})(?![\w-])/;

export function youtubeIdFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^(www|m|music)\./, '');
    if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'youtube-nocookie.com') return null;
  } catch {
    return null;
  }
  return url.match(YT_ID_RE)?.[1] ?? null;
}
