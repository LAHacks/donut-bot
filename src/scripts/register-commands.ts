import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { config, validateConfig } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function registerCommands() {
  try {
    validateConfig();

    const commands = [];
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file =>
      file.endsWith('.js') || file.endsWith('.ts')
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const commandModule = await import(filePath);
      const command = commandModule.default;

      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`Loaded command: ${command.data.name}`);
      }
    }

    const rest = new REST().setToken(config.token);

    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    let data;
    if (config.guildId) {
      // Register to specific guild (faster for testing)
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`Successfully registered commands to guild ${config.guildId}`);
    } else {
      // Register globally
      data = await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('Successfully registered commands globally');
    }

    console.log(`Successfully reloaded ${(data as any).length} application (/) commands.`);
  } catch (error) {
    console.error('Error registering commands:', error);
    process.exit(1);
  }
}

registerCommands();
