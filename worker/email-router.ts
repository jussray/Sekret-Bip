const DESTINATION_EMAIL = 'sekretbip@gmail.com';

const BIP_INBOXES: Record<string, string> = {
  hello: 'general',
  founder: 'founder',
  partnerships: 'partnerships',
  support: 'support',
  parents: 'parent-support',
  safety: 'safety',
  privacy: 'privacy',
  legal: 'legal',
  security: 'security',
};

interface ForwardableEmailMessage {
  from: string;
  to: string;
  rawSize: number;
  headers: Headers;
  forward(recipient: string, headers?: Headers): Promise<void>;
  setReject(reason: string): void;
}

export default {
  async email(message: ForwardableEmailMessage): Promise<void> {
    const originalRecipient = message.to.toLowerCase().trim();
    const localPart = originalRecipient.split('@')[0];
    const category = BIP_INBOXES[localPart];

    if (!category) {
      message.setReject("Unknown Se'kret Bip email address.");
      return;
    }

    const sender = message.from.toLowerCase().trim();
    const subject = message.headers.get('subject') || '(no subject)';
    const forwardingHeaders = new Headers();

    forwardingHeaders.set('X-Bip-Category', category);
    forwardingHeaders.set('X-Bip-Original-Recipient', originalRecipient);
    forwardingHeaders.set('X-Bip-Original-Sender', sender);
    forwardingHeaders.set('X-Bip-Received-At', new Date().toISOString());

    if (category === 'safety' || category === 'security') {
      forwardingHeaders.set('X-Bip-Priority', 'urgent');
    } else if (category === 'privacy' || category === 'legal') {
      forwardingHeaders.set('X-Bip-Priority', 'important');
    } else {
      forwardingHeaders.set('X-Bip-Priority', 'normal');
    }

    console.log(
      JSON.stringify({
        event: 'bip_email_received',
        category,
        from: sender,
        to: originalRecipient,
        subject,
        size: message.rawSize,
      }),
    );

    await message.forward(DESTINATION_EMAIL, forwardingHeaders);
  },
};
