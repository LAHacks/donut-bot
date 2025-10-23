import { Message } from 'discord.js';
import { config } from '../config.js';
import { donutTracker } from '../utils/donut-tracker.js';
import { pairingManager } from '../utils/pairing-manager.js';

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process messages in the donuts channel
  if (!config.donutsChannelId || message.channelId !== config.donutsChannelId) {
    console.log(`Skipping message: channelId=${message.channelId}, donutsChannelId=${config.donutsChannelId}`);
    return;
  }

  console.log('Processing message in donuts channel');

  // Check if message has mentions (pings)
  if (message.mentions.users.size === 0) return;

  // Check if message has image attachments
  const hasImage = message.attachments.some(attachment => {
    const contentType = attachment.contentType?.toLowerCase() || '';
    return contentType.startsWith('image/');
  });

  if (!hasImage) return;

  // Get the mentioned users (excluding bots)
  const mentionedUsers = message.mentions.users.filter(user => !user.bot);

  if (mentionedUsers.size === 0) return;

  // Record completion for each mentioned user paired with the message author
  const authorId = message.author.id;
  const guildId = message.guildId;

  if (!guildId) return;

  let recordedCount = 0;
  const alreadyCompleted: string[] = [];
  const notPaired: string[] = [];

  for (const [mentionedUserId, mentionedUser] of mentionedUsers) {
    // Check if they are current week partners
    const arePartners = pairingManager.areCurrentWeekPartners(guildId, authorId, mentionedUserId);
    console.log(`Checking if ${authorId} and ${mentionedUserId} are partners: ${arePartners}`);

    if (!arePartners) {
      notPaired.push(mentionedUser.username);
      continue;
    }

    const recorded = donutTracker.recordCompletion(
      guildId,
      authorId,
      mentionedUserId,
      message.id
    );

    if (recorded) {
      recordedCount++;
    } else {
      alreadyCompleted.push(mentionedUser.username);
    }
  }

  // Build response message
  let responses: string[] = [];

  if (recordedCount > 0) {
    await message.react('🍩');
    responses.push(`Donut completion recorded! 🎉`);
  }

  if (alreadyCompleted.length > 0) {
    responses.push(
      `You've already completed donuts with ${alreadyCompleted.join(', ')} this week!`
    );
  }

  if (notPaired.length > 0) {
    responses.push(
      `⚠️ You're not paired with ${notPaired.join(', ')} this week. Only post photos with your assigned partner!`
    );
  }

  if (responses.length > 0) {
    await message.reply(responses.join('\n\n'));
  }
}
