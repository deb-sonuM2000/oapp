// routes/festivals.js
const express = require('express');
const router = express.Router();

// Get all festivals with upcoming dates
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get current date
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Get all festivals
        const [festivals] = await db.promise().query(
            'SELECT * FROM festivals ORDER BY month, day'
        );
        
        // Add upcoming dates for each festival
        for (let festival of festivals) {
            let festivalDate;
            
            if (festival.is_lunar) {
                // Get next lunar festival date
                const [dates] = await db.promise().query(
                    'SELECT * FROM festival_dates WHERE festival_id = ? AND date >= ? ORDER BY date LIMIT 1',
                    [festival.id, currentDate.toISOString().split('T')[0]]
                );
                festivalDate = dates[0];
            } else {
                // Fixed date festival
                const year = festival.month >= currentDate.getMonth() + 1 ? currentYear : currentYear + 1;
                festivalDate = {
                    date: `${year}-${String(festival.month).padStart(2, '0')}-${String(festival.day).padStart(2, '0')}`
                };
            }
            
            if (festivalDate) {
                festival.upcoming_date = festivalDate.date;
                // Calculate days remaining
                const daysRemaining = Math.ceil((new Date(festivalDate.date) - currentDate) / (1000 * 60 * 60 * 24));
                festival.days_remaining = daysRemaining > 0 ? daysRemaining : 0;
            }
        }
        
        res.json({ success: true, data: festivals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get festival by ID with full details
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const festivalId = req.params.id;
        
        // Get festival details
        const [festivalRows] = await db.promise().query(
            'SELECT * FROM festivals WHERE id = ?',
            [festivalId]
        );
        
        if (festivalRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Festival not found' });
        }
        
        const festival = festivalRows[0];
        
        // Get rituals
        const [rituals] = await db.promise().query(
            'SELECT * FROM rituals WHERE festival_id = ? ORDER BY sequence_order',
            [festivalId]
        );
        
        // Get gallery images
        const [gallery] = await db.promise().query(
            'SELECT * FROM festival_gallery WHERE festival_id = ?',
            [festivalId]
        );
        
        // Get dates for the next 3 years
        let upcomingDates = [];
        if (festival.is_lunar) {
            const [dates] = await db.promise().query(
                'SELECT * FROM festival_dates WHERE festival_id = ? ORDER BY date LIMIT 5',
                [festivalId]
            );
            upcomingDates = dates;
        } else {
            const currentYear = new Date().getFullYear();
            for (let i = 0; i < 3; i++) {
                const year = currentYear + i;
                const date = `${year}-${String(festival.month).padStart(2, '0')}-${String(festival.day).padStart(2, '0')}`;
                upcomingDates.push({
                    year: year,
                    date: date,
                    day_of_week: new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                ...festival,
                rituals_list: rituals,
                gallery: gallery,
                upcoming_dates: upcomingDates
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get festivals by month
router.get('/month/:month', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const month = req.params.month;
        
        const [festivals] = await db.promise().query(
            'SELECT * FROM festivals WHERE month = ? ORDER BY day',
            [month]
        );
        
        res.json({ success: true, data: festivals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get upcoming festivals (next 30/60/90 days)
router.get('/upcoming/:days', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const days = parseInt(req.params.days);
        const currentDate = new Date();
        const futureDate = new Date();
        futureDate.setDate(currentDate.getDate() + days);
        
        const [festivals] = await db.promise().query('SELECT * FROM festivals');
        
        const upcoming = [];
        for (let festival of festivals) {
            let festivalDate;
            
            if (festival.is_lunar) {
                const [dates] = await db.promise().query(
                    'SELECT date FROM festival_dates WHERE festival_id = ? AND date BETWEEN ? AND ? ORDER BY date LIMIT 1',
                    [festival.id, currentDate.toISOString().split('T')[0], futureDate.toISOString().split('T')[0]]
                );
                if (dates.length > 0) festivalDate = dates[0];
            } else {
                let year = currentDate.getFullYear();
                if (festival.month < currentDate.getMonth() + 1) year++;
                festivalDate = { date: `${year}-${String(festival.month).padStart(2, '0')}-${String(festival.day).padStart(2, '0')}` };
            }
            
            if (festivalDate && new Date(festivalDate.date) <= futureDate) {
                const daysRemaining = Math.ceil((new Date(festivalDate.date) - currentDate) / (1000 * 60 * 60 * 24));
                upcoming.push({
                    ...festival,
                    upcoming_date: festivalDate.date,
                    days_remaining: daysRemaining
                });
            }
        }
        
        upcoming.sort((a, b) => a.days_remaining - b.days_remaining);
        
        res.json({ success: true, data: upcoming });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get festival by date
router.get('/date/:date', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const date = req.params.date;
        
        // Search in fixed dates
        const [fixedFestivals] = await db.promise().query(
            'SELECT * FROM festivals WHERE is_lunar = 0 AND month = ? AND day = ?',
            [parseInt(date.split('-')[1]), parseInt(date.split('-')[2])]
        );
        
        // Search in lunar dates
        const [lunarFestivals] = await db.promise().query(
            'SELECT f.* FROM festivals f INNER JOIN festival_dates fd ON f.id = fd.festival_id WHERE fd.date = ?',
            [date]
        );
        
        const festivals = [...fixedFestivals, ...lunarFestivals];
        
        res.json({ success: true, data: festivals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Save user reminder preference
router.post('/reminder', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { user_id, festival_id, reminder_days_before, is_enabled } = req.body;
        
        await db.promise().query(
            'INSERT INTO festival_reminders (user_id, festival_id, reminder_days_before, is_enabled) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE reminder_days_before = ?, is_enabled = ?',
            [user_id, festival_id, reminder_days_before, is_enabled, reminder_days_before, is_enabled]
        );
        
        res.json({ success: true, message: 'Reminder saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user reminders
router.get('/reminder/:user_id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const userId = req.params.user_id;
        
        const [reminders] = await db.promise().query(
            'SELECT fr.*, f.name, f.name_odia, f.image_url FROM festival_reminders fr INNER JOIN festivals f ON fr.festival_id = f.id WHERE fr.user_id = ? AND fr.is_enabled = 1',
            [userId]
        );
        
        res.json({ success: true, data: reminders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;