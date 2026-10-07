import spotifyUrlInfo from 'spotify-url-info';
import { config } from '../config.js';
import { UserError } from '../errors.js';
import { log } from '../logger.js';
import { isHttpUrl, truncate, youtubeIdFromUrl } from '../util.js';
import { getInfo } from './ytdlp.js';

/**
 * @typedef {object} Track
 * @property {string} title
 * @property {string|null} author
 * @property {string|null} url       Page URL that yt-dlp plays. null = search `query` on YouTube when its turn comes.
 * @property {string|null} query
 * @property {number|null} duration  Seconds.
 * @property {boolean} isLive
 * @property {string|null} thumbnail
 * @property {string|null} youtubeId
 * @property {string} source         Where the link came from (YouTube, Spotify, ...).
 * @property {string|null} link      Link shown to users.
 * @property {boolean} partial       Title/duration unknown until the track is looked up.
 * @property {{id: string, name: string}|null} requester  null when added by autoplay.
 */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const SHORT_LINK_HOSTS = new Set(['spotify.link', 'spoti.fi', 'deezer.page.link', 'dzr.page.link', 'link.deezer.com']);
const SOURCE_NAMES = {
  Youtube: 'YouTube',
  YoutubeTab: 'YouTube',
  Soundcloud: 'SoundCloud',
  SoundcloudSet: 'SoundCloud',
  Bandcamp: 'Bandcamp',
  TwitchStream: 'Twitch',
  TwitchVod: 'Twitch',
  Vimeo: 'Vimeo',
  TikTok: 'TikTok',
  Mixcloud: 'Mixcloud',
  Audiomack: 'Audiomack',
};

const spotify = spotifyUrlInfo(fetch);

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

function fileNameFromUrl(url) {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).at(-1);
    return last ? decodeURIComponent(last) : hostname(url);
  } catch {
    return url;
  }
}

/** Builds a Track from one `yt-dlp -J` result or flat playlist entry. */
export function trackFromInfo(entry, overrides = {}) {
  if (!entry || typeof entry !== 'object') return null;
  const extractor = entry.extractor_key || entry.ie_key || '';
  // Nested playlists (e.g. a channel's "Videos" tab) are not playable tracks.
  if (entry._type === 'playlist' || /Tab$|Playlist$/.test(entry.ie_key ?? '')) return null;
  const url =
    entry.webpage_url ||
    (isHttpUrl(entry.url) ? entry.url : null) ||
    (extractor === 'Youtube' && entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : null);
  if (!url) return null;

  const youtubeId = youtubeIdFromUrl(url) ?? (extractor === 'Youtube' ? entry.id ?? null : null);
  const title = entry.title || entry.track || null;
  const thumbnail = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    : entry.thumbnail || entry.thumbnails?.at(-1)?.url || null;

  return {
    title: title || fileNameFromUrl(url),
    author: entry.artist || entry.creator || entry.uploader || entry.channel || null,
    url,
    query: null,
    duration: Number.isFinite(entry.duration) ? Math.round(entry.duration) : null,
    isLive: entry.is_live === true || entry.live_status === 'is_live',
    thumbnail,
    youtubeId,
    source: SOURCE_NAMES[extractor] || (youtubeId ? 'YouTube' : extractor && extractor !== 'Generic' ? extractor : hostname(url)),
    link: url,
    partial: !title,
    requester: null,
    ...overrides,
  };
}

/** A track known only by name (Spotify, Deezer, ...); it is searched on YouTube right before it plays. */
export function lazyTrack({ name, artist = null, duration = null, link = null, source, thumbnail = null }) {
  const title = artist ? `${artist} - ${name}` : name;
  return {
    title,
    author: artist,
    url: null,
    query: title,
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    isLive: false,
    thumbnail,
    youtubeId: null,
    source,
    link,
    partial: false,
    requester: null,
  };
}

export async function searchYouTube(query) {
  const info = await getInfo(`ytsearch1:${query.replace(/\s+/g, ' ').trim()}`, { timeout: 30_000 });
  return trackFromInfo(info.entries?.find(Boolean));
}

