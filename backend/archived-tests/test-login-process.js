require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function testLoginProcess() {
  try {
    console.log('🔍 Testing login process...');
    
    // Connect using Mongoose (same as backend)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔍 Connected to database via Mongoose');
    
    const User = require('./src/models/User');
    
    // Find the admin user we just created
    const adminUsers = await User.find({
      email: { $regex: 'admin\\+.*@test\.com' }
    }).sort({ createdAt: -1 }).limit(1);
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin test users found');
      return;
    }
    
    const adminUser = adminUsers[0];
    console.log('🔧 Found admin user:', adminUser.email);
    console.log('🔧 Admin user role:', adminUser.role);
    console.log('🔧 Admin user status:', adminUser.status);
    
    // Test the exact login logic from auth.controller.js
    const identifier = adminUser.email;
    const password = 'Admin123!';
    const userType = 'admin';
    
    console.log('\n🔍 Testing login logic...');
    console.log('🔍 Identifier:', identifier);
    console.log('🔍 UserType:', userType);
    
    // Step 1: Find user (same query as auth.controller.js)
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { telegram: identifier }
      ]
    });
    
    console.log('🔧 User found via login query:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('❌ User not found with login query');
      return;
    }
    
    console.log('🔧 Found user details:');
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - Status:', user.status);
    
    // Step 2: Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔧 Password valid:', isPasswordValid);
    
    // Step 3: Check admin access logic
    if (userType === 'user' && (user.role === 'admin' || user.role === 'superadmin')) {
      console.log('❌ Access denied: Admin users cannot login through user interface');
      return;
    }
    
    // Step 4: Check user status
    if (user.status !== 'active') {
      console.log('❌ Account is not active');
      return;
    }
    
    console.log('✅ Login should succeed!');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLoginProcess();