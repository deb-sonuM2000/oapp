// routes/quiz.js
const express = require('express');
const router = express.Router();

// Get all quiz categories
router.get('/categories', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const [rows] = await db.promise().query(
            'SELECT * FROM quiz_categories WHERE is_active = true'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching quiz categories:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get random questions for a category
router.get('/questions/:categoryId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { categoryId } = req.params;
        const { limit = 10, difficulty } = req.query;
        
        let query = 'SELECT * FROM quiz_questions WHERE category_id = ? AND is_active = true';
        const params = [categoryId];
        
        if (difficulty) {
            query += ' AND difficulty = ?';
            params.push(difficulty);
        }
        
        // Get random questions
        query += ' ORDER BY RAND() LIMIT ?';
        params.push(parseInt(limit));
        
        const [rows] = await db.promise().query(query, params);
        
        res.json({ 
            success: true, 
            data: rows,
            total: rows.length 
        });
    } catch (error) {
        console.error('Error fetching quiz questions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Submit quiz answers
router.post('/submit', async (req, res) => {
    const db = req.app.locals.db;
    const connection = await db.promise().getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            user_id, 
            category_id, 
            answers, 
            time_taken 
        } = req.body;
        
        let score = 0;
        let totalQuestions = answers.length;
        
        // Calculate score
        for (const answer of answers) {
            const [question] = await connection.query(
                'SELECT correct_answer, points FROM quiz_questions WHERE id = ?',
                [answer.question_id]
            );
            
            const isCorrect = question[0].correct_answer === answer.selected_answer;
            if (isCorrect) {
                score += question[0].points;
            }
        }
        
        const percentage = (score / (totalQuestions * 10)) * 100;
        
        // Save attempt
        const [attempt] = await connection.query(
            `INSERT INTO user_quiz_attempts 
             (user_id, category_id, score, total_questions, percentage, time_taken) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, category_id, score, totalQuestions, percentage, time_taken]
        );
        
        const attemptId = attempt.insertId;
        
        // Save individual answers
        for (const answer of answers) {
            const [question] = await connection.query(
                'SELECT correct_answer FROM quiz_questions WHERE id = ?',
                [answer.question_id]
            );
            
            const isCorrect = question[0].correct_answer === answer.selected_answer;
            
            await connection.query(
                `INSERT INTO user_quiz_answers 
                 (attempt_id, question_id, selected_answer, is_correct, time_taken_per_question) 
                 VALUES (?, ?, ?, ?, ?)`,
                [attemptId, answer.question_id, answer.selected_answer, isCorrect, answer.time_taken]
            );
        }
        
        // Update user stats
        await updateUserStats(connection, user_id, score, totalQuestions);
        
        // Check and award badges
        const newBadges = await checkAndAwardBadges(connection, user_id);
        
        // Check and award titles
        const newTitles = await checkAndAwardTitles(connection, user_id);
        
        await connection.commit();
        
        res.json({
            success: true,
            data: {
                score: score,
                total_questions: totalQuestions,
                percentage: percentage,
                new_badges: newBadges,
                new_titles: newTitles
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting quiz:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// Get user quiz stats
router.get('/stats/:userId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { userId } = req.params;
        
        const [stats] = await db.promise().query(
            'SELECT * FROM user_quiz_stats WHERE user_id = ?',
            [userId]
        );
        
        const [badges] = await db.promise().query(
            `SELECT b.*, ub.earned_at 
             FROM user_badges ub 
             JOIN badges b ON ub.badge_id = b.id 
             WHERE ub.user_id = ?`,
            [userId]
        );
        
        const [titles] = await db.promise().query(
            `SELECT t.*, ut.earned_at, ut.is_active 
             FROM user_titles ut 
             JOIN titles t ON ut.title_id = t.id 
             WHERE ut.user_id = ?`,
            [userId]
        );
        
        const [recentQuizzes] = await db.promise().query(
            `SELECT qc.name, qc.name_odia, uqa.percentage, uqa.score, uqa.completed_at 
             FROM user_quiz_attempts uqa 
             JOIN quiz_categories qc ON uqa.category_id = qc.id 
             WHERE uqa.user_id = ? 
             ORDER BY uqa.completed_at DESC 
             LIMIT 5`,
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                stats: stats[0] || {},
                badges: badges,
                titles: titles,
                recentQuizzes: recentQuizzes
            }
        });
    } catch (error) {
        console.error('Error fetching user quiz stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { limit = 10, category } = req.query;
        
        let query = `
            SELECT u.username, u.profile_image, 
                   COALESCE(SUM(uqa.score), 0) as total_points,
                   COUNT(DISTINCT uqa.id) as quizzes_taken,
                   MAX(uqa.percentage) as best_score
            FROM users u
            LEFT JOIN user_quiz_attempts uqa ON u.id = uqa.user_id
        `;
        
        const params = [];
        
        if (category) {
            query += ' AND uqa.category_id = ?';
            params.push(category);
        }
        
        query += ` GROUP BY u.id 
                   ORDER BY total_points DESC 
                   LIMIT ?`;
        params.push(parseInt(limit));
        
        const [rows] = await db.promise().query(query, params);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper functions
async function updateUserStats(connection, userId, earnedPoints, questionsAttempted) {
    // Get or create user stats
    let [stats] = await connection.query(
        'SELECT * FROM user_quiz_stats WHERE user_id = ?',
        [userId]
    );
    
    if (stats.length === 0) {
        await connection.query(
            'INSERT INTO user_quiz_stats (user_id) VALUES (?)',
            [userId]
        );
        [stats] = await connection.query(
            'SELECT * FROM user_quiz_stats WHERE user_id = ?',
            [userId]
        );
    }
    
    const currentStats = stats[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Update streak
    let currentStreak = currentStats.current_streak;
    if (currentStats.last_quiz_date === today) {
        // Already played today, no streak change
    } else if (currentStats.last_quiz_date === getPreviousDate(today)) {
        currentStreak++;
    } else {
        currentStreak = 1;
    }
    
    const bestStreak = Math.max(currentStats.best_streak, currentStreak);
    
    await connection.query(
        `UPDATE user_quiz_stats 
         SET total_quizzes_taken = total_quizzes_taken + 1,
             total_questions_answered = total_questions_answered + ?,
             total_correct_answers = total_correct_answers + ?,
             total_points_earned = total_points_earned + ?,
             current_streak = ?,
             best_streak = ?,
             last_quiz_date = ?
         WHERE user_id = ?`,
        [questionsAttempted, 0, earnedPoints, currentStreak, bestStreak, today, userId]
    );
}

async function checkAndAwardBadges(connection, userId) {
    const newBadges = [];
    
    // Get user stats
    const [stats] = await connection.query(
        'SELECT * FROM user_quiz_stats WHERE user_id = ?',
        [userId]
    );
    
    const userStats = stats[0];
    
    // Get already earned badges
    const [earnedBadges] = await connection.query(
        'SELECT badge_id FROM user_badges WHERE user_id = ?',
        [userId]
    );
    const earnedBadgeIds = earnedBadges.map(b => b.badge_id);
    
    // Check all badges
    const [allBadges] = await connection.query('SELECT * FROM badges');
    
    for (const badge of allBadges) {
        if (earnedBadgeIds.includes(badge.id)) continue;
        
        let eligible = false;
        
        switch (badge.requirement_type) {
            case 'quiz_count':
                eligible = userStats.total_quizzes_taken >= badge.requirement_value;
                break;
            case 'perfect_scores':
                // Check if user has any perfect score
                const [perfectScores] = await connection.query(
                    'SELECT COUNT(*) as count FROM user_quiz_attempts WHERE user_id = ? AND percentage = 100',
                    [userId]
                );
                eligible = perfectScores[0].count >= badge.requirement_value;
                break;
            case 'weekly_streak':
                eligible = userStats.current_streak >= badge.requirement_value;
                break;
        }
        
        if (eligible) {
            await connection.query(
                'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
                [userId, badge.id]
            );
            newBadges.push(badge);
        }
    }
    
    return newBadges;
}

async function checkAndAwardTitles(connection, userId) {
    const newTitles = [];
    
    // Get user stats
    const [stats] = await connection.query(
        'SELECT * FROM user_quiz_stats WHERE user_id = ?',
        [userId]
    );
    
    const userStats = stats[0];
    
    // Get already earned titles
    const [earnedTitles] = await connection.query(
        'SELECT title_id FROM user_titles WHERE user_id = ?',
        [userId]
    );
    const earnedTitleIds = earnedTitles.map(t => t.title_id);
    
    // Check all titles
    const [allTitles] = await connection.query('SELECT * FROM titles');
    
    for (const title of allTitles) {
        if (earnedTitleIds.includes(title.id)) continue;
        
        let eligible = false;
        
        switch (title.requirement_type) {
            case 'total_score':
                eligible = userStats.total_points_earned >= title.requirement_value;
                break;
            case 'perfect_scores':
                const [perfectScores] = await connection.query(
                    'SELECT COUNT(*) as count FROM user_quiz_attempts WHERE user_id = ? AND percentage = 100',
                    [userId]
                );
                eligible = perfectScores[0].count >= title.requirement_value;
                break;
            case 'categories_completed':
                const [categoriesCompleted] = await connection.query(
                    'SELECT COUNT(DISTINCT category_id) as count FROM user_quiz_attempts WHERE user_id = ?',
                    [userId]
                );
                eligible = categoriesCompleted[0].count >= title.requirement_value;
                break;
        }
        
        if (eligible) {
            await connection.query(
                'INSERT INTO user_titles (user_id, title_id) VALUES (?, ?)',
                [userId, title.id]
            );
            newTitles.push(title);
        }
    }
    
    return newTitles;
}

function getPreviousDate(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

module.exports = router;