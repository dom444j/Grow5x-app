const mongoose = require('mongoose');
const User = require('./src/models/User');
const Referral = require('./src/models/Referral.model');

async function testMiddlewareFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Clean up any existing test data
    await User.deleteMany({ email: { $regex: /middleware-test/ } });
    await Referral.deleteMany({ referralCode: 'MWTEST' });
    
    // Create a referrer user
    const referrer = new User({
      email: 'referrer-middleware-test@test.com',
      password: 'password123',
      fullName: 'Referrer Middleware Test',
      country: 'US',
      referralCode: 'MWTEST'
    });
    
    await referrer.save();
    console.log('Referrer created:', referrer._id);
    
    // Create a referred user
    const referred = new User({
      email: 'referred-middleware-test@test.com',
      password: 'password123',
      fullName: 'Referred Middleware Test',
      country: 'US',
      referralCode: 'MWTEST2',
      referredBy: referrer._id
    });
    
    await referred.save();
    console.log('Referred user created:', referred._id);
    
    // Wait a moment for middleware to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if referral record was created
    const referralRecord = await Referral.findOne({
      referrer: referrer._id,
      referred: referred._id
    });
    
    if (referralRecord) {
      console.log('✅ SUCCESS: Referral record created:', referralRecord._id);
    } else {
      console.log('❌ FAILED: No referral record found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testMiddlewareFix();