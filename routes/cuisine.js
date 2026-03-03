const express = require('express');
const router = express.Router();

// Get all cuisine items
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            `SELECT c.*, d.name as district_name, d.name_odia as district_name_odia 
             FROM cuisine c 
             LEFT JOIN districts d ON c.district_id = d.id`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get cuisine by ID
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            `SELECT c.*, d.name as district_name, d.name_odia as district_name_odia 
             FROM cuisine c 
             LEFT JOIN districts d ON c.district_id = d.id 
             WHERE c.id = ?`,
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cuisine not found' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get vegetarian cuisine
router.get('/filter/vegetarian', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM cuisine WHERE is_vegetarian = true'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;