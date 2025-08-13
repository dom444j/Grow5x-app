const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to database');
    
    const usersA = await User.find({ 
      email: { $regex: /usera.*@test.com/ } 
    }, { email: 1, referralCode: 1, referredBy: 1 });
    
    console.log('User A records:', JSON.stringify(usersA, null, 2));
    
    const usersB = await User.find({ 
      email: { $regex: /userb.*@test.com/ } 
    }, { email: 1, referralCode: 1, referredBy: 1 });
    
    console.log('User B records:', JSON.stringify(usersB, null, 2));
    
    process.exit(0);
  })
  .catch(console.error);