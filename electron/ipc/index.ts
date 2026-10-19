import { ipcMain } from 'electron';
import { authService } from '../services/authService';
import { staffService } from '../services/staffService';
import { customerService } from '../services/customerService';
import { vehicleService } from '../services/vehicleService';
import { serviceCatalogService } from '../services/serviceCatalogService';
import { settingsService } from '../services/settingsService';
import { cashSessionService } from '../services/cashSessionService';
import { workOrderService } from '../services/workOrderService';
import { stockService } from '../services/stockService';
import { backupService } from '../services/backupService';
import { financeService } from '../services/financeService';
import { summaryService } from '../services/summaryService';
import { emailService } from '../services/emailService';
import { excelExportService } from '../services/excelExportService';

export function registerIpcHandlers() {
  // Auth
  ipcMain.handle('auth:login', async (_e, { username, password }) => {
    return authService.login(username, password);
  });

  ipcMain.handle('auth:changePassword', async (_e, { userId, newPassword }) => {
    return authService.changePassword(userId, newPassword);
  });

  ipcMain.handle('auth:verifyAdminPin', async (_e, { pin }) => {
    return authService.verifyAdminPin(pin);
  });

  ipcMain.handle('auth:getUsers', async () => {
    return authService.getUsers();
  });

  ipcMain.handle('auth:createUser', async (_e, { adminUserId, data }) => {
    return authService.createUser(adminUserId, data);
  });

  ipcMain.handle('auth:updateUser', async (_e, { adminUserId, targetUserId, data }) => {
    return authService.updateUserRoleOrStatus(adminUserId, targetUserId, data);
  });

  // Staff
  ipcMain.handle('staff:getAll', async () => {
    return staffService.getAllStaff();
  });

  ipcMain.handle('staff:getActive', async () => {
    return staffService.getActiveStaff();
  });

  ipcMain.handle('staff:create', async (_e, { userId, data }) => {
    return staffService.createStaff(userId, data);
  });

  ipcMain.handle('staff:update', async (_e, { userId, id, data }) => {
    return staffService.updateStaff(userId, id, data);
  });

  // Customers
  ipcMain.handle('customers:getAll', async () => {
    return customerService.getAllCustomers();
  });

  ipcMain.handle('customers:search', async (_e, { query }) => {
    return customerService.searchCustomers(query);
  });

  ipcMain.handle('customers:create', async (_e, { userId, data }) => {
    return customerService.createCustomer(userId, data);
  });

  ipcMain.handle('customers:update', async (_e, { userId, id, data }) => {
    return customerService.updateCustomer(userId, id, data);
  });

  // Vehicles & Plate
  ipcMain.handle('vehicles:getTypes', async () => {
    return vehicleService.getVehicleTypes();
  });

  ipcMain.handle('vehicles:searchPlate', async (_e, { rawPlate }) => {
    return vehicleService.searchPlate(rawPlate);
  });

  ipcMain.handle('vehicles:register', async (_e, data) => {
    return vehicleService.registerVehicle(data);
  });

  // Services & Prices
  ipcMain.handle('services:getAll', async (_e, { includeInactive } = {}) => {
    return serviceCatalogService.getAllServices(includeInactive);
  });

  ipcMain.handle('services:create', async (_e, { userId, data }) => {
    return serviceCatalogService.createService(userId, data);
  });

  ipcMain.handle('services:update', async (_e, { userId, id, data }) => {
    return serviceCatalogService.updateService(userId, id, data);
  });

  ipcMain.handle('services:getPriceMatrix', async () => {
    return serviceCatalogService.getPriceMatrix();
  });

  ipcMain.handle('services:updatePrice', async (_e, { userId, serviceId, vehicleTypeId, priceKurus }) => {
    return serviceCatalogService.updatePrice(userId, serviceId, vehicleTypeId, priceKurus);
  });

  // Settings
  ipcMain.handle('settings:get', async () => {
    return settingsService.getSettings();
  });

  ipcMain.handle('settings:updateBusiness', async (_e, { userId, data }) => {
    return settingsService.updateBusinessSettings(userId, data);
  });

  // Cash Sessions (Day 3 / FR-32, P3)
  ipcMain.handle('cash:getOpenSession', async () => {
    return cashSessionService.getOpenSession();
  });

  ipcMain.handle('cash:openSession', async (_e, { userId, acilisKurus }) => {
    return cashSessionService.openSession(userId, acilisKurus);
  });

  // Work Orders (Day 3 / FR-01 to FR-09)
  ipcMain.handle('orders:getToday', async () => {
    return workOrderService.getTodayWorkOrders();
  });

  ipcMain.handle('orders:getById', async (_e, { id }) => {
    return workOrderService.getWorkOrderById(id);
  });

  ipcMain.handle('orders:create', async (_e, { userId, data }) => {
    return workOrderService.createWorkOrder(userId, data);
  });

  ipcMain.handle('orders:updateStatus', async (_e, { userId, orderId, status, options }) => {
    return workOrderService.updateStatus(userId, orderId, status, options);
  });

  ipcMain.handle('orders:addPayment', async (_e, { userId, workOrderId, tutarKurus, yontem }) => {
    return workOrderService.addPayment(userId, workOrderId, tutarKurus, yontem);
  });

  // Stock & Recipes (Day 4 / FR-19 to FR-26)
  ipcMain.handle('stock:getAllProducts', async () => {
    return stockService.getAllProducts();
  },);

  ipcMain.handle('stock:getCriticalProducts', async () => {
    return stockService.getCriticalProducts();
  });

  ipcMain.handle('stock:createProduct', async (_e, { userId, data }) => {
    return stockService.createProduct(userId, data);
  });

  ipcMain.handle('stock:updateProduct', async (_e, { userId, id, data }) => {
    return stockService.updateProduct(userId, id, data);
  });

  ipcMain.handle('stock:getRecipes', async (_e, { serviceId }) => {
    return stockService.getRecipesByServiceId(serviceId);
  });

  ipcMain.handle('stock:setRecipe', async (_e, { userId, serviceId, productId, miktar }) => {
    return stockService.setRecipe(userId, serviceId, productId, miktar);
  });

  ipcMain.handle('stock:removeRecipe', async (_e, { userId, serviceId, productId }) => {
    return stockService.removeRecipe(userId, serviceId, productId);
  });

  ipcMain.handle('stock:addPurchase', async (_e, { userId, data }) => {
    return stockService.addStockPurchase(userId, data);
  });

  ipcMain.handle('stock:recordMovement', async (_e, { userId, data }) => {
    return stockService.recordManualMovement(userId, data);
  });

  ipcMain.handle('stock:getMovements', async (_e, { limit } = {}) => {
    return stockService.getMovements(limit);
  });

  ipcMain.handle('stock:getSuppliers', async () => {
    return stockService.getAllSuppliers();
  });

  ipcMain.handle('stock:createSupplier', async (_e, data) => {
    return stockService.createSupplier(data);
  });

  // Backup & Restore (Day 4 / FR-47, FR-48, B7)
  ipcMain.handle('backup:create', async (_e, { userId, customPath } = {}) => {
    return backupService.createBackup(userId, customPath);
  });

  ipcMain.handle('backup:restore', async (_e, { userId, backupFilePath }) => {
    return backupService.restoreBackup(userId, backupFilePath);
  });

  // Finance & Cash Closing (Day 5 / FR-29 to FR-34, P3, A1)
  ipcMain.handle('finance:getCategories', async (_e, { tur } = {}) => {
    return financeService.getCategories(tur);
  });

  ipcMain.handle('finance:createCategory', async (_e, data) => {
    return financeService.createCategory(data);
  });

  ipcMain.handle('finance:getTransactions', async (_e, { filters } = {}) => {
    return financeService.getTransactions(filters);
  });

  ipcMain.handle('finance:getNetProfit', async (_e, { startDate, endDate } = {}) => {
    return financeService.getNetProfitSummary(startDate, endDate);
  });

  ipcMain.handle('finance:addTransaction', async (_e, { userId, data }) => {
    return financeService.addManualTransaction(userId, data);
  });

  ipcMain.handle('finance:closeCashSession', async (_e, { userId, sayilanKurus }) => {
    return financeService.closeCashSession(userId, sayilanKurus);
  });

  // Summary Service (Day 5 & Day 6 / FR-35 to FR-39, FR-52)
  ipcMain.handle('summary:getDaily', async (_e, { date } = {}) => {
    return summaryService.getDailySummary(date);
  });

  ipcMain.handle('summary:getReports', async (_e, { period } = {}) => {
    return summaryService.getReports(period || 'daily');
  });

  // Email & Outbox (Day 6 / FR-51 to FR-55, B6)
  ipcMain.handle('email:getConfig', async () => {
    return emailService.getSmtpConfig();
  });

  ipcMain.handle('email:updateConfig', async (_e, { userId, config }) => {
    return emailService.updateSmtpConfig(userId, config);
  });

  ipcMain.handle('email:sendTest', async (_e, { userId, testRecipient }) => {
    return emailService.sendTestEmail(userId, testRecipient);
  });

  ipcMain.handle('email:triggerDaily', async (_e, { userId, force } = {}) => {
    return emailService.triggerDailyEmail(userId, force);
  });

  ipcMain.handle('email:getQueueStatus', async () => {
    return emailService.getQueueStatus();
  });

  // Export Reports (Day 6 / FR-40)
  ipcMain.handle('report:exportExcel', async (_e, { period } = {}) => {
    const buffer = await excelExportService.generateReportExcel(period || 'daily');
    return buffer.toString('base64');
  });
}


