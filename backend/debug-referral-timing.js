require('dotenv').config();
const mongoose = require('mongoose');
const Referral = require('./src/models/Referral.model');

async function checkReferralTiming() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find all referrals
    const allReferrals = await Referral.find({}).populate('referrer').populate('referred');
    console.log('All referrals:', allReferrals.length);
    
    for (const referral of allReferrals) {
      console.log('Referral:', {
        _id: referral._id,
        referrer: referral.referrer ? {
          _id: referral.referrer._id,
          email: referral.referrer.email
        } : null,
        referred: referral.referred ? {
          _id: referral.referred._id,
          email: referral.referred.email
        } : null,
        status: referral.status,
        createdAt: referral.createdAt
      });
    }
    
    // Test the exact query used in BenefitsProcessor
    const testUserId = allReferrals[0]?.referred?._id;
    if (testUserId) {
      console.log('\nTesting query for userId:', testUserId);
      const foundReferral = await Referral.findOne({
        referred: testUserId,
        status: { $in: ['active', 'pending'] }
      }).populate('referrer');
      
      console.log('Query result:', {
        found: !!foundReferral,
        referralId: foundReferral?._id,
        hasReferrer: !!foundReferral?.referrer,
        referrerPopulated: !!foundReferral?.referrer?._id
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkReferralTiming();