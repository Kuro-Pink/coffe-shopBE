import Store, { IStore } from '../models/Store';
import User from '../models/User';
import { ApiError } from '../utils/ApiError';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload';

interface CreateStoreData {
  name: string;
  address: string;
  phone: string;
  ownerId: string;
  logo?: Express.Multer.File;
}

interface UpdateStoreData {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
  logo?: Express.Multer.File;
}

class StoreService {
  // Get all stores
  async getAllStores(filter: any = {}): Promise<IStore[]> {
    const stores = await Store.find(filter)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 });
    return stores;
  }

  // Get store by ID
  async getStoreById(storeId: string): Promise<IStore> {
    const store = await Store.findById(storeId).populate('ownerId', 'name email phone');
    
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    return store;
  }

  // Create new store
  async createStore(data: CreateStoreData): Promise<IStore> {
    // Check if owner exists
    const owner = await User.findById(data.ownerId);
    if (!owner) {
      throw new ApiError(404, 'Owner not found');
    }

    // Check if owner already has a store
    const existingStore = await Store.findOne({ ownerId: data.ownerId });
    if (existingStore) {
      throw new ApiError(400, 'This user already owns a store');
    }

    // Upload logo if provided
    let logoUrl: string | undefined;
    if (data.logo) {
      const uploadResult = await uploadToCloudinary(data.logo, 'stores/logos');
      logoUrl = uploadResult.url;
    }

    // Create store
    const store = await Store.create({
      name: data.name,
      address: data.address,
      phone: data.phone,
      ownerId: data.ownerId,
      logo: logoUrl,
    });

    // Update user's storeId
    await User.findByIdAndUpdate(data.ownerId, { storeId: store._id });

    return store;
  }

  // Update store
  async updateStore(storeId: string, data: UpdateStoreData): Promise<IStore> {
    const store = await Store.findById(storeId);
    
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    // Upload new logo if provided
    if (data.logo) {
      // Delete old logo if exists
      if (store.logo) {
        const publicId = store.logo.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      }

      const uploadResult = await uploadToCloudinary(data.logo, 'stores/logos');
      data.logo = uploadResult.url as any;
    }

    // Update store
    Object.assign(store, data);
    await store.save();

    return store;
  }

  // Delete store
  async deleteStore(storeId: string): Promise<void> {
    const store = await Store.findById(storeId);
    
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    // Delete logo from Cloudinary if exists
    if (store.logo) {
      const publicId = store.logo.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    // Remove storeId from owner
    await User.findByIdAndUpdate(store.ownerId, { storeId: null });

    // Delete store
    await Store.findByIdAndDelete(storeId);
  }

  // Toggle store active status
  async toggleStoreStatus(storeId: string): Promise<IStore> {
    const store = await Store.findById(storeId);
    
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    store.isActive = !store.isActive;
    await store.save();

    return store;
  }

  // Get statistics
  async getStatistics(): Promise<any> {
    const totalStores = await Store.countDocuments();
    const activeStores = await Store.countDocuments({ isActive: true });
    const inactiveStores = await Store.countDocuments({ isActive: false });

    return {
      totalStores,
      activeStores,
      inactiveStores,
    };
  }
}

export default new StoreService();