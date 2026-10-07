import { log } from '../logger.js';
import { songCore } from '../util.js';
import { searchYouTube, trackFromInfo } from './resolve.js';
import { getInfo } from './ytdlp.js';

const MIX_SIZE = 30;
const MIN_SECONDS = 60;
const MAX_SECONDS = 10 * 60;

/** "song" vs "song remix" / "song live version": versions add words after the name. */
function sameSong(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.startsWith(`${short} `);
}

/**
 * Chooses the next autoplay track from YouTube's related list, skipping the seed, anything played
 * recently, other versions of the same song, live streams and (if possible) non-song lengths.
 * @param {{ids: Set<string>, cores: Set<string>}} recent
 */
export function pickRelated(candidates, { seedId, seedTitle, recent }, random = Math.random) {
  const seedCore = songCore(seedTitle);
  const usable = (track, strict) => {
    if (!track?.youtubeId || track.youtubeId === seedId || recent.ids.has(track.youtubeId)) return false;
    if (track.isLive) return false;
    const core = songCore(track.title);
    if (core && (recent.cores.has(core) || sameSong(core, seedCore))) return false;
    if (strict && track.duration && (track.duration < MIN_SECONDS || track.duration > MAX_SECONDS)) return false;
    return true;
  };
  let pool = candidates.filter((t) => usable(t, true));
  if (!pool.length) pool = candidates.filter((t) => usable(t, false));
  if (!pool.length) return null;
  // YouTube orders the list by similarity; pick among the closest few so sessions don't repeat.
  const closest = pool.slice(0, 5);
  return closest[Math.floor(random() * closest.length)];
}

async function listCandidates(target, limit) {
  const info = await getInfo(target, { playlistEnd: limit, timeout: 45_000 });
  return (info.entries ?? []).map((entry) => trackFromInfo(entry)).filter(Boolean);
}

/**
 * Finds a song in the same style as `seed` using YouTube's "Mix" radio for it, which is what
 * YouTube itself autoplays. Non-YouTube seeds (Spotify, SoundCloud, files...) are matched to a
 * YouTube video first.
 */
export async function findRelated(seed, recent) {
  let seedId = seed.youtubeId;
  if (!seedId) {
    const query = seed.query || [seed.author, seed.title].filter(Boolean).join(' ');
    seedId = (await searchYouTube(query).catch(() => null))?.youtubeId ?? null;
  }

  if (seedId) {
    try {
      const mix = await listCandidates(`https://www.youtube.com/watch?v=${seedId}&list=RD${seedId}`, MIX_SIZE);
      const pick = pickRelated(mix, { seedId, seedTitle: seed.title, recent });
      if (pick) return pick;
    } catch (error) {
      log.warn(`Autoplay mix failed for ${seedId}: ${error.message}`);
    }
  }

  // No mix available: fall back to more songs from the same artist.
  const artist = seed.author?.replace(/\s*(VEVO|- Topic|Official)$/i, '').trim();
  if (!artist) return null;
  try {
    const results = await listCandidates(`ytsearch15:${artist} songs`, 15);
    return pickRelated(results, { seedId, seedTitle: seed.title, recent });
  } catch (error) {
    log.warn(`Autoplay search failed for ${artist}: ${error.message}`);
    return null;
  }
}
