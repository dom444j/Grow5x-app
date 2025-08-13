const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDBState() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Check for any test-related users
    const testUsers = await db.collection('users').find({
      $or: [
        { email: { $regex: '.*test\.com' } },
        { fullName: { $regex: 'Test User' } },
        { 'metadata.isTest': true }
      ]
    }).toArray();
    
    console.log('Test-related users found:', testUsers.length);
    testUsers.forEach(u => {
      console.log('User:', u.email, u.fullName, u.telegram?.username || 'no-telegram', u._id);
      console.log('  Metadata:', u.metadata);
      console.log('  Created:', u.createdAt);
    });
    
    // Check for users with telegram usernames that might conflict
    const telegramUsers = await db.collection('users').find({
      'telegram.username': { $exists: true, $ne: null }
    }).toArray();
    
    console.log('\nUsers with telegram:', telegramUsers.length);
    telegramUsers.forEach(u => {
      console.log('Telegram user:', u.email, u.telegram?.username);
    });
    
    // Check total user count
    const totalUsers = await db.collection('users').countDocuments();
    console.log('\nTotal users in DB:', totalUsers);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkDBState();