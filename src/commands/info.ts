import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get information about the bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Bot Information')
      .setDescription('A Discord bot built with TypeScript and discord.js')
      .addFields(
        { name: 'Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${interaction.client.users.cache.size}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
