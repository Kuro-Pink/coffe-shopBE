import Table, { ITable } from '../models/Table';
import Store from '../models/Store';
import Order from '../models/Order';
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

    // Generate a temporary ID for QR code URL
    // We'll use the store + tableNumber as a temporary unique identifier
    const tempId = `${data.storeId}-${data.tableNumber}`;
    const menuUrl = generateMenuUrl(data.storeId, tempId);
    const qrCodeDataUrl = await generateQRCode(menuUrl);

    // Create table with QR code
    const table = await Table.create({
      tableNumber: data.tableNumber,
      area: data.area,
      storeId: data.storeId,
      qrCodeUrl: qrCodeDataUrl,
    });

    // Update QR code with actual table ID if needed
    const actualMenuUrl = generateMenuUrl(data.storeId, table._id.toString());
    const actualQrCodeDataUrl = await generateQRCode(actualMenuUrl);
    
    if (actualQrCodeDataUrl !== qrCodeDataUrl) {
      table.qrCodeUrl = actualQrCodeDataUrl;
      await table.save();
    }

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

  // Update table status
  async updateTableStatus(
    tableId: string, 
    status: 'available' | 'occupied' | 'needs_cleaning'
  ): Promise<ITable> {
    const table = await Table.findById(tableId);
    if (!table) {
      throw new ApiError(404, 'Table not found');
    }

    table.status = status;

    // ✅ Clear session if setting to available
    if (status === 'available') {
      table.currentSession = undefined;
    }

    await table.save();

    // ✅ Emit socket event
    const io = (global as any).io;
    if (io) {
      io.to(table.storeId.toString()).emit('table_updated', {
        tableId: table._id,
        status: table.status,
        currentSession: table.currentSession,
      });
    }

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