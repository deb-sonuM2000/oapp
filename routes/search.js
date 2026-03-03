const express = require('express');
const router = express.Router();

// Global search across all categories
router.get('/', async (req, res) => {
    try {
        const { q } = req.query;
        const db = req.app.locals.db;
        
        if (!q) {
            return res.status(400).json({ success: false, message: 'Search query required' });
        }
        
        const searchTerm = `%${q}%`;
        
        // Search in history
        const [history] = await db.promise().query(
            'SELECT id, title, title_odia, "history" as type FROM history_timeline WHERE title LIKE ? OR title_odia LIKE ? OR description LIKE ?',
            [searchTerm, searchTerm, searchTerm]
        );
        
        // Search in districts
        const [districts] = await db.promise().query(
            'SELECT id, name, name_odia, "district" as type FROM districts WHERE name LIKE ? OR name_odia LIKE ? OR description LIKE ?',
            [searchTerm, searchTerm, searchTerm]
        );
        
        // Search in cuisine
        const [cuisine] = await db.promise().query(
            'SELECT id, dish_name, dish_name_odia, "cuisine" as type FROM cuisine WHERE dish_name LIKE ? OR dish_name_odia LIKE ?',
            [searchTerm, searchTerm]
        );
        
        // Search in freedom fighters
        const [fighters] = await db.promise().query(
            'SELECT id, name, name_odia, "fighter" as type FROM freedom_fighters WHERE name LIKE ? OR name_odia LIKE ?',
            [searchTerm, searchTerm]
        );
        
        // Search in dance
        const [dance] = await db.promise().query(
            'SELECT id, title, title_odia, "dance" as type FROM odissi_dance WHERE title LIKE ? OR title_odia LIKE ?',
            [searchTerm, searchTerm]
        );
        
        // Search in literature
        const [literature] = await db.promise().query(
            'SELECT id, title, title_odia, "literature" as type FROM literature WHERE title LIKE ? OR title_odia LIKE ?',
            [searchTerm, searchTerm]
        );
        
        res.json({
            success: true,
            data: {
                history,
                districts,
                cuisine,
                fighters,
                dance,
                literature
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;