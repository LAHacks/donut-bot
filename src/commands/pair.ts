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
        flags: 64,
      });
      return;
    }

    // ⚡ Immediately defer reply so Discord doesn’t time out
    try {
      await interaction.deferReply();
    } catch (error: any) {
      // Handle expired or invalid interactions gracefully
      if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
        console.log(`Interaction ${interaction.id} has expired or is invalid, ignoring...`);
        return;
      }
      throw error;
    }

    try {
      // 🧱 Get Donut role
      const donutRole = interaction.guild.roles.cache.find(
        (role) => role.name === DONUT_ROLE_NAME
      );

      if (!donutRole) {
        try {
          await interaction.editReply(
            `Could not find the "${DONUT_ROLE_NAME}" role. Run \`/init\` first!`
          );
        } catch (error: any) {
          if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
            console.log(`Could not edit reply for pair command (interaction ${interaction.id} expired).`);
            return;
          }
          throw error;
        }
        return;
      }

      await interaction.guild.members.fetch();
      const donutMembers = donutRole.members.filter((m) => !m.user.bot);

      if (donutMembers.size < 2) {
        try {
          await interaction.editReply(
            `Not enough members with the ${donutRole} role to create pairs. Need at least 2 members!`
          );
        } catch (error: any) {
          if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
            console.log(`Could not edit reply for pair command (interaction ${interaction.id} expired).`);
            return;
          }
          throw error;
        }
        return;
      }

      const userIds = Array.from(donutMembers.keys());
      const { pairs, unpaired } = pairingManager.createPairings(
        interaction.guild.id,
        userIds
      );

      if (pairs.length === 0) {
        try {
          await interaction.editReply(
            'Could not create any pairs. This might happen if everyone has already been paired with everyone else.'
          );
        } catch (error: any) {
          if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
            console.log(`Could not edit reply for pair command (interaction ${interaction.id} expired).`);
            return;
          }
          throw error;
        }
        return;
      }

      pairingManager.savePairings(interaction.guild.id, pairs);

      // 🪶 Build main embed
      const embed = new EmbedBuilder()
        .setColor(0xffb6c1)
        .setTitle('🍌 Donut Pairings!')
        .setDescription(
          "Here are this round's donut pairs! Each pair should schedule a time to chat over donuts (or coffee, or tea!)."
        )
        .setTimestamp();

      const FIELD_CHAR_LIMIT = 1024;
      let pairsText = '';
      let fieldIndex = 1;

      for (let i = 0; i < pairs.length; i++) {
        const [id1, id2] = pairs[i];
        const m1 = donutMembers.get(id1);
        const m2 = donutMembers.get(id2);
        const pairLine = `**Pair ${i + 1}:** ${m1} & ${m2}\n`;

        if (pairsText.length + pairLine.length > FIELD_CHAR_LIMIT) {
          embed.addFields({
            name: fieldIndex === 1 ? 'Pairs' : 'Pairs (continued)',
            value: pairsText,
          });
          pairsText = pairLine;
          fieldIndex++;
        } else {
          pairsText += pairLine;
        }
      }

      if (pairsText.length > 0) {
        embed.addFields({
          name: fieldIndex === 1 ? 'Pairs' : 'Pairs (continued)',
          value: pairsText,
        });
      }

      if (unpaired.length > 0) {
        const unpairedText = unpaired
          .map((id) => `${donutMembers.get(id)}`)
          .join(', ');
        embed.addFields({
          name: 'Unpaired (odd number)',
          value: unpairedText,
        });
      }

      // ⚡ Edit reply early to avoid timeout
      try {
        await interaction.editReply({
          content: 'Pairings created! Sending DMs...',
          embeds: [embed],
        });
      } catch (error: any) {
        if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
          console.log(`Could not edit reply for pair command (interaction ${interaction.id} expired).`);
          return;
        }
        throw error;
      }

      // 📩 Send DMs concurrently
      let dmsSent = 0;
      let dmsFailed = 0;

      const dmPromises = pairs.flatMap(([id1, id2]) => {
        const m1 = donutMembers.get(id1);
        const m2 = donutMembers.get(id2);
        if (!m1 || !m2) return [];

        const dmEmbed = new EmbedBuilder()
          .setColor(0xffb6c1)
          .setTitle("🍩 You've been paired for Donuts!")
          .setDescription(
            `You've been paired with ${m2} (${m1.user.tag} & ${m2.user.tag})!\n\nReach out to schedule a time to chat over donuts, coffee, or tea.`
          )
          .setTimestamp();

        return [m1.send({ embeds: [dmEmbed] }), m2.send({ embeds: [dmEmbed] })];
      });

      const dmResults = await Promise.allSettled(dmPromises);

      for (const result of dmResults) {
        if (result.status === 'fulfilled') dmsSent++;
        else dmsFailed++;
      }

      embed.addFields({
        name: 'Notifications',
        value: `DMs sent: ${dmsSent} | Failed: ${dmsFailed}`,
      });

      // ✅ Final edit
      await interaction.editReply({
        content: '✅ Pairings complete!',
        embeds: [embed],
      });
    } catch (error: any) {
      // Handle expired or invalid interactions gracefully
      if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
        console.log(`Pair command interaction ${interaction.id} has expired or is invalid, ignoring...`);
        return;
      }

      console.error('Error in /pair command:', error);
      try {
        await interaction.editReply(
          'Failed to create pairings. Please try again later.'
        );
      } catch (editError: any) {
        // If interaction expired, log instead of crash
        if (editError.code === 10062 || editError.message?.includes('Unknown interaction')) {
          console.log(`Could not edit reply for pair command (interaction ${interaction.id} expired).`);
          return;
        }
        console.error('Could not edit reply:', editError);
      }
    }
  },
};

export default command;