// routes/literature.js
const express = require('express');
const router = express.Router();

// Get all literature with images
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get all literature items
        const [literature] = await db.promise().query(
            'SELECT * FROM literature ORDER BY type, title'
        );
        
        // Get images for each literature item
        for (let item of literature) {
            const [images] = await db.promise().query(
                'SELECT * FROM literature_images WHERE literature_id = ? ORDER BY display_order',
                [item.id]
            );
            item.images = images;
        }
        
        res.json({ success: true, data: literature });
    } catch (error) {
        console.error('Error fetching literature:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get literature by ID with images
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get literature details
        const [literatureRows] = await db.promise().query(
            'SELECT * FROM literature WHERE id = ?',
            [req.params.id]
        );
        
        if (literatureRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Literature not found' });
        }
        
        const literature = literatureRows[0];
        
        // Get images for this literature
        const [images] = await db.promise().query(
            'SELECT * FROM literature_images WHERE literature_id = ? ORDER BY display_order',
            [req.params.id]
        );
        
        literature.images = images;
        
        res.json({ success: true, data: literature });
    } catch (error) {
        console.error('Error fetching literature by ID:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get literature by type with images
router.get('/type/:type', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get literature by type
        const [literature] = await db.promise().query(
            'SELECT * FROM literature WHERE type = ? ORDER BY title',
            [req.params.type]
        );
        
        // Get images for each literature item
        for (let item of literature) {
            const [images] = await db.promise().query(
                'SELECT * FROM literature_images WHERE literature_id = ? ORDER BY display_order',
                [item.id]
            );
            item.images = images;
        }
        
        res.json({ success: true, data: literature });
    } catch (error) {
        console.error('Error fetching literature by type:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add image to literature
router.post('/:id/images', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { image_url, caption, caption_odia, display_order } = req.body;
        
        // Validate required fields
        if (!image_url) {
            return res.status(400).json({ 
                success: false, 
                message: 'Image URL is required' 
            });
        }
        
        // Check if literature exists
        const [literature] = await db.promise().query(
            'SELECT id FROM literature WHERE id = ?',
            [req.params.id]
        );
        
        if (literature.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Literature not found' 
            });
        }
        
        // Insert image
        const [result] = await db.promise().query(
            `INSERT INTO literature_images 
             (literature_id, image_url, caption, caption_odia, display_order) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, image_url, caption || '', caption_odia || '', display_order || 0]
        );
        
        // Get the inserted image
        const [newImage] = await db.promise().query(
            'SELECT * FROM literature_images WHERE id = ?',
            [result.insertId]
        );
        
        res.json({ 
            success: true, 
            message: 'Image added successfully',
            image: newImage[0]
        });
    } catch (error) {
        console.error('Error adding image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update image details
router.put('/:id/images/:image_id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { caption, caption_odia, display_order } = req.body;
        
        // Check if image exists and belongs to literature
        const [imageCheck] = await db.promise().query(
            'SELECT * FROM literature_images WHERE id = ? AND literature_id = ?',
            [req.params.image_id, req.params.id]
        );
        
        if (imageCheck.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Image not found' 
            });
        }
        
        // Update image
        await db.promise().query(
            `UPDATE literature_images 
             SET caption = ?, caption_odia = ?, display_order = ? 
             WHERE id = ? AND literature_id = ?`,
            [caption || '', caption_odia || '', display_order || 0, req.params.image_id, req.params.id]
        );
        
        // Get updated image
        const [updatedImage] = await db.promise().query(
            'SELECT * FROM literature_images WHERE id = ?',
            [req.params.image_id]
        );
        
        res.json({ 
            success: true, 
            message: 'Image updated successfully',
            image: updatedImage[0]
        });
    } catch (error) {
        console.error('Error updating image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remove image from literature
router.delete('/:id/images/:image_id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Check if image exists and belongs to literature
        const [imageCheck] = await db.promise().query(
            'SELECT * FROM literature_images WHERE id = ? AND literature_id = ?',
            [req.params.image_id, req.params.id]
        );
        
        if (imageCheck.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Image not found' 
            });
        }
        
        // Delete image
        await db.promise().query(
            'DELETE FROM literature_images WHERE id = ? AND literature_id = ?',
            [req.params.image_id, req.params.id]
        );
        
        res.json({ 
            success: true, 
            message: 'Image removed successfully' 
        });
    } catch (error) {
        console.error('Error removing image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all images for a literature
router.get('/:id/images', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Check if literature exists
        const [literature] = await db.promise().query(
            'SELECT id FROM literature WHERE id = ?',
            [req.params.id]
        );
        
        if (literature.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Literature not found' 
            });
        }
        
        // Get all images
        const [images] = await db.promise().query(
            'SELECT * FROM literature_images WHERE literature_id = ? ORDER BY display_order',
            [req.params.id]
        );
        
        res.json({ 
            success: true, 
            data: images 
        });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Bulk upload images for literature
router.post('/:id/images/bulk', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { images } = req.body; // Array of image objects
        
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Images array is required' 
            });
        }
        
        // Check if literature exists
        const [literature] = await db.promise().query(
            'SELECT id FROM literature WHERE id = ?',
            [req.params.id]
        );
        
        if (literature.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Literature not found' 
            });
        }
        
        const insertedImages = [];
        
        // Insert each image
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const [result] = await db.promise().query(
                `INSERT INTO literature_images 
                 (literature_id, image_url, caption, caption_odia, display_order) 
                 VALUES (?, ?, ?, ?, ?)`,
                [req.params.id, img.image_url, img.caption || '', img.caption_odia || '', img.display_order || i]
            );
            
            const [newImage] = await db.promise().query(
                'SELECT * FROM literature_images WHERE id = ?',
                [result.insertId]
            );
            
            insertedImages.push(newImage[0]);
        }
        
        res.json({ 
            success: true, 
            message: `${insertedImages.length} images added successfully`,
            images: insertedImages
        });
    } catch (error) {
        console.error('Error bulk uploading images:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reorder images
router.put('/:id/images/reorder', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { image_order } = req.body; // Array of image IDs in desired order
        
        if (!image_order || !Array.isArray(image_order)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Image order array is required' 
            });
        }
        
        // Update display order for each image
        for (let i = 0; i < image_order.length; i++) {
            await db.promise().query(
                'UPDATE literature_images SET display_order = ? WHERE id = ? AND literature_id = ?',
                [i, image_order[i], req.params.id]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Images reordered successfully' 
        });
    } catch (error) {
        console.error('Error reordering images:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;