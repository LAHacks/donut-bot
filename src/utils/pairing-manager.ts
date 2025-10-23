import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PairingHistory {
  [guildId: string]: {
    [userId: string]: string[]; // userId -> array of user IDs they've been paired with
  };
}

const DATA_FILE = join(__dirname, '..', '..', 'data', 'pairing-history.json');

export class PairingManager {
  private history: PairingHistory;

  constructor() {
    this.history = this.loadHistory();
  }

  private loadHistory(): PairingHistory {
    try {
      if (existsSync(DATA_FILE)) {
        const data = readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading pairing history:', error);
    }
    return {};
  }

  private saveHistory(): void {
    try {
      const dir = dirname(DATA_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(DATA_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('Error saving pairing history:', error);
    }
  }

  hasPairedBefore(guildId: string, userId1: string, userId2: string): boolean {
    if (!this.history[guildId]) return false;
    if (!this.history[guildId][userId1]) return false;
    return this.history[guildId][userId1].includes(userId2);
  }

  recordPairing(guildId: string, userId1: string, userId2: string): void {
    if (!this.history[guildId]) {
      this.history[guildId] = {};
    }

    // Record in both directions
    if (!this.history[guildId][userId1]) {
      this.history[guildId][userId1] = [];
    }
    if (!this.history[guildId][userId2]) {
      this.history[guildId][userId2] = [];
    }

    if (!this.history[guildId][userId1].includes(userId2)) {
      this.history[guildId][userId1].push(userId2);
    }
    if (!this.history[guildId][userId2].includes(userId1)) {
      this.history[guildId][userId2].push(userId1);
    }

    this.saveHistory();
  }

  /**
   * Create optimal pairings avoiding previous pairs
   * Returns array of [userId1, userId2] pairs and array of unpaired users
   */
  createPairings(
    guildId: string,
    userIds: string[]
  ): { pairs: [string, string][]; unpaired: string[] } {
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);
    const pairs: [string, string][] = [];
    const remaining = new Set(shuffled);

    // Try to pair people who haven't been paired before
    for (const userId of shuffled) {
      if (!remaining.has(userId)) continue;

      let paired = false;
      // Find someone this user hasn't been paired with
      for (const partnerId of remaining) {
        if (partnerId === userId) continue;
        if (!this.hasPairedBefore(guildId, userId, partnerId)) {
          pairs.push([userId, partnerId]);
          remaining.delete(userId);
          remaining.delete(partnerId);
          paired = true;
          break;
        }
      }

      // If no new pairing found and this is the last chance, pair with anyone
      if (!paired && remaining.size >= 2) {
        const others = Array.from(remaining).filter(id => id !== userId);
        if (others.length > 0) {
          const partnerId = others[0];
          pairs.push([userId, partnerId]);
          remaining.delete(userId);
          remaining.delete(partnerId);
        }
      }
    }

    return {
      pairs,
      unpaired: Array.from(remaining),
    };
  }

  savePairings(guildId: string, pairs: [string, string][]): void {
    for (const [userId1, userId2] of pairs) {
      this.recordPairing(guildId, userId1, userId2);
    }
  }
}

export const pairingManager = new PairingManager();
