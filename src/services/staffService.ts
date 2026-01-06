import User, { IUser } from '../models/User';
import Store from '../models/Store';
import { ApiError } from '../utils/ApiError';

interface CreateStaffData {
  name: string;
  email: string;
  password: string;
  phone: string;
  staffType: 'cashier' | 'bar' | 'kitchen';
  storeId: string;
}

interface UpdateStaffData {
  name?: string;
  phone?: string;
  staffType?: 'cashier' | 'bar' | 'kitchen';
  isActive?: boolean;
}

class StaffService {
  // Get all staff by store
  async getStaffByStore(storeId: string): Promise<IUser[]> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const staff = await User.find({
      storeId,
      role: 'staff',
    }).select('-password').sort({ createdAt: -1 });

    return staff;
  }

  // Get staff by ID
  async getStaffById(staffId: string): Promise<IUser> {
    const staff = await User.findById(staffId).select('-password');
    
    if (!staff || staff.role !== 'staff') {
      throw new ApiError(404, 'Staff not found');
    }

    return staff;
  }

  // Create staff
  async createStaff(data: CreateStaffData): Promise<IUser> {
    // Check if store exists
    const store = await Store.findById(data.storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ApiError(400, 'Email already in use');
    }

    // Create staff user
    const staff = await User.create({
      name: data.name,
      email: data.email,
      password: data.password, // Will be hashed by pre-save hook
      phone: data.phone,
      role: 'staff',
      staffType: data.staffType,
      storeId: data.storeId,
      isActive: true,
    });

    // Don't return password
    const staffObject = staff.toObject();
    delete staffObject.password;

    return staffObject as IUser;
  }

  // Update staff
  async updateStaff(staffId: string, data: UpdateStaffData): Promise<IUser> {
    const staff = await User.findById(staffId);
    
    if (!staff || staff.role !== 'staff') {
      throw new ApiError(404, 'Staff not found');
    }

    // Update fields
    if (data.name) staff.name = data.name;
    if (data.phone) staff.phone = data.phone;
    if (data.staffType) staff.staffType = data.staffType;
    if (data.isActive !== undefined) staff.isActive = data.isActive;

    await staff.save();

    // Don't return password
    const staffObject = staff.toObject();
    delete staffObject.password;

    return staffObject as IUser;
  }

  // Delete staff
  async deleteStaff(staffId: string): Promise<void> {
    const staff = await User.findById(staffId);
    
    if (!staff || staff.role !== 'staff') {
      throw new ApiError(404, 'Staff not found');
    }

    await User.findByIdAndDelete(staffId);
  }

  // Toggle staff active status
  async toggleStaffStatus(staffId: string): Promise<IUser> {
    const staff = await User.findById(staffId);
    
    if (!staff || staff.role !== 'staff') {
      throw new ApiError(404, 'Staff not found');
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    const staffObject = staff.toObject();
    delete staffObject.password;

    return staffObject as IUser;
  }

  // Get staff statistics
  async getStaffStats(storeId: string): Promise<any> {
    const totalStaff = await User.countDocuments({
      storeId,
      role: 'staff',
    });

    const activeStaff = await User.countDocuments({
      storeId,
      role: 'staff',
      isActive: true,
    });

    const staffByType = await User.aggregate([
      { $match: { storeId: storeId, role: 'staff' } },
      { $group: { _id: '$staffType', count: { $sum: 1 } } },
    ]);

    return {
      totalStaff,
      activeStaff,
      inactiveStaff: totalStaff - activeStaff,
      staffByType: staffByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

export default new StaffService();