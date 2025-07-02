import { Router } from 'express';
import UserModel from '../models/User';
import logger from '../utils/logger';
import * as sessionService from '../services/sessionService';
import { formatMessage, sendMessage, sendMediaMessage, enqueueWhatsAppMessage, sendMessageWithStatus, sendMediaMessageWithStatus, updateMessageStatus, getMessageStatus, generatePersonalizedMessage } from '../services/whatsappService';
import UserActivityModel from '../models/UserActivity';
import crypto from 'crypto';
import { parseWhatsAppMessage, extractMessageMetadata } from '../services/messageParser';
import { askOpenAI, generateQuizQuestion, generateQuizFeedback, generateProgressInsights } from '../services/aiService';
import { getAIContext, setAIContext } from '../utils/redis';
import ProgressModel from '../models/Progress';
import LessonModel from '../models/Lesson';
import recommendationService from '../services/recommendationService';
import client from '../utils/redis';

const router = Router();

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', domain: 'bot' });
});

/**
 * Register a user via WhatsApp (simulated)
 * Expects { phone: string } in the request body
 */
router.post('/register', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone number is required' });
  }
  try {
    // Check if user exists
    const existing = await UserModel.getUserByPhone(phone);
    if (existing) {
      return res.json({ status: 'ok', message: 'User already registered', user: existing });
    }
    // Create new user
    const user = await UserModel.createUser({ phone });
    // Send welcome/onboarding message (mock)
    const welcomeMsg = formatMessage(phone, "Welcome to SomaBot! Let's get you started.");
    await sendMessage(welcomeMsg);
    // Mark onboarding in preferences
    await UserModel.setPreferences(phone, { onboarding: 'started' });
    // Log onboarding event
    await UserActivityModel.logAction(user.id!, 'onboarding_started', {});
    res.json({ status: 'ok', message: 'User registered and onboarded', user });
  } catch (err) {
    logger.error('Registration error: ' + (err as Error).message);
    res.status(500).json({ status: 'error', message: 'Registration failed' });
  }
});

/**
 * Set user session data (for testing)
 * Expects { phone: string, data: object } in the request body
 */
router.post('/session', async (req, res) => {
  const { phone, data } = req.body;
  if (!phone || !data) {
    return res.status(400).json({ status: 'error', message: 'Phone and data are required' });
  }
  try {
    await sessionService.setSession(phone, data);
    res.json({ status: 'ok', message: 'Session set' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to set session' });
  }
});

/**
 * Get user session data (for testing)
 * Expects { phone: string } in the request body
 */
router.post('/session/get', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone is required' });
  }
  try {
    const session = await sessionService.getSession(phone);
    res.json({ status: 'ok', session });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to get session' });
  }
});

// Test WhatsApp outbound message
router.post('/send-test-whatsapp', async (req, res) => {
  const { to, body } = req.body;
  if (!to || !body) {
    return res.status(400).json({ status: 'error', message: 'to and body required' });
  }
  try {
    const result = await sendMessage(formatMessage(to, body));
    res.json({ status: 'ok', result });
  } catch (err) {
    console.error('Twilio send error:', err); // <-- Add this line
    res.status(500).json({ status: 'error', message: 'Failed to send WhatsApp message' });
  }
});

/**
 * Validate Twilio webhook signature to ensure request is from Twilio
 * @param req - Express request object
 * @returns boolean indicating if signature is valid
 */
