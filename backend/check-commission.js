require('dotenv').config();
const mongoose = require('mongoose');
const Commission = require('./src/models/Commission.model');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('🔍 Checking commission details...');
  
  // 1. Find the specific commission
  const commission = await Commission.findOne({ _id: '6898777d6478dae49eb0b4fb' }).lean();
  console.log('\n📋 Commission found:');
  console.log(JSON.stringify(commission, null, 2));
  
  // 2. Check if any commission has runId
  const commissionWithRunId = await Commission.findOne({ 'metadata.runId': { $exists: true } }).lean();
  console.log('\n🏃 Commission with runId:');
  console.log(JSON.stringify(commissionWithRunId, null, 2));
  
  // 3. Search for commissions like the smoke test does
  const userId = '689877516478dae49eb0b3bc'; // User A (sponsor)
  const runId = Date.now(); // Simulate current runId
  
  const smokeTestQuery = {
    commissionType: 'direct_referral',
    userId: userId,
    'metadata.runId': runId
  };
  
  console.log('\n🧪 Smoke test query:');
  console.log(JSON.stringify(smokeTestQuery, null, 2));
  
  const smokeTestResult = await Commission.findOne(smokeTestQuery).lean();
  console.log('\n🧪 Smoke test result:');
  console.log(smokeTestResult ? JSON.stringify(smokeTestResult, null, 2) : 'null - NOT FOUND');
  
  // 4. Check what runId values exist
  const commissionsWithRunId = await Commission.find({ 'metadata.runId': { $exists: true } }, { 'metadata.runId': 1, commissionType: 1, userId: 1 }).lean();
  console.log('\n📊 All commissions with runId:');
  console.log(JSON.stringify(commissionsWithRunId, null, 2));
  
  process.exit(0);
}).catch(console.error);