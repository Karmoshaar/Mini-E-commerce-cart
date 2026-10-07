import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanPageTitle, extractPageMeta, lazyTrack, toUserError, trackFromInfo } from '../src/media/resolve.js';
import { UserError } from '../src/errors.js';

test('trackFromInfo: flat YouTube entry', () => {
  const track = trackFromInfo({
    _type: 'url', ie_key: 'Youtube', id: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up', duration: 212.0, channel: 'Rick Astley',
  });
  assert.equal(track.youtubeId, 'dQw4w9WgXcQ');
  assert.equal(track.duration, 212);
  assert.equal(track.source, 'YouTube');
  assert.equal(track.author, 'Rick Astley');
  assert.equal(track.thumbnail, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  assert.equal(track.partial, false);
});

test('trackFromInfo: full extraction uses webpage_url, not the media url', () => {
  const track = trackFromInfo({
    extractor_key: 'Soundcloud', id: '123', title: 'Song', webpage_url: 'https://soundcloud.com/a/song',
    url: 'https://cf-media.sndcdn.com/xyz.mp3', duration: 180, uploader: 'Artist', thumbnail: 'https://i1.sndcdn.com/a.jpg',
  });
  assert.equal(track.url, 'https://soundcloud.com/a/song');
  assert.equal(track.source, 'SoundCloud');
  assert.equal(track.youtubeId, null);
  assert.equal(track.thumbnail, 'https://i1.sndcdn.com/a.jpg');
});

test('trackFromInfo: untitled flat entries are partial; nested playlists are skipped', () => {
  const partial = trackFromInfo({ _type: 'url', ie_key: 'Soundcloud', url: 'https://api.soundcloud.com/tracks/42' });
  assert.equal(partial.partial, true);
  assert.equal(trackFromInfo({ _type: 'url', ie_key: 'YoutubeTab', url: 'https://www.youtube.com/@x/videos' }), null);
  assert.equal(trackFromInfo({ _type: 'url', ie_key: 'Youtube', id: 'x' }).url, 'https://www.youtube.com/watch?v=x');
  assert.equal(trackFromInfo(null), null);
});

test('lazyTrack builds a YouTube search from artist and name', () => {
  const track = lazyTrack({ name: 'Blinding Lights', artist: 'The Weeknd', duration: 200.04, source: 'Spotify' });
  assert.equal(track.url, null);
  assert.equal(track.query, 'The Weeknd - Blinding Lights');
  assert.equal(track.duration, 200);
});

test('extractPageMeta reads schema.org recordings and og tags', () => {
  const html = `<html><head>
    <meta property="og:title" content="Don&#39;t Stop &amp; Go on Apple Music">
    <meta content='Apple Music' property='og:site_name'>
    <script type="application/ld+json">{"@type":"MusicAlbum","name":"Album","track":[
      {"@type":"MusicRecording","name":"One","byArtist":{"@type":"MusicGroup","name":"Band"}},
      {"@type":"MusicRecording","name":"Two","byArtist":[{"name":"Band"}]},
      {"@type":"MusicRecording","name":"One","byArtist":{"name":"Band"}}]}</script>
    </head></html>`;
  const meta = extractPageMeta(html);
  assert.equal(meta.title, "Don't Stop & Go on Apple Music");
  assert.equal(meta.siteName, 'Apple Music');
  assert.deepEqual(meta.tracks, [{ name: 'One', artist: 'Band' }, { name: 'Two', artist: 'Band' }]);
});

test('extractPageMeta falls back to <title>', () => {
  assert.equal(extractPageMeta('<title>Song - Artist | Anghami</title>').title, 'Song - Artist | Anghami');
});

test('cleanPageTitle strips site names', () => {
  assert.equal(cleanPageTitle('‎Blinding Lights by The Weeknd on Apple Music'), 'Blinding Lights by The Weeknd');
  assert.equal(cleanPageTitle('Song - Artist | Anghami'), 'Song - Artist');
  assert.equal(cleanPageTitle('Song - Song by Artist - Apple Music'), 'Song Artist');
  assert.equal(cleanPageTitle('Track — My Site', 'My Site'), 'Track');
  assert.equal(cleanPageTitle(null), '');
});

test('toUserError explains common yt-dlp failures', () => {
  assert.ok(toUserError(new Error('Unsupported URL: https://x')) instanceof UserError);
  assert.match(toUserError(new Error("Sign in to confirm you're not a bot")).message, /كوكيز/);
  assert.match(toUserError(new Error('Video unavailable')).message, /مش متاح/);
  const original = new UserError('x');
  assert.equal(toUserError(original), original);
});

test('toUserError does not mistake "webpage" for an age restriction', () => {
  const message = toUserError(new Error('Unable to download webpage: HTTP Error 404: File not found')).message;
  assert.match(message, /مش متاح/);
  assert.match(toUserError(new Error('This video is private')).message, /خاص/);
});
