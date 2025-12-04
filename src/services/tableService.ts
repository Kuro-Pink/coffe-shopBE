import Table, { ITable } from '../models/Table';
import Store from '../models/Store';
import { ApiError } from '../utils/ApiError';
import { generateQRCode, generateMenuUrl } from '../utils/qrcodeGenerator';

interface CreateTableData {
  tableNumber: string;
  area: string;
  storeId: string;
}

interface UpdateTableData {
  tableNumber?: string;
  area?: string;
}

class TableService {
  // Get all tables by store
  async getTablesByStore(storeId: string): Promise<ITable[]> {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    const tables = await Table.find({ storeId }).sort({ area: 1, tableNumber: 1 });
    return tables;
  }

  // Get table by ID
  async getTableById(tableId: string): Promise<ITable> {
    const table = await Table.findById(tableId).populate('storeId', 'name address');
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }
    return table;
  }

  // Create table
  async createTable(data: CreateTableData): Promise<ITable> {
    // Verify store exists
    const store = await Store.findById(data.storeId);
    if (!store) {
      throw new ApiError(404, 'Store not found');
    }

    // Check if table number already exists in this store
    const existingTable = await Table.findOne({
      storeId: data.storeId,
      tableNumber: data.tableNumber,
    });
    if (existingTable) {
      throw new ApiError(400, 'Table number already exists in this store');
    }

    // Create table first (to get ID)
    const table = await Table.create({
      tableNumber: data.tableNumber,
      area: data.area,
      storeId: data.storeId,
      qrCodeUrl: '', // Will update after generating
    });

    // Generate QR code
    const menuUrl = generateMenuUrl(data.storeId, table._id.toString());
    const qrCodeDataUrl = await generateQRCode(menuUrl);

    // Update table with QR code
    table.qrCodeUrl = qrCodeDataUrl;
    await table.save();

    return table;
  }

  // Update table
  async updateTable(tableId: string, data: UpdateTableData): Promise<ITable> {
    const table = await Table.findById(tableId);
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }

    // If updating table number, check uniqueness
    if (data.tableNumber && data.tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({
        storeId: table.storeId,
        tableNumber: data.tableNumber,
      });
      if (existingTable) {
        throw new ApiError(400, 'Table number already exists in this store');
      }
    }

    // Update table
    Object.assign(table, data);
    await table.save();

    return table;
  }

  // Delete table
  async deleteTable(tableId: string): Promise<void> {
    const table = await Table.findById(tableId);
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }

    await Table.findByIdAndDelete(tableId);
  }

  // Regenerate QR code (if needed)
  async regenerateQRCode(tableId: string): Promise<ITable> {
    const table = await Table.findById(tableId);
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }

    const menuUrl = generateMenuUrl(table.storeId.toString(), table._id.toString());
    const qrCodeDataUrl = await generateQRCode(menuUrl);

    table.qrCodeUrl = qrCodeDataUrl;
    await table.save();

    return table;
  }

  // Get table statistics
  async getTableStats(storeId: string): Promise<any> {
    const totalTables = await Table.countDocuments({ storeId });
    
    // Group by area
    const tablesByArea = await Table.aggregate([
      { $match: { storeId: storeId } },
      { 
        $group: { 
          _id: '$area', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      totalTables,
      tablesByArea,
    };
  }
}

export default new TableService();