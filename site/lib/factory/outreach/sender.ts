import {
  listDueOutreachMessages,
  listSuppressions,
  markOutreachMessage,
  markProspectContacted,
} from './store';

export interface OutreachDispatchResult {
  sent: number;
  dryRun: number;
  failed: number;
  skipped: number;
}

function unsubscribeUrl(email: string): string | null {
  const base = process.env.FACTORY_OUTREACH_UNSUBSCRIBE_BASE;
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set('email', email);
  return url.toString();
}

export async function dispatchDueOutreach(options: {
  live: boolean;
  limit?: number;
  now?: Date;
}): Promise<OutreachDispatchResult> {
  const due = await listDueOutreachMessages(
    options.limit ?? 20,
    options.now ?? new Date(),
    options.live ? ['queued', 'dry_run'] : ['queued'],
  );
  const suppressed = new Set(
    (await listSuppressions()).map((email) => email.toLowerCase()),
  );
  const result: OutreachDispatchResult = {
    sent: 0,
    dryRun: 0,
    failed: 0,
    skipped: 0,
  };

  if (!options.live) {
    for (const message of due) {
      if (!message.email || suppressed.has(message.email.toLowerCase())) {
        await markOutreachMessage(message.id, 'canceled');
        result.skipped += 1;
        continue;
      }
      await markOutreachMessage(message.id, 'dry_run');
      result.dryRun += 1;
    }
    return result;
  }

  if (process.env.FACTORY_OUTREACH_LIVE !== 'true') {
    throw new Error('FACTORY_OUTREACH_LIVE must be true for live dispatch');
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FACTORY_OUTREACH_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and FACTORY_OUTREACH_FROM_EMAIL are required');
  }

  for (const message of due) {
    const email = message.email;
    if (!email || suppressed.has(email.toLowerCase())) {
      await markOutreachMessage(message.id, 'canceled');
      result.skipped += 1;
      continue;
    }
    const unsubscribe = unsubscribeUrl(email);
    if (!unsubscribe || !message.body.includes('{{unsubscribeUrl}}')) {
      await markOutreachMessage(message.id, 'failed', {
        error: 'unsubscribe_url_missing',
      });
      result.failed += 1;
      continue;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: message.subject,
        text: message.body.replace('{{unsubscribeUrl}}', unsubscribe),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      await markOutreachMessage(message.id, 'failed', {
        error: error.slice(0, 300),
      });
      result.failed += 1;
      continue;
    }

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
    };
    await markOutreachMessage(message.id, 'sent', {
      providerId: data.id,
      sentAt: new Date(),
    });
    await markProspectContacted(message.prospectId);
    result.sent += 1;
  }

  return result;
}
