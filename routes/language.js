// routes/language.js
const express = require('express');
const router = express.Router();

// Get all proverbs
router.get('/proverbs', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM proverbs ORDER BY id DESC'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get random proverb
router.get('/proverbs/random', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM proverbs ORDER BY RAND() LIMIT 1'
        );
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get proverbs by category
router.get('/proverbs/category/:category', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM proverbs WHERE category = ?',
            [req.params.category]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all quotes
router.get('/quotes', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM quotes ORDER BY id DESC'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get random quote
router.get('/quotes/random', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM quotes ORDER BY RAND() LIMIT 1'
        );
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get word of the day
router.get('/word-of-day', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const today = new Date().toISOString().split('T')[0];
        
        let [rows] = await db.promise().query(
            'SELECT * FROM word_of_day WHERE date = ?',
            [today]
        );
        
        // If no word for today, get random word
        if (rows.length === 0) {
            [rows] = await db.promise().query(
                'SELECT * FROM word_of_day ORDER BY RAND() LIMIT 1'
            );
        }
        
        res.json({ success: true, data: rows[0] || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all idioms
router.get('/idioms', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM idioms ORDER BY id DESC'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get idioms by category
router.get('/idioms/category/:category', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM idioms WHERE category = ?',
            [req.params.category]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;