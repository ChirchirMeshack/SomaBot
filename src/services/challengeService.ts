import ChallengeModel from '../models/Challenge';
import UserModel from '../models/User';
import { formatMessage, sendMessage } from './whatsappService';

const challengeService = {
  async optIn(user_id: number, challenge_id: number) {
    return ChallengeModel.optIn(user_id, challenge_id);
  },
  async getUserStatus(user_id: number) {
    return ChallengeModel.getUserChallenges(user_id);
  },
  async updateProgress(user_id: number, challenge_id: number, increment = 1) {
    const updated = await ChallengeModel.updateProgress(user_id, challenge_id, increment);
    if (updated) {
      const user = await UserModel.getUserById(user_id);
      if (user && user.phone) {
        let message = `Challenge progress: ${updated.progress}/${updated.goal}`;
        if (updated.completed) {
          message = `🎉 Challenge complete! You finished: ${updated.description}`;
        }
        await sendMessage(formatMessage(user.phone, message));
      }
    }
    return updated;
  }
};

export default challengeService; 