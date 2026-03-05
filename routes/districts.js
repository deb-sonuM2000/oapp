const express = require('express');
const router = express.Router();

// Get all districts (summary)
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT id, name, name_odia, capital,area_km2,population,description,description_odia, image_url FROM districts ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get district by ID with full details
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get district details
        const [districtRows] = await db.promise().query(
            'SELECT * FROM districts WHERE id = ?',
            [req.params.id]
        );
        
        if (districtRows.length === 0) {
            return res.status(404).json({ success: false, message: 'District not found' });
        }
        
        const district = districtRows[0];
        
        // Get cuisine for this district
        const [cuisineRows] = await db.promise().query(
            'SELECT * FROM cuisine WHERE district_id = ?',
            [req.params.id]
        );
        
        // Get gallery images for this district
        const [galleryRows] = await db.promise().query(
            'SELECT * FROM gallery WHERE entity_type = "district" AND entity_id = ?',
            [req.params.id]
        );
        
        res.json({
            success: true,
            data: {
                ...district,
                cuisine: cuisineRows,
                gallery: galleryRows
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get cuisine by district
router.get('/:id/cuisine', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT * FROM cuisine WHERE district_id = ?',
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;