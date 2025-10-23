import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types/command.js';

const DONUT_ROLE_NAME = 'Donut';
const REACTION_EMOJI = '🍩';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('init')
    .setDescription('Initialize the donut pool - members react to join!')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
      return;
    }

    // Defer reply since we'll be doing some work
    await interaction.deferReply({ ephemeral: true });

    try {
      // Find or create the Donut role
      let donutRole = interaction.guild.roles.cache.find(role => role.name === DONUT_ROLE_NAME);

      if (!donutRole) {
        donutRole = await interaction.guild.roles.create({
          name: DONUT_ROLE_NAME,
          color: 0xFFB6C1, // Pink color for donuts
          reason: 'Donut pool role created by init command',
        });
      }

      // Send the message to the channel with @everyone ping
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply('Could not send message to this channel!');
        return;
      }

      const message = await channel.send({
        content: `@everyone\n\n🍩 **Welcome to the Donut Pool!** 🍩\n\nReact with ${REACTION_EMOJI} to join the donut pool and get the ${donutRole} role!`,
        allowedMentions: { parse: ['everyone'] },
      });

      // Add the initial reaction
      await message.react(REACTION_EMOJI);

      // Create a reaction collector
      const collector = message.createReactionCollector({
        filter: (reaction) => reaction.emoji.name === REACTION_EMOJI,
        dispose: true, // Also handle reaction removals
      });

      collector.on('collect', async (reaction, user) => {
        if (user.bot) return;

        try {
          const member = await interaction.guild!.members.fetch(user.id);
          if (member && donutRole) {
            await member.roles.add(donutRole);
            console.log(`Added ${DONUT_ROLE_NAME} role to ${user.tag}`);
          }
        } catch (error) {
          console.error(`Failed to add role to ${user.tag}:`, error);
        }
      });

      collector.on('remove', async (reaction, user) => {
        if (user.bot) return;

        try {
          const member = await interaction.guild!.members.fetch(user.id);
          if (member && donutRole) {
            await member.roles.remove(donutRole);
            console.log(`Removed ${DONUT_ROLE_NAME} role from ${user.tag}`);
          }
        } catch (error) {
          console.error(`Failed to remove role from ${user.tag}:`, error);
        }
      });

      await interaction.editReply(
        `Donut pool initialized! Members can react to the message with ${REACTION_EMOJI} to join.`
      );
    } catch (error) {
      console.error('Error in init command:', error);
      await interaction.editReply('Failed to initialize donut pool. Make sure I have permission to manage roles!');
    }
  },
};

export default command;