/** Fills in a lazy/partial track right before it plays. Throws UserError if it can't be found. */
export async function prepareTrack(track) {
  if (!track.url) {
    const found = await searchYouTube(track.query).catch((error) => {
      log.warn(`Search failed for "${track.query}": ${error.message}`);
      return null;
    });
    if (!found) throw new UserError(`🔍 ما لقيت **${truncate(track.title, 80)}** على يوتيوب.`);
    track.url = found.url;
    track.youtubeId = found.youtubeId;
    track.thumbnail ??= found.thumbnail;
    track.duration ??= found.duration;
    track.isLive = found.isLive;
  } else if (track.partial) {
    const info = await getInfo(track.url, { flat: false, noPlaylist: true }).catch(() => null);
    const full = trackFromInfo(info);
    if (full) Object.assign(track, { ...full, link: track.link, requester: track.requester, partial: false });
  }
  return track;
}

/**
 * Turns what the user typed (any link, or words to search) into tracks.
 * @returns {Promise<{tracks: Track[], playlist?: {title: string, url: string}}>}
 */
export async function resolve(input) {
  const text = input.trim().replace(/^<(.+)>$/, '$1');
  if (!text) throw new UserError('اكتب رابط أو اسم أغنية.');

  if (!isHttpUrl(text)) {
    const track = await searchYouTube(text).catch((error) => {
      throw toUserError(error);
    });
    if (!track) throw new UserError(`🔍 ما لقيت أي نتيجة لـ **${truncate(text, 80)}**`);
    return { tracks: [track] };
  }

  let url = new URL(text);
  if (SHORT_LINK_HOSTS.has(url.hostname)) url = new URL(await expandShortLink(url.href));

  if (url.hostname === 'open.spotify.com' || url.hostname === 'play.spotify.com') return resolveSpotify(url);
  if (/(^|\.)deezer\.com$/.test(url.hostname)) return resolveDeezer(url);
  return resolveWithYtDlp(url);
}

async function fetchWithTimeout(url, init = {}) {
  return fetch(url, {
    redirect: 'follow',
    ...init,
    headers: { 'user-agent': BROWSER_UA, 'accept-language': 'en-US,en;q=0.8', ...init.headers },
    signal: AbortSignal.timeout(init.timeout ?? 12_000),
  });
}

