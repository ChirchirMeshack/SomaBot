import { Router } from 'express';
import QuizModel from '../models/Quiz';
import { pool } from '../models/QuizSubmission';
import QuizSubmission from '../models/QuizSubmission';
import QuizScheduleModel from '../models/QuizSchedule';

const router = Router();

/**
 * Create a new quiz
 * Expects { lesson_id, question, options, correct_answer, explanation } in the request body
 */
router.post('/', async (req, res) => {
  try {
    const quiz = await QuizModel.createQuiz(req.body);
    res.json({ status: 'ok', quiz });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to create quiz' });
  }
});

/**
 * Get a quiz by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const quiz = await QuizModel.getQuizById(Number(req.params.id));
    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    res.json({ status: 'ok', quiz });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get quiz' });
  }
});

/**
 * Get all quizzes for a lesson
 */
router.get('/lesson/:lesson_id', async (req, res) => {
  try {
    const quizzes = await QuizModel.getQuizzesByLesson(Number(req.params.lesson_id));
    res.json({ status: 'ok', quizzes });
  } catch (err) {
    const error = err as Error;
    console.error('Quiz creation error:', error);
    res.status(500).json({ status: 'error', message: error.message, stack: error.stack });
  }
});

/**
 * Update a quiz by ID
 * Accepts { question, options, correct_answer, explanation } in the request body
 */
router.put('/:id', async (req, res) => {
  try {
    const quiz = await QuizModel.updateQuiz(Number(req.params.id), req.body);
    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    res.json({ status: 'ok', quiz });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update quiz' });
  }
});

/**
 * Delete a quiz by ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await QuizModel.deleteQuiz(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    res.json({ status: 'ok', message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to delete quiz' });
  }
});

/**
 * Submit a quiz answer
 * Expects { user_id, quiz_id, submitted_answer } in the request body
 * Allows retries: Each submission (including retries) is tracked as a separate attempt.
 */
router.post('/submit', async (req, res) => {
  const { user_id, quiz_id, submitted_answer } = req.body;
  if (!user_id || !quiz_id || !submitted_answer) {
    return res.status(400).json({ status: 'error', message: 'user_id, quiz_id, and submitted_answer are required' });
  }
  try {
    const quiz = await QuizModel.getQuizById(Number(quiz_id));
    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    const submission = await QuizSubmission.submitAnswer({ user_id, quiz_id, submitted_answer }, quiz.correct_answer);
    res.json({ status: 'ok', submission, feedback: submission.is_correct ? 'Correct!' : 'Incorrect.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to submit quiz answer' });
  }
});

/**
 * Get all quiz submissions for a user
 */
router.get('/submissions/:user_id', async (req, res) => {
  try {
    const submissions = await QuizSubmission.getUserSubmissions(Number(req.params.user_id));
    res.json({ status: 'ok', submissions });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get quiz submissions' });
  }
});

/**
 * Get feedback for a specific quiz submission
 * Returns question, options, correct answer, submitted answer, and explanation if the answer is incorrect
 */
router.get('/feedback/:submission_id', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const result = await pool.query(
      `SELECT s.*, q.question, q.options, q.correct_answer, q.explanation
       FROM quiz_submissions s
       JOIN quizzes q ON s.quiz_id = q.id
       WHERE s.id = $1`,
      [submission_id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ status: 'error', message: 'Submission not found' });
    }
    const row = result.rows[0];
    row.options = JSON.parse(row.options);
    // If the answer is incorrect, include the explanation in the feedback
    const feedback = {
      ...row,
      explanation: row.is_correct ? undefined : row.explanation
    };
    res.json({ status: 'ok', feedback });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get feedback' });
  }
});

/**
 * List all feedback for a user
 * Returns question, options, correct answer, submitted answer, and explanation if the answer is incorrect
 */
router.get('/feedback/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      `SELECT s.*, q.question, q.options, q.correct_answer, q.explanation
       FROM quiz_submissions s
       JOIN quizzes q ON s.quiz_id = q.id
       WHERE s.user_id = $1
       ORDER BY s.submitted_at DESC`,
      [user_id]
    );
    // For each feedback, include explanation only if the answer is incorrect
    const feedback = result.rows.map((row: any) => ({
      ...row,
      options: JSON.parse(row.options),
      explanation: row.is_correct ? undefined : row.explanation
    }));
    res.json({ status: 'ok', feedback });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get user feedback' });
  }
});

/**
 * Get all attempts for a quiz by a user
 * Returns all submissions (attempts) for the given user and quiz, ordered by submitted_at DESC
 */
router.get('/attempts/:user_id/:quiz_id', async (req, res) => {
  try {
    const { user_id, quiz_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM quiz_submissions WHERE user_id = $1 AND quiz_id = $2 ORDER BY submitted_at DESC`,
      [user_id, quiz_id]
    );
    res.json({ status: 'ok', attempts: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get quiz attempts' });
  }
});

/**
 * Get quiz completion analytics
 * Returns quiz_id, total_attempts, total_correct, and completion_rate for each quiz
 */
router.get('/analytics/completions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT quiz_id,
             COUNT(*) AS total_attempts,
             SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS total_correct,
             ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2) AS completion_rate
      FROM quiz_submissions
      GROUP BY quiz_id
      ORDER BY quiz_id
    `);
    res.json({ status: 'ok', completions: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get quiz completion analytics' });
  }
});

/**
 * Get most common wrong answers for each quiz
 * Returns quiz_id, wrong_answer, and count (top 3 per quiz)
 */
router.get('/analytics/wrong-answers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT quiz_id, submitted_answer AS wrong_answer, COUNT(*) AS count
      FROM quiz_submissions
      WHERE is_correct = false
      GROUP BY quiz_id, submitted_answer
      ORDER BY quiz_id, count DESC
    `);
    // Group by quiz_id and take top 3 wrong answers per quiz
    const grouped: Record<string, any[]> = {};
    for (const row of result.rows) {
      const key = String(row.quiz_id);
      if (!grouped[key]) grouped[key] = [];
      if (grouped[key].length < 3) grouped[key].push(row);
    }
    res.json({ status: 'ok', wrongAnswers: grouped });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get wrong answer analytics' });
  }
});

