const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Also serve from /images for backward compatibility
app.use('/images', express.static(path.join(__dirname, 'uploads')));

// Database connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false,
  },
  connectTimeout: 10000,
});

// Test database connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
        connection.release();
    }
});

// Make db accessible to routes
app.locals.db = db;

// Import routes
const historyRoutes = require('./routes/history');
const districtRoutes = require('./routes/districts');
const cuisineRoutes = require('./routes/cuisine');
const fighterRoutes = require('./routes/fighters');
const danceRoutes = require('./routes/dance');
const literatureRoutes = require('./routes/literature');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const videoUploadRoutes = require('./routes/video_upload');
//const galleryRoutes = require('./routes/gallery');

// Use routes
app.use('/api/history', historyRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/cuisine', cuisineRoutes);
app.use('/api/fighters', fighterRoutes);
app.use('/api/dance', danceRoutes);
app.use('/api/literature', literatureRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/video-upload', videoUploadRoutes);
//app.use('/api/gallery', galleryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});