async function expandShortLink(href) {
  try {
    const response = await fetchWithTimeout(href);
    if (hostname(response.url) !== hostname(href)) return response.url;
    // Some short links redirect with a script instead of HTTP: look for the target in the page.
    const html = await response.text();
    const target = html.match(/https:\/\/(?:open\.spotify\.com|www\.deezer\.com)\/[^"'\s<>\\]+/)?.[0];
    return target ?? href;
  } catch {
    return href;
  }
}

function spotifyOpenLink(uri) {
  const [, type, id] = String(uri ?? '').split(':');
  return type && id ? `https://open.spotify.com/${type}/${id}` : null;
}

async function resolveSpotify(url) {
  url.pathname = url.pathname.replace(/^\/intl-[\w-]+/, '');
  let details;
  try {
    details = await spotify.getDetails(url.href, { headers: { 'user-agent': BROWSER_UA } });
  } catch (error) {
    log.warn(`Spotify lookup failed: ${error.message}`);
    throw new UserError('🟢 ما قدرت أقرأ رابط سبوتيفاي. تأكد إنه رابط أغنية/ألبوم/بلاي ليست عامة (Public).');
  }
  const tracks = details.tracks
    .filter((t) => t?.name)
    .slice(0, config.maxPlaylist)
    .map((t) =>
      lazyTrack({
        name: t.name,
        artist: t.artist || null,
        duration: t.duration / 1000,
        link: spotifyOpenLink(t.uri) ?? url.href,
        source: 'Spotify',
        thumbnail: details.preview.type === 'track' || details.preview.type === 'album' ? details.preview.image : null,
      }),
    );
  if (!tracks.length) throw new UserError('📭 ما في أغاني بهذا الرابط.');
  if (details.preview.type === 'track' || details.preview.type === 'episode') return { tracks: tracks.slice(0, 1) };
  return { tracks, playlist: { title: details.preview.title || 'Spotify', url: url.href } };
}

async function resolveDeezer(url) {
  const match = url.pathname.match(/\/(track|album|playlist)\/(\d+)/);
  if (!match) return resolveWithYtDlp(url);
  const [, type, id] = match;
  let data;
  try {
    data = await (await fetchWithTimeout(`https://api.deezer.com/${type}/${id}`)).json();
  } catch {
    data = null;
  }
  if (!data || data.error) throw new UserError('🟣 ما قدرت أقرأ رابط ديزر. تأكد إنه عام.');

  const toTrack = (t) =>
    lazyTrack({
      name: t.title,
      artist: t.artist?.name ?? null,
      duration: t.duration,
      link: t.link ?? url.href,
      source: 'Deezer',
      thumbnail: t.album?.cover_medium ?? data.cover_medium ?? null,
    });
  if (type === 'track') return { tracks: [toTrack(data)] };
  const tracks = (data.tracks?.data ?? []).filter((t) => t?.title).slice(0, config.maxPlaylist).map(toTrack);
  if (!tracks.length) throw new UserError('📭 ما في أغاني بهذا الرابط.');
  return { tracks, playlist: { title: data.title || 'Deezer', url: url.href } };
}

async function resolveWithYtDlp(url) {
  const videoId = youtubeIdFromUrl(url.href);
  const list = url.searchParams.get('list');
  // A video link without a playlist, or inside a YouTube mix ("RD..." lists never end): just that video.
  const noPlaylist = Boolean(videoId && (!list || list.startsWith('RD')));

  let info = null;
  let failure = null;
  try {
    info = await getInfo(url.href, { noPlaylist, playlistEnd: config.maxPlaylist });
  } catch (error) {
    failure = error;
    log.debug(`yt-dlp failed for ${url.href}: ${error.message}`);
  }
  if (!info && videoId && !noPlaylist) {
    // Private or broken playlist: fall back to the video itself.
    info = await getInfo(`https://www.youtube.com/watch?v=${videoId}`, { noPlaylist: true }).catch(() => null);
  }
  if (!info) {
    // yt-dlp can't play it (Apple Music, Anghami, Tidal, ...): read the song name from the page and search it.
    const fromPage = await resolveFromPage(url).catch(() => null);
    if (fromPage) return fromPage;
    throw toUserError(failure);
  }
  return fromInfo(info, url, videoId);
}

function fromInfo(info, url, startId) {
  if (info._type === 'playlist' || Array.isArray(info.entries)) {
    let tracks = (info.entries ?? []).map((entry) => trackFromInfo(entry)).filter(Boolean);
    const start = startId ? tracks.findIndex((t) => t.youtubeId === startId) : -1;
    if (start > 0) tracks = [...tracks.slice(start), ...tracks.slice(0, start)];
    tracks = tracks.slice(0, config.maxPlaylist);
    if (!tracks.length) throw new UserError('📭 القائمة فاضية أو خاصة.');
    if (tracks.length === 1) return { tracks };
    return { tracks, playlist: { title: info.title || 'Playlist', url: url.href } };
  }
  const track = trackFromInfo(info);
  if (!track) throw new UserError('🚫 ما لقيت صوت بهذا الرابط.');
  return { tracks: [track] };
}

async function resolveFromPage(url) {
  const response = await fetchWithTimeout(url.href);
  if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) return null;
  const html = (await response.text()).slice(0, 3_000_000);
  const meta = extractPageMeta(html);
  const source = meta.siteName || hostname(url.href);

  if (meta.tracks.length) {
    const tracks = meta.tracks
      .slice(0, config.maxPlaylist)
      .map((t) => lazyTrack({ name: t.name, artist: t.artist, link: url.href, source }));
    if (tracks.length === 1) return { tracks };
    return { tracks, playlist: { title: cleanPageTitle(meta.title, meta.siteName) || source, url: url.href } };
  }

  const name = cleanPageTitle(meta.title, meta.siteName);
  if (!name) return null;
  return { tracks: [lazyTrack({ name, link: url.href, source, thumbnail: meta.image })] };
}

export function decodeEntities(text) {
  return String(text ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function metaContent(html, key) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i'))?.[0];
  if (!tag) return null;
  const match = tag.match(/content=(?:"([^"]*)"|'([^']*)')/i);
  const value = decodeEntities(match?.[1] ?? match?.[2] ?? '').trim();
  return value || null;
}

function artistName(value) {
  if (!value) return null;
  if (Array.isArray(value)) return artistName(value[0]);
  if (typeof value === 'string') return value;
  return typeof value.name === 'string' ? value.name : null;
}

function collectRecordings(node, out, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 8 || out.length >= 500) return;
  if (Array.isArray(node)) {
    for (const child of node) collectRecordings(child, out, depth + 1);
    return;
  }
  const types = [].concat(node['@type'] ?? []);
  if (types.includes('MusicRecording') && typeof node.name === 'string') {
    out.push({ name: decodeEntities(node.name), artist: artistName(node.byArtist) });
    return;
  }
  for (const key of ['@graph', 'track', 'tracks', 'itemListElement', 'item']) {
    if (node[key]) collectRecordings(node[key], out, depth + 1);
  }
}

/** Song info from a web page: schema.org MusicRecording entries, else its og:title. */
export function extractPageMeta(html) {
  const tracks = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectRecordings(JSON.parse(match[1].trim()), tracks);
    } catch {
      // ignore invalid JSON-LD
    }
  }
  const seen = new Set();
  const unique = tracks.filter((t) => {
    const key = `${t.artist}|${t.name}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return {
    title: metaContent(html, 'og:title') || metaContent(html, 'twitter:title') || decodeEntities(titleTag ?? '').trim() || null,
    siteName: metaContent(html, 'og:site_name'),
    image: metaContent(html, 'og:image'),
    tracks: unique,
  };
}

const KNOWN_SITES = [
  'apple music', 'spotify', 'youtube music', 'youtube', 'soundcloud', 'deezer', 'anghami', 'tidal', 'shazam',
  'amazon music', 'audiomack', 'bandcamp', 'napster', 'qobuz', 'pandora', 'boomplay', 'jiosaavn',
];

/** "‎Song by Artist on Apple Music" -> "Song by Artist" (something YouTube search understands). */
export function cleanPageTitle(title, siteName) {
  if (!title) return '';
  let text = title.replace(/[‎‏‪-‮]/g, '').replace(/\s+/g, ' ').trim();
  const sites = siteName ? [siteName.toLowerCase(), ...KNOWN_SITES] : KNOWN_SITES;
  for (const site of sites) {
    const escaped = site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`\\s*(?:[|\\-–—:·]|\\bon|على)\\s*${escaped}\\s*$`, 'i'), '');
  }
  text = text
    .replace(/\s[-–—]\s(?:song|single|album|ep|playlist) by\s/i, ' ')
    .replace(/^(?:listen to|stream|play)\s+/i, '')
    .trim();
  return text;
}

export function toUserError(error) {
  if (error instanceof UserError) return error;
  const message = error?.message ?? String(error);
  log.debug(`Resolve error: ${message}`);
  if (/unsupported url/i.test(message)) {
    return new UserError('🚫 هذا الرابط مش مدعوم. جرب رابط ثاني أو اكتب اسم الأغنية.');
  }
  if (/not a bot|sign in|log ?in|cookies/i.test(message)) {
    return new UserError(`🔒 الموقع طالب تسجيل دخول (شوف قسم الكوكيز بملف README).\n\`${truncate(message, 180)}\``);
  }
  if (/\bprivate\b|members[- ]only|\bpremium\b|age[- ]restrict|confirm your age/i.test(message)) {
    return new UserError(`🔒 هذا المحتوى خاص أو محظور.\n\`${truncate(message, 180)}\``);
  }
  if (/unavailable|not available|removed|copyright|blocked|does not exist|not found|\b404\b/i.test(message)) {
    return new UserError(`🚫 هذا المقطع مش متاح.\n\`${truncate(message, 180)}\``);
  }
  return new UserError(`❌ ما قدرت شغّل هذا الرابط.\n\`${truncate(message, 200)}\``);
}
