require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const axios = require('axios');

async function testSmokeAdminLogin() {
  try {
    console.log('🔍 Testing smoke admin login process...');
    
    const API_BASE = 'http://localhost:3000';
    const adminEmail = 'admin-smoke-test@test.com';
    const adminPassword = 'Admin123!';
    
    // Step 1: Create admin user
    console.log('\n🔧 Step 1: Creating admin user...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    // Delete existing admin user
    await db.collection('users').deleteOne({ email: adminEmail });
    
    // Create new admin user
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
          referralCode: 'ADMTEST',
          acceptedTerms: true,
          acceptedRisk: true,
          emailVerified: true,
          isEmailVerified: true,
          verifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
          metadata: { isTest: true }
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
    }
    
    await client.close();
    
    // Step 2: Wait a moment for DB to sync
    console.log('\n⏳ Waiting for database sync...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Test login via API
    console.log('\n🔧 Step 2: Testing login via API...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        identifier: adminEmail,
        password: adminPassword,
        userType: 'admin'
      });
      
      console.log('✅ Login successful!');
      console.log('🔧 Response status:', loginResponse.status);
      console.log('🔧 Response data:', loginResponse.data);
      
      if (loginResponse.data.data && loginResponse.data.data.tokens) {
        console.log('🔧 Access token received:', loginResponse.data.data.tokens.accessToken ? 'Yes' : 'No');
      }
      
    } catch (loginError) {
      console.log('❌ Login failed!');
      console.log('🔧 Error status:', loginError.response?.status);
      console.log('🔧 Error data:', loginError.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSmokeAdminLogin();