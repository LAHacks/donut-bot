import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WeeklyPairing {
  pairs: [string, string][];
  weekId: string;
  timestamp: number;
}

interface PairingHistory {
  [guildId: string]: {
    allTimePairs: {
      [userId: string]: string[]; // userId -> array of user IDs they've been paired with
    };
    weeklyPairings: WeeklyPairing[];
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

  private getWeekId(date: Date = new Date()): string {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }

  hasPairedBefore(guildId: string, userId1: string, userId2: string): boolean {
    if (!this.history[guildId]) return false;
    if (!this.history[guildId].allTimePairs) return false;
    if (!this.history[guildId].allTimePairs[userId1]) return false;
    return this.history[guildId].allTimePairs[userId1].includes(userId2);
  }

  getCurrentWeekPairing(guildId: string, userId: string): string | null {
    if (!this.history[guildId]) return null;
    if (!this.history[guildId].weeklyPairings) return null;

    const currentWeek = this.getWeekId();
    const weeklyPairing = this.history[guildId].weeklyPairings.find(
      wp => wp.weekId === currentWeek
    );

    if (!weeklyPairing) return null;

    for (const [user1, user2] of weeklyPairing.pairs) {
      if (user1 === userId) return user2;
      if (user2 === userId) return user1;
    }

    return null;
  }

  areCurrentWeekPartners(guildId: string, userId1: string, userId2: string): boolean {
    if (!this.history[guildId]) return false;
    if (!this.history[guildId].weeklyPairings) return false;

    const currentWeek = this.getWeekId();
    const weeklyPairing = this.history[guildId].weeklyPairings.find(
      wp => wp.weekId === currentWeek
    );

    if (!weeklyPairing) return false;

    const sorted = [userId1, userId2].sort();
    return weeklyPairing.pairs.some(pair => {
      const pairSorted = [pair[0], pair[1]].sort();
      return pairSorted[0] === sorted[0] && pairSorted[1] === sorted[1];
    });
  }

  recordPairing(guildId: string, userId1: string, userId2: string): void {
    if (!this.history[guildId]) {
      this.history[guildId] = { allTimePairs: {}, weeklyPairings: [] };
    }

    // Record in both directions
    if (!this.history[guildId].allTimePairs[userId1]) {
      this.history[guildId].allTimePairs[userId1] = [];
    }
    if (!this.history[guildId].allTimePairs[userId2]) {
      this.history[guildId].allTimePairs[userId2] = [];
    }

    if (!this.history[guildId].allTimePairs[userId1].includes(userId2)) {
      this.history[guildId].allTimePairs[userId1].push(userId2);
    }
    if (!this.history[guildId].allTimePairs[userId2].includes(userId1)) {
      this.history[guildId].allTimePairs[userId2].push(userId1);
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
    if (!this.history[guildId]) {
      this.history[guildId] = { allTimePairs: {}, weeklyPairings: [] };
    }

    // Save to all-time history
    for (const [userId1, userId2] of pairs) {
      this.recordPairing(guildId, userId1, userId2);
    }

    // Save as this week's pairing
    const currentWeek = this.getWeekId();
    this.history[guildId].weeklyPairings.push({
      pairs,
      weekId: currentWeek,
      timestamp: Date.now(),
    });

    this.saveHistory();
  }
}

export const pairingManager = new PairingManager();
