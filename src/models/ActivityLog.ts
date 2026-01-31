import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  type: 'host' | 'store' | 'order' | 'revenue' | 'system';
  message: string;
  actor?: mongoose.Types.ObjectId; // admin / staff
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    type: {
      type: String,
      enum: ['host', 'store', 'order', 'revenue', 'system'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);

export default ActivityLog;
