import dotenv from 'dotenv';

dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  donutsChannelId: process.env.DONUTS_CHANNEL_ID || '',
};

export function validateConfig(): void {
  if (!config.token) {
    throw new Error('DISCORD_TOKEN is not set in environment variables');
  }
  if (!config.clientId) {
    throw new Error('CLIENT_ID is not set in environment variables');
  }
}
