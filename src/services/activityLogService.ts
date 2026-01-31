import ActivityLog from '../models/ActivityLog';

class ActivityLogService {
  async createLog(
    type: 'host' | 'store' | 'order' | 'revenue' | 'system',
    message: string,
    actor?: string,
  ) {
    await ActivityLog.create({
      type,
      message,
      actor,
    });
  }

  async getRecent(limit = 10) {
    return ActivityLog.find().sort({ createdAt: -1 }).limit(limit);
  }
}

export default new ActivityLogService();
