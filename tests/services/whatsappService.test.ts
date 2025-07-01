import { formatMessage, sendMessage } from '../../src/services/whatsappService';

describe('WhatsApp Service', () => {
  it('should format a message correctly', () => {
    const msg = formatMessage('+12345678901', 'Hello!');
    expect(msg).toEqual({ to: '+12345678901', body: 'Hello!' });
  });

  it('should mock send a message', async () => {
    const msg = formatMessage('+12345678901', 'Test');
    const result = await sendMessage(msg);
    expect(result).toEqual({ status: 'sent', to: '+12345678901', body: 'Test' });
  });
}); 