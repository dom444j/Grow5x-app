require('dotenv').config();
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

async function testAdminUser() {
  try {
    console.log('🔍 Testing admin user in database...');
    console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI);
    
    // Parse database name from URI
    const dbName = process.env.MONGODB_URI.split('/')[3].split('?')[0];
    console.log('🔍 Database name:', dbName);
    
    // Test with MongoClient (same as smoke test)
    console.log('\n📊 Testing with MongoClient...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Connected to database:', db.databaseName);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('🔍 Collections in database:', collections.map(c => c.name));
    
    const adminUsers = await db.collection('users').find({
      email: { $regex: 'admin\\+.*@test\.com' }
    }).sort({ createdAt: -1 }).toArray();
    
    console.log('🔍 Admin users found with MongoClient:', adminUsers.length);
    adminUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. Email: ${user.email}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Status: ${user.status}`);
      console.log(`     Created: ${user.createdAt}`);
    });
    
    // Check all users in the collection
    const allUsers = await db.collection('users').find({}).limit(5).toArray();
    console.log('🔍 Total users in collection:', await db.collection('users').countDocuments());
    console.log('🔍 Sample users:', allUsers.map(u => ({ email: u.email, role: u.role })));
    
    await client.close();
    
    // Test with Mongoose (same as backend)
    console.log('\n📊 Testing with Mongoose...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    const mongooseAdminUsers = await User.find({
      email: { $regex: 'admin\\+.*@test\.com' }
    });
    
    console.log('🔍 Admin users found with Mongoose:', mongooseAdminUsers.length);
    mongooseAdminUsers.forEach(user => {
      console.log('  - Email:', user.email);
      console.log('  - Role:', user.role);
      console.log('  - Status:', user.status);
    });
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminUser();