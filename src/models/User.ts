import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phone: string;
  avatar: string;
  role: 'admin' | 'host' | 'staff';
  staffType?: 'cashier' | 'bar' | 'kitchen';
  storeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },

    role: {
      type: String,
      enum: ['admin', 'host', 'staff'],
      default: 'staff',
    },
    staffType: {
      type: String,
      enum: ['cashier', 'bar', 'kitchen'],
      // Only required if role is 'staff'
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Validate: if role is staff, staffType is required
userSchema.pre('save', function (next) {
  if (this.role === 'staff' && !this.staffType) {
    next(new Error('Staff type is required for staff role'));
  } else {
    next();
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
