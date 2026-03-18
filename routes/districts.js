const express = require('express');
const router = express.Router();

// Get all districts (summary)
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(
            'SELECT id, name, name_odia, capital,area_km2,population,description,description_odia,history,history_odia,famous_for,famous_for_odia, image_url FROM districts ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get district by ID with full details - Fix this
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const districtId = req.params.id;
        
        console.log('Fetching district with ID:', districtId); // Debug log
        
        // Get district details
        const [districtRows] = await db.promise().query(
            'SELECT * FROM districts WHERE id = ?',
            [districtId]
        );
        
        console.log('District rows:', districtRows); // Debug log
        
        if (districtRows.length === 0) {
            return res.status(404).json({ success: false, message: 'District not found' });
        }
        
        const district = districtRows[0];
        
        // Get cuisine for this district
        const [cuisineRows] = await db.promise().query(
            'SELECT * FROM cuisine WHERE district_id = ?',
            [districtId]
        );
        
        // Get gallery images for this district
        const [galleryRows] = await db.promise().query(
            'SELECT * FROM gallery WHERE entity_type = "district" AND entity_id = ?',
            [districtId]
        );
        
        // Format the response
        const response = {
            ...district,
            cuisine: cuisineRows,
            gallery: galleryRows.map(g => g.image_url) // Extract just the URLs
        };
        
        console.log('Sending response for district:', districtId); // Debug log
        res.json({ success: true, data: response });
        
    } catch (error) {
        console.error('Error fetching district details:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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