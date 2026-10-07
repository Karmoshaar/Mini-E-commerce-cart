import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCommands } from '../src/commands.js';
import { controlRows, helpEmbed, nowPlayingEmbed, queueEmbed } from '../src/ui.js';

const track = (i, extra = {}) => ({
  title: `Artist ${i} - Song [Official] (${i}) *bold* _x_`,
  author: 'Artist',
  url: `https://www.youtube.com/watch?v=abcdefghij${i % 10}`,
  link: `https://example.com/song_(${i})`,
  duration: 200 + i,
  isLive: false,
  thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
  source: 'YouTube',
  requester: i % 2 ? { id: '1', name: 'a' } : null,
  ...extra,
});

const fakePlayer = (queueLength) => ({
  current: track(0, { requester: { id: '123', name: 'me' } }),
  queue: Array.from({ length: queueLength }, (_, i) => track(i + 1)),
  autoplay: true,
  loop: 'queue',
  volume: 80,
  isPaused: false,
  position: () => 42,
});

test('now playing / queue / help embeds and buttons pass discord.js validation', () => {
  for (const n of [0, 1, 37]) {
    const player = fakePlayer(n);
    nowPlayingEmbed(player).toJSON();
    const np = nowPlayingEmbed(player, { showProgress: true }).toJSON();
    assert.match(np.description, /0:42/);
    assert.ok(np.url.includes('%28'));
    const rows = controlRows(player).map((row) => row.toJSON());
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.components.length === 5));
    for (const page of [1, 2, 99]) {
      const q = queueEmbed(player, page).toJSON();
      assert.ok(q.description.length <= 4096);
    }
  }
  const live = fakePlayer(0);
  live.current = track(0, { isLive: true, duration: null, thumbnail: null, link: null, url: 'not a url' });
  nowPlayingEmbed(live, { showProgress: true }).toJSON();

  const { commands } = createCommands({});
  const help = helpEmbed(commands, '!').toJSON();
  assert.ok(help.description.length <= 4096, `help is ${help.description.length} chars`);
  assert.match(help.title, /Karmo/);
});
