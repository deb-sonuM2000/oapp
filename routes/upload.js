// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Determine subfolder based on entity type
    if (req.body.entity_type) {
      uploadPath += req.body.entity_type + '/';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename: entity_type_entityId_timestamp.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.body.entity_type + '_' + req.body.entity_id + '_' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload image endpoint
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    
    // Generate image URL
    const imageUrl = `/uploads/${entity_type}/${req.file.filename}`;
    
    // Update database based on entity type
    const db = req.app.locals.db;
    let query = '';
    
    switch(entity_type) {
      case 'districts':
        query = 'UPDATE districts SET image_url = ? WHERE id = ?';
        break;
      case 'cuisine':
        query = 'UPDATE cuisine SET image_url = ? WHERE id = ?';
        break;
      case 'fighters':
        query = 'UPDATE freedom_fighters SET image_url = ? WHERE id = ?';
        break;
      case 'history':
        query = 'UPDATE history_timeline SET image_url = ? WHERE id = ?';
        break;
      case 'dance':
        query = 'UPDATE odissi_dance SET image_url = ? WHERE id = ?';
        break;
      case 'literature':
        query = 'UPDATE literature SET image_url = ? WHERE id = ?';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }
    
    await db.promise().query(query, [imageUrl, entity_id]);
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: imageUrl
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get image by entity
router.get('/:entity_type/:entity_id', async (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;
    const db = req.app.locals.db;
    
    let query = '';
    switch(entity_type) {
      case 'districts':
        query = 'SELECT image_url FROM districts WHERE id = ?';
        break;
      case 'cuisine':
        query = 'SELECT image_url FROM cuisine WHERE id = ?';
        break;
      case 'fighters':
        query = 'SELECT image_url FROM freedom_fighters WHERE id = ?';
        break;
      case 'history':
        query = 'SELECT image_url FROM history_timeline WHERE id = ?';
        break;
      case 'dance':
        query = 'SELECT image_url FROM odissi_dance WHERE id = ?';
        break;
      case 'literature':
        query = 'SELECT image_url FROM literature WHERE id = ?';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }
    
    const [rows] = await db.promise().query(query, [entity_id]);
    
    if (rows.length === 0 || !rows[0].image_url) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    // Send the image file
    const imagePath = path.join(__dirname, '..', rows[0].image_url);
    res.sendFile(imagePath);
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;