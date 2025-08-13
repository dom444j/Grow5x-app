const { MongoClient } = require('mongodb');

async function cleanupOldTestData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🧹 Cleaning up old test data...');
    
    // Remove all test users (including old admin test users)
    const userResult = await db.collection('users').deleteMany({
      $or: [
        { email: { $regex: '.*test\.com' } },
        { fullName: { $regex: 'Test' } },
        { 'metadata.isTest': true },
        { email: { $regex: 'admin\+.*@test\.com' } }
      ]
    });
    console.log('🗑️ Deleted users:', userResult.deletedCount);
    
    // Clean wallets
    const walletResult = await db.collection('wallets').deleteMany({
      $or: [
        { email: { $regex: '.*test\.com' } },
        { userEmail: { $regex: '.*test\.com' } },
        { 'user.email': { $regex: '.*test\.com' } }
      ]
    });
    console.log('🗑️ Deleted wallets:', walletResult.deletedCount);
    
    // Clean purchases
    const purchaseResult = await db.collection('purchases').deleteMany({
      $or: [
        { userEmail: { $regex: '.*test\.com' } },
        { email: { $regex: '.*test\.com' } },
        { 'user.email': { $regex: '.*test\.com' } }
      ]
    });
    console.log('🗑️ Deleted purchases:', purchaseResult.deletedCount);
    
    // Clean admin pools
    const poolResult = await db.collection('admin_pools').deleteMany({});
    console.log('🗑️ Deleted admin pools:', poolResult.deletedCount);
    
    // Check remaining users
    const remainingUsers = await db.collection('users').countDocuments();
    console.log('✅ Remaining users in DB:', remainingUsers);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

cleanupOldTestData();