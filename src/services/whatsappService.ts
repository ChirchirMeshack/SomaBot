/**
 * WhatsApp Service - formats messages and mocks sending
 */

import dotenv from 'dotenv';
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
 * Mock sending a WhatsApp message
 * @param message - WhatsAppMessage object
 * @returns Promise resolving to a mock success response
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