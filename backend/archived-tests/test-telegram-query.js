const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testTelegramQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Testing query with undefined telegram...');
    
    // Test the exact query from auth controller
    const result = await User.findOne({
      $or: [
        { email: 'test@test.com' },
        { telegram: undefined }
      ]
    });
    console.log('Query result:', result);
    
    const count = await User.countDocuments({ telegram: undefined });
    console.log('Users with undefined telegram:', count);
    
    const allUsers = await User.find({}, { email: 1, telegram: 1 });
    console.log('All users:', allUsers);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testTelegramQuery();