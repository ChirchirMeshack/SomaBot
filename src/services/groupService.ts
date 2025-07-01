import GroupModel from '../models/Group';

const groupService = {
  async createGroup(name: string, description?: string) {
    return GroupModel.createGroup({ name, description });
  },
  async joinGroup(user_id: number, code: string) {
    return GroupModel.joinGroup(user_id, code);
  },
  async listUserGroups(user_id: number) {
    return GroupModel.listUserGroups(user_id);
  },
  async listGroupMembers(group_id: number) {
    return GroupModel.listGroupMembers(group_id);
  }
};

export default groupService; 