/**
 * Message Parser Service - Parse incoming WhatsApp messages from Twilio
 */

export interface ParsedMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  messageType: 'text' | 'media' | 'location' | 'contact' | 'unknown';
  mediaUrl?: string;
  mediaType?: string;
  timestamp: string;
  rawPayload: any;
}

export interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  Latitude?: string;
  Longitude?: string;
  Address?: string;
  ContactName?: string;
  ContactPhone?: string;
  [key: string]: any;
}

/**
 * Parse incoming Twilio webhook payload into structured message data
 * @param payload - Raw Twilio webhook payload
 * @returns ParsedMessage object with normalized data
 */
export function parseWhatsAppMessage(payload: TwilioWebhookPayload): ParsedMessage {
  // Extract basic message info
  const messageId = payload.MessageSid;
  const from = normalizePhoneNumber(payload.From);
  const to = normalizePhoneNumber(payload.To);
  const body = payload.Body || '';
  const timestamp = new Date().toISOString();

  // Determine message type based on payload content
  const messageType = determineMessageType(payload);

  // Build parsed message object
  const parsedMessage: ParsedMessage = {
    id: messageId,
    from,
    to,
    body,
    messageType,
    timestamp,
    rawPayload: payload
  };

  // Add media-specific data if present
  if (messageType === 'media' && payload.MediaUrl0) {
    parsedMessage.mediaUrl = payload.MediaUrl0;
    parsedMessage.mediaType = payload.MediaContentType0;
  }

  return parsedMessage;
}

/**
 * Normalize phone number by removing 'whatsapp:' prefix
 * @param phone - Phone number from Twilio (e.g., 'whatsapp:+12345678901')
 * @returns Normalized phone number (e.g., '+12345678901')
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace('whatsapp:', '');
}

/**
 * Determine message type based on Twilio payload content
 * @param payload - Raw Twilio webhook payload
 * @returns Message type as string
 */
function determineMessageType(payload: TwilioWebhookPayload): ParsedMessage['messageType'] {
  // Check for media content
  if (payload.MediaUrl0) {
    return 'media';
  }

  // Check for location data
  if (payload.Latitude && payload.Longitude) {
    return 'location';
  }

  // Check for contact information
  if (payload.ContactName || payload.ContactPhone) {
    return 'contact';
  }

  // Default to text if body is present
  if (payload.Body) {
    return 'text';
  }

  // Fallback for unknown message types
  return 'unknown';
}

/**
 * Extract additional metadata from parsed message
 * @param parsedMessage - Parsed message object
 * @returns Additional metadata object
 */
export function extractMessageMetadata(parsedMessage: ParsedMessage): any {
  const metadata: any = {};

  // Add message type specific metadata
  switch (parsedMessage.messageType) {
    case 'location':
      const payload = parsedMessage.rawPayload;
      metadata.location = {
        latitude: parseFloat(payload.Latitude || '0'),
        longitude: parseFloat(payload.Longitude || '0'),
        address: payload.Address
      };
      break;

    case 'contact':
      const contactPayload = parsedMessage.rawPayload;
      metadata.contact = {
        name: contactPayload.ContactName,
        phone: contactPayload.ContactPhone
      };
      break;

    case 'media':
      metadata.media = {
        url: parsedMessage.mediaUrl,
        type: parsedMessage.mediaType
      };
      break;
  }

  return metadata;
}

/**
 * Route incoming parsed WhatsApp message to the appropriate handler (minimal, logs only)
 * @param parsedMessage - ParsedMessage object
 * @param user - User object (if found)
 * @param session - Session/context object (optional)
 */
export function routeIncomingMessage(parsedMessage: ParsedMessage, user?: any, session?: any): void {
  switch (parsedMessage.messageType) {
    case 'text':
      // Example: check for commands or normal text
      if (parsedMessage.body.startsWith('/')) {
        console.log(`[Message Router] Would route to command handler: ${parsedMessage.body}`);
      } else {
        console.log(`[Message Router] Would route to AI/conversation handler: ${parsedMessage.body}`);
      }
      break;
    case 'media':
      console.log(`[Message Router] Would route to media handler: ${parsedMessage.mediaType} at ${parsedMessage.mediaUrl}`);
      break;
    case 'location':
      console.log(`[Message Router] Would route to location handler: ${JSON.stringify(parsedMessage.rawPayload)}`);
      break;
    case 'contact':
      console.log(`[Message Router] Would route to contact handler: ${JSON.stringify(parsedMessage.rawPayload)}`);
      break;
    default:
      console.log(`[Message Router] Would route to unknown handler: ${JSON.stringify(parsedMessage)}`);
  }
} 