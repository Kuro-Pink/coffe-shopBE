import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'admin' | 'host' | 'staff';
  storeId?: string;
}

interface LoginData {
  email: string;
  password: string;
}
interface UpdateMeData {
  name?: string;
  phone?: string;
  password?: string;
  avatar?: string;
}

class AuthService {
  generateToken(id: string, role: string): string {
    return jwt.sign(
      { id, role },
      process.env.JWT_SECRET as string,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      } as jwt.SignOptions,
    );
  }

  async register(data: RegisterData): Promise<{ user: IUser; token: string }> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ApiError(400, 'Email already exists');
    }

    const user = await User.create(data);
    const token = this.generateToken(user._id.toString(), user.role);

    return { user, token };
  }

  async login(data: LoginData): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email: data.email }).select('+password');

    if (!user || !(await user.comparePassword(data.password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is deactivated');
    }

    const token = this.generateToken(user._id.toString(), user.role);
    user.password = undefined as any; // Remove password from response

    return { user, token };
  }

  async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId).populate('storeId');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  async updateMe(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      avatar?: Express.Multer.File;
    },
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // ✅ Upload avatar nếu có
    if (data.avatar) {
      // Xoá avatar cũ
      if (user.avatar) {
        const publicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];

        await deleteFromCloudinary(publicId);
      }

      const uploadResult = await uploadToCloudinary(data.avatar, 'user-avatars');

      user.avatar = uploadResult.url;
    }

    // Update text fields
    if (data.name) user.name = data.name;
    if (data.phone) user.phone = data.phone;

    await user.save();

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+password');

    if (!user || !(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'Mật khẩu mới tối thiểu 6 ký tự');
    }

    user.password = newPassword;
    await user.save();
  }
}

export default new AuthService();
