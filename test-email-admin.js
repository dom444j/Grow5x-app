const axios = require('axios');
const colors = require('colors');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@growx5.com',
  password: 'Admin123!'
};

let adminToken = null;
let testUserId = null;

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

// Test functions
const loginAsAdmin = async () => {
  console.log('\n🔐 Testing Admin Login...'.cyan);
  
  const result = await makeRequest('POST', '/auth/login', ADMIN_CREDENTIALS);
  
  if (result.success && result.data.success) {
    adminToken = result.data.data.token;
    console.log('✅ Admin login successful'.green);
    console.log(`   Token: ${adminToken.substring(0, 20)}...`);
    return true;
  } else {
    console.log('❌ Admin login failed:'.red, result.error);
    return false;
  }
};

const findTestUser = async () => {
  console.log('\n👤 Finding test user...'.cyan);
  
  const result = await makeRequest('GET', '/admin/users?limit=5&status=pending', null, adminToken);
  
  if (result.success && result.data.success && result.data.data.users.length > 0) {
    const unverifiedUser = result.data.data.users.find(user => !user.verification?.isVerified);
    
    if (unverifiedUser) {
      testUserId = unverifiedUser._id;
      console.log('✅ Found unverified user:'.green);
      console.log(`   ID: ${testUserId}`);
      console.log(`   Email: ${unverifiedUser.email}`);
      console.log(`   Verified: ${unverifiedUser.verification?.isVerified || false}`);
      return true;
    } else {
      console.log('⚠️  No unverified users found'.yellow);
      // Use the first user anyway for testing
      testUserId = result.data.data.users[0]._id;
      console.log(`   Using user ID: ${testUserId}`);
      return true;
    }
  } else {
    console.log('❌ Failed to find test user:'.red, result.error);
    return false;
  }
};

const testResendVerificationEmail = async () => {
  console.log('\n📧 Testing Resend Verification Email...'.cyan);
  
  const result = await makeRequest('POST', '/admin/email/resend-verification', {
    userId: testUserId
  }, adminToken);
  
  if (result.success && result.data.success) {
    console.log('✅ Verification email resent successfully'.green);
    console.log(`   User ID: ${result.data.data.userId}`);
    console.log(`   Email: ${result.data.data.email}`);
    console.log(`   Token expires: ${result.data.data.tokenExpires}`);
    return true;
  } else {
    console.log('❌ Failed to resend verification email:'.red, result.error);
    return false;
  }
};

const testForceEmailVerification = async () => {
  console.log('\n🔧 Testing Force Email Verification...'.cyan);
  
  const result = await makeRequest('POST', '/admin/email/force-verification', {
    userId: testUserId,
    reason: 'Testing admin force verification functionality for system validation'
  }, adminToken);
  
  if (result.success && result.data.success) {
    console.log('✅ Email verification forced successfully'.green);
    console.log(`   User ID: ${result.data.data.userId}`);
    console.log(`   Email: ${result.data.data.email}`);
    console.log(`   Verified at: ${result.data.data.verifiedAt}`);
    console.log(`   Verified by: ${result.data.data.verifiedBy}`);
    console.log(`   Reason: ${result.data.data.reason}`);
    return true;
  } else {
    console.log('❌ Failed to force email verification:'.red, result.error);
    return false;
  }
};

const testGetEmailErrors = async () => {
  console.log('\n📊 Testing Get Email Errors...'.cyan);
  
  const result = await makeRequest('GET', '/admin/email/errors?limit=10', null, adminToken);
  
  if (result.success && result.data.success) {
    console.log('✅ Email errors retrieved successfully'.green);
    console.log(`   Total errors: ${result.data.data.pagination.total}`);
    console.log(`   Errors in response: ${result.data.data.errors.length}`);
    
    if (result.data.data.errors.length > 0) {
      console.log('   Recent errors:');
      result.data.data.errors.slice(0, 3).forEach((error, index) => {
        console.log(`     ${index + 1}. ${error.recipient} - ${error.status} (${error.emailType})`);
      });
    }
    return true;
  } else {
    console.log('❌ Failed to get email errors:'.red, result.error);
    return false;
  }
};

const testGetEmailStats = async () => {
  console.log('\n📈 Testing Get Email Statistics...'.cyan);
  
  const result = await makeRequest('GET', '/admin/email/stats?days=7', null, adminToken);
  
  if (result.success && result.data.success) {
    console.log('✅ Email statistics retrieved successfully'.green);
    console.log(`   Period: ${result.data.data.period}`);
    
    const stats = result.data.data.stats;
    console.log('   Statistics:');
    console.log(`     Total emails: ${stats.totalEmails || 0}`);
    console.log(`     Successful: ${stats.successfulEmails || 0}`);
    console.log(`     Failed: ${stats.failedEmails || 0}`);
    console.log(`     Pending: ${stats.pendingEmails || 0}`);
    console.log(`     Success rate: ${stats.successRate || 0}%`);
    
    if (stats.byType) {
      console.log('   By type:');
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    }
    
    return true;
  } else {
    console.log('❌ Failed to get email statistics:'.red, result.error);
    return false;
  }
};

const testEmailLogModel = async () => {
  console.log('\n🗄️  Testing EmailLog Model Integration...'.cyan);
  
  // Test if EmailLog model is working by checking recent logs
  const result = await makeRequest('GET', '/admin/email/errors?limit=1', null, adminToken);
  
  if (result.success) {
    console.log('✅ EmailLog model integration working'.green);
    return true;
  } else {
    console.log('❌ EmailLog model integration issue:'.red, result.error);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Email Administration Tests'.bold.blue);
  console.log('=====================================\n');
  
  const tests = [
    { name: 'Admin Login', fn: loginAsAdmin },
    { name: 'Find Test User', fn: findTestUser },
    { name: 'EmailLog Model Integration', fn: testEmailLogModel },
    { name: 'Resend Verification Email', fn: testResendVerificationEmail },
    { name: 'Get Email Errors', fn: testGetEmailErrors },
    { name: 'Get Email Statistics', fn: testGetEmailStats },
    { name: 'Force Email Verification', fn: testForceEmailVerification }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" threw an error:`.red, error.message);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=====================================');
  console.log('📊 Test Results Summary'.bold.blue);
  console.log(`✅ Passed: ${passed}`.green);
  console.log(`❌ Failed: ${failed}`.red);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All email administration tests passed!'.bold.green);
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.'.bold.yellow);
  }
};

// Handle script execution
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner crashed:'.red, error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  loginAsAdmin,
  testResendVerificationEmail,
  testForceEmailVerification,
  testGetEmailErrors,
  testGetEmailStats
};

/*
=== USAGE ===

# Run all tests
node test-email-admin.js

# Or run specific tests programmatically
const { testResendVerificationEmail } = require('./test-email-admin.js');

=== REQUIREMENTS ===

1. Backend server must be running on localhost:3000
2. Admin user must exist with credentials:
   - Email: admin@growx5.com
   - Password: Admin123!
3. At least one user should exist in the database
4. EmailLog model should be properly integrated

=== WHAT THIS TESTS ===

✅ Admin authentication
✅ Finding test users
✅ EmailLog model integration
✅ Resending verification emails
✅ Getting email error logs
✅ Getting email statistics
✅ Forcing email verification

*/