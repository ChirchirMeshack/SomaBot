import UserModel from '../models/User';
import { formatMessage, sendMessage } from './whatsappService';

const shareService = {
  async sendInvite(user_id: number, friend_phone: string) {
    const user = await UserModel.getUserById(user_id);
    if (!user) throw new Error('User not found');
    const message = `👋 Your friend ${user.name || 'A SomaBot user'} invites you to join SomaBot for microlearning! Reply JOIN to get started.`;
    await sendMessage(formatMessage(friend_phone, message));
    return { sent: true };
  }
};

export default shareService; 