import mongoose from 'mongoose';
import Shift, { IShift } from '../models/Shift';
import Order from '../models/Order';
import User from '../models/User';
import { ApiError } from '../utils/ApiError';

interface CheckInData {
  staffId: string;
  storeId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

interface CheckOutData {
  staffId: string;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

class ShiftService {
  // Get current active shift for staff
  async getCurrentShift(staffId: string): Promise<IShift | null> {
    const shift = await Shift.findOne({
      staffId,
      status: 'active',
    })
      .populate('staffId', 'name email staffType')
      .populate('storeId', 'name');

    return shift;
  }

  // Check in (start shift)
  async checkIn(data: CheckInData): Promise<IShift> {
    // Check if staff already has active shift
    const existingShift = await Shift.findOne({
      staffId: data.staffId,
      status: 'active',
    });

    if (existingShift) {
      throw new ApiError(400, 'Staff already has an active shift. Please check out first.');
    }

    // Verify staff belongs to store
    const staff = await User.findById(data.staffId);
    if (!staff) {
      throw new ApiError(404, 'Staff not found');
    }

    if (staff.storeId?.toString() !== data.storeId) {
      throw new ApiError(403, 'Staff does not belong to this store');
    }

    // Create new shift
    const shift = await Shift.create({
      storeId: data.storeId,
      staffId: data.staffId,
      checkInTime: new Date(),
      status: 'active',
      checkInLocation: data.location,
      notes: data.notes,
    });

    await shift.populate('staffId', 'name email staffType');
    await shift.populate('storeId', 'name');

    return shift;
  }

  // Check out (end shift and calculate performance)
  async checkOut(data: CheckOutData): Promise<IShift> {
    const shift = await Shift.findOne({
      staffId: data.staffId,
      status: 'active',
    });

    if (!shift) {
      throw new ApiError(404, 'No active shift found for this staff');
    }

    const checkOutTime = new Date();
    const hoursWorked = (checkOutTime.getTime() - shift.checkInTime.getTime()) / (1000 * 60 * 60);

    // Calculate performance metrics
    const performance = await this.calculateShiftPerformance(
      shift._id.toString(),
      shift.checkInTime,
      checkOutTime,
    );

    // Update shift
    shift.checkOutTime = checkOutTime;
    shift.status = 'completed';
    shift.hoursWorked = Number(hoursWorked.toFixed(2));
    shift.ordersProcessed = performance.ordersProcessed;
    shift.totalRevenue = performance.totalRevenue;
    shift.averageOrderValue = performance.averageOrderValue;
    shift.checkOutLocation = data.location;
    if (data.notes) shift.notes = shift.notes ? `${shift.notes}\n${data.notes}` : data.notes;

    await shift.save();
    await shift.populate('staffId', 'name email staffType');
    await shift.populate('storeId', 'name');

    return shift;
  }

  // Calculate shift performance
  private async calculateShiftPerformance(
    shiftId: string,
    checkInTime: Date,
    checkOutTime: Date,
  ): Promise<{
    ordersProcessed: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      throw new ApiError(404, 'Shift not found');
    }

    // Get orders processed during this shift by this staff
    const orders = await Order.find({
      storeId: shift.storeId,
      $or: [{ confirmedBy: shift.staffId }, { completedBy: shift.staffId }],
      createdAt: { $gte: checkInTime, $lte: checkOutTime },
      status: 'completed',
    });

    const ordersProcessed = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = ordersProcessed > 0 ? totalRevenue / ordersProcessed : 0;

    return {
      ordersProcessed,
      totalRevenue,
      averageOrderValue: Number(averageOrderValue.toFixed(0)),
    };
  }

  // Get shift history for a staff
  async getShiftHistory(
    staffId: string,
    filter: { startDate?: Date; endDate?: Date; status?: string } = {},
  ): Promise<IShift[]> {
    const query: any = { staffId };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      query.checkInTime = {};
      if (filter.startDate) query.checkInTime.$gte = filter.startDate;
      if (filter.endDate) query.checkInTime.$lte = filter.endDate;
    }

    const shifts = await Shift.find(query)
      .populate('staffId', 'name email staffType')
      .populate('storeId', 'name')
      .sort({ checkInTime: -1 });

    return shifts;
  }

  // Get all shifts for a store
  async getAllShifts(
    storeId: string,
    filter: { startDate?: Date; endDate?: Date; status?: string; staffId?: string } = {},
  ): Promise<IShift[]> {
    const query: any = { storeId };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.staffId) {
      query.staffId = filter.staffId;
    }

    if (filter.startDate || filter.endDate) {
      query.checkInTime = {};
      if (filter.startDate) query.checkInTime.$gte = filter.startDate;
      if (filter.endDate) query.checkInTime.$lte = filter.endDate;
    }

