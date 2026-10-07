// Checked before loading anything else: older Node.js versions fail with confusing errors.
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`Node.js ${process.versions.node} is too old. Install Node.js 22.12 or newer (LTS) from https://nodejs.org`);
  process.exit(78);
}

await import('./bot.js');
