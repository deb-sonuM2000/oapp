// routes/national_symbols.js
const express = require('express');
const router = express.Router();

// Get all national symbols
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [symbols] = await db.promise().query(
            'SELECT * FROM national_symbols ORDER BY symbol_type'
        );
        res.json({ success: true, data: symbols });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get symbol by type
router.get('/type/:type', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { type } = req.params;
        
        const [symbols] = await db.promise().query(
            'SELECT * FROM national_symbols WHERE symbol_type = ?',
            [type]
        );
        
        if (symbols.length === 0) {
            return res.status(404).json({ success: false, message: 'Symbol not found' });
        }
        
        res.json({ success: true, data: symbols[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get symbol by ID
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [symbols] = await db.promise().query(
            'SELECT * FROM national_symbols WHERE id = ?',
            [req.params.id]
        );
        
        if (symbols.length === 0) {
            return res.status(404).json({ success: false, message: 'Symbol not found' });
        }
        
        res.json({ success: true, data: symbols[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;