    const shifts = await Shift.find(query)
      .populate('staffId', 'name email staffType')
      .sort({ checkInTime: -1 });

    return shifts;
  }

  // Get shift report (detailed performance)
  async getShiftReport(shiftId: string): Promise<any> {
    const shift = await Shift.findById(shiftId)
      .populate('staffId', 'name email staffType')
      .populate('storeId', 'name');

    if (!shift) {
      throw new ApiError(404, 'Shift not found');
    }

    // Get detailed orders
    const orders = await Order.find({
      storeId: shift.storeId,
      $or: [{ confirmedBy: shift.staffId }, { completedBy: shift.staffId }],
      createdAt: { $gte: shift.checkInTime, $lte: shift.checkOutTime || new Date() },
    }).sort({ createdAt: 1 });

    // Calculate hourly performance
    const hourlyStats: any = {};
    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { orders: 0, revenue: 0 };
      }
      hourlyStats[hour].orders++;
      if (order.status === 'completed') {
        hourlyStats[hour].revenue += order.totalAmount;
      }
    });

    return {
      shift: {
        _id: shift._id,
        checkInTime: shift.checkInTime,
        checkOutTime: shift.checkOutTime,
        status: shift.status,
        hoursWorked: shift.hoursWorked,
      },
      staff: shift.staffId,
      store: shift.storeId,
      performance: {
        ordersProcessed: shift.ordersProcessed,
        totalRevenue: shift.totalRevenue,
        averageOrderValue: shift.averageOrderValue,
        ordersPerHour: shift.hoursWorked
          ? Number((shift.ordersProcessed! / shift.hoursWorked).toFixed(2))
          : 0,
      },
      orders: orders.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        totalAmount: o.totalAmount,
        status: o.status,
        createdAt: o.createdAt,
      })),
      hourlyStats: Object.keys(hourlyStats)
        .sort()
        .map((hour) => ({
          hour: `${hour}:00`,
          orders: hourlyStats[hour].orders,
          revenue: hourlyStats[hour].revenue,
        })),
    };
  }

  // Get shift summary stats for a period
  async getShiftSummaryStats(
    storeId: string,
    filter: { startDate?: Date; endDate?: Date } = {},
  ): Promise<any> {
    const query: any = { storeId, status: 'completed' };

    if (filter.startDate || filter.endDate) {
      query.checkInTime = {};
      if (filter.startDate) query.checkInTime.$gte = filter.startDate;
      if (filter.endDate) query.checkInTime.$lte = filter.endDate;
    }

    const shifts = await Shift.find(query);

    const totalShifts = shifts.length;
    const totalHoursWorked = shifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    const totalOrdersProcessed = shifts.reduce((sum, s) => sum + (s.ordersProcessed || 0), 0);
    const totalRevenue = shifts.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);

    return {
      totalShifts,
      totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
      totalOrdersProcessed,
      totalRevenue,
      averageHoursPerShift:
        totalShifts > 0 ? Number((totalHoursWorked / totalShifts).toFixed(2)) : 0,
      averageOrdersPerShift:
        totalShifts > 0 ? Number((totalOrdersProcessed / totalShifts).toFixed(1)) : 0,
      averageRevenuePerShift: totalShifts > 0 ? Number((totalRevenue / totalShifts).toFixed(0)) : 0,
    };
  }

  // Get staff's own shift statistics
  async getStaffShiftStats(
    staffId: string,
    filter: { startDate?: Date; endDate?: Date } = {},
  ): Promise<any> {
    const query: any = { staffId, status: 'completed' };

    if (filter.startDate || filter.endDate) {
      query.checkInTime = {};
      if (filter.startDate) query.checkInTime.$gte = filter.startDate;
      if (filter.endDate) query.checkInTime.$lte = filter.endDate;
    }

    const shifts = await Shift.find(query);

    const totalShifts = shifts.length;
    const totalHoursWorked = shifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    const totalOrdersProcessed = shifts.reduce((sum, s) => sum + (s.ordersProcessed || 0), 0);
    const totalRevenue = shifts.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);

    return {
      totalShifts,
      totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
      totalOrdersProcessed,
      totalRevenue,
      averageHoursPerShift:
        totalShifts > 0 ? Number((totalHoursWorked / totalShifts).toFixed(2)) : 0,
      averageOrdersPerShift:
        totalShifts > 0 ? Number((totalOrdersProcessed / totalShifts).toFixed(1)) : 0,
      averageRevenuePerShift: totalShifts > 0 ? Number((totalRevenue / totalShifts).toFixed(0)) : 0,
    };
  }
}

export default new ShiftService();
