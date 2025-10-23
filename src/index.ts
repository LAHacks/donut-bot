import { config, validateConfig } from './config.js';
import { createClient } from './client.js';
import { loadCommands } from './handlers/command-loader.js';
import { registerEventHandlers } from './handlers/event-handler.js';

async function main() {
  try {
    console.log('Starting bot...');

    // Validate configuration
    validateConfig();

    // Create Discord client
    const client = createClient();

    // Load commands
    await loadCommands(client);
    console.log(`Loaded ${client.commands.size} commands`);

    // Register event handlers
    registerEventHandlers(client);

    // Login to Discord
    await client.login(config.token);
    console.log('Bot is ready!');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main();
