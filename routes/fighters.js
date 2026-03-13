const express = require('express');
const router = express.Router();

// Get all freedom fighters
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT id, name, name_odia, birthplace,birthplace_odia,biography,biography_odia,contributions,contributions_odia, image_url FROM freedom_fighters ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get fighter by ID
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM freedom_fighters WHERE id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Freedom fighter not found' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Search fighters by name
router.get('/search/:name', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM freedom_fighters WHERE name LIKE ? OR name_odia LIKE ?',
            [`%${req.params.name}%`, `%${req.params.name}%`]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;