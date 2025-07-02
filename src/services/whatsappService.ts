/**
 * WhatsApp Service - formats messages and mocks sending
 */

import dotenv from 'dotenv';
import { renderTemplate, TemplateType } from './messageTemplates';
dotenv.config();

let twilioClient: any = null;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  // Dynamically require to avoid breaking tests if not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio');
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export interface WhatsAppMessage {
  to: string;
  body: string;
}

/**
 * Format a WhatsApp message
 * @param to - recipient phone number (E.164 format)
 * @param body - message content
 * @returns WhatsAppMessage object
 */
export function formatMessage(to: string, body: string): WhatsAppMessage {
  return { to, body };
}

/**
 * Send a WhatsApp message (text only)
 * @param msg - WhatsAppMessage object
 * @returns Promise resolving to a Twilio or mock response
 */
export async function sendMessage(msg: { to: string; body: string }) {
  if (twilioClient && TWILIO_WHATSAPP_FROM) {
    // Use Twilio API
    return twilioClient.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${msg.to}`,
      body: msg.body
    });
  } else {
    // Fallback to mock
    console.log('[MOCK WHATSAPP SEND]', msg);
    return { status: 'mock', ...msg };
  }
}

/**
 * Send a WhatsApp media message via Twilio
 * @param params - { to, mediaUrl, body }
 * @returns Promise resolving to Twilio API response or mock
 */
export async function sendMediaMessage(params: { to: string; mediaUrl: string; body?: string }) {
  if (twilioClient && TWILIO_WHATSAPP_FROM) {
    // Use Twilio API
    return twilioClient.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${params.to}`,
      body: params.body,
      mediaUrl: [params.mediaUrl]
    });
  } else {
    // Fallback to mock
    console.log('[MOCK WHATSAPP MEDIA SEND]', params);
    return { status: 'mock', ...params };
  }
}

// Patch sendMessage and sendMediaMessage to record status
const originalSendMessage = sendMessage;
export async function sendMessageWithStatus(msg: { to: string; body: string }) {
  const result = await originalSendMessage(msg);
  if (result && result.sid) {
    recordMessageStatus(result.sid, msg.to, msg.body, undefined, result.status || 'sent', result);
  }
  return result;
}

const originalSendMediaMessage = sendMediaMessage;
export async function sendMediaMessageWithStatus(params: { to: string; mediaUrl: string; body?: string }) {
  const result = await originalSendMediaMessage(params);
  if (result && result.sid) {
    recordMessageStatus(result.sid, params.to, params.body, params.mediaUrl, result.status || 'sent', result);
  }
  return result;
}

/**
 * Format lesson content for WhatsApp delivery
 * Splits long text into 1000-char chunks, includes media_url if present
 */
export function formatLessonForWhatsApp(lesson: { title: string; content?: string; media_url?: string; }): { messages: string[]; media_url?: string } {
  const messages: string[] = [];
  if (lesson.title) messages.push(`*${lesson.title}*`);
  if (lesson.content) {
    for (let i = 0; i < lesson.content.length; i += 1000) {
      messages.push(lesson.content.substring(i, i + 1000));
    }
  }
  const result: { messages: string[]; media_url?: string } = { messages };
  if (lesson.media_url) result.media_url = lesson.media_url;
  return result;
}

// --- In-Memory Delivery Status Tracking ---

interface MessageStatus {
  sid: string;
  to: string;
  body?: string;
  mediaUrl?: string;
  status: string;
  timestamps: { [key: string]: string };
  raw?: any;
}

const messageStatusStore: { [sid: string]: MessageStatus } = {};

/**
 * Record a new outgoing message status
 */
export function recordMessageStatus(sid: string, to: string, body: string | undefined, mediaUrl: string | undefined, status: string, raw?: any) {
  messageStatusStore[sid] = {
    sid,
    to,
    body,
    mediaUrl,
    status,
    timestamps: { [status]: new Date().toISOString() },
    raw
  };
}

/**
 * Update the status of a message by SID
 */
export function updateMessageStatus(sid: string, status: string, raw?: any) {
  const msg = messageStatusStore[sid];
  if (msg) {
    msg.status = status;
    msg.timestamps[status] = new Date().toISOString();
    if (raw) msg.raw = raw;
  }
}

/**
 * Get the status of a message by SID
 */
export function getMessageStatus(sid: string): MessageStatus | undefined {
  return messageStatusStore[sid];
}

// --- Minimal In-Memory Message Queue System ---

interface OutgoingMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

const messageQueue: OutgoingMessage[] = [];
let queueProcessing = false;
const QUEUE_INTERVAL_MS = 1000; // 1 message per second

/**
 * Enqueue a WhatsApp message (text or media) for rate-limited sending
 * @param msg - OutgoingMessage object
 */
export function enqueueWhatsAppMessage(msg: OutgoingMessage) {
  messageQueue.push(msg);
  if (!queueProcessing) {
    startQueueProcessor();
  }
}

function startQueueProcessor() {
  queueProcessing = true;
  setInterval(async () => {
    if (messageQueue.length === 0) return;
    const msg = messageQueue.shift();
    if (!msg) return;
    try {
      if (msg.mediaUrl) {
        await sendMediaMessageWithStatus({ to: msg.to, mediaUrl: msg.mediaUrl, body: msg.body });
      } else {
        await sendMessageWithStatus({ to: msg.to, body: msg.body });
      }
      // Optionally log successful send
      console.log(`[Queue] Sent message to ${msg.to}`);
    } catch (err) {
      console.error('[Queue] Failed to send message:', err);
    }
  }, QUEUE_INTERVAL_MS);
}

/**
 * Generate a personalized WhatsApp message for a user using a template
 * @param type - Template type
 * @param user - User object (must have at least name)
 * @param extra - Additional data for template placeholders
 * @returns Rendered personalized message string
 */
export function generatePersonalizedMessage(type: TemplateType, user: { name: string; [key: string]: any }, extra: Record<string, string | number> = {}) {
  return renderTemplate(type, { name: user.name, ...user.preferences, ...extra });
} 