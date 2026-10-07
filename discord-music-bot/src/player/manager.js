import { ActivityType } from 'discord.js';
import { config } from '../config.js';
import { truncate } from '../util.js';
import { GuildPlayer } from './GuildPlayer.js';

export class PlayerManager {
  constructor(client) {
    this.client = client;
    this.players = new Map();
  }

  get(guildId) {
    const player = this.players.get(guildId);
    return player && !player.destroyed ? player : null;
  }

  obtain(guild) {
    const existing = this.get(guild.id);
    if (existing) return existing;
    const player = new GuildPlayer(guild, {
      onDestroy: (destroyed) => {
        if (this.players.get(guild.id) === destroyed) this.players.delete(guild.id);
        this.updatePresence();
      },
      onTrackChange: () => this.updatePresence(),
    });
    this.players.set(guild.id, player);
    return player;
  }

  /** Shows "Listening to <song>" on the bot's profile. */
  updatePresence() {
    const user = this.client.user;
    if (!user) return;
    const playing = [...this.players.values()].findLast((p) => p.current);
    if (playing) {
      user.setActivity(truncate(playing.current.title, 120), { type: ActivityType.Listening });
    } else {
      user.setActivity(`${config.prefix}h | 🎵`, { type: ActivityType.Listening });
    }
  }

  destroyAll() {
    for (const player of this.players.values()) player.destroy();
  }
}
