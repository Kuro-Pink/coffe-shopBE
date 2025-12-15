import StoreRequest, { IStoreRequest } from '../models/StoreRequest';
import Store from '../models/Store';
import User from '../models/User';
import { ApiError } from '../utils/ApiError';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload';
import emailService from '../utils/emailService';
import { getIO } from '../utils/socket';


interface CreateStoreRequestData {
  userId: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo?: Express.Multer.File;
  businessLicense?: string;
  description?: string;
}

class StoreRequestService {
  // Create store request (Host)
  async createStoreRequest(data: CreateStoreRequestData): Promise<IStoreRequest> {
    // Check if user exists
    const user = await User.findById(data.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if user already has a store
    const existingStore = await Store.findOne({ ownerId: data.userId });
    if (existingStore) {
      throw new ApiError(400, 'You already own a store');
    }

    // Check if user has a pending request
    const pendingRequest = await StoreRequest.findOne({
      userId: data.userId,
      status: 'pending',
    });
    if (pendingRequest) {
      throw new ApiError(400, 'You already have a pending store request');
    }

    // Upload logo if provided
    let logoUrl: string | undefined;
    if (data.storeLogo) {
      const uploadResult = await uploadToCloudinary(data.storeLogo, 'store-requests');
      logoUrl = uploadResult.url;
    }

    // Create request
    const request = await StoreRequest.create({
      userId: data.userId,
      storeName: data.storeName,
      storeAddress: data.storeAddress,
      storePhone: data.storePhone,
      storeLogo: logoUrl,
      businessLicense: data.businessLicense,
      description: data.description,
      status: 'pending',
    });

    const io = getIO();
    io.to('admins').emit('store_request_created');

    return request;
  }

  // Get all store requests (Admin)
  async getAllStoreRequests(filter: any = {}): Promise<IStoreRequest[]> {
    const query: any = {};

    if (filter.status) {
      query.status = filter.status;
    }

    const requests = await StoreRequest.find(query)
      .populate('userId', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return requests;
  }

  // Get store request by ID
  async getStoreRequestById(requestId: string): Promise<IStoreRequest> {
    const request = await StoreRequest.findById(requestId)
      .populate('userId', 'name email phone')
      .populate('reviewedBy', 'name email');

    if (!request) {
      throw new ApiError(404, 'Store request not found');
    }

    return request;
  }

  // Get my store requests (Host)
  async getMyStoreRequests(userId: string): Promise<IStoreRequest[]> {
    const requests = await StoreRequest.find({ userId }).sort({ createdAt: -1 });
    return requests;
  }

  // Approve store request (Admin)
  async approveStoreRequest(requestId: string, adminId: string): Promise<IStoreRequest> {
    const request = await StoreRequest.findById(requestId).populate('userId', 'name email');

    if (!request) {
      throw new ApiError(404, 'Store request not found');
    }

    if (request.status !== 'pending') {
      throw new ApiError(400, `Cannot approve request with status: ${request.status}`);
    }

    // Check if user already has a store (double check)
    const existingStore = await Store.findOne({ ownerId: request.userId });
    if (existingStore) {
      throw new ApiError(400, 'User already owns a store');
    }

    // Create store
    const store = await Store.create({
      name: request.storeName,
      address: request.storeAddress,
      phone: request.storePhone,
      logo: request.storeLogo,
      ownerId: request.userId,
      isActive: true,
    });

    // Update user's storeId
    await User.findByIdAndUpdate(request.userId, { storeId: store._id });

    // Update request status
    request.status = 'approved';
    request.reviewedBy = adminId as any;
    request.reviewedAt = new Date();
    await request.save();

    // Send approval email
    const user = request.userId as any;
    await emailService.sendStoreApprovedEmail(user.email, user.name, request.storeName);

    const io = getIO();
    io.to('admins').emit('store_request_updated');

    return request;
  }

  // Reject store request (Admin)
  async rejectStoreRequest(
    requestId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<IStoreRequest> {
    const request = await StoreRequest.findById(requestId).populate('userId', 'name email');

    if (!request) {
      throw new ApiError(404, 'Store request not found');
    }

    if (request.status !== 'pending') {
      throw new ApiError(400, `Cannot reject request with status: ${request.status}`);
    }

    // Update request status
    request.status = 'rejected';
    request.rejectionReason = rejectionReason;
    request.reviewedBy = adminId as any;
    request.reviewedAt = new Date();
    await request.save();

    // Delete logo from Cloudinary if exists
    if (request.storeLogo) {
      const publicId = request.storeLogo.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    // Send rejection email
    const user = request.userId as any;
    await emailService.sendStoreRejectedEmail(
      user.email,
      user.name,
      request.storeName,
      rejectionReason
    );

    const io = getIO();
    io.to('admins').emit('store_request_updated');

    return request;
  }

  // Delete store request (Admin or Host owner)
  async deleteStoreRequest(requestId: string, userId?: string): Promise<void> {
    const request = await StoreRequest.findById(requestId);

    if (!request) {
      throw new ApiError(404, 'Store request not found');
    }

    // If userId provided, check ownership
    if (userId && request.userId.toString() !== userId) {
      throw new ApiError(403, 'You can only delete your own requests');
    }

    // Delete logo from Cloudinary if exists
    if (request.storeLogo) {
      const publicId = request.storeLogo.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    await StoreRequest.findByIdAndDelete(requestId);
  }

  // Get statistics
  async getStatistics(): Promise<any> {
    const total = await StoreRequest.countDocuments();
    const pending = await StoreRequest.countDocuments({ status: 'pending' });
    const approved = await StoreRequest.countDocuments({ status: 'approved' });
    const rejected = await StoreRequest.countDocuments({ status: 'rejected' });

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }
}

export default new StoreRequestService();