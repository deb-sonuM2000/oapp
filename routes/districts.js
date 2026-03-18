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

// Get district by ID with full details
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
        
        if (districtRows.length === 0) {
            return res.status(404).json({ success: false, message: 'District not found' });
        }
        
        const district = districtRows[0];
        
        // Get cuisine for this district
        const [cuisineRows] = await db.promise().query(
            'SELECT * FROM cuisine WHERE district_id = ?',
            [districtId]
        );
        
        // Get gallery images for this district - FIXED QUERY
        // The error "Unknown column 'district'" suggests the column name might be different
        // Let's try both possible column names
        let galleryRows = [];
        try {
            // Try with 'entity_type' first (as per your schema)
            const [rows] = await db.promise().query(
                'SELECT * FROM gallery WHERE entity_type = ? AND entity_id = ?',
                ['district', districtId]
            );
            galleryRows = rows;
        } catch (galleryError) {
            console.log('Gallery query with entity_type failed, trying alternative...');
            // If that fails, try without entity_type filter
            const [rows] = await db.promise().query(
                'SELECT * FROM gallery WHERE entity_id = ?',
                [districtId]
            );
            galleryRows = rows;
        }
        
        // Format the response
        const responseData = {
            ...district,
            cuisine: cuisineRows || [],
            gallery: galleryRows.map(g => g.image_url).filter(url => url) || []
        };
        
        res.json({
            success: true,
            data: responseData
        });
        
    } catch (error) {
        console.error('Error in GET /districts/:id:', error);
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