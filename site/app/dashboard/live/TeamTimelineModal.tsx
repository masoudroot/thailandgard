'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Play,
  RefreshCw,
  Star,
} from 'lucide-react';
import { Dialog } from '../../../components/dashboard/ui/dialog';
import { Collapsible } from '../../../components/dashboard/ui/collapsible';
import { Badge } from '../../../components/dashboard/ui/Badge';
import { faNum } from '../../../lib/dashboard/format';
import { TEAM_META } from '../../../lib/dashboard/team-meta';
import type { TeamName } from '../../../lib/dashboard/types';

export interface OperationEvent {
  id: string;
  cycle_id: string;
  team: string | null;
  event_type: string;
  payload: unknown;
  created_at: string;
}

type ConnState = 'connecting' | 'sse' | 'polling' | 'error';

const CONN_LABEL: Record<ConnState, string> = {
  connecting: 'در حال اتصال',
  sse: 'زنده',
  polling: 'پولینگ',
  error: 'قطع شد',
};

const EVENT_META: Record<string, { label: string; tone: 'brand' | 'success' | 'danger' | 'warning' | 'muted' }> = {
  prompt_sent: { label: 'پرامپت ارسال شد', tone: 'brand' },
  llm_response: { label: 'پاسخ مدل', tone: 'brand' },
  critic_decision: { label: 'تصمیم منتقد', tone: 'warning' },
  error: { label: 'خطا', tone: 'danger' },
  status_change: { label: 'تغییر وضعیت', tone: 'muted' },
  cycle_started: { label: 'شروع چرخه', tone: 'success' },
  cycle_finished: { label: 'پایان چرخه', tone: 'success' },
  team_started: { label: 'شروع تیم', tone: 'success' },
  team_finished: { label: 'پایان تیم', tone: 'muted' },
};

const EVENT_ICON: Record<string, typeof FileText> = {
  prompt_sent: FileText,
  llm_response: MessageSquareText,
  critic_decision: Star,
  error: AlertTriangle,
  status_change: RefreshCw,
  cycle_started: Play,
  cycle_finished: CheckCircle2,
  team_started: Play,
  team_finished: CheckCircle2,
};

const TONE_DOT: Record<string, string> = {
  brand: 'bg-brand',
  success: 'bg-success',
  danger: 'bg-destructive',
  warning: 'bg-warning',
  muted: 'bg-muted-foreground/60',
};

const timeFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** استخراج امن متن از payload با هر شکلی که داشته باشد. */
function payloadText(payload: unknown): string | null {
  if (payload == null) return null;
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    for (const key of ['prompt', 'response', 'text', 'content', 'message']) {
      const v = p[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
    return JSON.stringify(p, null, 2);
  }
  return String(payload);
}

function payloadField(payload: unknown, ...keys: string[]): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  for (const key of keys) {
    const v = p[key];
    if (typeof v === 'string' || typeof v === 'number') return String(v);
  }
  return null;
}

/** بدنه‌ی هر رویداد بر اساس نوعش. */
function EventBody({ event }: { event: OperationEvent }) {
  const payload = event.payload;

  if (event.event_type === 'prompt_sent' || event.event_type === 'llm_response') {
    const text = payloadText(payload);
    const model = payloadField(payload, 'model', 'model_name');
    return (
      <div className="mt-2 space-y-2">
        {model && <p className="text-xs text-muted-foreground">مدل: <span className="font-mono" dir="ltr">{model}</span></p>}
        {text ? (
          <Collapsible
            trigger={event.event_type === 'prompt_sent' ? 'نمایش پرامپت' : 'نمایش پاسخ کامل'}
            openLabel="بستن"
          >
            <pre
              dir="auto"
              className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs leading-6 text-card-foreground"
            >
              {text}
            </pre>
          </Collapsible>
        ) : (
          <p className="text-xs text-muted-foreground">بدون متن.</p>
        )}
      </div>
    );
  }

  if (event.event_type === 'critic_decision') {
    const score = payloadField(payload, 'score', 'rating', 'grade');
    const reason = payloadField(payload, 'reason', 'explanation', 'comment');
    const round = payloadField(payload, 'round', 'attempt');
    const verdict = payloadField(payload, 'verdict', 'decision');
    return (
      <div className="mt-2 space-y-1.5 rounded-lg bg-warning/10 p-3 text-sm leading-7">
        <p>
          امتیاز: <strong className="text-base">{score != null ? faNum(score) : 'نامشخص'}</strong>
          {verdict && <span> · {verdict}</span>}
          {round && <span className="text-muted-foreground"> · دور {faNum(round)}</span>}
        </p>
        {reason && <p className="text-xs leading-6 text-muted-foreground">{reason}</p>}
      </div>
    );
  }

  if (event.event_type === 'error') {
    const message = payloadText(payload) ?? 'خطای نامشخص';
    return (
      <p className="mt-2 rounded-lg bg-destructive/10 p-3 text-xs leading-6 text-destructive">{message}</p>
    );
  }

  const summary = payloadText(payload);
  if (!summary) return null;
  return <p className="mt-1.5 line-clamp-3 text-xs leading-6 text-muted-foreground">{summary}</p>;
}

