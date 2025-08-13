const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testUserCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // First create a referrer user
    const referrer = new User({
      email: 'referrer@test.com',
      password: 'password123',
      fullName: 'Referrer User',
      country: 'US',
      referralCode: 'TEST123'
    });
    
    await referrer.save();
    console.log('Referrer created:', referrer._id);
    
    // Now create a referred user
    const referred = new User({
      email: 'referred@test.com',
      password: 'password123',
      fullName: 'Referred User',
      country: 'US',
      referralCode: 'TEST456',
      referredBy: referrer._id
    });
    
    await referred.save();
    console.log('Referred user created:', referred._id);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testUserCreation();