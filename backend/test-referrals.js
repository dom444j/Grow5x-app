const mongoose = require('mongoose');
const Referral = require('./src/models/Referral.model');

async function checkReferrals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const referrals = await Referral.find({});
    console.log('Referrals found:', referrals.length);
    
    for (const r of referrals) {
      const referrer = await require('./src/models/User').findById(r.referrer);
      const referred = await require('./src/models/User').findById(r.referred);
      console.log(`${referrer?.email || 'Unknown'} -> ${referred?.email || 'Unknown'} (Code: ${r.referralCode})`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReferrals();