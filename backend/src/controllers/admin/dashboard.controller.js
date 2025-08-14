const User = require('../../models/User');
const Transaction = require('../../models/Transaction.model');
const Wallet = require('../../models/Wallet.model');
const AdminLog = require('../../models/AdminLog.model');
const logger = require('../../utils/logger');

const getDashboardStats = async (req, res) => {
  try {
    const [transactionAgg, userAgg, walletAgg, recentActivity] = await Promise.all([
      Transaction.aggregate([
        { $group: {
            _id: '$status',
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
            deposits: { $sum: { $cond: [{ $eq: ['$type','deposit'] }, '$amount', 0] } },
            packageSales: { $sum: { $cond: [{ $eq: ['$type','purchase'] }, 1, 0] } }
        }}
      ]),
      User.aggregate([{ $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        verifiedUsers: { $sum: { $cond: [{ $eq: ['$verification.isVerified', true] }, 1, 0] } }
      }}]),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balance' }, count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status','active'] },1,0] } } } }]),
      AdminLog.find().sort({ timestamp: -1 }).limit(10)
    ]);

    const txIdx = (k) => transactionAgg.find(x => x._id === k) || { count: 0, volume: 0, deposits: 0, packageSales: 0 };

    return res.json({
      success: true,
      data: {
        transactions: {
          totalTransactions: transactionAgg.reduce((a,b)=>a+b.count,0),
          completedTransactions: txIdx('completed').count,
          pendingTransactions: txIdx('pending').count,
          totalVolume: transactionAgg.reduce((a,b)=>a+b.volume,0),
          totalDeposits: txIdx('completed').deposits || 0,
          packageSales: txIdx('completed').packageSales || 0
        },
        users: userAgg[0] || { totalUsers:0, activeUsers:0, verifiedUsers:0 },
        wallets: { totalBalance: walletAgg[0]?.total || 0, total: walletAgg[0]?.count || 0, active: walletAgg[0]?.active || 0 },
        recentActivity
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    logger.error('Error stack:', error.stack);
    console.error('FULL ERROR DETAILS:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ success:false, message:'Error interno del servidor' });
  }
};

module.exports = {
  getDashboardStats
};