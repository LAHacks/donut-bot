import { Events } from 'discord.js';
import { ExtendedClient } from '../types/client.js';
import { handleInteraction } from './interaction-handler.js';

export function registerEventHandlers(client: ExtendedClient): void {
  // Ready event
  client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  });

  // Interaction create event
  client.on(Events.InteractionCreate, async interaction => {
    await handleInteraction(interaction);
  });

  // Error handling
  client.on(Events.Error, error => {
    console.error('Discord client error:', error);
  });

  // Warning handling
  client.on(Events.Warn, warning => {
    console.warn('Discord client warning:', warning);
  });
}
