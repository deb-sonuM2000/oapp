const express = require('express');
const router = express.Router();

// Get all literature
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM literature ORDER BY type, title'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get literature by ID
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM literature WHERE id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Literature not found' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get literature by type
router.get('/type/:type', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM literature WHERE type = ?',
            [req.params.type]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;