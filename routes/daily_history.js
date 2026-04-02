// routes/daily_history.js
const express = require('express');
const router = express.Router();

// Get today's historical event
router.get('/today', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];
        const currentMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // First check daily_events table for scheduled events
        const [dailyEvents] = await db.promise().query(
            `SELECT * FROM daily_events 
             WHERE DATE_FORMAT(event_date, '%m-%d') = ? 
             AND is_active = TRUE 
             ORDER BY event_date DESC LIMIT 1`,
            [currentMonthDay]
        );
        
        if (dailyEvents.length > 0) {
            return res.json({
                success: true,
                data: dailyEvents[0],
                source: 'daily_events'
            });
        }
        
        // If no specific daily event, get from history timeline
        const [historyEvents] = await db.promise().query(
            `SELECT * FROM history_timeline 
             WHERE DATE_FORMAT(created_at, '%m-%d') = ? 
             OR (event_date IS NOT NULL AND DATE_FORMAT(event_date, '%m-%d') = ?)
             ORDER BY year_from DESC LIMIT 1`,
            [currentMonthDay, currentMonthDay]
        );
        
        if (historyEvents.length > 0) {
            return res.json({
                success: true,
                data: historyEvents[0],
                source: 'history_timeline'
            });
        }
        
        // Return random interesting fact if no event found
        const [randomEvent] = await db.promise().query(
            `SELECT * FROM history_timeline 
             ORDER BY RAND() LIMIT 1`
        );
        
        return res.json({
            success: true,
            data: randomEvent[0],
            source: 'random',
            message: 'No specific event found for today. Here\'s an interesting fact!'
        });
        
    } catch (error) {
        console.error('Error fetching today\'s event:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get historical events for a specific date
router.get('/date/:date', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { date } = req.params;
        
        const [events] = await db.promise().query(
            `SELECT * FROM daily_events 
             WHERE event_date = ? 
             AND is_active = TRUE`,
            [date]
        );
        
        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get upcoming events
router.get('/upcoming', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const today = new Date().toISOString().split('T')[0];
        
        const [events] = await db.promise().query(
            `SELECT * FROM daily_events 
             WHERE event_date > ? 
             AND is_active = TRUE 
             ORDER BY event_date ASC 
             LIMIT 10`,
            [today]
        );
        
        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;