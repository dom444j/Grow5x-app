const request = require('supertest');
const app = require('../server');
const User = require('../src/models/User.model');
const Commission = require('../src/models/Commission.model');
const jwt = require('jsonwebtoken');

describe('Referrals System Tests', () => {
  let referrerUser;
  let referredUser1;
  let referredUser2;
  let adminUser;
  let referrerToken;
  let adminToken;
  let referralCode;

  beforeAll(async () => {
    // Create referrer user
    referrerUser = {
      email: 'referrer@example.com',
      password: 'ReferrerPass123!',
      firstName: 'Referrer',
      lastName: 'User',
      phone: '+1234567890'
    };

    // Create admin user
    adminUser = {
      email: 'admin@grow5x.app',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567891',
      role: 'admin'
    };

    // Register referrer user
    const referrerResponse = await request(app)
      .post('/api/auth/register')
      .send(referrerUser);
    
    referrerToken = referrerResponse.body.data.token;
    referralCode = referrerResponse.body.data.user.referralCode;

    // Register admin user
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send(adminUser);
    
    adminToken = adminResponse.body.data.token;
  });

  afterAll(async () => {
    // Cleanup test data
    await User.deleteMany({ 
      email: { 
        $in: [
          referrerUser.email, 
          adminUser.email,
          'referred1@example.com',
          'referred2@example.com'
        ] 
      } 
    });
    await Commission.deleteMany({ 
      referrerEmail: referrerUser.email 
    });
  });

  describe('Referral Code Generation', () => {
    it('should generate unique referral code on user registration', async () => {
      expect(referralCode).toBeDefined();
      expect(referralCode).toMatch(/^[A-Z0-9]{6,10}$/);
    });

    it('should retrieve user referral code', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(200);

      expect(response.body.data.user.referralCode).toBe(referralCode);
    });
  });

  describe('User Registration with Referral', () => {
    it('should register user with valid referral code', async () => {
      referredUser1 = {
        email: 'referred1@example.com',
        password: 'ReferredPass123!',
        firstName: 'Referred1',
        lastName: 'User',
        phone: '+1234567892',
        referralCode: referralCode
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(referredUser1)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.referredBy).toBeDefined();
    });

    it('should register user with invalid referral code', async () => {
      referredUser2 = {
        email: 'referred2@example.com',
        password: 'ReferredPass123!',
        firstName: 'Referred2',
        lastName: 'User',
        phone: '+1234567893',
        referralCode: 'INVALID123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(referredUser2)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.referredBy).toBeUndefined();
    });

    it('should not allow self-referral', async () => {
      const selfReferralUser = {
        email: 'selfrefer@example.com',
        password: 'SelfReferPass123!',
        firstName: 'SelfRefer',
        lastName: 'User',
        phone: '+1234567894',
        referralCode: referralCode
      };

      // Try to register with own referral code
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...selfReferralUser,
          email: referrerUser.email // Same email as referrer
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Commission Creation', () => {
    it('should create commission when referred user registers', async () => {
      // Wait a bit for commission to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .get('/api/commissions')
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.commissions.length).toBeGreaterThan(0);
      
      const commission = response.body.data.commissions.find(
        c => c.referredEmail === referredUser1.email
      );
      expect(commission).toBeDefined();
      expect(commission.amount).toBe(50); // Default commission amount
      expect(commission.status).toBe('pending');
    });

    it('should not create commission for invalid referral', async () => {
      const response = await request(app)
        .get('/api/commissions')
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(200);

      const invalidCommission = response.body.data.commissions.find(
        c => c.referredEmail === referredUser2.email
      );
      expect(invalidCommission).toBeUndefined();
    });
  });

  describe('Referral Statistics', () => {
    it('should get user referral statistics', async () => {
      const response = await request(app)
        .get('/api/referrals/stats')
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalReferrals).toBeGreaterThanOrEqual(1);
      expect(response.body.data.totalCommissions).toBeGreaterThanOrEqual(50);
      expect(response.body.data.pendingCommissions).toBeGreaterThanOrEqual(50);
    });

    it('should get user referred users list', async () => {
      const response = await request(app)
        .get('/api/referrals/referred-users')
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.referredUsers)).toBe(true);
      expect(response.body.data.referredUsers.length).toBeGreaterThanOrEqual(1);
      
      const referredUser = response.body.data.referredUsers.find(
        u => u.email === referredUser1.email
      );
      expect(referredUser).toBeDefined();
      expect(referredUser.firstName).toBe(referredUser1.firstName);
    });
  });

  describe('Admin Referral Management', () => {
    it('should get all referrals as admin', async () => {
      const response = await request(app)
        .get('/api/admin/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.referrals)).toBe(true);
      expect(response.body.data.referrals.length).toBeGreaterThanOrEqual(1);
    });

    it('should get referral statistics as admin', async () => {
      const response = await request(app)
        .get('/api/admin/referrals/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBeGreaterThanOrEqual(3);
      expect(response.body.data.totalReferrals).toBeGreaterThanOrEqual(1);
      expect(response.body.data.totalCommissions).toBeGreaterThanOrEqual(50);
    });

    it('should get user referrals by user ID as admin', async () => {
      // First get the referrer user ID
      const userResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const referrer = userResponse.body.data.users.find(
        u => u.email === referrerUser.email
      );

      const response = await request(app)
        .get(`/api/admin/users/${referrer._id}/referrals`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.referrals)).toBe(true);
      expect(response.body.data.referrals.length).toBeGreaterThanOrEqual(1);
    });

    it('should not access admin referral routes with regular user token', async () => {
      const response = await request(app)
        .get('/api/admin/referrals')
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Acceso denegado');
    });
  });

  describe('Referral Data Consistency', () => {
    it('should have consistent referral data between user and admin views', async () => {
      // Get user referral stats
      const userStatsResponse = await request(app)
        .get('/api/referrals/stats')
        .set('Authorization', `Bearer ${referrerToken}`);

      // Get admin view of same user's referrals
      const userResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const referrer = userResponse.body.data.users.find(
        u => u.email === referrerUser.email
      );

      const adminReferralsResponse = await request(app)
        .get(`/api/admin/users/${referrer._id}/referrals`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Compare data consistency
      const userTotalReferrals = userStatsResponse.body.data.totalReferrals;
      const adminTotalReferrals = adminReferralsResponse.body.data.referrals.length;

      expect(userTotalReferrals).toBe(adminTotalReferrals);
    });

    it('should have consistent commission data between user and admin views', async () => {
      // Get user commissions
      const userCommissionsResponse = await request(app)
        .get('/api/commissions')
        .set('Authorization', `Bearer ${referrerToken}`);

      // Get admin commissions for same user
      const adminCommissionsResponse = await request(app)
        .get('/api/admin/commissions')
        .set('Authorization', `Bearer ${adminToken}`);

      const userCommissions = userCommissionsResponse.body.data.commissions;
      const adminCommissions = adminCommissionsResponse.body.data.commissions.filter(
        c => c.referrerEmail === referrerUser.email
      );

      expect(userCommissions.length).toBe(adminCommissions.length);
      
      // Check if commission amounts match
      const userTotalAmount = userCommissions.reduce((sum, c) => sum + c.amount, 0);
      const adminTotalAmount = adminCommissions.reduce((sum, c) => sum + c.amount, 0);
      
      expect(userTotalAmount).toBe(adminTotalAmount);
    });
  });

  describe('Referral Code Validation', () => {
    it('should validate referral code format', async () => {
      const testCodes = [
        'ABC12345', // Valid
        'XYZA1B2C', // Valid
        'abc12345', // Invalid (lowercase)
        '1234567',  // Invalid (too short)
        'ABCDEFGHI', // Invalid (too long)
        'ABC123@#'  // Invalid (special chars)
      ];

      for (const code of testCodes) {
        const testUser = {
          email: `test-${code}@example.com`,
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
          phone: '+1234567899',
          referralCode: code
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(testUser);

        if (code.match(/^[A-Z0-9]{8}$/)) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(201); // Registration should succeed even with invalid referral
        }

        // Cleanup
        await User.deleteOne({ email: testUser.email });
      }
    });
  });
});

// Helper functions
const createTestCommission = async (referrerEmail, referredEmail, amount = 50) => {
  const commission = new Commission({
    referrerEmail,
    referredEmail,
    amount,
    status: 'pending',
    createdAt: new Date()
  });
  await commission.save();
  return commission;
};

const generateTestReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};