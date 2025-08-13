require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function testAdminCreation() {
  try {
    console.log('🔍 Testing admin user creation...');
    
    const runId = Date.now();
    const adminEmail = `admin+${runId}@test.com`;
    const adminPassword = 'Admin123!';
    
    console.log('🔍 Creating admin with email:', adminEmail);
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Connected to database:', db.databaseName);
    
    // Create admin user (same logic as smoke test)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const result = await db.collection('users').updateOne(
      { email: adminEmail },
      {
        $setOnInsert: {
          email: adminEmail,
          password: hashedPassword,
          fullName: 'Test Admin',
          role: 'admin',
          country: 'ES',
          referralCode: `ADM${runId.toString().slice(-6)}`,
          acceptedTerms: true,
          acceptedRisk: true,
          emailVerified: true,
          isEmailVerified: true,
          verifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
          metadata: { isTest: true, runId }
        }
      },
      { upsert: true }
    );
    
    console.log('🔧 Admin user creation result:', result);
    
    // Verify admin user was created
    const adminUser = await db.collection('users').findOne({ email: adminEmail });
    console.log('🔧 Admin user found:', adminUser ? 'Yes' : 'No');
    if (adminUser) {
      console.log('🔧 Admin user details:');
      console.log('  - Email:', adminUser.email);
      console.log('  - Role:', adminUser.role);
      console.log('  - Status:', adminUser.status);
      console.log('  - Password hash length:', adminUser.password ? adminUser.password.length : 'No password');
    }
    
    // Test login with this user
    console.log('\n🔍 Testing password verification...');
    if (adminUser && adminUser.password) {
      const isPasswordValid = await bcrypt.compare(adminPassword, adminUser.password);
      console.log('🔧 Password verification result:', isPasswordValid);
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminCreation();