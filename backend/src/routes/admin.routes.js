const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction.model');
const walletController = require('../controllers/wallet.controller');
const adminController = require('../controllers/admin.controller');
const transactionController = require('../controllers/transaction.controller');
const newsController = require('../controllers/news.controller');
const systemSettingsController = require('../controllers/systemSettings.controller');
const UserStatusController = require('../controllers/userStatus.controller');
const aiController = require('../controllers/ai.controller');
const adminPackageController = require('../controllers/adminPackage.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { 
  requireWalletPermission, 
  checkWalletCreationLimits, 
  incrementWalletCreationCounter,
  checkAllowedNetwork 
} = require('../middleware/walletAuth.middleware');
const { validateRequest } = require('../middleware/validation');
const logger = require('../utils/logger');

// Import document routes
const documentRoutes = require('./document.routes');

const router = express.Router();

// Rate limiting for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 admin requests per windowMs
  message: {
    error: 'Too many admin requests, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Fix for trust proxy error
  handler: (req, res) => {
    logger.logSecurityEvent('admin_rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many admin requests, please try again later.',
      retryAfter: 15 * 60
    });
  }
});

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminLimiter);

// ===== WALLET MANAGEMENT ROUTES =====

/**
 * @route   GET /api/admin/wallets
 * @desc    Get all wallets with pagination and filters
 * @access  Private (Admin + wallet_viewer)
 */
router.get('/wallets', requireWalletPermission('view_wallets'), walletController.getAllWallets);

/**
 * @route   POST /api/admin/wallets
 * @desc    Create new wallet
 * @access  Private (Admin + wallet_manager)
 */
router.post('/wallets', 
  requireWalletPermission('create_wallet'),
  checkWalletCreationLimits,
  checkAllowedNetwork,
  walletController.createWallet,
  incrementWalletCreationCounter
);

/**
 * @route   GET /api/admin/wallets/stats
 * @desc    Get wallet statistics
 * @access  Private (Admin + wallet_viewer)
 */
router.get('/wallets/stats', requireWalletPermission('view_wallet_stats'), walletController.getWalletStats);

/**
 * @route   GET /api/admin/wallets/available
 * @desc    Get available wallets for payments
 * @access  Private (Admin + wallet_viewer)
 */
router.get('/wallets/available', requireWalletPermission('view_wallets'), walletController.getAvailableWallet);

/**
 * @route   GET /api/admin/wallets/:id
 * @desc    Get wallet by ID
 * @access  Private (Admin + wallet_viewer)
 */
router.get('/wallets/:id', requireWalletPermission('view_wallet_details'), walletController.getWalletById);

/**
 * @route   PUT /api/admin/wallets/:id
 * @desc    Update wallet
 * @access  Private (Admin + wallet_manager)
 */
router.put('/wallets/:id', 
  requireWalletPermission('update_wallet'),
  checkAllowedNetwork,
  walletController.updateWallet
);

/**
 * @route   DELETE /api/admin/wallets/:id
 * @desc    Delete wallet
 * @access  Private (Admin + wallet_admin)
 */
router.delete('/wallets/:id', requireWalletPermission('delete_wallet'), walletController.deleteWallet);

/**
 * @route   POST /api/admin/wallets/:id/update-balance
 * @desc    Update wallet balance
 * @access  Private (Admin + wallet_manager)
 */
router.post('/wallets/:id/update-balance', requireWalletPermission('update_wallet_balance'), walletController.updateWalletBalance);

/**
 * @route   POST /api/admin/wallets/:id/release
 * @desc    Release wallet from current usage
 * @access  Private (Admin + wallet_manager)
 */
router.post('/wallets/:id/release', requireWalletPermission('release_wallet'), walletController.releaseWallet);

/**
 * @route   POST /api/admin/wallets/:id/notes
 * @desc    Add notes to wallet
 * @access  Private (Admin + wallet_manager)
 */
router.post('/wallets/:id/notes', requireWalletPermission('add_wallet_notes'), walletController.addWalletNote);

// ===== WALLET ROLES MANAGEMENT ROUTES =====
/**
 * @route   GET /api/admin/wallet-roles
 * @desc    Get all wallet roles
 * @access  Private (Admin + wallet_admin)
 */
router.get('/wallet-roles', requireWalletPermission('manage_wallet_roles'), async (req, res) => {
  try {
    const WalletRole = require('../models/WalletRole.model');
    const roles = await WalletRole.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: roles });
  } catch (error) {
    logger.error('Error fetching wallet roles:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @route   POST /api/admin/wallet-roles
 * @desc    Create new wallet role
 * @access  Private (Admin + wallet_admin)
 */
router.post('/wallet-roles', requireWalletPermission('manage_wallet_roles'), async (req, res) => {
  try {
    const WalletRole = require('../models/WalletRole.model');
    const role = new WalletRole(req.body);
    await role.save();
    
    // Log the action
    const AdminLog = require('../../models/AdminLog.model');
    await AdminLog.create({
      adminId: req.user.id,
      action: 'CREATE_WALLET_ROLE',
      details: { roleId: role._id, roleName: role.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    logger.error('Error creating wallet role:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @route   GET /api/admin/user-wallet-roles
 * @desc    Get user wallet role assignments
 * @access  Private (Admin + wallet_admin)
 */
router.get('/user-wallet-roles', requireWalletPermission('manage_wallet_roles'), async (req, res) => {
  try {
    const UserWalletRole = require('../models/UserWalletRole.model');
    const assignments = await UserWalletRole.find({ isActive: true })
      .populate('userId', 'username email')
      .populate('walletRoleId', 'name description')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Error fetching user wallet roles:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @route   POST /api/admin/user-wallet-roles
 * @desc    Assign wallet role to user
 * @access  Private (Admin + wallet_admin)
 */
router.post('/user-wallet-roles', requireWalletPermission('manage_wallet_roles'), async (req, res) => {
  try {
    const UserWalletRole = require('../models/UserWalletRole.model');
    const assignment = new UserWalletRole({
      ...req.body,
      assignedBy: req.user.id
    });
    await assignment.save();
    
    // Log the action
    const AdminLog = require('../../models/AdminLog.model');
    await AdminLog.create({
      adminId: req.user.id,
      action: 'ASSIGN_WALLET_ROLE',
      details: { userId: assignment.userId, walletRoleId: assignment.walletRoleId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    logger.error('Error assigning wallet role:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ===== WALLET SECURITY AUDIT ROUTES =====
/**
 * @route   GET /api/admin/wallet-audit
 * @desc    Get wallet security audit report
 * @access  Private (Admin + wallet_admin)
 */
router.get('/wallet-audit', requireWalletPermission('audit_wallets'), async (req, res) => {
  try {
    const { exec } = require('child_process');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, '../../scripts/wallet-security-audit.js');
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        logger.error('Error running wallet audit:', error);
        return res.status(500).json({ success: false, message: 'Error ejecutando auditoría' });
      }
      
      try {
        const auditResult = JSON.parse(stdout);
        res.json({ success: true, data: auditResult });
      } catch (parseError) {
        logger.error('Error parsing audit result:', parseError);
        res.status(500).json({ success: false, message: 'Error procesando resultado de auditoría' });
      }
    });
  } catch (error) {
    logger.error('Error initiating wallet audit:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @route   POST /api/admin/wallet-audit/schedule
 * @desc    Schedule automatic wallet audit
 * @access  Private (Admin + wallet_admin)
 */
router.post('/wallet-audit/schedule', requireWalletPermission('audit_wallets'), async (req, res) => {
  try {
    const { frequency = 'daily', time = '02:00' } = req.body;
    
    // Log the scheduling action
    const AdminLog = require('../../models/AdminLog.model');
    await AdminLog.create({
      adminId: req.user.id,
      action: 'SCHEDULE_WALLET_AUDIT',
      details: { frequency, time },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ 
      success: true, 
      message: `Auditoría programada para ejecutarse ${frequency} a las ${time}` 
    });
  } catch (error) {
    logger.error('Error scheduling wallet audit:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ===== ADMIN DASHBOARD ROUTES =====

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get main dashboard data
 * @access  Private (Admin)
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard/stats', adminController.getDashboardStats);

// ===== USER MANAGEMENT ROUTES =====

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Admin)
 */
router.get('/users', adminController.getUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user details
 * @access  Private (Admin)
 */
router.get('/users/:userId', adminController.getUserDetails);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    Update user status
 * @access  Private (Admin)
 */
router.put('/users/:userId/status', [
  validateRequest([
    { field: 'status', type: 'string', required: true, enum: ['active', 'suspended', 'banned'] },
    { field: 'reason', type: 'string', required: false }
  ])
], adminController.updateUserStatus);

/**
 * @route   POST /api/admin/users/:userId/adjust-balance
 * @desc    Adjust user balance manually
 * @access  Private (Admin)
 */
router.patch('/users/:userId/balance', [
  validateRequest([
    { field: 'amount', type: 'number', required: true },
    { field: 'type', type: 'string', required: true, enum: ['add', 'subtract', 'set'] },
    { field: 'reason', type: 'string', required: true }
  ])
], adminController.adjustUserBalance);

/**
 * @route   POST /api/admin/users/:userId/status
 * @desc    Create UserStatus for user
 * @access  Private (Admin)
 */
router.post('/users/:userId/status', [
  validateRequest([
    { field: 'packageType', type: 'string', required: false },
    { field: 'reason', type: 'string', required: false }
  ])
], adminController.createUserStatus);

/**
 * @route   PATCH /api/admin/users/:userId/verify
 * @desc    Verify user account
 * @access  Private (Admin)
 */
router.patch('/users/:userId/verify', adminController.verifyUser);

/**
 * @route   POST /api/admin/users/:userId/process-withdrawals
 * @desc    Process pending withdrawals for user
 * @access  Private (Admin)
 */
router.post('/users/:userId/process-withdrawals', adminController.processWithdrawals);

/**
 * @route   GET /api/admin/users/:userId/financial-details
 * @desc    Get detailed financial information for user
 * @access  Private (Admin)
 */
router.get('/users/:userId/financial-details', adminController.viewFinancialDetails);

/**
 * @route   GET /api/admin/users/:userId/report
 * @desc    Generate comprehensive user report
 * @access  Private (Admin)
 */
router.get('/users/:userId/report', adminController.generateUserReport);

/**
 * @route   PUT /api/admin/users/:userId/profile
 * @desc    Update user profile (Admin)
 * @access  Private (Admin)
 */
router.put('/users/:userId/profile', [
  validateRequest([
    { field: 'name', type: 'string', required: false },
    { field: 'email', type: 'string', required: false },
    { field: 'phone', type: 'string', required: false },
    { field: 'role', type: 'string', required: false, enum: ['user', 'admin'] }
  ])
], adminController.updateUserProfile);

/**
 * @route   PATCH /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Private (Admin)
 */
router.patch('/users/:userId/role', adminController.updateUserProfile);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user account
 * @access  Private (Admin)
 */
router.delete('/users/:userId', adminController.deleteUser);

// ===== NEWS MANAGEMENT ROUTES =====

/**
 * @route   GET /api/admin/news
 * @desc    Get all news (admin view)
 * @access  Private (Admin)
 */
router.get('/news', newsController.getAllNews);

/**
 * @route   GET /api/admin/news/stats
 * @desc    Get news statistics
 * @access  Private (Admin)
 */
router.get('/news/stats', newsController.getNewsStats);

/**
 * @route   POST /api/admin/news
 * @desc    Create new news
 * @access  Private (Admin)
 */
router.post('/news', [
  validateRequest([
    { field: 'title.es', type: 'string', required: true },
    { field: 'title.en', type: 'string', required: true },
    { field: 'content.es', type: 'string', required: true },
    { field: 'content.en', type: 'string', required: true },
    { field: 'category', type: 'string', required: true },
    { field: 'priority', type: 'string', required: false, enum: ['low', 'medium', 'high', 'urgent'] },
    { field: 'status', type: 'string', required: false, enum: ['draft', 'published', 'archived'] }
  ])
], newsController.createNews);

/**
 * @route   GET /api/admin/news/:newsId
 * @desc    Get news by ID
 * @access  Private (Admin)
 */
router.get('/news/:newsId', newsController.getNewsById);

/**
 * @route   PUT /api/admin/news/:newsId
 * @desc    Update news
 * @access  Private (Admin)
 */
router.put('/news/:newsId', [
  validateRequest([
    { field: 'title.es', type: 'string', required: false },
    { field: 'title.en', type: 'string', required: false },
    { field: 'content.es', type: 'string', required: false },
    { field: 'content.en', type: 'string', required: false },
    { field: 'category', type: 'string', required: false },
    { field: 'priority', type: 'string', required: false, enum: ['low', 'medium', 'high', 'urgent'] },
    { field: 'status', type: 'string', required: false, enum: ['draft', 'published', 'archived'] }
  ])
], newsController.updateNews);

/**
 * @route   DELETE /api/admin/news/:newsId
 * @desc    Delete news
 * @access  Private (Admin)
 */
router.delete('/news/:newsId', newsController.deleteNews);

/**
 * @route   POST /api/admin/news/bulk-update
 * @desc    Bulk update news status
 * @access  Private (Admin)
 */
router.post('/news/bulk-update', [
  validateRequest([
    { field: 'newsIds', type: 'array', required: true },
    { field: 'status', type: 'string', required: true, enum: ['draft', 'published', 'archived'] }
  ])
], newsController.bulkUpdateNewsStatus);

// ===== SYSTEM SETTINGS ROUTES =====

/**
 * @route   GET /api/admin/settings
 * @desc    Get all system settings
 * @access  Private (Admin)
 */
router.get('/settings', systemSettingsController.getAllSettings);

/**
 * @route   GET /api/admin/settings/stats
 * @desc    Get settings statistics
 * @access  Private (Admin)
 */
router.get('/settings/stats', systemSettingsController.getSettingsStats);

/**
 * @route   POST /api/admin/settings
 * @desc    Create new system setting
 * @access  Private (Admin)
 */
router.post('/settings', [
  validateRequest([
    { field: 'key', type: 'string', required: true },
    { field: 'value', type: 'any', required: true },
    { field: 'category', type: 'string', required: true },
    { field: 'description', type: 'string', required: true },
    { field: 'dataType', type: 'string', required: true, enum: ['string', 'number', 'boolean', 'object', 'array'] },
    { field: 'isPublic', type: 'boolean', required: false }
  ])
], systemSettingsController.createSetting);

/**
 * @route   GET /api/admin/settings/:key
 * @desc    Get setting by key
 * @access  Private (Admin)
 */
router.get('/settings/:key', systemSettingsController.getSettingByKey);

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Update system setting
 * @access  Private (Admin)
 */
router.put('/settings/:key', [
  validateRequest([
    { field: 'value', type: 'any', required: false },
    { field: 'description', type: 'string', required: false },
    { field: 'isPublic', type: 'boolean', required: false }
  ])
], systemSettingsController.updateSetting);

/**
 * @route   DELETE /api/admin/settings/:key
 * @desc    Delete system setting
 * @access  Private (Admin)
 */
router.delete('/settings/:key', systemSettingsController.deleteSetting);

/**
 * @route   POST /api/admin/settings/bulk-update
 * @desc    Bulk update system settings
 * @access  Private (Admin)
 */
router.post('/settings/bulk-update', [
  validateRequest([
    { field: 'settings', type: 'array', required: true }
  ])
], systemSettingsController.bulkUpdateSettings);

/**
 * @route   GET /api/admin/settings/:key/history
 * @desc    Get setting history
 * @access  Private (Admin)
 */
router.get('/settings/:key/history', systemSettingsController.getSettingHistory);

/**
 * @route   POST /api/admin/settings/:key/restore
 * @desc    Restore setting to previous version
 * @access  Private (Admin)
 */
router.post('/settings/:key/restore', [
  validateRequest([
    { field: 'version', type: 'number', required: true }
  ])
], systemSettingsController.restoreSettingVersion);

// ===== USER STATUS MANAGEMENT ROUTES =====

/**
 * @route   GET /api/admin/user-status
 * @desc    Get user status dashboard data (redirect to user-status service)
 * @access  Private (Admin)
 */
router.get('/user-status', UserStatusController.getDashboardMetrics);

/**
 * @route   GET /api/admin/user-status/metrics
 * @desc    Get detailed user status metrics
 * @access  Private (Admin)
 */
router.get('/user-status/metrics', UserStatusController.getDashboardMetrics);

/**
 * @route   GET /api/admin/user-status/attention-needed
 * @desc    Get users needing attention
 * @access  Private (Admin)
 */
router.get('/user-status/attention-needed', UserStatusController.getUsersNeedingAttention);

// ===== WITHDRAWAL MANAGEMENT ROUTES =====

/**
 * @route   GET /api/admin/withdrawals/pending
 * @desc    Get pending withdrawals
 * @access  Private (Admin)
 */
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);

/**
 * @route   GET /api/admin/withdrawals/for-batch
 * @desc    Get withdrawals available for batch creation (optimized for 10x10 selection)
 * @access  Private (Admin)
 */
router.get('/withdrawals/for-batch', adminController.getWithdrawalsForBatch);

/**
 * @route   GET /api/admin/withdrawals/batch-stats
 * @desc    Get withdrawal batch statistics and recommendations
 * @access  Private (Admin)
 */
router.get('/withdrawals/batch-stats', adminController.getWithdrawalBatchStats);

/**
 * @route   GET /api/admin/withdrawals/export
 * @desc    Export pending withdrawals to CSV for batch payments
 * @access  Private (Admin)
 */
router.get('/withdrawals/export', adminController.exportPendingWithdrawals);

/**
 * @route   POST /api/admin/withdrawals/mark-exported
 * @desc    Mark withdrawals as exported to prevent duplicates
 * @access  Private (Admin)
 */
router.post('/withdrawals/mark-exported', [
  validateRequest([
    { field: 'withdrawalIds', type: 'array', required: true },
    { field: 'batchId', type: 'string', required: false }
  ])
], adminController.markWithdrawalsAsExported);

/**
 * @route   POST /api/admin/withdrawals/mark-processed
 * @desc    Mark withdrawals as processed after external payment
 * @access  Private (Admin)
 */
router.post('/withdrawals/mark-processed', [
  validateRequest([
    { field: 'withdrawalIds', type: 'array', required: true },
    { field: 'txHashes', type: 'array', required: false },
    { field: 'batchId', type: 'string', required: false }
  ])
], adminController.markWithdrawalsAsProcessed);

/**
 * @route   POST /api/admin/withdrawals/create-batch
 * @desc    Create withdrawal batch for external processing
 * @access  Private (Admin)
 */
router.post('/withdrawals/create-batch', [
  validateRequest([
    { field: 'withdrawalIds', type: 'array', required: true },
    { field: 'batchName', type: 'string', required: false },
    { field: 'priority', type: 'string', required: false, enum: ['low', 'normal', 'high', 'urgent'] }
  ])
], adminController.createWithdrawalBatch);

/**
 * @route   GET /api/admin/withdrawals/batches
 * @desc    Get withdrawal batches with filters and pagination
 * @access  Private (Admin)
 */
router.get('/withdrawals/batches', adminController.getWithdrawalBatches);

// ===== TRANSACTION MONITORING ROUTES =====

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with filters and pagination
 * @access  Private (Admin)
 */
router.get('/transactions', transactionController.getAllTransactions);

/**
 * @route   POST /api/admin/transactions
 * @desc    Create a new transaction from admin panel
 * @access  Private (Admin)
 */
router.post('/transactions', transactionController.createTransaction);

/**
 * @route   GET /api/admin/transactions/pending
 * @desc    Get pending BEP20 transactions for monitoring
 * @access  Private (Admin)
 */
router.get('/transactions/pending', async (req, res) => {
  try {
    
    const pendingTransactions = await Transaction.find({
      status: 'pending',
      'paymentDetails.network': 'BEP20',
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username email')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      data: pendingTransactions
    });
  } catch (error) {
    logger.error('Error getting pending transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/admin/transactions/:id/force-check
 * @desc    Force check transaction status on blockchain
 * @access  Private (Admin)
 */
router.post('/transactions/:id/force-check', async (req, res) => {
  try {
    const bep20Service = require('../services/bep20.service');
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    if (transaction.paymentDetails.network !== 'BEP20') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden verificar transacciones BEP20'
      });
    }

    if (!transaction.paymentDetails.txHash) {
      return res.status(400).json({
        success: false,
        message: 'No hay hash de transacción para verificar'
      });
    }

    // Verificar en blockchain
    const verification = await bep20Service.verifyTransaction(
      transaction.paymentDetails.txHash,
      transaction.paymentDetails.address,
      transaction.amount
    );

    // Actualizar confirmaciones
    transaction.paymentDetails.confirmations = verification.confirmations;
    await transaction.save();

    res.json({
      success: true,
      data: {
        status: verification.status,
        confirmations: verification.confirmations,
        requiredConfirmations: verification.requiredConfirmations,
        transaction: verification.transaction
      }
    });

  } catch (error) {
    logger.error('Error force checking transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== REFERRAL MANAGEMENT ROUTES =====

/**
 * @route   GET /api/admin/referrals/stats
 * @desc    Get referral statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/referrals/stats', adminController.getReferralStats);

/**
 * @route   GET /api/admin/referrals
 * @desc    Get all referrals with filters (Admin only)
 * @access  Private (Admin)
 */
router.get('/referrals', adminController.getAllReferrals);

/**
 * @route   GET /api/admin/referrals/commissions/pending
 * @desc    Get pending commissions (Admin only)
 * @access  Private (Admin)
 */
router.get('/referrals/commissions/pending', adminController.getPendingCommissions);

/**
 * @route   POST /api/admin/referrals/commissions/process
 * @desc    Process commission payments (Admin only)
 * @access  Private (Admin)
 */
router.post('/referrals/commissions/process', [
  validateRequest([
    { field: 'commissionIds', type: 'array', required: true }
  ])
], adminController.processCommissionPayments);

/**
 * @route   POST /api/admin/referrals/commissions/reject
 * @desc    Reject commission payments (Admin only)
 * @access  Private (Admin)
 */
router.post('/referrals/commissions/reject', [
  validateRequest([
    { field: 'commissionIds', type: 'array', required: true }
  ])
], adminController.rejectCommissions);

/**
 * @route   POST /api/admin/referrals/recalculate-commissions
 * @desc    Recalculate commissions for a user (Admin only)
 * @access  Private (Admin)
 */
router.post('/referrals/recalculate-commissions', [
  validateRequest([
    { field: 'userId', type: 'string', required: true },
    { field: 'fromDate', type: 'string', required: false }
  ])
], adminController.recalculateCommissions);

/**
 * @route   GET /api/admin/referrals/top-referrers
 * @desc    Get top referrers (Admin only)
 * @access  Private (Admin)
 */
router.get('/referrals/top-referrers', adminController.getTopReferrers);

/**
 * @route   GET /api/admin/payments/pending-benefits
 * @desc    Get payments with confirmed blockchain but unactivated benefits
 * @access  Private (Admin)
 */
router.get('/payments/pending-benefits', adminController.getPendingPaymentsAndBenefits);

/**
 * @route   POST /api/admin/payments/force-benefit-activation
 * @desc    Manually activate benefits for a transaction
 * @access  Private (Admin)
 */
router.post('/payments/force-benefit-activation', [
  validateRequest([
    { field: 'transactionId', type: 'string', required: true },
    { field: 'reason', type: 'string', required: false }
  ])
], adminController.forceBenefitActivation);

/**
 * @route   POST /api/admin/commissions/process-manual
 * @desc    Manually process referral commissions for a transaction
 * @access  Private (Admin)
 */
router.post('/commissions/process-manual', [
  validateRequest([
    { field: 'transactionId', type: 'string', required: true },
    { field: 'reason', type: 'string', required: false }
  ])
], adminController.processManualCommissions);

/**
 * @route   GET /api/admin/transactions/search/:reference
 * @desc    Search transaction by ID or external reference
 * @access  Private (Admin)
 */
router.get('/transactions/search/:reference', adminController.searchTransaction);

// ===== SYSTEM MONITORING ROUTES =====

/**
 * @route   GET /api/admin/system/stats
 * @desc    Get system statistics
 * @access  Private (Admin)
 */
router.get('/system/stats', adminController.getSystemStats);

/**
 * @route   GET /api/admin/system/logs
 * @desc    Get system logs
 * @access  Private (Admin)
 */
router.get('/system/logs', adminController.getSystemLogs);

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
router.get('/system/health', adminController.getSystemHealth);

/**
 * @route   POST /api/admin/transactions/monitor-bep20
 * @desc    Iniciar monitoreo de transacciones BEP20 pendientes
 * @access  Private (Admin)
 */
router.post('/transactions/monitor-bep20', transactionController.monitorBEP20Transactions);

/**
 * @route   POST /api/admin/transactions/:transactionId/force-verify
 * @desc    Verificar forzadamente una transacción específica
 * @access  Private (Admin)
 */
router.post('/transactions/:transactionId/force-verify', transactionController.forceVerifyTransaction);

// ===== AI MANAGEMENT ROUTES =====

/**
 * @route   POST /api/admin/ai/configure
 * @desc    Configurar API de IA
 * @access  Private (Admin)
 */
router.post('/ai/configure', [
  validateRequest([
    { field: 'enabled', type: 'boolean', required: true },
    { field: 'apiKey', type: 'string', required: false },
    { field: 'apiUrl', type: 'string', required: false },
    { field: 'model', type: 'string', required: false }
  ])
], aiController.configureAI);

/**
 * @route   GET /api/admin/ai/config
 * @desc    Obtener configuración actual de IA
 * @access  Private (Admin)
 */
router.get('/ai/config', aiController.getAIConfig);

/**
 * @route   POST /api/admin/ai/validate
 * @desc    Validar API de IA
 * @access  Private (Admin)
 */
router.post('/ai/validate', [
  validateRequest([
    { field: 'apiKey', type: 'string', required: true },
    { field: 'apiUrl', type: 'string', required: true },
    { field: 'model', type: 'string', required: true }
  ])
], aiController.validateAIAPI);

/**
 * @route   POST /api/admin/ai/process-ticket/:ticketId
 * @desc    Procesar ticket con IA
 * @access  Private (Admin)
 */
router.post('/ai/process-ticket/:ticketId', aiController.processTicketWithAI);

/**
 * @route   GET /api/admin/ai/stats
 * @desc    Obtener estadísticas de IA
 * @access  Private (Admin)
 */
router.get('/ai/stats', aiController.getAIStats);

// ===== STATISTICS ROUTES =====

/**
 * @route   GET /api/admin/stats/users
 * @desc    Get user statistics for charts
 * @access  Private (Admin)
 */
router.get('/stats/users', adminController.getUserStats);

/**
 * @route   GET /api/admin/stats/transactions
 * @desc    Get transaction statistics for charts
 * @access  Private (Admin)
 */
router.get('/stats/transactions', adminController.getTransactionStats);

/**
 * @route   GET /api/admin/stats/conversion-rate
 * @desc    Get conversion rate statistics
 * @access  Private (Admin)
 */
router.get('/stats/conversion-rate', adminController.getConversionRateStats);

/**
 * @route   GET /api/admin/stats/system-performance
 * @desc    Get system performance statistics
 * @access  Private (Admin)
 */
router.get('/stats/system-performance', adminController.getSystemPerformanceStats);

/**
 * @route   GET /api/admin/stats/benefits-system
 * @desc    Get benefits system statistics
 * @access  Private (Admin)
 */
router.get('/stats/benefits-system', adminController.getBenefitsSystemStats);

/**
 * @route   GET /api/admin/stats/current-cycle
 * @desc    Get current cycle status
 * @access  Private (Admin)
 */
router.get('/stats/current-cycle', adminController.getCurrentCycleStatus);

/**
 * @route   GET /api/admin/stats/users-by-status
 * @desc    Get users by status distribution
 * @access  Private (Admin)
 */
router.get('/stats/users-by-status', adminController.getUsersByStatus);

/**
 * @route   GET /api/admin/stats/system-performance-metrics
 * @desc    Get detailed system performance metrics
 * @access  Private (Admin)
 */
router.get('/stats/system-performance-metrics', adminController.getSystemPerformanceMetrics);

/**
 * @route   GET /api/admin/finance/summary
 * @desc    Get financial summary and reconciliation
 * @access  Private (Admin)
 */
router.get('/finance/summary', adminController.getFinancialSummary);

/**
 * @route   POST /api/admin/finance/reconcile
 * @desc    Balance reconciliation
 * @access  Private (Admin)
 */
router.post('/finance/reconcile', [
  validateRequest([
    { field: 'userId', type: 'string', required: false },
    { field: 'autoFix', type: 'boolean', required: false }
  ])
], adminController.reconcileUserBalances);

/**
 * @route   GET /api/admin/preregistrations
 * @desc    Get preregistrations with filters
 * @access  Private (Admin)
 */
router.get('/preregistrations', adminController.getPreregistrations);

// ===== AI INTEGRATION ROUTES =====

/**
 * @route   POST /api/admin/ai/train
 * @desc    Entrenar modelo de IA
 * @access  Private (Admin)
 */
router.post('/ai/train', aiController.trainAI);

/**
 * @route   POST /api/admin/ai/auto-response
 * @desc    Configurar respuesta automática
 * @access  Private (Admin)
 */
router.post('/ai/auto-response', [
  validateRequest([
    { field: 'enabled', type: 'boolean', required: true },
    { field: 'categories', type: 'array', required: false },
    { field: 'template', type: 'string', required: false }
  ])
], aiController.configureAutoResponse);

/**
 * @route   GET /api/admin/ai/models
 * @desc    Obtener modelos disponibles
 * @access  Private (Admin)
 */
router.get('/ai/models', aiController.getAvailableModels);

/**
 * @route   POST /api/admin/ai/generate-response
 * @desc    Generar respuesta con IA
 * @access  Private (Admin)
 */
router.post('/ai/generate-response', [
  validateRequest([
    { field: 'ticketContent', type: 'string', required: true },
    { field: 'context', type: 'string', required: false }
  ])
], aiController.generateResponse);

/**
 * @route   GET /api/admin/ai/templates/:category
 * @desc    Obtener plantillas por categoría
 * @access  Private (Admin)
 */
router.get('/ai/templates/:category', aiController.getTemplatesByCategory);

/**
 * @route   POST /api/admin/ai/sentiment
 * @desc    Análisis de sentimiento
 * @access  Private (Admin)
 */
router.post('/ai/sentiment', [
  validateRequest([
    { field: 'text', type: 'string', required: true }
  ])
], aiController.analyzeSentiment);

/**
 * @route   POST /api/admin/ai/categorize
 * @desc    Categorizar ticket automáticamente
 * @access  Private (Admin)
 */
router.post('/ai/categorize', [
  validateRequest([
    { field: 'subject', type: 'string', required: true },
    { field: 'description', type: 'string', required: true }
  ])
], aiController.categorizeTicket);

/**
 * @route   GET /api/admin/ai/performance
 * @desc    Obtener métricas de rendimiento de IA
 * @access  Private (Admin)
 */
router.get('/ai/performance', aiController.getPerformanceMetrics);

// ===== PACKAGE MANAGEMENT ROUTES =====
/**
 * @route   GET /api/admin/packages
 * @desc    Get all packages for admin
 * @access  Private (Admin)
 */
router.get('/packages', adminPackageController.getAllPackages);

/**
 * @route   GET /api/admin/packages/stats
 * @desc    Get package statistics
 * @access  Private (Admin)
 */
router.get('/packages/stats', adminPackageController.getPackageStats);

/**
 * @route   POST /api/admin/packages
 * @desc    Create new package
 * @access  Private (Admin)
 */
router.post('/packages', [
  validateRequest([
    { field: 'name', type: 'string', required: true },
    { field: 'description', type: 'string', required: true },
    { field: 'price', type: 'number', required: true, min: 0 },
    { field: 'duration', type: 'number', required: false, min: 1 },
    { field: 'status', type: 'string', required: false, enum: ['active', 'inactive', 'draft'] },
    { field: 'features', type: 'array', required: false },
    { field: 'isPopular', type: 'boolean', required: false }
  ])
], adminPackageController.createPackage);

/**
 * @route   GET /api/admin/packages/:id
 * @desc    Get package by ID
 * @access  Private (Admin)
 */
router.get('/packages/:id', adminPackageController.getPackageById);

/**
 * @route   PUT /api/admin/packages/:id
 * @desc    Update package
 * @access  Private (Admin)
 */
router.put('/packages/:id', [
  validateRequest([
    { field: 'name', type: 'string', required: false },
    { field: 'description', type: 'string', required: false },
    { field: 'price', type: 'number', required: false, min: 0 },
    { field: 'duration', type: 'number', required: false, min: 1 },
    { field: 'status', type: 'string', required: false, enum: ['active', 'inactive', 'draft'] },
    { field: 'features', type: 'array', required: false },
    { field: 'isPopular', type: 'boolean', required: false }
  ])
], adminPackageController.updatePackage);

/**
 * @route   DELETE /api/admin/packages/:id
 * @desc    Delete package
 * @access  Private (Admin)
 */
router.delete('/packages/:id', adminPackageController.deletePackage);

/**
 * @route   POST /api/admin/packages/bulk-update
 * @desc    Bulk update package status
 * @access  Private (Admin)
 */
router.post('/packages/bulk-update', [
  validateRequest([
    { field: 'packageIds', type: 'array', required: true },
    { field: 'status', type: 'string', required: true, enum: ['active', 'inactive', 'draft'] }
  ])
], adminPackageController.bulkUpdatePackages);

// ===== DOCUMENT MANAGEMENT ROUTES =====
// Mount document routes under// ===== SECURITY MANAGEMENT ROUTES =====

/**
 * @route   GET /api/admin/security/logs
 * @desc    Get security logs with pagination and filters
 * @access  Private (Admin)
 */
router.get('/security/logs', adminController.getSecurityLogs);

/**
 * @route   GET /api/admin/security/suspicious-activities
 * @desc    Get suspicious activities
 * @access  Private (Admin)
 */
router.get('/security/suspicious-activities', adminController.getSuspiciousActivities);

/**
 * @route   GET /api/admin/security/blocked-ips
 * @desc    Get blocked IPs
 * @access  Private (Admin)
 */
router.get('/security/blocked-ips', adminController.getBlockedIPs);

/**
 * @route   GET /api/admin/security/settings
 * @desc    Get security settings
 * @access  Private (Admin)
 */
router.get('/security/settings', adminController.getSecuritySettings);

/**
 * @route   GET /api/admin/security/stats
 * @desc    Get security statistics
 * @access  Private (Admin)
 */
router.get('/security/stats', adminController.getSecurityStats);

/**
 * @route   POST /api/admin/security/block-ip
 * @desc    Block an IP address
 * @access  Private (Admin)
 */
router.post('/security/block-ip', [
  validateRequest([
    { field: 'ipAddress', type: 'string', required: true },
    { field: 'reason', type: 'string', required: false }
  ])
], adminController.blockIP);

/**
 * @route   DELETE /api/admin/security/blocked-ips/:ipAddress
 * @desc    Unblock an IP address
 * @access  Private (Admin)
 */
router.delete('/security/blocked-ips/:ipAddress', adminController.unblockIP);

/**
 * @route   PUT /api/admin/security/settings
 * @desc    Update security settings
 * @access  Private (Admin)
 */
router.put('/security/settings', [
  validateRequest([
    { field: 'maxLoginAttempts', type: 'number', required: false },
    { field: 'lockoutDuration', type: 'number', required: false },
    { field: 'sessionTimeout', type: 'number', required: false },
    { field: 'enableTwoFactor', type: 'boolean', required: false },
    { field: 'enableIpWhitelist', type: 'boolean', required: false }
  ])
], adminController.updateSecuritySettings);

/**
 * @route   PATCH /api/admin/security/suspicious-activities/:activityId/resolve
 * @desc    Mark suspicious activity as resolved
 * @access  Private (Admin)
 */
router.patch('/security/suspicious-activities/:activityId/resolve', adminController.markActivityAsResolved);

// ===== TRANSACTION INQUIRY ROUTES =====

/**
 * @route   POST /api/admin/notifications/transaction-inquiry
 * @desc    Create transaction inquiry notification for admins
 * @access  Private (User)
 */
router.post('/notifications/transaction-inquiry', [validateRequest([
  { field: 'transactionId', type: 'string', required: true },
  { field: 'userId', type: 'string', required: true },
  { field: 'message', type: 'string', required: true },
  { field: 'type', type: 'string', required: false },
  { field: 'priority', type: 'string', required: false },
  { field: 'metadata', type: 'object', required: false }
])], async (req, res) => {
  try {
    const { transactionId, userId, message, type = 'transaction_inquiry', priority = 'medium', metadata = {} } = req.body;
    
    // Crear notificación para todos los administradores
    const NotificationService = require('../services/NotificationService');
    const notificationService = new NotificationService();
    
    const title = `Consulta de Transacción: ${transactionId}`;
    const fullMessage = `${message}\n\nDetalles adicionales:\n- Usuario ID: ${userId}\n- Transacción ID: ${transactionId}`;
    
    const notifications = await notificationService.notifyAdmins({
      title,
      message: fullMessage,
      type,
      priority,
      actionUrl: `/admin/transactions/${transactionId}`,
      metadata: {
        ...metadata,
        transactionId,
        userId,
        inquiryType: 'user_transaction_inquiry'
      }
    });
    
    res.json({
      success: true,
      message: 'Consulta enviada exitosamente a los administradores',
      data: {
        notificationsCreated: notifications.length,
        transactionId
      }
    });
    
  } catch (error) {
    logger.error('Error creating transaction inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar la consulta'
    });
  }
});

// ===== EMAIL MANAGEMENT ROUTES =====

/**
 * @route   POST /api/admin/email/resend-verification
 * @desc    Resend verification email to user
 * @access  Private (Admin)
 */
router.post('/email/resend-verification', adminController.resendVerificationEmail);

/**
 * @route   POST /api/admin/email/force-verification
 * @desc    Force email verification for user
 * @access  Private (Admin)
 */
router.post('/email/force-verification', adminController.forceEmailVerification);

/**
 * @route   GET /api/admin/email/errors
 * @desc    Get email sending errors
 * @access  Private (Admin)
 */
router.get('/email/errors', adminController.getEmailErrors);

/**
 * @route   GET /api/admin/email/stats
 * @desc    Get email statistics
 * @access  Private (Admin)
 */
router.get('/email/stats', adminController.getEmailStats);

/**
 * @route   POST /api/admin/email/resend-failed
 * @desc    Resend a failed email
 * @access  Private (Admin)
 */
router.post('/email/resend-failed', [
  validateRequest([
    { field: 'emailLogId', type: 'string', required: true },
    { field: 'reason', type: 'string', required: false }
  ])
], adminController.resendFailedEmail);

// Mount document routes
router.use('/documents', documentRoutes);

// Error handling middleware for admin routes
router.use((error, req, res, next) => {
  logger.logSecurityEvent('admin_route_error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    adminId: req.user?.id
  });

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      error: 'Admin operation error'
    });
  } else {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;