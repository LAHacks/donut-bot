import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DonutCompletion {
  userId1: string;
  userId2: string;
  timestamp: number;
  weekId: string; // e.g., "2025-W03"
  messageId: string;
}

interface DonutData {
  [guildId: string]: {
    completions: DonutCompletion[];
  };
}

const DATA_FILE = join(__dirname, '..', '..', 'data', 'donut-completions.json');

export class DonutTracker {
  private data: DonutData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DonutData {
    try {
      if (existsSync(DATA_FILE)) {
        const fileData = readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(fileData);
      }
    } catch (error) {
      console.error('Error loading donut completions:', error);
    }
    return {};
  }

  private saveData(): void {
    try {
      const dir = dirname(DATA_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving donut completions:', error);
    }
  }

  private getWeekId(date: Date = new Date()): string {
    // Get ISO week number
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }

  hasCompletedThisWeek(guildId: string, userId1: string, userId2: string): boolean {
    if (!this.data[guildId]) return false;

    const currentWeek = this.getWeekId();
    const sorted = [userId1, userId2].sort();

    return this.data[guildId].completions.some(completion => {
      if (completion.weekId !== currentWeek) return false;
      const completionSorted = [completion.userId1, completion.userId2].sort();
      return completionSorted[0] === sorted[0] && completionSorted[1] === sorted[1];
    });
  }

  recordCompletion(
    guildId: string,
    userId1: string,
    userId2: string,
    messageId: string
  ): boolean {
    // Check if already completed this week
    if (this.hasCompletedThisWeek(guildId, userId1, userId2)) {
      return false;
    }

    if (!this.data[guildId]) {
      this.data[guildId] = { completions: [] };
    }

    this.data[guildId].completions.push({
      userId1,
      userId2,
      timestamp: Date.now(),
      weekId: this.getWeekId(),
      messageId,
    });

    this.saveData();
    return true;
  }

  getLeaderboard(guildId: string): { userId: string; count: number }[] {
    if (!this.data[guildId]) return [];

    const counts = new Map<string, number>();

    for (const completion of this.data[guildId].completions) {
      counts.set(completion.userId1, (counts.get(completion.userId1) || 0) + 1);
      counts.set(completion.userId2, (counts.get(completion.userId2) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);
  }

  getUserStats(guildId: string, userId: string): { total: number; thisWeek: number } {
    if (!this.data[guildId]) return { total: 0, thisWeek: 0 };

    const currentWeek = this.getWeekId();
    let total = 0;
    let thisWeek = 0;

    for (const completion of this.data[guildId].completions) {
      if (completion.userId1 === userId || completion.userId2 === userId) {
        total++;
        if (completion.weekId === currentWeek) {
          thisWeek++;
        }
      }
    }

    return { total, thisWeek };
  }
}

export const donutTracker = new DonutTracker();
