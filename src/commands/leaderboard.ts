import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command.js';
import { donutTracker } from '../utils/donut-tracker.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the donut completion leaderboard'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server!',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const leaderboard = donutTracker.getLeaderboard(interaction.guild.id);

      if (leaderboard.length === 0) {
        await interaction.editReply(
          'No donut completions yet! Use `/pair` to create pairings, then post a photo with your partner in the donuts channel.'
        );
        return;
      }

      // Fetch members to get their display names
      await interaction.guild.members.fetch();

      const embed = new EmbedBuilder()
        .setColor(0xFFB6C1)
        .setTitle('🍩 Donut Leaderboard')
        .setDescription('Members ranked by total donut completions')
        .setTimestamp();

      // Build leaderboard text
      let leaderboardText = '';
      const maxDisplay = 10; // Show top 10

      for (let i = 0; i < Math.min(leaderboard.length, maxDisplay); i++) {
        const entry = leaderboard[i];
        const member = await interaction.guild.members.fetch(entry.userId).catch(() => null);
        const displayName = member ? member.displayName : 'Unknown User';

        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const stats = donutTracker.getUserStats(interaction.guild.id, entry.userId);

        leaderboardText += `${medal} **${displayName}** - ${entry.count} donut${entry.count !== 1 ? 's' : ''}`;
        if (stats.thisWeek > 0) {
          leaderboardText += ` (${stats.thisWeek} this week)`;
        }
        leaderboardText += '\n';
      }

      embed.addFields({ name: 'Rankings', value: leaderboardText });

      if (leaderboard.length > maxDisplay) {
        embed.setFooter({ text: `Showing top ${maxDisplay} of ${leaderboard.length} members` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await interaction.editReply('Failed to fetch leaderboard. Please try again later.');
    }
  },
};

export default command;
