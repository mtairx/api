// worker.js - Complete OTP Login with Bearer Token (JSON File Storage)

const fs = require('fs');
const path = require('path');
const API_BASE_URL = 'https://rozgarapinew.teachx.in';

// Path to store tokens
const TOKEN_STORE_PATH = path.join(__dirname, 'tokens.json');

class AuthWorker {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.tokenStore = this.loadTokenStore();
  }

  /**
   * Load token store from JSON file
   */
  loadTokenStore() {
    try {
      if (fs.existsSync(TOKEN_STORE_PATH)) {
        const data = fs.readFileSync(TOKEN_STORE_PATH, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading token store:', error.message);
    }
    // Return default structure if file doesn't exist or error
    return {
      sessions: [],
      tokens: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Save token store to JSON file
   */
  saveTokenStore() {
    try {
      this.tokenStore.lastUpdated = new Date().toISOString();
      fs.writeFileSync(TOKEN_STORE_PATH, JSON.stringify(this.tokenStore, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving token store:', error.message);
      return false;
    }
  }

  /**
   * Send OTP to phone or email
   * @param {string} phoneOrEmail - Phone number or email
   * @returns {Promise<Object>} Response with OTP status
   */
  async sendOTP(phoneOrEmail) {
    try {
      const url = `${this.baseURL}/get/sendotp?phone=${encodeURIComponent(phoneOrEmail)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        data: data,
        phoneOrEmail: phoneOrEmail
      };
    } catch (error) {
      console.error('Send OTP Error:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to send OTP',
        error: error.message
      };
    }
  }

  /**
   * Verify OTP and generate bearer token
   * @param {string} phoneOrEmail - Phone number or email
   * @param {string} otp - OTP received
   * @returns {Promise<Object>} Response with bearer token
   */
  async verifyOTP(phoneOrEmail, otp) {
    try {
      // Build URL with all required parameters
      const url = `${this.baseURL}/get/otpverify?useremail=${encodeURIComponent(phoneOrEmail)}&otp=${otp}&device_id=v&mydeviceid=&mydeviceid2=`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'OTP verification failed');
      }

      // Generate bearer token
      const token = this.generateBearerToken(phoneOrEmail, data);

      // Store token in JSON file
      this.storeToken(phoneOrEmail, token, data);

      return {
        success: true,
        message: 'OTP verified successfully',
        token: token,
        user: {
          phoneOrEmail: phoneOrEmail,
          verified: true,
          timestamp: new Date().toISOString()
        },
        data: data
      };
    } catch (error) {
      console.error('Verify OTP Error:', error.message);
      return {
        success: false,
        message: error.message || 'OTP verification failed',
        error: error.message
      };
    }
  }

  /**
   * Generate bearer token (simplified JWT-like token)
   * In production, use jsonwebtoken library
   */
  generateBearerToken(phoneOrEmail, data) {
    const tokenId = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = {
      tokenId: tokenId,
      phoneOrEmail: phoneOrEmail,
      verified: true,
      timestamp: Date.now(),
      expiresIn: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    // Encode as base64 (simplified - use actual JWT in production)
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    
    // Simple signature (in production, use HMAC with secret)
    const signature = Buffer.from(
      `${header}.${encodedPayload}`,
      'utf-8'
    ).toString('base64');

    return `${header}.${encodedPayload}.${signature}`;
  }

  /**
   * Store token in JSON file
   */
  storeToken(phoneOrEmail, token, data) {
    // Reload token store to get latest data
    this.tokenStore = this.loadTokenStore();
    
    // Check if token already exists for this user
    const existingIndex = this.tokenStore.tokens.findIndex(
      t => t.phoneOrEmail === phoneOrEmail && t.isActive === true
    );

    // If exists, deactivate old token
    if (existingIndex !== -1) {
      this.tokenStore.tokens[existingIndex].isActive = false;
      this.tokenStore.tokens[existingIndex].revokedAt = new Date().toISOString();
    }

    // Create new token entry
    const tokenEntry = {
      tokenId: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phoneOrEmail: phoneOrEmail,
      token: token,
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      data: data,
      ipAddress: null,
      userAgent: null
    };

    // Add to tokens array
    this.tokenStore.tokens.push(tokenEntry);

    // Add to sessions
    const sessionEntry = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId: tokenEntry.tokenId,
      phoneOrEmail: phoneOrEmail,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };
    this.tokenStore.sessions.push(sessionEntry);

    // Save to file
    this.saveTokenStore();

    // Cleanup expired tokens
    this.cleanupExpiredTokens();
  }

  /**
   * Verify bearer token
   */
  verifyBearerToken(token) {
    try {
      // Reload token store
      this.tokenStore = this.loadTokenStore();

      // Check if token exists in store
      const tokenRecord = this.tokenStore.tokens.find(t => t.token === token);
      
      if (!tokenRecord) {
        return { valid: false, message: 'Token not found' };
      }

      if (!tokenRecord.isActive) {
        return { valid: false, message: 'Token has been revoked' };
      }

      // Parse token
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, message: 'Invalid token format' };
      }

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );

      // Check if token is expired
      if (payload.expiresIn && Date.now() > payload.expiresIn) {
        // Mark as inactive in store
        tokenRecord.isActive = false;
        tokenRecord.revokedAt = new Date().toISOString();
        tokenRecord.revokedReason = 'Expired';
        this.saveTokenStore();
        return { valid: false, message: 'Token expired' };
      }

      return {
        valid: true,
        payload: payload,
        tokenRecord: tokenRecord
      };
    } catch (error) {
      return { valid: false, message: 'Invalid token' };
    }
  }

  /**
   * Get token by phone/email
   */
  getTokenByPhone(phoneOrEmail) {
    this.tokenStore = this.loadTokenStore();
    const tokens = this.tokenStore.tokens.filter(
      t => t.phoneOrEmail === phoneOrEmail && t.isActive === true
    );
    return tokens;
  }

  /**
   * Get all active tokens
   */
  getActiveTokens() {
    this.tokenStore = this.loadTokenStore();
    return this.tokenStore.tokens.filter(t => t.isActive === true);
  }

  /**
   * Get all sessions
   */
  getActiveSessions() {
    this.tokenStore = this.loadTokenStore();
    return this.tokenStore.sessions.filter(s => s.isActive === true);
  }

  /**
   * Revoke token (logout)
   */
  revokeToken(token) {
    try {
      this.tokenStore = this.loadTokenStore();
      
      const tokenIndex = this.tokenStore.tokens.findIndex(t => t.token === token);
      
      if (tokenIndex === -1) {
        return { success: false, message: 'Token not found' };
      }

      // Deactivate token
      this.tokenStore.tokens[tokenIndex].isActive = false;
      this.tokenStore.tokens[tokenIndex].revokedAt = new Date().toISOString();
      this.tokenStore.tokens[tokenIndex].revokedReason = 'User logout';

      // Deactivate associated sessions
      const tokenId = this.tokenStore.tokens[tokenIndex].tokenId;
      this.tokenStore.sessions.forEach(session => {
        if (session.tokenId === tokenId) {
          session.isActive = false;
          session.revokedAt = new Date().toISOString();
        }
      });

      this.saveTokenStore();
      
      return { 
        success: true, 
        message: 'Token revoked successfully',
        tokenId: tokenId
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to revoke token',
        error: error.message
      };
    }
  }

  /**
   * Revoke all tokens for a user
   */
  revokeAllUserTokens(phoneOrEmail) {
    try {
      this.tokenStore = this.loadTokenStore();
      
      let revokedCount = 0;
      
      this.tokenStore.tokens.forEach(token => {
        if (token.phoneOrEmail === phoneOrEmail && token.isActive) {
          token.isActive = false;
          token.revokedAt = new Date().toISOString();
          token.revokedReason = 'Revoke all user tokens';
          revokedCount++;
        }
      });

      // Deactivate all sessions for this user
      this.tokenStore.sessions.forEach(session => {
        if (session.phoneOrEmail === phoneOrEmail && session.isActive) {
          session.isActive = false;
          session.revokedAt = new Date().toISOString();
        }
      });

      this.saveTokenStore();
      
      return {
        success: true,
        message: `Revoked ${revokedCount} tokens for user`,
        revokedCount: revokedCount
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to revoke tokens',
        error: error.message
      };
    }
  }

  /**
   * Cleanup expired tokens
   */
  cleanupExpiredTokens() {
    try {
      this.tokenStore = this.loadTokenStore();
      const now = Date.now();
      let expiredCount = 0;

      this.tokenStore.tokens.forEach(token => {
        if (new Date(token.expiresAt).getTime() < now && token.isActive) {
          token.isActive = false;
          token.revokedAt = new Date().toISOString();
          token.revokedReason = 'Auto-expired';
          expiredCount++;
        }
      });

      // Cleanup expired sessions
      this.tokenStore.sessions.forEach(session => {
        if (new Date(session.expiresAt).getTime() < now && session.isActive) {
          session.isActive = false;
          session.revokedAt = new Date().toISOString();
        }
      });

      if (expiredCount > 0) {
        this.saveTokenStore();
      }

      return {
        success: true,
        expiredCount: expiredCount
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cleanup tokens',
        error: error.message
      };
    }
  }

  /**
   * Get token statistics
   */
  getTokenStats() {
    this.tokenStore = this.loadTokenStore();
    
    const total = this.tokenStore.tokens.length;
    const active = this.tokenStore.tokens.filter(t => t.isActive).length;
    const revoked = this.tokenStore.tokens.filter(t => !t.isActive).length;
    const expired = this.tokenStore.tokens.filter(t => 
      !t.isActive && t.revokedReason === 'Expired'
    ).length;
    const sessions = this.tokenStore.sessions.filter(s => s.isActive).length;

    return {
      totalTokens: total,
      activeTokens: active,
      revokedTokens: revoked,
      expiredTokens: expired,
      activeSessions: sessions,
      lastUpdated: this.tokenStore.lastUpdated,
      uniqueUsers: new Set(this.tokenStore.tokens.map(t => t.phoneOrEmail)).size
    };
  }

  /**
   * Clear all tokens (dangerous - use with caution)
   */
  clearAllTokens() {
    try {
      this.tokenStore = {
        sessions: [],
        tokens: [],
        lastUpdated: new Date().toISOString()
      };
      this.saveTokenStore();
      return { success: true, message: 'All tokens cleared' };
    } catch (error) {
      return { success: false, message: 'Failed to clear tokens', error: error.message };
    }
  }
}

// Create instance
const authWorker = new AuthWorker();

// ============================================
// Express Server Implementation
// ============================================

function createServer() {
  const express = require('express');
  const cors = require('cors');
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Send OTP endpoint
  app.get('/api/auth/send-otp/:phone', async (req, res) => {
    const { phone } = req.params;
    const result = await authWorker.sendOTP(phone);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  });

  // Verify OTP endpoint
  app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone/Email and OTP are required'
      });
    }
    
    const result = await authWorker.verifyOTP(phone, otp);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  });

  // Verify token endpoint
  app.get('/api/auth/verify-token', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required'
      });
    }
    
    const result = authWorker.verifyBearerToken(token);
    
    if (result.valid) {
      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: result.payload,
        tokenRecord: result.tokenRecord
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: result.message
      });
    }
  });

  // Protected route example
  app.get('/api/auth/protected', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    const verification = authWorker.verifyBearerToken(token);
    
    if (!verification.valid) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
        error: verification.message
      });
    }
    
    res.json({
      success: true,
      message: 'Protected resource accessed',
      user: verification.payload,
      tokenInfo: verification.tokenRecord
    });
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required'
      });
    }
    
    const result = authWorker.revokeToken(token);
    res.status(result.success ? 200 : 404).json(result);
  });

  // Revoke all user tokens
  app.post('/api/auth/revoke-all/:phone', async (req, res) => {
    const { phone } = req.params;
    const result = authWorker.revokeAllUserTokens(phone);
    res.status(result.success ? 200 : 400).json(result);
  });

  // Get token stats
  app.get('/api/auth/stats', async (req, res) => {
    const stats = authWorker.getTokenStats();
    res.json(stats);
  });

  // Get active tokens (admin only - add authentication)
  app.get('/api/auth/tokens', async (req, res) => {
    const tokens = authWorker.getActiveTokens();
    res.json({
      success: true,
      count: tokens.length,
      tokens: tokens
    });
  });

  // Health check
  app.get('/health', async (req, res) => {
    const stats = authWorker.getTokenStats();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      stats: stats
    });
  });

  return app;
}

// ============================================
// Export
// ============================================

module.exports = {
  AuthWorker,
  authWorker,
  createServer,
  TOKEN_STORE_PATH
};

// ============================================
// Start Server
// ============================================

if (require.main === module) {
  console.log('🚀 Auth Worker Started\n');
  console.log(`📁 Token Store: ${TOKEN_STORE_PATH}`);
  console.log('📚 Available endpoints:\n');

  try {
    const app = createServer();
    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`\n📋 Endpoints:`);
      console.log(`  - GET  /api/auth/send-otp/:phone`);
      console.log(`  - POST /api/auth/verify-otp`);
      console.log(`  - GET  /api/auth/verify-token`);
      console.log(`  - GET  /api/auth/protected`);
      console.log(`  - POST /api/auth/logout`);
      console.log(`  - POST /api/auth/revoke-all/:phone`);
      console.log(`  - GET  /api/auth/stats`);
      console.log(`  - GET  /api/auth/tokens`);
      console.log(`  - GET  /health\n`);
      
      // Show initial stats
      const stats = authWorker.getTokenStats();
      console.log('📊 Token Statistics:');
      console.log(`  - Total Tokens: ${stats.totalTokens}`);
      console.log(`  - Active Tokens: ${stats.activeTokens}`);
      console.log(`  - Active Sessions: ${stats.activeSessions}`);
      console.log(`  - Unique Users: ${stats.uniqueUsers}\n`);
    });
  } catch (error) {
    console.log('❌ Failed to start server:', error.message);
    console.log('Install dependencies: npm install express cors');
  }
}
