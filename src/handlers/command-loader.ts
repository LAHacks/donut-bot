import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { ExtendedClient } from '../types/client.js';
import { Command } from '../types/command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client: ExtendedClient): Promise<void> {
  const commandsPath = join(__dirname, '..', 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const commandModule = await import(filePath);
    const command: Command = commandModule.default;

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }
}
