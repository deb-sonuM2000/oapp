// routes/quiz.js
const express = require('express');
const router = express.Router();

// Get all available quizzes
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const userId = req.query.user_id || null;

           // Use .promise() to get Promise-based interface
        const promiseDb = db.promise();
        
        const [quizzes] = await promiseDb.query(
            `SELECT q.*, 
                    COUNT(qq.id) as question_count,
                    (SELECT COUNT(*) FROM user_quiz_attempts WHERE quiz_id = q.id AND user_id = ?) as attempts_count,
                    (SELECT MAX(percentage) FROM user_quiz_attempts WHERE quiz_id = q.id AND user_id = ?) as best_score
             FROM quizzes q
             LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
             WHERE q.is_active = true
             GROUP BY q.id
             ORDER BY q.created_at DESC`,
            [userId, userId]
        );
        
        res.json({ success: true, data: quizzes });
    } catch (error) {
        console.error('Error in GET /api/quiz:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get quiz by ID with questions
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const promiseDb = db.promise();
        const quizId = req.params.id;
        
        // Get quiz details
        const [quiz] = await promiseDb.query(
            'SELECT * FROM quizzes WHERE id = ?',
            [quizId]
        );
        
        if (quiz.length === 0) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }
        
        // Get questions
        const [questions] = await promiseDb.query(
            'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order',
            [quizId]
        );
        
        res.json({
            success: true,
            data: {
                quiz: quiz[0],
                questions: questions
            }
        });
    } catch (error) {
        console.error('Error in GET /api/quiz/:id:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Submit quiz answers
router.post('/:id/submit', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const promiseDb = db.promise();
        const quizId = req.params.id;
        const { user_id, answers, time_taken } = req.body;
        
        if (!user_id || !answers) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Get quiz details
        const [quiz] = await promiseDb.query(
            'SELECT * FROM quizzes WHERE id = ?',
            [quizId]
        );
        
        if (quiz.length === 0) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }
        
        // Get all questions for this quiz
        const [questions] = await promiseDb.query(
            'SELECT * FROM quiz_questions WHERE quiz_id = ?',
            [quizId]
        );
        
        let score = 0;
        let correctCount = 0;
        const answerDetails = [];
        
        // Calculate score
        for (const question of questions) {
            const userAnswer = answers[question.id];
            const isCorrect = userAnswer === question.correct_answer;
            
            if (isCorrect) {
                score += question.points;
                correctCount++;
            }
            
            answerDetails.push({
                question_id: question.id,
                selected_answer: userAnswer,
                is_correct: isCorrect
            });
        }
        
        const totalPossible = questions.length * (quiz[0].points_per_question || 10);
        const percentage = (score / totalPossible) * 100;
        
        // Save attempt
        const [attemptResult] = await promiseDb.query(
            `INSERT INTO user_quiz_attempts 
             (user_id, quiz_id, score, total_possible, percentage, time_taken) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, quizId, score, totalPossible, percentage, time_taken]
        );
        
        const attemptId = attemptResult.insertId;
        
        // Save individual answers
        for (const answer of answerDetails) {
            await promiseDb.query(
                `INSERT INTO user_quiz_answers 
                 (attempt_id, question_id, selected_answer, is_correct) 
                 VALUES (?, ?, ?, ?)`,
                [attemptId, answer.question_id, answer.selected_answer, answer.is_correct]
            );
        }
        
        // Update user stats
        await updateUserStats(promiseDb,user_id, score, correctCount, questions.length);
        
        // Check and award badges
        const earnedBadges = await checkAndAwardBadges(promiseDb,user_id);
        
        // Update leaderboard
        await updateLeaderboard(promiseDb,user_id);
        
        res.json({
            success: true,
            data: {
                score: score,
                total_possible: totalPossible,
                percentage: percentage,
                correct_answers: correctCount,
                total_questions: questions.length,
                earned_badges: earnedBadges
            }
        });
        
    } catch (error) {
        console.error('Quiz submission error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user quiz stats
router.get('/stats/:userId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const promiseDb = db.promise();
        const userId = req.params.userId;
        
        // Get user stats
        const [stats] = await promiseDb.query(
            'SELECT * FROM user_quiz_stats WHERE user_id = ?',
            [userId]
        );
        
        // Get recent attempts
        const [recentAttempts] = await promiseDb.query(
            `SELECT uqa.*, q.title, q.title_odia 
             FROM user_quiz_attempts uqa
             JOIN quizzes q ON uqa.quiz_id = q.id
             WHERE uqa.user_id = ?
             ORDER BY uqa.completed_at DESC
             LIMIT 10`,
            [userId]
        );
        
        // Get earned badges
        const [badges] = await promiseDb.query(
            `SELECT b.*, ub.earned_at 
             FROM user_badges ub
             JOIN badges b ON ub.badge_id = b.id
             WHERE ub.user_id = ?
             ORDER BY ub.earned_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                stats: stats[0] || {
                    total_quizzes_taken: 0,
                    total_points_earned: 0,
                    correct_answers: 0,
                    total_answers: 0,
                    current_streak: 0,
                    best_streak: 0
                },
                recent_attempts: recentAttempts,
                badges: badges
            }
        });
        
    } catch (error) {
        console.error('Error in GET /api/quiz/stats/:userId:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get leaderboard
router.get('/leaderboard/top', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const promiseDb = db.promise();
        const limit = req.query.limit || 50;
        
        const [leaderboard] = await promiseDb.query(
            `SELECT user_id, user_name, total_points, quizzes_completed, accuracy
             FROM leaderboard
             ORDER BY total_points DESC
             LIMIT ?`,
            [parseInt(limit)]
        );
        
        res.json({ success: true, data: leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper functions
async function updateUserStats(promiseDb,userId, pointsEarned, correctCount, totalQuestions) {
    const today = new Date().toISOString().split('T')[0];
    
    // Get current stats
    const [currentStats] = await promiseDb.query(
        'SELECT * FROM user_quiz_stats WHERE user_id = ?',
        [userId]
    );
    
    let streak = 1;
    if (currentStats.length > 0) {
        const lastQuizDate = currentStats[0].last_quiz_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastQuizDate === yesterdayStr) {
            streak = currentStats[0].current_streak + 1;
        } else if (lastQuizDate !== today) {
            streak = 1;
        } else {
            streak = currentStats[0].current_streak;
        }
    }
    
    if (currentStats.length === 0) {
        // Insert new stats
        await promiseDb.query(
            `INSERT INTO user_quiz_stats 
             (user_id, total_quizzes_taken, total_points_earned, correct_answers, 
              total_answers, current_streak, best_streak, last_quiz_date)
             VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
            [userId, pointsEarned, correctCount, totalQuestions, streak, streak, today]
        );
    } else {
        // Update existing stats
        const newBestStreak = Math.max(streak, currentStats[0].best_streak);
        await promiseDb.query(
            `UPDATE user_quiz_stats SET
             total_quizzes_taken = total_quizzes_taken + 1,
             total_points_earned = total_points_earned + ?,
             correct_answers = correct_answers + ?,
             total_answers = total_answers + ?,
             current_streak = ?,
             best_streak = ?,
             last_quiz_date = ?
             WHERE user_id = ?`,
            [pointsEarned, correctCount, totalQuestions, streak, newBestStreak, today, userId]
        );
    }
}

async function checkAndAwardBadges(userId) {
    const earnedBadges = [];
    
    // Get user stats
    const [stats] = await promiseDb.query(
        'SELECT * FROM user_quiz_stats WHERE user_id = ?',
        [userId]
    );
    
    if (stats.length === 0) return earnedBadges;
    
    // Get all badges
    const [badges] = await promiseDb.query('SELECT * FROM badges');
    
    for (const badge of badges) {
        // Check if user already has this badge
        const [hasBadge] = await promiseDb.query(
            'SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?',
            [userId, badge.id]
        );
        
        if (hasBadge.length > 0) continue;
        
        let qualifies = false;
        
        switch (badge.requirement_type) {
            case 'quiz_count':
                qualifies = stats[0].total_quizzes_taken >= badge.requirement_value;
                break;
            case 'total_points':
                qualifies = stats[0].total_points_earned >= badge.requirement_value;
                break;
            case 'streak':
                qualifies = stats[0].best_streak >= badge.requirement_value;
                break;
        }
        
        if (qualifies) {
            await promiseDb.query(
                'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
                [userId, badge.id]
            );
            earnedBadges.push(badge);
        }
    }
    
    return earnedBadges;
}

async function updateLeaderboard(userId) {
    // Get user stats
    const [stats] = await promiseDb.query(
        'SELECT * FROM user_quiz_stats WHERE user_id = ?',
        [userId]
    );
    
    if (stats.length === 0) return;
    
    const accuracy = stats[0].total_answers > 0 
        ? (stats[0].correct_answers / stats[0].total_answers) * 100 
        : 0;
    
    // Update or insert leaderboard entry
    await promiseDb.query(
        `INSERT INTO leaderboard (user_id, user_name, total_points, quizzes_completed, accuracy)
         VALUES (?, (SELECT username FROM users WHERE id = ?), ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         total_points = VALUES(total_points),
         quizzes_completed = VALUES(quizzes_completed),
         accuracy = VALUES(accuracy)`,
        [userId, userId, stats[0].total_points_earned, stats[0].total_quizzes_taken, accuracy]
    );
    
    // Update rankings
    await promiseDb.query(`
        SET @rank = 0;
        UPDATE leaderboard 
        SET rank_position = (@rank := @rank + 1)
        ORDER BY total_points DESC;
    `);
}

module.exports = router;