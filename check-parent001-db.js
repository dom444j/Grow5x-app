const mongoose = require('mongoose');
const User = require('./backend/src/models/User.model');
require('dotenv').config({ path: './backend/.env.production' });

async function checkParent001() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ referralCode: 'PARENT001' });
    
    if (user) {
      console.log('User with PARENT001 found:');
      console.log({
        id: user._id,
        email: user.email,
        referralCode: user.referralCode,
        createdAt: user.createdAt
      });
    } else {
      console.log('User with referralCode PARENT001 NOT FOUND');
      
      // Let's also check if there are any users with similar codes
      const similarUsers = await User.find({ 
        referralCode: { $regex: /PARENT/i } 
      }).select('email referralCode');
      
      console.log('Users with PARENT in referralCode:', similarUsers);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkParent001();