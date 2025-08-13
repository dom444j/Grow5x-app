require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkSmokeAdmin() {
  try {
    console.log('🔍 Checking for smoke test admin user...');
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Connected to database:', db.databaseName);
    
    // Check for the smoke test admin user
    const smokeAdmin = await db.collection('users').findOne({ 
      email: 'admin-smoke-test@test.com' 
    });
    
    console.log('🔧 Smoke test admin found:', smokeAdmin ? 'Yes' : 'No');
    
    if (smokeAdmin) {
      console.log('🔧 Admin details:');
      console.log('  - Email:', smokeAdmin.email);
      console.log('  - Role:', smokeAdmin.role);
      console.log('  - Status:', smokeAdmin.status);
      console.log('  - Created:', smokeAdmin.createdAt);
    }
    
    // Check all test admin users
    const allTestAdmins = await db.collection('users').find({
      $or: [
        { email: { $regex: 'admin.*@test\.com' } },
        { 'metadata.isTest': true, role: 'admin' }
      ]
    }).toArray();
    
    console.log('\n🔍 All test admin users:', allTestAdmins.length);
    allTestAdmins.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role}) - ${user.status}`);
    });
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSmokeAdmin();