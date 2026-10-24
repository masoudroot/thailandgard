import {
  OutreachPolicySchema,
  OutreachStepSchema,
  type OutreachContext,
  type OutreachPlan,
  type OutreachPolicy,
  type OutreachStep,
  type Prospect,
} from './contracts';

function unsubscribeLine(): string {
  return 'Unsubscribe: {{unsubscribeUrl}}';
}

function signature(): string {
  return 'ThailandGard editorial team';
}

function stepOne(prospect: Prospect): { subject: string; body: string } {
  const hook = prospect.notes?.trim() || 'your Thailand travel coverage';
  return {
    subject: `Resource idea for ${prospect.domain}`,
    body: [
      'Hi,',
      '',
      'I write for ThailandGard, a Persian-language travel publication focused on practical Thailand guides.',
      '',
      `I found ${prospect.url} while researching ${hook}. Would you be open to a short conversation about a resource swap or a guest contribution?`,
      '',
      'If this is not relevant, reply "no" and I will not follow up.',
      '',
      signature(),
      '',
      unsubscribeLine(),
    ].join('\n'),
  };
}

function stepTwo(prospect: Prospect): { subject: string; body: string } {
  return {
    subject: `Re: Resource idea for ${prospect.domain}`,
    body: [
      'Hi,',
      '',
      `I am following up on my note about ${prospect.domain}.`,
      '',
      'If a resource swap is not a fit, I would still value a pointer to the right person on your team.',
      '',
      signature(),
      '',
      unsubscribeLine(),
    ].join('\n'),
  };
}

function stepThree(prospect: Prospect): { subject: string; body: string } {
  return {
    subject: `Closing the loop — ${prospect.domain}`,
    body: [
      'Hi,',
      '',
      `I will close the loop on ${prospect.domain} for now.`,
      '',
      'If you would like to revisit a resource swap later, just reply to this email.',
      '',
      signature(),
      '',
      unsubscribeLine(),
    ].join('\n'),
  };
}

export function buildOutreachSteps(
  prospect: Prospect,
  policy: OutreachPolicy,
  now: Date,
): OutreachStep[] {
  const builders = [stepOne, stepTwo, stepThree];
  return builders.slice(0, policy.maxSteps).map((builder, index) =>
    OutreachStepSchema.parse({
      step: index + 1,
      ...builder(prospect),
      scheduledAt: new Date(
        now.getTime() + index * policy.minDaysBetweenSteps * 86_400_000,
      ).toISOString(),
    }),
  );
}

export function canContact(
  prospect: Prospect,
  context: OutreachContext,
): { allowed: boolean; reason: string } {
  if (prospect.status === 'suppressed' || prospect.status === 'lost') {
    return { allowed: false, reason: `status:${prospect.status}` };
  }
  if (prospect.status === 'won' || prospect.status === 'replied') {
    return { allowed: false, reason: `status:${prospect.status}` };
  }
  if (context.policy.requireEmail && !prospect.contactEmail) {
    return { allowed: false, reason: 'missing_email' };
  }
  if (prospect.contactEmail && context.suppressions.has(prospect.contactEmail)) {
    return { allowed: false, reason: 'suppressed_email' };
  }
  if (prospect.relevance < context.policy.minRelevance) {
    return { allowed: false, reason: 'low_relevance' };
  }

  const history = context.history.get(prospect.id);
  const lastContacted = history?.lastContactedAt ?? prospect.lastContactedAt;
  if (lastContacted) {
    const elapsedDays =
      (context.now.getTime() - Date.parse(lastContacted)) / 86_400_000;
    if (elapsedDays < context.policy.minDaysBetweenSteps) {
      return { allowed: false, reason: 'contacted_recently' };
    }
  }

  if (context.sentLast24h >= context.policy.maxPerDay) {
    return { allowed: false, reason: 'daily_cap' };
  }

  return { allowed: true, reason: 'eligible' };
}

export function planOutreach(
  prospects: Prospect[],
  context: OutreachContext,
): OutreachPlan {
  const policy = OutreachPolicySchema.parse(context.policy);
  const remaining = Math.max(0, policy.maxPerDay - context.sentLast24h);
  const planned: OutreachPlan['planned'] = [];
  const skipped: OutreachPlan['skipped'] = [];

  for (const prospect of [...prospects].sort(
    (a, b) => b.relevance - a.relevance,
  )) {
    if (planned.length >= remaining) {
      skipped.push({ domain: prospect.domain, reason: 'daily_cap' });
      continue;
    }
    const decision = canContact(prospect, {
      ...context,
      policy,
      sentLast24h: context.sentLast24h + planned.length,
    });
    if (!decision.allowed) {
      skipped.push({ domain: prospect.domain, reason: decision.reason });
      continue;
    }
    planned.push({
      prospectId: prospect.id,
      domain: prospect.domain,
      steps: buildOutreachSteps(prospect, policy, context.now),
    });
  }

  return { planned, skipped };
}
