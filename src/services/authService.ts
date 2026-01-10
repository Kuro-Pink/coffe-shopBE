import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';

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
}

export default new AuthService();
