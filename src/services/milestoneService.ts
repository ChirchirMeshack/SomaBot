import ProgressModel from '../models/Progress';
import UserModel from '../models/User';
import { formatMessage, sendMessage } from './whatsappService';

export async function checkAndCelebrateMilestones(user_id: number): Promise<string | null> {
  // Get user info
  const user = await UserModel.getUserById(user_id);
  if (!user || !user.phone) return null;

  // Get current streak and completions
  const completions = await ProgressModel.getTopCompletions(1000);
  const streaks = await ProgressModel.getTopStreaks(1000);
  const userCompletions = completions.find(u => u.user_id == user_id);
  const userStreak = streaks.find(u => u.user_id == user_id);
  let message = null;

  // Example milestones
  if (userStreak && Number(userStreak.max_streak) === 7) {
    message = '🎉 Congrats! You hit a 7-day learning streak! Keep it up!';
  } else if (userCompletions && Number(userCompletions.completions) === 50) {
    message = '🏆 Amazing! You have completed 50 lessons! You unlocked bonus content!';
  }

  if (message) {
    const msg = formatMessage(user.phone, message);
    await sendMessage(msg);
    return message;
  }
  return null;
} 