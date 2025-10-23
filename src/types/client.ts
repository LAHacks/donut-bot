import { Client, Collection } from 'discord.js';
import { Command } from './command.js';

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}
