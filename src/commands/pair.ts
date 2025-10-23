import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../types/command.js';
import { pairingManager } from '../utils/pairing-manager.js';

const DONUT_ROLE_NAME = 'Donut';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pair')
    .setDescription('Pair members with the Donut role for donut chats!')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
      // Find the Donut role
      const donutRole = interaction.guild.roles.cache.find(
        role => role.name === DONUT_ROLE_NAME
      );

      if (!donutRole) {
        await interaction.editReply(
          `Could not find the "${DONUT_ROLE_NAME}" role. Run \`/init\` first!`
        );
        return;
      }

      // Get all members with the Donut role
      await interaction.guild.members.fetch();
      const donutMembers = donutRole.members.filter(member => !member.user.bot);

      if (donutMembers.size < 2) {
        await interaction.editReply(
          `Not enough members with the ${donutRole} role to create pairs. Need at least 2 members!`
        );
        return;
      }

      const userIds = Array.from(donutMembers.keys());
      const { pairs, unpaired } = pairingManager.createPairings(
        interaction.guild.id,
        userIds
      );

      if (pairs.length === 0) {
        await interaction.editReply(
          'Could not create any pairs. This might happen if everyone has already been paired with everyone else.'
        );
        return;
      }

      // Save the pairings to history
      pairingManager.savePairings(interaction.guild.id, pairs);

      // Create embed to show pairings
      const embed = new EmbedBuilder()
        .setColor(0xFFB6C1)
        .setTitle('🍌 Donut Pairings!')
        .setDescription(
          'Here are this round\'s donut pairs! Each pair should schedule a time to chat over donuts (or coffee, or tea!).'
        )
        .setTimestamp();

      // Add pairs to embed
      let pairsText = '';
      for (let i = 0; i < pairs.length; i++) {
        const [userId1, userId2] = pairs[i];
        const member1 = donutMembers.get(userId1);
        const member2 = donutMembers.get(userId2);
        pairsText += `**Pair ${i + 1}:** ${member1} & ${member2}\n`;
      }
      embed.addFields({ name: 'Pairs', value: pairsText });

      // Handle unpaired members
      if (unpaired.length > 0) {
        const unpairedText = unpaired
          .map(id => `${donutMembers.get(id)}`)
          .join(', ');
        embed.addFields({
          name: 'Unpaired (odd number)',
          value: unpairedText,
        });
      }

      // Send DMs to each pair
      let dmsSent = 0;
      let dmsFailed = 0;

      for (const [userId1, userId2] of pairs) {
        const member1 = donutMembers.get(userId1);
        const member2 = donutMembers.get(userId2);

        if (!member1 || !member2) continue;

        const dmEmbed = new EmbedBuilder()
          .setColor(0xFFB6C1)
          .setTitle('🍩 You\'ve been paired for Donuts!')
          .setDescription(
            `You've been paired with ${member2} (${member1.user.tag} & ${member2.user.tag})!\n\n` +
              'Reach out to schedule a time to chat over donuts, coffee, or tea. Get to know each other!'
          )
          .setTimestamp();

        // Send to both users
        for (const member of [member1, member2]) {
          try {
            await member.send({ embeds: [dmEmbed] });
            dmsSent++;
          } catch (error) {
            console.error(`Failed to send DM to ${member.user.tag}:`, error);
            dmsFailed++;
          }
        }
      }

      // Add DM status to embed
      embed.addFields({
        name: 'Notifications',
        value: `DMs sent: ${dmsSent} | Failed: ${dmsFailed}`,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in pair command:', error);
      await interaction.editReply(
        'Failed to create pairings. Please try again later.'
      );
    }
  },
};

export default command;
