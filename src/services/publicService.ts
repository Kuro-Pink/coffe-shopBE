import Store from '../models/Store';
import Table from '../models/Table';
import Category from '../models/Category';
import Product from '../models/Product';
import Order, { IOrder } from '../models/Order';
import Voucher from '../models/Voucher';
import { ApiError } from '../utils/ApiError';
import { generateOrderNumber } from '../utils/orderNumberGenerator';
import inventoryService from '../services/inventoryService';
import { emitNewOrder } from '../utils/socket';

interface MenuData {
  store: {
    _id: string;
    name: string;
    address: string;
    phone: string;
    logo?: string;
  };
  categories: Array<{
    _id: string;
    name: string;
    order: number;
    products: Array<{
      _id: string;
      name: string;
      description: string;
      originalPrice: number;
      finalPrice: number;
      discountAmount: number;
      voucherName?: string | null;
      image?: string;
      isAvailable: boolean;
      isOutOfStock?: boolean;
    }>;
  }>;
}

interface CreateOrderData {
  storeId: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  voucherDiscount?: number;
  voucherId?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

class PublicService {
  private async getProductDiscount(productId: string, price: number, storeId: string) {
    const now = new Date();

    const voucher = await Voucher.findOne({
      storeId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      productIds: { $in: [productId] },
    });

    if (!voucher) {
      return {
        originalPrice: price,
        finalPrice: price,
        discountAmount: 0,
        voucherId: null,
        voucherName: null,
      };
    }

    let discount = 0;

    if (voucher.type === 'percent') {
      discount = (price * voucher.value) / 100;
      if (voucher.maxDiscount) {
        discount = Math.min(discount, voucher.maxDiscount);
      }
    } else if (voucher.type === 'fixed') {
      discount = voucher.value;

      // ❗ tránh giảm quá giá
      if (discount > price) {
        discount = price;
      }
    }

    const finalPrice = Math.max(price - discount, 0);

    return {
      originalPrice: price,
      finalPrice,
      discountAmount: discount,
      voucherName: voucher.name,
    };
  }

  // Get menu by store (for customer)
  async getMenu(storeId: string): Promise<MenuData> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    if (!store.isActive) {
      throw new ApiError(400, 'Store is currently inactive');
    }

    const categories = await Category.find({ storeId }).sort({ order: 1 });

    const menuData: MenuData = {
      store: {
        _id: store._id.toString(),
        name: store.name,
        address: store.address,
        phone: store.phone,
        logo: store.logo,
      },
      categories: [],
    };

    for (const category of categories) {
      const products = await Product.find({
        categoryId: category._id,
        storeId,
      }).select('name description price image isAvailable');

      const productList: MenuData['categories'][0]['products'] = [];

      for (const p of products) {
        const discountInfo = await this.getProductDiscount(p._id.toString(), p.price, storeId);

        // 👉 CHECK STOCK
        const isEnoughStock = await inventoryService.checkStockForProduct(p._id.toString(), 1);

        productList.push({
          _id: p._id.toString(),
          name: p.name,
          description: p.description,
          originalPrice: discountInfo.originalPrice,
          finalPrice: discountInfo.finalPrice,
          discountAmount: discountInfo.discountAmount,
          voucherName: discountInfo.voucherName,
          image: p.image,
          isAvailable: p.isAvailable,

          // 👇 NEW
          isOutOfStock: !isEnoughStock,
        });
      }

      menuData.categories.push({
        _id: category._id.toString(),
        name: category.name,
        order: category.order,
        products: productList,
      });
    }

    return menuData;
  }

  // Get table info
  async getTableInfo(tableId: string): Promise<any> {
    const table = await Table.findById(tableId).populate('storeId', 'name address phone');
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }

    return {
      _id: table._id,
      tableNumber: table.tableNumber,
      area: table.area,
      store: table.storeId,
    };
  }

  // Create order (customer submit)
  async createOrder(data: CreateOrderData): Promise<IOrder> {
    // Validate store
    const store = await Store.findById(data.storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }
    if (!store.isActive) {
      throw new ApiError(400, 'Store is currently inactive');
    }

    // Validate table
    const table = await Table.findById(data.tableId);
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }
    if (table.storeId.toString() !== data.storeId) {
      throw new ApiError(400, 'Table does not belong to this store');
    }

    // ✅ NEW: Validate customerName
    if (!data.customerName || data.customerName.trim().length < 2) {
      throw new ApiError(400, 'Customer name is required (minimum 2 characters)');
    }

    // Validate items
    if (!data.items || data.items.length === 0) {
      throw new ApiError(400, 'Order must have at least one item');
    }

    // Get products and calculate total
    const orderItems: any[] = [];
    let subtotal = 0;
    let productSaving = 0;

    for (const item of data.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new ApiError(404, `Product ${item.productId} not found`);
      }
      if (product.storeId.toString() !== data.storeId) {
        throw new ApiError(400, 'Product does not belong to this store');
      }
      if (!product.isAvailable) {
        throw new ApiError(400, `Product "${product.name}" is currently unavailable`);
      }

      const discountInfo = await this.getProductDiscount(
        product._id.toString(),
        product.price,
        data.storeId,
      );

      const originalTotalItem = discountInfo.originalPrice * item.quantity;

      subtotal += originalTotalItem;
      productSaving += discountInfo.discountAmount * item.quantity;

      orderItems.push({
        productId: product._id,
        name: product.name,
        originalPrice: discountInfo.originalPrice,
        finalPrice: discountInfo.finalPrice,
        discountAmount: discountInfo.discountAmount,
        quantity: item.quantity,
      });
    }
    const voucherDiscount = data.voucherDiscount || 0;
    const totalAmount = subtotal - productSaving - voucherDiscount;

    // Generate order number
    let orderNumber = generateOrderNumber();
    let existingOrder = await Order.findOne({ orderNumber });
    while (existingOrder) {
      orderNumber = generateOrderNumber();
      existingOrder = await Order.findOne({ orderNumber });
    }

    // Create order
    const order = await Order.create({
      orderNumber,
      storeId: data.storeId,
      tableId: data.tableId,
      tableName: `${table.tableNumber} - ${table.area}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerNote: data.customerNote || '',
      items: orderItems,
      subtotal,
      productSaving,
      voucherDiscount,
      totalAmount,
      status: 'pending',
      isPaid: false,
    });

    // 🔥 UPDATE VOUCHER USED COUNT
    if (data.voucherId) {
      const voucher = await Voucher.findById(data.voucherId);

      if (voucher) {
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
          throw new ApiError(400, 'Voucher hết lượt sử dụng');
        }

        voucher.usedCount += 1;

        // Auto inactive nếu hết lượt
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
          voucher.isActive = false;
        }

        await voucher.save();
      }
    }

    // ✅ NEW: AUTO UPDATE TABLE STATUS & SESSION
    if (table.status === 'available') {
      // First order - create new session
      table.status = 'occupied';
      table.currentSession = {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        startTime: new Date(),
        totalOrders: 1,
        totalAmount: totalAmount,
      };
    } else if (table.status === 'occupied' && table.currentSession) {
      // Additional order - update existing session
      table.currentSession.totalOrders += 1;
      table.currentSession.totalAmount += totalAmount;
    }

    await table.save();

    // ✅ EMIT SOCKET EVENTS
    emitNewOrder(data.storeId, order);
    // ✅ NEW: Emit table status update
    const io = (global as any).io;
    if (io) {
      io.to(data.storeId).emit('table_updated', {
        tableId: table._id,
        status: table.status,
        currentSession: table.currentSession,
      });
    }

    return order;
  }
}

export default new PublicService();