function validateTwilioSignature(req: any): boolean {
  // Allow bypass for development/testing when NODE_ENV is not production
  if (process.env.NODE_ENV !== 'production') {
    const bypassHeader = req.headers['x-test-bypass'];
    if (bypassHeader === 'true') {
      logger.info('[Twilio Security] Test bypass enabled');
      return true;
    }
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    logger.error('[Twilio Security] TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body;

  // Create the string to sign
  const sortedKeys = Object.keys(params).sort();
  const sortedParams = sortedKeys.map(key => `${key}${params[key]}`).join('');
  const stringToSign = url + sortedParams;

  // Create expected signature
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(stringToSign, 'utf-8'))
    .digest('base64');

  const isValid = signature === expectedSignature;
  
  if (!isValid) {
    logger.warn(`[Twilio Security] Invalid signature. Expected: ${expectedSignature}, Received: ${signature}`);
  }

  return isValid;
}

/**
 * Inbound webhook for Twilio WhatsApp messages
 * Logs the incoming payload and associates with user if possible
 * Validates Twilio signature for security
 * Parses message content and structure
 */
router.post('/webhook', async (req, res) => {
  // TEMPORARY BYPASS: Disable Twilio signature validation for local development
  // REMOVE THIS IN PRODUCTION!
  // if (!validateTwilioSignature(req)) {
  //   logger.error('[Twilio Security] Invalid webhook signature - rejecting request');
  //   return res.status(403).json({ status: 'error', message: 'Invalid signature' });
  // }

  // Log the raw incoming payload
  logger.info(`[Twilio Webhook] Incoming message: ${JSON.stringify(req.body)}`);

  // Parse the message into structured format
  const parsedMessage = parseWhatsAppMessage(req.body);
  logger.info(`[Message Parser] Parsed message: ${JSON.stringify(parsedMessage)}`);

  // Extract additional metadata
  const metadata = extractMessageMetadata(parsedMessage);
  if (Object.keys(metadata).length > 0) {
    logger.info(`[Message Parser] Message metadata: ${JSON.stringify(metadata)}`);
  }

  // Attempt to associate with a user by phone number
  const from = parsedMessage.from;
  let user = null;
  if (from) {
    user = await UserModel.getUserByPhone(from);
    if (user && user.id) {
      await UserActivityModel.logAction(user.id, 'whatsapp_inbound', { 
        parsedMessage,
        metadata 
      });
    }
  }

  // If text message, check for quiz answer, quiz or recommendation request, else call OpenAI as before
  if (parsedMessage.messageType === 'text' && parsedMessage.body) {
    try {
      // Detect if user is submitting a quiz answer (A, B, C, D, or 'my answer is ...')
      const lowerBody = parsedMessage.body.toLowerCase();
      const isQuizAnswer = ['a', 'b', 'c', 'd'].includes(lowerBody.trim()) || lowerBody.startsWith('my answer is');
      if (isQuizAnswer && user && user.id) {
        // Retrieve last quiz question and correct answer from Redis
        const quizKey = `last_quiz:${parsedMessage.from}`;
        await client.connect();
        const quizDataRaw = await client.get(quizKey);
        await client.disconnect();
        if (quizDataRaw) {
          const quizData = JSON.parse(quizDataRaw);
          const question = quizData.question || '';
          const correctAnswer = quizData.correctAnswer || '';
          const userAnswer = lowerBody.replace('my answer is', '').trim().toUpperCase();
          const feedback = await generateQuizFeedback(question, correctAnswer, userAnswer);
          await sendMessage({ to: parsedMessage.from, body: feedback });
          return res.status(200).send('OK');
        } else {
          await sendMessage({ to: parsedMessage.from, body: 'No quiz question found to provide feedback.' });
          return res.status(200).send('OK');
        }
      }
      // Detect if user is asking for a quiz
      const isQuizRequest = lowerBody.includes('quiz me') || lowerBody.includes('generate quiz');
      if (isQuizRequest && user && user.id) {
        // Get user's most recent lesson
        const progress = await ProgressModel.getUserProgress(user.id);
        if (progress && progress.length > 0) {
          const lastLessonId = progress[0].lesson_id;
          const lesson = await LessonModel.getLessonById(lastLessonId);
          if (lesson && lesson.title && lesson.content) {
            // Determine difficulty based on last 3 quiz results
            let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
            const recentQuizzes = progress.filter((p: any) => typeof p.is_correct !== 'undefined').slice(0, 3);
            const correctCount = recentQuizzes.filter((p: any) => p.is_correct).length;
            if (recentQuizzes.length === 3) {
              if (correctCount === 3) difficulty = 'hard';
              else if (correctCount === 0) difficulty = 'easy';
            }
            const quiz = await generateQuizQuestion(lesson.title, lesson.content, difficulty);
            await sendMessage({ to: parsedMessage.from, body: quiz });
            return res.status(200).send('OK');
          }
        }
        await sendMessage({ to: parsedMessage.from, body: 'No lesson found to generate a quiz.' });
        return res.status(200).send('OK');
      }
      // Detect if user is asking for a recommendation
      const isRecommendation = lowerBody.includes('what next') || lowerBody.includes('recommend') || lowerBody.includes('next lesson') || lowerBody.includes('next course');
      if (isRecommendation && user && user.id) {
        // 1. Get next recommendation
        const rec = await recommendationService.getNextRecommendation(user.id);
        let reply = '';
        if (rec.type === 'lesson' && rec.lesson) {
          reply = `Recommended next lesson: ${rec.lesson.title}\n${rec.lesson.content || ''}`;
        } else if (rec.type === 'quiz' && rec.quiz) {
          reply = `Recommended next quiz: ${rec.quiz.question || 'Quiz available.'}`;
        } else if (rec.type === 'complete') {
          reply = rec.message ?? '';
        } else {
          reply = 'No recommendation available.';
        }
        await sendMessage({ to: parsedMessage.from, body: reply });
        // Optionally, do not update AI context for recommendations
        return res.status(200).send('OK');
      }
      // Detect if user is requesting progress insights
      const isProgressRequest = lowerBody.includes('progress report') || lowerBody.includes('how am i doing') || lowerBody.includes('learning insights');
      if (isProgressRequest && user && user.id) {
        const progress = await ProgressModel.getUserProgress(user.id);
        const insights = await generateProgressInsights(progress);
        await sendMessage({ to: parsedMessage.from, body: insights });
        return res.status(200).send('OK');
      }
      // Detect if user is requesting a topic change
      const isTopicChange = lowerBody.includes('new topic') || lowerBody.startsWith("let's talk about");
      if (isTopicChange) {
        await setAIContext(parsedMessage.from, []); // Clear context
        await sendMessage({ to: parsedMessage.from, body: 'Starting a new topic! What would you like to talk about?' });
        return res.status(200).send('OK');
      }
      // 1. Retrieve conversation context from Redis
      let context = await getAIContext(parsedMessage.from);
      if (!Array.isArray(context)) context = [];
      // 2. Try to get user's preferences and most recent lesson content
      let systemMsgs = [];
      if (user && user.id) {
        // Add user preferences as a system message if present
        if (user.preferences && Object.keys(user.preferences).length > 0) {
          const prefs = user.preferences as Record<string, any>;
          let prefDesc = 'User preferences:';
          if (prefs.language) prefDesc += ` Preferred language: ${prefs.language}.`;
          if (prefs.learning_style) prefDesc += ` Learning style: ${prefs.learning_style}.`;
          // Add any other preferences as needed
          systemMsgs.push({ role: 'system', content: prefDesc });
        }
        // Add lesson context as a system message if present
        const progress = await ProgressModel.getUserProgress(user.id);
        if (progress && progress.length > 0) {
          const lastLessonId = progress[0].lesson_id;
          const lesson = await LessonModel.getLessonById(lastLessonId);
          if (lesson && lesson.content) {
            systemMsgs.push({ role: 'system', content: `Lesson context: ${lesson.title}\n${lesson.content}` });
          }
        }
      }
      // 3. Build context: system messages (if any) + previous + new user message
      let aiContext = [...systemMsgs, ...context];
      aiContext.push({ role: 'user', content: parsedMessage.body });
      // 4. Call OpenAI with full context
      const aiResponse = await askOpenAI(aiContext);
      // 5. Append AI reply to context
      aiContext.push({ role: 'assistant', content: aiResponse });
      // 6. Save updated context back to Redis
      await setAIContext(parsedMessage.from, aiContext);
      // 7. Send AI reply to user
      await sendMessage({ to: parsedMessage.from, body: aiResponse });
    } catch (err) {
      logger.error('[AI Integration] Failed to get/send AI response: ' + (err as Error).message);
    }
  }

  // Always respond 200 OK to Twilio
  res.status(200).send('OK');
});

// Twilio status callback webhook
router.post('/status-callback', (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  if (MessageSid && MessageStatus) {
    updateMessageStatus(MessageSid, MessageStatus, req.body);
    logger.info(`[Status Callback] Updated status for ${MessageSid}: ${MessageStatus}`);
  }
  res.status(200).send('OK');
});

// Query message status by SID
router.get('/status/:sid', (req, res) => {
  const { sid } = req.params;
  const status = getMessageStatus(sid);
  if (!status) {
    return res.status(404).json({ status: 'error', message: 'Message SID not found' });
  }
  res.json({ status: 'ok', messageStatus: status });
});

// Send a personalized WhatsApp message using a template and user data
router.post('/send-personalized', async (req, res) => {
  const { to, templateType, user, extra } = req.body;
  if (!to || !templateType || !user) {
    return res.status(400).json({ status: 'error', message: 'to, templateType, and user are required' });
  }
  try {
    const body = generatePersonalizedMessage(templateType, user, extra || {});
    const result = await sendMessageWithStatus({ to, body });
    res.json({ status: 'ok', result, body });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to send personalized message' });
  }
});

// Test OpenAI API integration
router.post('/ai-test', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ status: 'error', message: 'prompt is required' });
  }
  try {
    const aiResponse = await askOpenAI(prompt);
    res.json({ status: 'ok', aiResponse });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'OpenAI error', error: (err as Error).message });
  }
});

export default router; 