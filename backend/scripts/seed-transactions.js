const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Transaction = require('../src/models/Transaction.model');
const Package = require('../src/models/Package.model');
const User = require('../src/models/User.js');

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || '')
};

async function seedTransactions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get existing packages and users
    const packages = await Package.find({ status: 'active' });
    const users = await User.find({ role: 'user' }).limit(20);

    if (packages.length === 0) {
      logger.error('No active packages found. Please seed packages first.');
      return;
    }

    if (users.length === 0) {
      logger.error('No users found. Please create users first.');
      return;
    }

    logger.info(`Found ${packages.length} packages and ${users.length} users`);

    // Clear existing license purchase transactions
    await Transaction.deleteMany({ 
      type: 'deposit', 
      subtype: 'license_purchase' 
    });
    logger.info('Cleared existing license purchase transactions');

    const transactions = [];
    const now = new Date();
    
    // Generate transactions for the last 6 months
    for (let i = 0; i < 150; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomPackage = packages[Math.floor(Math.random() * packages.length)];
      
      // Random date within last 6 months
      const randomDate = new Date(now.getTime() - Math.random() * 6 * 30 * 24 * 60 * 60 * 1000);
      
      const transaction = {
        user: randomUser._id,
        type: 'deposit',
        subtype: 'license_purchase',
        amount: randomPackage.price,
        currency: 'USDT',
        status: 'completed',
        description: `Compra de paquete ${randomPackage.name}`,
        payment: {
          method: 'crypto',
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          network: 'BEP20',
          confirmations: Math.floor(Math.random() * 10) + 1,
          requiredConfirmations: 1
        },
        metadata: {
          packageId: randomPackage._id,
          packageName: randomPackage.name,
          packagePrice: randomPackage.price,
          purchaseDate: randomDate
        },
        createdAt: randomDate,
        updatedAt: randomDate,
        completedAt: new Date(randomDate.getTime() + Math.random() * 60 * 60 * 1000) // Completed within 1 hour
      };
      
      transactions.push(transaction);
    }

    // Insert transactions
    await Transaction.insertMany(transactions);
    logger.info(`Created ${transactions.length} sample license purchase transactions`);

    // Update package sales counts based on real transactions
    for (const pkg of packages) {
      const salesCount = await Transaction.countDocuments({
        type: 'deposit',
        subtype: 'license_purchase',
        status: 'completed',
        'metadata.packageId': pkg._id
      });
      
      await Package.findByIdAndUpdate(pkg._id, { salesCount });
      logger.info(`Updated ${pkg.name} sales count to ${salesCount}`);
    }

    // Generate some commission transactions
    const commissionTransactions = [];
    for (let i = 0; i < 50; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomDate = new Date(now.getTime() - Math.random() * 6 * 30 * 24 * 60 * 60 * 1000);
      const commissionAmount = Math.floor(Math.random() * 50) + 10; // $10-$60
      
      const commissionTransaction = {
        user: randomUser._id,
        type: 'commission',
        subtype: 'referral_commission',
        amount: commissionAmount,
        currency: 'USDT',
        status: 'completed',
        description: 'Comisión por referido',
        createdAt: randomDate,
        updatedAt: randomDate,
        completedAt: randomDate
      };
      
      commissionTransactions.push(commissionTransaction);
    }

    await Transaction.insertMany(commissionTransactions);
    logger.info(`Created ${commissionTransactions.length} sample commission transactions`);

    // Generate some earnings transactions
    const earningsTransactions = [];
    for (let i = 0; i < 100; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomDate = new Date(now.getTime() - Math.random() * 6 * 30 * 24 * 60 * 60 * 1000);
      const earningsAmount = Math.floor(Math.random() * 200) + 50; // $50-$250
      
      const earningsTransaction = {
        user: randomUser._id,
        type: 'earnings',
        subtype: 'auto_earnings',
        amount: earningsAmount,
        currency: 'USDT',
        status: 'completed',
        description: 'Ganancias automáticas',
        createdAt: randomDate,
        updatedAt: randomDate,
        completedAt: randomDate
      };
      
      earningsTransactions.push(earningsTransaction);
    }

    await Transaction.insertMany(earningsTransactions);
    logger.info(`Created ${earningsTransactions.length} sample earnings transactions`);

    // Summary
    const totalTransactions = await Transaction.countDocuments();
    const completedPurchases = await Transaction.countDocuments({
      type: 'deposit',
      subtype: 'license_purchase',
      status: 'completed'
    });
    const totalRevenue = await Transaction.aggregate([
      {
        $match: {
          type: 'deposit',
          subtype: 'license_purchase',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    logger.info('=== SEEDING SUMMARY ===');
    logger.info(`Total transactions in database: ${totalTransactions}`);
    logger.info(`Completed license purchases: ${completedPurchases}`);
    logger.info(`Total revenue from purchases: $${totalRevenue[0]?.total || 0}`);
    logger.info('Seeding completed successfully!');

  } catch (error) {
    logger.error('Error seeding transactions:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the seeding
if (require.main === module) {
  seedTransactions();
}

module.exports = seedTransactions;