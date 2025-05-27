import { Router, Request, Response } from 'express';
import { authService, AuthRequest } from '../services/authService';
import { body, validationResult } from 'express-validator';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('displayName').optional().isLength({ min: 1, max: 100 }).trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
];

const changePasswordValidation = [
  body('oldPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
];

// Register endpoint
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { email, username, password, displayName } = req.body;
    const user = await authService.register(email, username, password, displayName);
    
    const token = authService.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url
      },
      token
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        displayName: result.user.display_name,
        avatarUrl: result.user.avatar_url
      },
      token: result.token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authService.authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        displayName: req.user.display_name,
        avatarUrl: req.user.avatar_url,
        createdAt: req.user.created_at,
        updatedAt: req.user.updated_at
      }
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', 
  authService.authenticateToken,
  [
    body('displayName').optional().isLength({ min: 1, max: 100 }).trim(),
    body('avatarUrl').optional().isURL()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { displayName, avatarUrl } = req.body;
      const updates: any = {};
      
      if (displayName !== undefined) updates.display_name = displayName;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      const updatedUser = await authService.updateProfile(req.user.id, updates);

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          displayName: updatedUser.display_name,
          avatarUrl: updatedUser.avatar_url
        }
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: error.message || 'Profile update failed' });
    }
  }
);

// Change password
router.put('/password',
  authService.authenticateToken,
  changePasswordValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { oldPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, oldPassword, newPassword);

      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      console.error('Password change error:', error);
      res.status(400).json({ error: error.message || 'Password change failed' });
    }
  }
);

// Request password reset
router.post('/reset-password-request',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { email } = req.body;
      await authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    } catch (error: any) {
      console.error('Password reset request error:', error);
      res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }
  }
);

// Reset password with token
router.post('/reset-password',
  [
    body('token').isLength({ min: 1 }),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(400).json({ error: error.message || 'Password reset failed' });
    }
  }
);

// Refresh token endpoint
router.post('/refresh', authService.authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const newToken = authService.generateToken({
      userId: req.user.id,
      email: req.user.email,
      username: req.user.username
    });

    res.json({
      token: newToken,
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        displayName: req.user.display_name,
        avatarUrl: req.user.avatar_url
      }
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;
