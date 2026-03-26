// routes/video_upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure video storage
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/dance/videos/';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.body.dance_id + '_' + uniqueSuffix + ext);
  }
});

const videoUpload = multer({ 
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Upload video endpoint
router.post('/', videoUpload.single('video'), async (req, res) => {
  try {
    const { dance_id, title } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video uploaded' });
    }
    
    // Generate video URL
    const videoUrl = `/uploads/dance/videos/${req.file.filename}`;
    
    // Generate thumbnail (optional - using ffmpeg)
    // This would require ffmpeg installed on your server
    
    // Update database
    const db = req.app.locals.db;
    await db.promise().query(
      'UPDATE odissi_dance SET video_url = ? WHERE id = ?',
      [videoUrl, dance_id]
    );
    
    res.json({
      success: true,
      message: 'Video uploaded successfully',
      videoUrl: videoUrl
    });
    
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;