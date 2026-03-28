// routes/map.js
const express = require('express');
const router = express.Router();

// Get all heritage locations
router.get('/locations', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(`
            SELECT hl.*, d.name as district_name 
            FROM heritage_locations hl
            LEFT JOIN districts d ON hl.district_id = d.id
            ORDER BY hl.type, hl.name
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get locations by district
router.get('/locations/district/:districtId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(`
            SELECT hl.*, d.name as district_name 
            FROM heritage_locations hl
            LEFT JOIN districts d ON hl.district_id = d.id
            WHERE hl.district_id = ?
        `, [req.params.districtId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get locations by type
router.get('/locations/type/:type', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(`
            SELECT hl.*, d.name as district_name 
            FROM heritage_locations hl
            LEFT JOIN districts d ON hl.district_id = d.id
            WHERE hl.type = ?
        `, [req.params.type]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get district boundaries (simplified - you'd need actual GeoJSON data)
router.get('/districts/boundaries', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [rows] = await db.promise().query(`
            SELECT id, name, name_odia, 
                   latitude, longitude, area_km2 
            FROM districts
        `);
        
        // Simplified boundaries - you should use actual GeoJSON for production
        const boundaries = rows.map(district => ({
            districtId: district.id,
            districtName: district.name,
            districtNameOdia: district.name_odia,
            center: {
                lat: district.latitude,
                lng: district.longitude
            }
        }));
        
        res.json({ success: true, data: boundaries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add a new heritage location
router.post('/locations', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const {
            name, name_odia, latitude, longitude, type,
            description, description_odia, image_url, district_id
        } = req.body;
        
        const [result] = await db.promise().query(`
            INSERT INTO heritage_locations 
            (name, name_odia, latitude, longitude, type, description, description_odia, image_url, district_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, name_odia, latitude, longitude, type, description, description_odia, image_url, district_id]);
        
        res.json({ 
            success: true, 
            data: { id: result.insertId },
            message: 'Location added successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update heritage location
router.put('/locations/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const {
            name, name_odia, latitude, longitude, type,
            description, description_odia, image_url, district_id
        } = req.body;
        
        await db.promise().query(`
            UPDATE heritage_locations 
            SET name=?, name_odia=?, latitude=?, longitude=?, type=?,
                description=?, description_odia=?, image_url=?, district_id=?
            WHERE id=?
        `, [name, name_odia, latitude, longitude, type, description, description_odia, image_url, district_id, req.params.id]);
        
        res.json({ success: true, message: 'Location updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete heritage location
router.delete('/locations/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        await db.promise().query('DELETE FROM heritage_locations WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Location deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;