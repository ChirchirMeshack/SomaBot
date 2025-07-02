import { Router } from 'express';
import UserModel from '../models/User';
import logger from '../utils/logger';
import * as sessionService from '../services/sessionService';
import { formatMessage, sendMessage, sendMediaMessage, enqueueWhatsAppMessage, sendMessageWithStatus, sendMediaMessageWithStatus, updateMessageStatus, getMessageStatus, generatePersonalizedMessage } from '../services/whatsappService';
import UserActivityModel from '../models/UserActivity';
import crypto from 'crypto';
import { parseWhatsAppMessage, extractMessageMetadata } from '../services/messageParser';

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
  // Validate Twilio signature first
  if (!validateTwilioSignature(req)) {
    logger.error('[Twilio Security] Invalid webhook signature - rejecting request');
    return res.status(403).json({ status: 'error', message: 'Invalid signature' });
  }

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

export default router; 