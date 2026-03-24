// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const JWT_EXPIRES_IN = '7d';

// Helper function to generate JWT token
const generateToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Helper function to generate random token
const generateRandomToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Register User
router.post('/register', [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').optional(),
    body('full_name_odia').optional(),
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { username, email, password, full_name, full_name_odia } = req.body;
        const db = req.app.locals.db;

        // Check if user already exists
        const [existingUsers] = await db.promise().query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        const [result] = await db.promise().query(
            `INSERT INTO users (username, email, password_hash, full_name, full_name_odia) 
             VALUES (?, ?, ?, ?, ?)`,
            [username, email, passwordHash, full_name || null, full_name_odia || null]
        );

        const userId = result.insertId;

        // Generate token
        const token = generateToken(userId, email);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        // Save session
        await db.promise().query(
            `INSERT INTO user_sessions (user_id, token, expires_at, device_info) 
             VALUES (?, ?, ?, ?)`,
            [userId, token, expiresAt, req.headers['user-agent'] || 'Unknown']
        );

        // Return user data (excluding sensitive info)
        res.json({
            success: true,
            message: 'Registration successful',
            data: {
                token,
                user: {
                    id: userId,
                    username,
                    email,
                    full_name,
                    full_name_odia
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Login User
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;
        const db = req.app.locals.db;

        // Find user by email
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await db.promise().query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Generate new token
        const token = generateToken(user.id, user.email);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Delete old sessions and create new
        await db.promise().query(
            'DELETE FROM user_sessions WHERE user_id = ?',
            [user.id]
        );

        await db.promise().query(
            `INSERT INTO user_sessions (user_id, token, expires_at, device_info) 
             VALUES (?, ?, ?, ?)`,
            [user.id, token, expiresAt, req.headers['user-agent'] || 'Unknown']
        );

        // Return user data
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    full_name_odia: user.full_name_odia,
                    profile_image: user.profile_image
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const db = req.app.locals.db;

        // Check if session exists and is valid
        const [sessions] = await db.promise().query(
            'SELECT * FROM user_sessions WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (sessions.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Get user data
        const [users] = await db.promise().query(
            'SELECT id, username, email, full_name, full_name_odia, profile_image FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = users[0];
        req.token = token;
        next();

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Get Current User Profile (Protected Route)
router.get('/profile', verifyToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Delete session
        await db.promise().query(
            'DELETE FROM user_sessions WHERE token = ?',
            [req.token]
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Forgot Password - Request Reset
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
    try {
        const { email } = req.body;
        const db = req.app.locals.db;

        // Check if user exists
        const [users] = await db.promise().query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // Don't reveal that user doesn't exist for security
            return res.json({
                success: true,
                message: 'If your email is registered, you will receive a reset link'
            });
        }

        // Generate reset token
        const resetToken = generateRandomToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

        // Save reset token
        await db.promise().query(
            'DELETE FROM password_resets WHERE email = ?',
            [email]
        );

        await db.promise().query(
            'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
            [email, resetToken, expiresAt]
        );

        // In production, send email with reset link
        const resetLink = `https://yourapp.com/reset-password?token=${resetToken}`;
        
        // For development, return the token (remove in production)
        console.log(`Password reset link: ${resetLink}`);

        res.json({
            success: true,
            message: 'If your email is registered, you will receive a reset link',
            // Only include token in development
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Reset Password
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Token is required'),
    body('new_password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
    try {
        const { token, new_password } = req.body;
        const db = req.app.locals.db;

        // Verify reset token
        const [resets] = await db.promise().query(
            'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (resets.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        const reset = resets[0];

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(new_password, salt);

        // Update user password
        await db.promise().query(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [passwordHash, reset.email]
        );

        // Delete used reset token
        await db.promise().query(
            'DELETE FROM password_resets WHERE token = ?',
            [token]
        );

        // Delete all user sessions (force re-login)
        const [users] = await db.promise().query(
            'SELECT id FROM users WHERE email = ?',
            [reset.email]
        );
        
        if (users.length > 0) {
            await db.promise().query(
                'DELETE FROM user_sessions WHERE user_id = ?',
                [users[0].id]
            );
        }

        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;