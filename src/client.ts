import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { ExtendedClient } from './types/client.js';

export function createClient(): ExtendedClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User],
  }) as ExtendedClient;

  client.commands = new Collection();

  return client;
}
