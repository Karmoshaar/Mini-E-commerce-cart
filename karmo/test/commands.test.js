import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SlashCommandBuilder } from 'discord.js';
import { createCommands, normalizeCommandName, slashName } from '../src/commands.js';
import { releaseAssetName, versionAtLeast, extractError } from '../src/media/ytdlp.js';

test('every command has a one-letter key, and names are unique', () => {
  const { commands, find } = createCommands({});
  for (const command of commands) {
    assert.match(command.keys[0], /^[a-z]$/, `${command.name} needs a one-letter English key first`);
    assert.ok(command.keys.some((k) => /\p{Script=Arabic}/u.test(k)), `${command.name} needs an Arabic word`);
    for (const name of [command.name, ...command.keys, ...command.aliases]) assert.equal(find(name), command);
  }
});

test('commands match however they are typed', () => {
  const { find } = createCommands({});
  assert.equal(find('P').name, 'play');
  assert.equal(find('ش').name, 'play');
  assert.equal(find('شغّل').name, 'play');
  assert.equal(find('اطفى').name, 'stop');
  assert.equal(find('اطفي').name, 'stop');
  assert.equal(find('x').name, 'stop');
  assert.equal(find('قايمة').name, 'queue');
  assert.equal(find('القائمه').name, 'queue');
  assert.equal(find('استني').name, 'pause');
  assert.equal(find('مساعده').name, 'help');
  assert.equal(find('nope'), null);
  assert.equal(normalizeCommandName('أإآ'), 'ااا');
});

test('slash command definitions are valid', () => {
  const { commands } = createCommands({});
  const names = new Set();
  for (const command of commands) {
    const name = slashName(command);
    assert.ok(!names.has(name), `duplicate slash name ${name}`);
    names.add(name);
    const builder = new SlashCommandBuilder().setName(name).setDescription(command.description.slice(0, 100));
    assert.doesNotThrow(() => builder.toJSON());
  }
  assert.ok(names.has('p') && names.has('s') && names.has('q') && names.has('x'));
});

test('yt-dlp helpers', () => {
  assert.equal(releaseAssetName('win32', 'x64', false), 'yt-dlp.exe');
  assert.equal(releaseAssetName('darwin', 'arm64', false), 'yt-dlp_macos');
  assert.equal(releaseAssetName('linux', 'x64', false), 'yt-dlp_linux');
  assert.equal(releaseAssetName('linux', 'arm64', true), 'yt-dlp_musllinux_aarch64');
  assert.equal(releaseAssetName('freebsd', 'x64', false), null);
  assert.ok(versionAtLeast('2026.08.19', [2025, 11, 12]));
  assert.ok(versionAtLeast('2025.11.12', [2025, 11, 12]));
  assert.ok(!versionAtLeast('2025.10.22', [2025, 11, 12]));
  assert.equal(extractError('WARNING: x\nERROR: [youtube] abc123: Video unavailable\n'), 'Video unavailable');
  assert.equal(extractError('ERROR: Unsupported URL: https://x'), 'Unsupported URL: https://x');
});
