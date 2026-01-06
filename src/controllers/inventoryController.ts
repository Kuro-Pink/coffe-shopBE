import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import inventoryService from '../services/inventoryService';

class InventoryController {
  // ========== INGREDIENTS ==========

  // Get all ingredients
  getIngredients = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { isActive, lowStock } = req.query;

    const filter: any = {};
    if (isActive) filter.isActive = isActive;
    if (lowStock) filter.lowStock = lowStock;

    const ingredients = await inventoryService.getIngredients(storeId, filter);

    res.status(200).json(
      ApiResponse.success(ingredients, 'Ingredients retrieved successfully')
    );
  });

  // Get ingredient by ID
  getIngredientById = catchAsync(async (req: Request, res: Response) => {
    const ingredient = await inventoryService.getIngredientById(req.params.id);

    res.status(200).json(
      ApiResponse.success(ingredient, 'Ingredient retrieved successfully')
    );
  });

  // Create ingredient
  createIngredient = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = { ...req.body, storeId };

    const ingredient = await inventoryService.createIngredient(data);

    res.status(201).json(
      ApiResponse.success(ingredient, 'Ingredient created successfully', 201)
    );
  });

  // Update ingredient
  updateIngredient = catchAsync(async (req: Request, res: Response) => {
    const ingredient = await inventoryService.updateIngredient(req.params.id, req.body);

    res.status(200).json(
      ApiResponse.success(ingredient, 'Ingredient updated successfully')
    );
  });

  // Delete ingredient
  deleteIngredient = catchAsync(async (req: Request, res: Response) => {
    await inventoryService.deleteIngredient(req.params.id);

    res.status(200).json(
      ApiResponse.success(null, 'Ingredient deleted successfully')
    );
  });

  // ========== STOCK MANAGEMENT ==========

  // Adjust stock
  adjustStock = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { quantity, note } = req.body;

    const ingredient = await inventoryService.adjustStock(req.params.id, {
      quantity,
      note,
      userId,
    });

    res.status(200).json(
      ApiResponse.success(ingredient, 'Stock adjusted successfully')
    );
  });

  // ========== PRODUCT RECIPE ==========

  // Get product recipe
  getProductRecipe = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const recipe = await inventoryService.getProductRecipe(productId);

    res.status(200).json(
      ApiResponse.success(recipe, 'Product recipe retrieved successfully')
    );
  });

  // Set product recipe
  setProductRecipe = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { ingredients } = req.body;

    await inventoryService.setProductRecipe({ productId, ingredients });

    res.status(200).json(
      ApiResponse.success(null, 'Product recipe updated successfully')
    );
  });

  // Check product availability
  checkProductAvailability = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const quantity = parseInt(req.query.quantity as string) || 1;

    const availability = await inventoryService.checkProductAvailability(productId, quantity);

    res.status(200).json(
      ApiResponse.success(availability, 'Product availability checked')
    );
  });

  // ========== REPORTS ==========

  // Get inventory summary
  getInventorySummary = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const summary = await inventoryService.getInventorySummary(storeId);

    res.status(200).json(
      ApiResponse.success(summary, 'Inventory summary retrieved successfully')
    );
  });

  // Get inventory transactions
  getInventoryTransactions = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { ingredientId, startDate, endDate } = req.query;

    const filter: any = {};
    if (ingredientId) filter.ingredientId = ingredientId;
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const transactions = await inventoryService.getInventoryTransactions(storeId, filter);

    res.status(200).json(
      ApiResponse.success(transactions, 'Transactions retrieved successfully')
    );
  });

  // Get ingredient usage report
  getIngredientUsageReport = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);

    const report = await inventoryService.getIngredientUsageReport(storeId, filter);

    res.status(200).json(
      ApiResponse.success(report, 'Usage report retrieved successfully')
    );
  });
}

export default new InventoryController();