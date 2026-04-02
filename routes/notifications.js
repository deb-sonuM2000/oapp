// routes/notifications.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK


if (!admin.apps.length) {
  admin.initializeApp({
     credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

// Save device token
router.post('/register', async (req, res) => {
  try {
    const { token, device_type } = req.body;
    const db = req.app.locals.db;
    
    // Save token to database
    await db.promise().query(
      'INSERT INTO device_tokens (token, device_type, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE updated_at = NOW()',
      [token, device_type]
    );
    
    res.json({ success: true, message: 'Token registered' });
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send push notification to all users
router.post('/send', async (req, res) => {
  try {
    const { title, body, data, topic } = req.body;
    const db = req.app.locals.db;
    
    // Get all device tokens
    const [tokens] = await db.promise().query(
      'SELECT token FROM device_tokens'
    );
    
    const deviceTokens = tokens.map(t => t.token);
    
    // Send notification
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
      tokens: deviceTokens,
    };
    
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log('Notification sent:', response);
    
    res.json({ success: true, message: 'Notifications sent', response });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send daily history notification (cron job)
router.post('/send-daily-history', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get today's event
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const [events] = await db.promise().query(
      `SELECT * FROM daily_events 
       WHERE DATE_FORMAT(event_date, '%m-%d') = ? 
       AND is_active = TRUE 
       LIMIT 1`,
      [monthDay]
    );
    
    if (events.length > 0) {
      const event = events[0];
      
      // Send notification to topic
      const message = {
        notification: {
          title: 'Today in Odisha History',
          body: event.title_odia,
        },
        data: {
          type: 'today_history',
          event_id: event.id.toString(),
        },
        topic: 'daily_history',
      };
      
      await admin.messaging().send(message);
    }
    
    res.json({ success: true, message: 'Daily notification sent' });
  } catch (error) {
    console.error('Error sending daily notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;