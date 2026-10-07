import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseTime, progressBar, songCore, youtubeIdFromUrl } from '../src/util.js';

test('formatDuration', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(75), '1:15');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(null), '??:??');
});

test('parseTime accepts common formats', () => {
  assert.equal(parseTime('90'), 90);
  assert.equal(parseTime('1:30'), 90);
  assert.equal(parseTime('1:02:03'), 3723);
  assert.equal(parseTime('2m'), 120);
  assert.equal(parseTime('1m30s'), 90);
  assert.equal(parseTime('45s'), 45);
  assert.equal(parseTime('abc'), null);
  assert.equal(parseTime(''), null);
});

test('progressBar', () => {
  assert.equal(progressBar(0, 100, 5), '🔘▬▬▬▬');
  assert.equal(progressBar(100, 100, 5), '▬▬▬▬🔘');
  assert.match(progressBar(10, null), /بث/);
});

test('songCore treats different uploads of one song as the same', () => {
  const a = songCore('The Weeknd - Blinding Lights (Official Video)');
  assert.equal(a, 'blinding lights');
  assert.equal(songCore('The Weeknd - Blinding Lights [Lyrics]'), a);
  assert.equal(songCore('Blinding Lights'), a);
  assert.equal(songCore('Artist - Song ft. Someone'), 'song');
  assert.notEqual(songCore('The Weeknd - Save Your Tears'), a);
});

test('songCore handles Arabic titles', () => {
  const a = songCore('عمرو دياب - تملي معاك (فيديو كليب)');
  assert.equal(a, songCore('Amr Diab - تملي معاك | كلمات'));
  assert.equal(songCore('فيروز - كيفك انت حصرياً'), 'كيفك انت');
});

test('youtubeIdFromUrl', () => {
  assert.equal(youtubeIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeIdFromUrl('https://youtu.be/dQw4w9WgXcQ?t=10'), 'dQw4w9WgXcQ');
  assert.equal(youtubeIdFromUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeIdFromUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeIdFromUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(youtubeIdFromUrl('https://www.youtube.com/playlist?list=PL123'), null);
});
