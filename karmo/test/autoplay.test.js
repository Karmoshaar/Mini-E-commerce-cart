import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickRelated } from '../src/media/autoplay.js';

const t = (youtubeId, title, duration = 200, extra = {}) => ({ youtubeId, title, duration, isLive: false, ...extra });
const none = () => ({ ids: new Set(), cores: new Set() });
const first = () => 0;

test('skips the seed and other versions of the same song', () => {
  const mix = [
    t('seed0000000', 'Artist - Song (Official Video)'),
    t('lyrics00000', 'Artist - Song [Lyrics]'),
    t('remix000000', 'Artist - Song Remix'),
    t('other000000', 'Other Artist - Different Song'),
  ];
  const pick = pickRelated(mix, { seedId: 'seed0000000', seedTitle: 'Artist - Song (Official Video)', recent: none() }, first);
  assert.equal(pick.youtubeId, 'other000000');
});

test('skips recently played songs, live streams and very long videos', () => {
  const recent = { ids: new Set(['played00000']), cores: new Set(['old hit']) };
  const mix = [
    t('played00000', 'X - Played'),
    t('oldhit00000', 'Y - Old Hit (Live)'),
    t('live0000000', 'Radio 24/7', null, { isLive: true }),
    t('long0000000', '1 hour mix', 3600),
    t('good0000000', 'Z - Fresh Song'),
  ];
  const pick = pickRelated(mix, { seedId: 'seed', seedTitle: 'Seed', recent }, first);
  assert.equal(pick.youtubeId, 'good0000000');
});

test('relaxes the length filter when nothing else is left', () => {
  const pick = pickRelated([t('long0000000', 'Long Classical Piece', 1500)], { seedId: 's', seedTitle: 'Seed', recent: none() }, first);
  assert.equal(pick.youtubeId, 'long0000000');
});

test('picks among the closest five only', () => {
  const mix = Array.from({ length: 20 }, (_, i) => t(`id${String(i).padStart(9, '0')}`, `Artist ${i} - Song ${i}`));
  const picks = new Set();
  for (let r = 0; r < 1; r += 0.05) picks.add(pickRelated(mix, { seedId: 's', seedTitle: 'Seed', recent: none() }, () => r).youtubeId);
  assert.deepEqual([...picks].sort(), mix.slice(0, 5).map((x) => x.youtubeId).sort());
});

test('returns null when there is nothing usable', () => {
  assert.equal(pickRelated([], { seedId: 's', seedTitle: 'S', recent: none() }), null);
  assert.equal(pickRelated([t(null, 'no id')], { seedId: 's', seedTitle: 'S', recent: none() }), null);
});