/** یک ردیف رویداد در تایم‌لاین. */
function EventRow({ event }: { event: OperationEvent }) {
  const meta = EVENT_META[event.event_type] ?? { label: event.event_type, tone: 'muted' as const };
  const Icon = EVENT_ICON[event.event_type] ?? RefreshCw;
  return (
    <li className="relative rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-start gap-2.5">
        <span className={`mt-1 size-2.5 shrink-0 rounded-full ${TONE_DOT[meta.tone]}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-bold text-card-foreground">{meta.label}</span>
            <span className="ms-auto text-[11px] text-muted-foreground">
              {timeFmt.format(new Date(event.created_at))}
            </span>
          </div>
          <EventBody event={event} />
        </div>
      </div>
    </li>
  );
}

/**
 * مودال تایم‌لاین زنده‌ی یک تیم در چرخه‌ی جاری.
 * اول تاریخچه (JSON)، بعد SSE برای تازه‌ها؛ اگر SSE قطع شد، پولینگ هر ۵ ثانیه.
 * پرامپت‌ها فقط همین‌جا (مسیر احرازشده) دیده می‌شوند و هرگز لاگ نمی‌شوند.
 */
export default function TeamTimelineModal({
  team,
  cycleId,
  cycleRunId,
  open,
  onOpenChange,
}: {
  team: TeamName;
  cycleId: string;
  cycleRunId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [events, setEvents] = useState<OperationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [conn, setConn] = useState<ConnState>('connecting');
  const seenIds = useRef<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorRef = useRef<{ ts: string; id: string } | null>(null);

  const baseUrl = useCallback(
    (stream: boolean) => {
      const u = new URL('/api/manager/live-stream', window.location.origin);
      u.searchParams.set('cycle_id', cycleId);
      u.searchParams.set('team', team);
      if (stream) {
        u.searchParams.set('stream', '1');
        const c = cursorRef.current;
        if (c) {
          u.searchParams.set('since_ts', c.ts);
          u.searchParams.set('since_id', c.id);
        }
      } else {
        u.searchParams.set('limit', '300');
      }
      return u.toString();
    },
    [cycleId, team],
  );

  /** ادغام رویدادهای تازه (جدیدترین اول)، بدون تکرار. */
  const mergeEvents = useCallback((incoming: OperationEvent[]) => {
    if (incoming.length === 0) return;
    setEvents((prev) => {
      const fresh = incoming.filter((e) => !seenIds.current.has(e.id));
      if (fresh.length === 0) return prev;
      for (const e of fresh) seenIds.current.add(e.id);
      return [...fresh, ...prev];
    });
    const newest = incoming[incoming.length - 1];
    cursorRef.current = { ts: newest.created_at, id: newest.id };
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setConn('polling');
    const tick = async () => {
      try {
        const res = await fetch(baseUrl(false), { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.ok === false) return;
        const rows = (json?.data?.events ?? []) as OperationEvent[];
        // تاریخچه جدیدترین‌اول است؛ فقط تازه‌تر از کرسر را بردار
        const c = cursorRef.current;
        const fresh = c ? rows.filter((e) => e.created_at > c.ts || (e.created_at === c.ts && e.id > c.id)) : rows;
        mergeEvents([...fresh].reverse());
      } catch {
        /* دور بعدی */
      }
    };
    void tick();
    pollRef.current = setInterval(() => void tick(), 5000);
  }, [baseUrl, mergeEvents]);

  const connectSse = useCallback(() => {
    if (typeof EventSource === 'undefined') {
      startPolling();
      return;
    }
    setConn('connecting');
    const es = new EventSource(baseUrl(true));
    esRef.current = es;

    es.addEventListener('event', (e) => {
      try {
        const ev = JSON.parse((e as MessageEvent).data) as OperationEvent;
        if (ev?.id) mergeEvents([ev]);
      } catch {
        /* پیام خراب را رد کن */
      }
    });
    es.addEventListener('close', () => {
      // پایان عمر ۵ دقیقه‌ای اتصال: با کرسر تازه reconnect کن
      es.close();
      esRef.current = null;
      connectSse();
    });
    es.addEventListener('error', () => {
      setErrorMsg('خطا در استریم زنده.');
    });
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        esRef.current = null;
        if (!pollRef.current) startPolling();
        else setConn('polling');
      }
    };
    // پیام ready یعنی اتصال برقرار است
    es.addEventListener('ready', () => setConn('sse'));
  }, [baseUrl, mergeEvents, startPolling]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    seenIds.current = new Set();
    cursorRef.current = null;
    setEvents([]);
    setLoading(true);
    setErrorMsg('');
    setConn('connecting');

    (async () => {
      try {
        const res = await fetch(baseUrl(false), { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || json?.ok === false) {
          setErrorMsg(
            typeof json?.error?.message === 'string'
              ? json.error.message
              : 'خواندن تایم‌لاین انجام نشد؛ دوباره تلاش کنید.',
          );
          setConn('error');
          setLoading(false);
          return;
        }
        const rows = (json?.data?.events ?? []) as OperationEvent[];
        for (const e of rows) seenIds.current.add(e.id);
        if (rows.length > 0) cursorRef.current = { ts: rows[0].created_at, id: rows[0].id };
        setEvents(rows);
        setLoading(false);
        connectSse();
      } catch {
        if (cancelled) return;
        setErrorMsg('اتصال به سرور برقرار نشد.');
        setConn('error');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, baseUrl, connectSse]);

  const meta = TEAM_META[team];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`تایم‌لاین زندهٔ ${meta.faName}`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs" dir="ltr">
            {cycleRunId}
          </span>
          <Badge variant={conn === 'sse' ? 'default' : conn === 'polling' ? 'secondary' : 'outline'}>
            {conn === 'sse' && (
              <span className="relative me-1.5 inline-flex size-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
            )}
            {CONN_LABEL[conn]}
          </Badge>
          {events.length > 0 && (
            <span className="text-xs text-muted-foreground">{faNum(events.length)} رویداد</span>
          )}
        </span>
      }
      className="max-h-[85vh] max-w-2xl overflow-hidden"
    >
      <div className="max-h-[60vh] overflow-y-auto pe-1">
        {loading && (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {!loading && errorMsg && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm leading-7 text-destructive">
            {errorMsg}
          </div>
        )}
        {!loading && !errorMsg && events.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm leading-7 text-muted-foreground">
            هنوز رویدادی برای این تیم در این چرخه ثبت نشده است.
          </p>
        )}
        {!loading && events.length > 0 && (
          <ol className="space-y-3">
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ol>
        )}
      </div>
    </Dialog>
  );
}
