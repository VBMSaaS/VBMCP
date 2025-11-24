/**
 * Authentication Service
 * 
 * Handles user authentication, token management, and session management
 */

import jwt from 'jsonwebtoken';
import { User, Session, LoginRequest, LoginResponse, Partition } from '../types';
import { VBMSaaSApiService } from './api';

export class AuthService {
  private sessions: Map<string, Session> = new Map();
  private jwtSecret: string;
  private apiService: VBMSaaSApiService;

  constructor(jwtSecret: string, apiService: VBMSaaSApiService) {
    this.jwtSecret = jwtSecret;
    this.apiService = apiService;
  }

  /**
   * Login user using VBMSaaS direct login
   *
   * @param request - Login request with account (phone/email) and password
   * @param partitionSelector - Optional function to select partition when multiple available
   * @returns Login response with user info and token
   */
  async login(
    request: LoginRequest,
    partitionSelector?: (partitions: Partition[]) => Promise<string | null>
  ): Promise<LoginResponse> {
    try {
      console.log('[AuthService] ========================================');
      console.log('[AuthService] Starting INITIAL login (Step 1)');
      console.log('[AuthService] Account:', request.account);
      console.log('[AuthService] ⚠️ NOT passing partitionId for initial login');
      console.log('[AuthService] ========================================');

      // Initial login - DO NOT pass partitionId
      // Only pass account and password to get userId and secret
      const loginResult = await this.apiService.loginDirect(
        request.account,
        request.password,
        process.env.VBMSAAS_PLATFORM_ID || '',  // platformId
        undefined,  // ⚠️ No partitionId for initial login
        'PC'  // roleTag
      );

      console.log('[AuthService] Login result:', loginResult);
      console.log('[AuthService] Secret received:', loginResult.secret ? '***' + loginResult.secret.substring(loginResult.secret.length - 10) : 'NULL');

      if (!loginResult.success || !loginResult.user || !loginResult.token) {
        return {
          success: false,
          message: loginResult.message || 'Login failed'
        };
      }

      // Extract user data from VBMSaaS response
      const vbUser = loginResult.user;
      const user: User = {
        id: vbUser.userId || vbUser.id,
        email: vbUser.email || vbUser.mobile || request.account,
        name: vbUser.name || 'User',
        plan: 'free', // VBMSaaS doesn't have plan concept, use default
        credits: 0,   // VBMSaaS doesn't have credits concept, use default
        createdAt: new Date()
      };

      console.log('[AuthService] Converted user:', user);

      // Generate our own JWT token for session management
      const sessionToken = this.generateToken(user);

      // Create session with secret
      this.createSession(user.id, sessionToken, loginResult.secret);

      // Set auth token and secret for API service (use VBMSaaS token)
      console.error('[AuthService] ⚠️⚠️⚠️ About to call setAuthToken');
      console.error('[AuthService] Token:', loginResult.token ? loginResult.token.substring(0, 50) + '...' : 'NULL');
      console.error('[AuthService] Secret:', loginResult.secret || 'NULL');
      this.apiService.setAuthToken(loginResult.token, loginResult.secret);
      console.error('[AuthService] ✅ setAuthToken called');

      console.log('[AuthService] Session token generated:', sessionToken.substring(0, 50) + '...');
      console.log('[AuthService] VBMSaaS token:', loginResult.token.substring(0, 50) + '...');
      if (loginResult.secret) {
        console.log('[AuthService] Secret key:', loginResult.secret);
      }

      console.error('[AuthService] ⚠️⚠️⚠️ Returning login response with secret:', loginResult.secret || 'NULL');

      return {
        success: true,
        user,
        token: sessionToken,  // Session token for MCP client
        vbmsaasToken: loginResult.token,  // VBMSaaS API token
        secret: loginResult.secret  // Signature secret key
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Generate JWT token for authenticated user
   * 
   * @param user - User object
   * @returns JWT token string
   */
  generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      plan: user.plan
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '7d',
      issuer: 'vbmsaas-mcp-server'
    });

    return token;
  }

  /**
   * Verify and decode JWT token
   * 
   * @param token - JWT token string
   * @returns Decoded token payload or null if invalid
   */
  verifyToken(token: string): { userId: string; email: string; plan: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        userId: string;
        email: string;
        plan: string;
      };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new session for authenticated user
   *
   * @param userId - User ID
   * @param token - JWT token
   * @param secret - Signature secret key (optional)
   */
  createSession(userId: string, token: string, secret?: string): void {
    const session: Session = {
      userId,
      token,
      secret,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date()
    };

    this.sessions.set(token, session);
  }

  /**
   * Get session by token
   * 
   * @param token - JWT token
   * @returns Session object or null if not found or expired
   */
  getSession(token: string): Session | null {
    const session = this.sessions.get(token);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Logout user by removing session
   * 
   * @param token - JWT token
   */
  logout(token: string): void {
    this.sessions.delete(token);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }
}