/**
 * Get quiz difficulty analytics
 * Returns quiz_id and percent_correct (lower = harder quiz)
 */
router.get('/analytics/difficulty', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT quiz_id,
             ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2) AS percent_correct
      FROM quiz_submissions
      GROUP BY quiz_id
      ORDER BY percent_correct ASC
    `);
    res.json({ status: 'ok', difficulty: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get quiz difficulty analytics' });
  }
});

/**
 * Get the next quiz for a user in a lesson, adapting difficulty based on user performance
 * Logic:
 *   - If user has not answered any quizzes in this lesson, serve an 'easy' quiz (if available), else any quiz not yet answered.
 *   - If user has answered quizzes, calculate percent correct:
 *       - <50%: serve 'easy' quiz not yet answered
 *       - 50-80%: serve 'medium' quiz not yet answered
 *       - >80%: serve 'hard' quiz not yet answered
 *   - If no quiz of the target difficulty is left, serve any not yet answered, else null.
 */
router.get('/next/:user_id/:lesson_id', async (req, res) => {
  try {
    const { user_id, lesson_id } = req.params;
    // Get all quizzes for the lesson
    const quizzes = await QuizModel.getQuizzesByLesson(Number(lesson_id));
    if (!quizzes.length) return res.status(404).json({ status: 'error', message: 'No quizzes found for this lesson' });
    // Get all submissions for this user and lesson
    const { rows: submissions } = await pool.query(
      `SELECT * FROM quiz_submissions WHERE user_id = $1 AND quiz_id IN (${quizzes.map(q => q.id).join(',') || 'NULL'})`,
      [user_id]
    );
    const answeredQuizIds = new Set(submissions.map((s: any) => s.quiz_id));
    // If user has not answered any, serve an easy quiz if available
    if (submissions.length === 0) {
      const easyQuiz = quizzes.find(q => (q.difficulty || 'medium') === 'easy');
      const nextQuiz = easyQuiz || quizzes.find(q => !answeredQuizIds.has(q.id));
      return res.json({ status: 'ok', nextQuiz });
    }
    // Calculate percent correct
    const correct = submissions.filter((s: any) => s.is_correct).length;
    const percent = (100 * correct) / submissions.length;
    let targetDifficulty: string;
    if (percent < 50) targetDifficulty = 'easy';
    else if (percent < 80) targetDifficulty = 'medium';
    else targetDifficulty = 'hard';
    // Find a quiz of the target difficulty not yet answered
    const nextQuiz = quizzes.find(q => (q.difficulty || 'medium') === targetDifficulty && !answeredQuizIds.has(q.id))
      || quizzes.find(q => !answeredQuizIds.has(q.id))
      || null;
    res.json({ status: 'ok', nextQuiz });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get next quiz' });
  }
});

/**
 * Schedule a quiz for a user
 * Expects { user_id, quiz_id, scheduled_time } in the request body
 */
router.post('/schedule', async (req, res) => {
  try {
    const { user_id, quiz_id, scheduled_time } = req.body;
    if (!user_id || !quiz_id || !scheduled_time) {
      return res.status(400).json({ status: 'error', message: 'user_id, quiz_id, and scheduled_time are required' });
    }
    const scheduled = await QuizScheduleModel.scheduleQuiz({ user_id, quiz_id, scheduled_time });
    res.json({ status: 'ok', scheduled });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to schedule quiz' });
  }
});

/**
 * Get all scheduled quizzes for a user
 */
router.get('/schedule/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const scheduled = await QuizScheduleModel.getScheduledQuizzes(Number(user_id));
    res.json({ status: 'ok', scheduled });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get scheduled quizzes' });
  }
});

/**
 * Trigger reminders for all users with pending (not delivered) scheduled quizzes
 * For MVP, this endpoint calculates which reminders should be sent based on how long the quiz has been pending
 * and returns a list of reminders that would be sent (mocked, no actual delivery).
 * Escalating frequency example:
 *   - 1st reminder: 1 hour after scheduled_time
 *   - 2nd reminder: 3 hours after scheduled_time
 *   - 3rd+ reminders: every 6 hours after scheduled_time
 */
router.post('/reminders/send', async (req, res) => {
  try {
    const now = new Date();
    const pending = await QuizScheduleModel.getPendingScheduledQuizzes();
    const reminders: any[] = [];
    for (const quiz of pending) {
      const scheduled = new Date(quiz.scheduled_time);
      const diffMs = now.getTime() - scheduled.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      let reminderCount = 0;
      if (diffHours >= 1) reminderCount = 1;
      if (diffHours >= 3) reminderCount = 2;
      if (diffHours >= 6) reminderCount = 3 + Math.floor((diffHours - 6) / 6);
      if (reminderCount > 0) {
        reminders.push({
          user_id: quiz.user_id,
          quiz_id: quiz.quiz_id,
          scheduled_time: quiz.scheduled_time,
          reminderCount,
          message: `Send reminder #${reminderCount} to user ${quiz.user_id} for quiz ${quiz.quiz_id}`
        });
      }
    }
    res.json({ status: 'ok', reminders });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to send quiz reminders' });
  }
});

export default router; 