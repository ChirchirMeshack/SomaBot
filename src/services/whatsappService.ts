/**
 * WhatsApp Service - formats messages and mocks sending
 */

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
export async function sendMessage(message: WhatsAppMessage): Promise<{ status: string; to: string; body: string }> {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 100));
  return {
    status: 'sent',
    to: message.to,
    body: message.body
  };
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