import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../database';

export interface User {
  id: number;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface TokenPayload {
  userId: number;
  email: string;
  username: string;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  /**
   * Generate JWT token
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'ai-notes-app',
      audience: 'ai-notes-users'
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'ai-notes-app',
        audience: 'ai-notes-users'
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Register new user
   */
  async register(email: string, username: string, password: string, displayName?: string): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await DatabaseService.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const existingUsername = await DatabaseService.getUserByUsername(username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const userId = await DatabaseService.createUser({
        email,
        username,
        password_hash: passwordHash,
        display_name: displayName || username
      });

      // Return user without password
      const user = await DatabaseService.getUserById(userId);
      if (!user) {
        throw new Error('Failed to create user');
      }

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      // Get user by email
      const user = await DatabaseService.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Get password hash
      const userWithPassword = await DatabaseService.getUserWithPassword(email);
      if (!userWithPassword) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, userWithPassword.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        username: user.username
      });

      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token: string): Promise<User> {
    try {
      const payload = this.verifyToken(token);
      const user = await DatabaseService.getUserById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Middleware to authenticate requests
   */
  authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
      }

      const user = await this.getUserFromToken(token);
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        try {
          const user = await this.getUserFromToken(token);
          req.user = user;
        } catch (error) {
          // Token is invalid, but we continue without user
          console.warn('Invalid token in optional auth:', error);
        }
      }

      next();
    } catch (error) {
      console.error('Optional auth error:', error);
      next();
    }
  };

  /**
   * Update user profile
   */
  async updateProfile(userId: number, updates: {
    display_name?: string;
    avatar_url?: string;
  }): Promise<User> {
    try {
      await DatabaseService.updateUser(userId, updates);
      const user = await DatabaseService.getUserById(userId);
      if (!user) {
        throw new Error('User not found after update');
      }
      return user;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password
      const user = await DatabaseService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userWithPassword = await DatabaseService.getUserWithPassword(user.email);
      if (!userWithPassword) {
        throw new Error('User not found');
      }

      // Verify old password
      const isValidPassword = await this.verifyPassword(oldPassword, userWithPassword.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await DatabaseService.updateUser(userId, { password_hash: newPasswordHash });
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Generate password reset token (placeholder for email integration)
   */
  async requestPasswordReset(email: string): Promise<string> {
    try {
      const user = await DatabaseService.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return 'reset-token-placeholder';
      }

      // Generate reset token (in production, store this with expiration)
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password-reset' },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      // TODO: Send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      return resetToken;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      
      if (payload.type !== 'password-reset') {
        throw new Error('Invalid reset token');
      }

      const newPasswordHash = await this.hashPassword(newPassword);
      await DatabaseService.updateUser(payload.userId, { password_hash: newPasswordHash });
    } catch (error) {
      console.error('Password reset error:', error);
      throw new Error('Invalid or expired reset token');
    }
  }
}

export const authService = new AuthService();
