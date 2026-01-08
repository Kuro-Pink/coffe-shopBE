import mongoose from 'mongoose';
import Ingredient, { IIngredient } from '../models/Ingredient';
import ProductIngredient from '../models/ProductIngredient';
import InventoryTransaction from '../models/InventoryTransaction';
import Store from '../models/Store';
import Product from '../models/Product';
import Order from '../models/Order';
import { ApiError } from '../utils/ApiError';

interface CreateIngredientData {
  storeId: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  cost?: number;
}

interface UpdateIngredientData {
  name?: string;
  unit?: string;
  minQuantity?: number;
  cost?: number;
  isActive?: boolean;
}

interface AdjustStockData {
  quantity: number;
  note?: string;
  userId: string;
}

interface SetProductRecipeData {
  productId: string;
  ingredients: Array<{
    ingredientId: string;
    amount: number;
  }>;
}

class InventoryService {
  // ========== INGREDIENTS CRUD ==========

  // Get all ingredients
  async getIngredients(storeId: string, filter: any = {}): Promise<IIngredient[]> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const query: any = { storeId };

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive === 'true';
    }

    if (filter.lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$minQuantity'] };
    }

    const ingredients = await Ingredient.find(query).sort({ name: 1 });

    return ingredients;
  }

  // Get ingredient by ID
  async getIngredientById(ingredientId: string): Promise<IIngredient> {
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      throw new ApiError(404, 'Ingredient not found');
    }
    return ingredient;
  }

  // Create ingredient
  async createIngredient(data: CreateIngredientData): Promise<IIngredient> {
    const store = await Store.findById(data.storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const ingredient = await Ingredient.create(data);
    return ingredient;
  }

  // Update ingredient
  async updateIngredient(ingredientId: string, data: UpdateIngredientData): Promise<IIngredient> {
    const ingredient = await Ingredient.findByIdAndUpdate(
      ingredientId,
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!ingredient) {
      throw new ApiError(404, 'Ingredient not found');
    }

    return ingredient;
  }

  // Delete ingredient
  async deleteIngredient(ingredientId: string): Promise<void> {
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      throw new ApiError(404, 'Ingredient not found');
    }

    // Check if ingredient is used in any product recipe
    const usedInProducts = await ProductIngredient.countDocuments({ ingredientId });
    if (usedInProducts > 0) {
      throw new ApiError(
        400,
        `Cannot delete ingredient that is used in ${usedInProducts} product(s)`,
      );
    }

    await Ingredient.findByIdAndDelete(ingredientId);
  }

  // ========== STOCK MANAGEMENT ==========

  // Adjust stock (manual - nhập/xuất/điều chỉnh)
  async adjustStock(ingredientId: string, data: AdjustStockData): Promise<IIngredient> {
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      throw new ApiError(404, 'Ingredient not found');
    }

    const quantityBefore = ingredient.quantity;
    const quantityAfter = quantityBefore + data.quantity;

    if (quantityAfter < 0) {
      throw new ApiError(400, 'Insufficient stock');
    }

    // Update ingredient quantity
    ingredient.quantity = quantityAfter;
    await ingredient.save();

    // Log transaction
    const transactionType = data.quantity > 0 ? 'in' : data.quantity < 0 ? 'out' : 'adjustment';

    await InventoryTransaction.create({
      storeId: ingredient.storeId,
      ingredientId: ingredient._id,
      type: transactionType,
      quantity: Math.abs(data.quantity),
      quantityBefore,
      quantityAfter,
      note: data.note,
      createdBy: data.userId,
    });

    return ingredient;
  }

  // Deduct stock for order (tự động khi confirm order)
  async deductStockForOrder(orderId: string, userId: string): Promise<void> {
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // For each product in order
    for (const item of order.items) {
      const productId = item.productId;

      // Get recipe (ingredients needed for this product)
      const recipe = await ProductIngredient.find({ productId }).populate('ingredientId');

      // Deduct each ingredient
      for (const recipeItem of recipe) {
        const ingredient = recipeItem.ingredientId as any;
        const amountNeeded = recipeItem.amount * item.quantity;

        // Check if enough stock
        if (ingredient.quantity < amountNeeded) {
          throw new ApiError(
            400,
            `Insufficient stock for ${ingredient.name}. Need ${amountNeeded} ${ingredient.unit}, only have ${ingredient.quantity} ${ingredient.unit}`,
          );
        }

        // Deduct stock
        const quantityBefore = ingredient.quantity;
        const quantityAfter = quantityBefore - amountNeeded;

        await Ingredient.findByIdAndUpdate(ingredient._id, {
          quantity: quantityAfter,
        });

        // Log transaction
        await InventoryTransaction.create({
          storeId: order.storeId,
          ingredientId: ingredient._id,
          type: 'out',
          quantity: amountNeeded,
          quantityBefore,
          quantityAfter,
          orderId: order._id,
          note: `Order ${order.orderNumber} - ${item.name} x${item.quantity}`,
          createdBy: userId,
        });
      }
    }
  }

  // ========== PRODUCT RECIPE ==========

  // Get product recipe
  async getProductRecipe(productId: string): Promise<any[]> {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const recipe = await ProductIngredient.find({ productId }).populate('ingredientId');

    return recipe.map((item: any) => ({
      ingredientId: item.ingredientId._id,
      ingredientName: item.ingredientId.name,
      unit: item.ingredientId.unit,
      amount: item.amount,
      currentStock: item.ingredientId.quantity,
    }));
  }

  // Set product recipe (replace all)
  async setProductRecipe(data: SetProductRecipeData): Promise<void> {
    const product = await Product.findById(data.productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Delete existing recipe
    await ProductIngredient.deleteMany({ productId: data.productId });

    // Create new recipe
    if (data.ingredients && data.ingredients.length > 0) {
      const recipeItems = data.ingredients.map((item) => ({
        productId: data.productId,
        ingredientId: item.ingredientId,
        amount: item.amount,
      }));

      await ProductIngredient.insertMany(recipeItems);
    }
  }

  // Check if product can be made (enough stock)
  async checkProductAvailability(productId: string, quantity: number = 1): Promise<any> {
    const recipe = await ProductIngredient.find({ productId }).populate('ingredientId');

    const availability = {
      canMake: true,
      maxQuantity: Infinity,
      missingIngredients: [] as any[],
    };

    for (const item of recipe) {
      const ingredient = item.ingredientId as any;
      const amountNeeded = item.amount * quantity;

      if (ingredient.quantity < amountNeeded) {
        availability.canMake = false;
        availability.missingIngredients.push({
          name: ingredient.name,
          needed: amountNeeded,
          available: ingredient.quantity,
          unit: ingredient.unit,
        });
      }

      // Calculate max quantity can make
      const maxQty = Math.floor(ingredient.quantity / item.amount);
      availability.maxQuantity = Math.min(availability.maxQuantity, maxQty);
    }

    if (availability.maxQuantity === Infinity) {
      availability.maxQuantity = 0;
    }

    return availability;
  }

  // ========== REPORTS ==========

  // Get inventory summary
  async getInventorySummary(storeId: string): Promise<any> {
    const totalIngredients = await Ingredient.countDocuments({ storeId, isActive: true });

    const lowStockIngredients = await Ingredient.find({
      storeId,
      isActive: true,
      $expr: { $lte: ['$quantity', '$minQuantity'] },
    });

    const outOfStockIngredients = await Ingredient.find({
      storeId,
      isActive: true,
      quantity: 0,
    });

    const totalValue = await Ingredient.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$cost'] } } } },
    ]);

    return {
      totalIngredients,
      lowStockCount: lowStockIngredients.length,
      lowStockIngredients: lowStockIngredients.map((i) => ({
        _id: i._id,
        name: i.name,
        quantity: i.quantity,
        minQuantity: i.minQuantity,
        unit: i.unit,
      })),
      outOfStockCount: outOfStockIngredients.length,
      outOfStockIngredients: outOfStockIngredients.map((i) => ({
        _id: i._id,
        name: i.name,
      })),
      totalInventoryValue: totalValue[0]?.total || 0,
    };
  }

  // Get inventory transactions (history)
  async getInventoryTransactions(
    storeId: string,
    filter: { ingredientId?: string; startDate?: Date; endDate?: Date } = {},
  ): Promise<any[]> {
    const query: any = { storeId };

    if (filter.ingredientId) {
      query.ingredientId = filter.ingredientId;
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = filter.startDate;
      if (filter.endDate) query.createdAt.$lte = filter.endDate;
    }

    const transactions = await InventoryTransaction.find(query)
      .populate('ingredientId', 'name unit')
      .populate('createdBy', 'name role')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(100);

    return transactions;
  }

  // Get ingredient usage report (most used)
  async getIngredientUsageReport(
    storeId: string,
    filter: { startDate?: Date; endDate?: Date } = {},
  ): Promise<any[]> {
    // ✅ Convert to ObjectId
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const query: any = {
      storeId: storeObjectId, // ← Must be ObjectId!
      type: 'out',
    };

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = filter.startDate;
      if (filter.endDate) query.createdAt.$lte = filter.endDate;
    }

    const totalTransactions = await InventoryTransaction.countDocuments(query);
    if (totalTransactions === 0) {
      console.log('⚠️ No inventory transactions found!');
      return [];
    }

    const usage = await InventoryTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$ingredientId',
          totalUsed: { $sum: '$quantity' },
          timesUsed: { $sum: 1 },
        },
      },
      { $sort: { totalUsed: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'ingredients',
          localField: '_id',
          foreignField: '_id',
          as: 'ingredient',
        },
      },
      { $unwind: '$ingredient' },
      {
        $project: {
          ingredientId: '$_id',
          name: '$ingredient.name',
          unit: '$ingredient.unit',
          totalUsed: 1,
          timesUsed: 1,
        },
      },
    ]);

    console.log('📊 Usage report:', usage);

    return usage;
  }
}

export default new InventoryService();
