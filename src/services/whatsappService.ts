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