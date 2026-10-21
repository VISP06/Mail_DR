import { Email, EmailCategory, EmailSummary, RagCitation, CategorySource } from '../types';
import { UNCATEGORIZED_CATEGORY_ID } from '../constants/app';

export interface CategorizeResult {
  emailId: string;
  categoryId: string;
  categorySource: CategorySource;
}

export interface CategorizeResponse {
  results: CategorizeResult[];
  failedCount: number;
  lastError: string | null;
  plainReason: string | null;
}

export function toPlainCategorizeReason(status?: number | null, rawReason?: string | null): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet';
  }

  const s = status || 0;
  const r = (rawReason || '').toLowerCase();

  if (s === 429 || r.includes('quota') || r.includes('resource_exhausted') || r.includes('rate limit') || r.includes('too many requests')) {
    return 'AI service limit reached';
  }
  if (s === 408 || s === 504 || r.includes('timeout') || r.includes('timed out') || r.includes('abort')) {
    return "AI service didn't respond";
  }
  if (s === 502 || r.includes('parse') || r.includes('json') || r.includes('unexpected') || r.includes('format')) {
    return 'AI returned an unexpected answer';
  }
  if (r.includes('failed to fetch') || r.includes('network') || r.includes('no internet') || r.includes('econnrefused')) {
    return 'No internet';
  }
  if (s === 503 || s === 500 || r.includes('unavailable') || r.includes('server error')) {
    return 'AI service unavailable';
  }

  return rawReason || 'AI service error';
}

export async function categorizeEmailsApi(
  emails: Email[],
  categories: EmailCategory[],
  onProgress?: (processed: number, total: number) => void
): Promise<CategorizeResponse> {
  if (emails.length === 0) {
    return { results: [], failedCount: 0, lastError: null, plainReason: null };
  }

  const validCategoryIds = new Set(categories.map((c) => c.id));
  const results: CategorizeResult[] = [];
  const BATCH_SIZE = 20;
  let failedCount = 0;
  let lastError: string | null = null;
  let plainReason: string | null = null;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    try {
      // 20-second timeout per batch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          emails: batch.map((e) => ({
            id: e.id,
            sender: `${e.senderName} <${e.senderEmail}>`,
            subject: e.subject,
            bodyExcerpt: (e.bodyText || e.snippet || '').slice(0, 300),
          })),
          categories: categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
          })),
          uncategorizedId: UNCATEGORIZED_CATEGORY_ID,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let reason = res.statusText || 'Request failed';
        let googleErrorReason: string | null = null;
        try {
          const errData = await res.json();
          if (errData?.error) {
            reason = errData.error;
            googleErrorReason = errData.error;
          }
        } catch {
          // ignore
        }
        console.error('[Categorize] Batch failed:', { status: res.status, reason });
        failedCount += batch.length;
        lastError = `${res.status}${googleErrorReason || reason ? ` (${googleErrorReason || reason})` : ''}`;
        plainReason = toPlainCategorizeReason(res.status, googleErrorReason || reason);

        for (const email of batch) {
          results.push({
            emailId: email.id,
            categoryId: UNCATEGORIZED_CATEGORY_ID,
            categorySource: 'fallback',
          });
        }
      } else {
        const data = await res.json();
        const assignments: any[] = data.assignments || [];
        const mapping: Record<string, string> = data.mapping || {};

        for (const email of batch) {
          const found = assignments.find((a: any) => a.emailId === email.id);
          const chosenCatId = found?.categoryId || mapping[email.id];

          // Validate the result (unknown ids are ignored)
          if (chosenCatId && validCategoryIds.has(chosenCatId) && chosenCatId !== UNCATEGORIZED_CATEGORY_ID) {
            results.push({
              emailId: email.id,
              categoryId: chosenCatId,
              categorySource: 'ai',
            });
          } else {
            results.push({
              emailId: email.id,
              categoryId: UNCATEGORIZED_CATEGORY_ID,
              categorySource: 'fallback',
            });
          }
        }
      }
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const reason = isTimeout ? 'Timeout after 20s' : err?.message || 'Network error';
      const status = isTimeout ? 408 : 0;
      console.error('[Categorize] Batch failed:', { status, reason });
      failedCount += batch.length;
      lastError = status > 0 ? `${status} (${reason})` : reason;
      plainReason = toPlainCategorizeReason(status, reason);

      for (const email of batch) {
        results.push({
          emailId: email.id,
          categoryId: UNCATEGORIZED_CATEGORY_ID,
          categorySource: 'fallback',
        });
      }
    }

    onProgress?.(results.length, emails.length);
  }

  return { results, failedCount, lastError, plainReason };
}

export async function summarizeEmailApi(email: Email): Promise<EmailSummary> {
  try {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      throw new Error(`Summarize failed (${res.status})`);
    }

    const data = await res.json();
    return {
      summary: data.summary || 'Summary unavailable.',
      actionNeeded: data.actionNeeded,
      deadline: data.deadline,
    };
  } catch (err) {
    console.warn('API summarize unavailable, generating fallback summary:', err);
    return {
      summary: `${email.senderName} sent an email regarding "${email.subject}". ${email.snippet}`,
      actionNeeded: email.subject.toLowerCase().includes('action') || email.subject.toLowerCase().includes('review')
        ? 'Review details and respond if needed.'
        : undefined,
      deadline: email.bodyText.toLowerCase().includes('deadline') || email.bodyText.toLowerCase().includes('due')
        ? 'Check email for specific date'
        : undefined,
    };
  }
}


export async function embedTextsApi(texts: string[]): Promise<number[][]> {
  try {
    const res = await fetch('/api/ai/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });

    if (!res.ok) {
      throw new Error(`Embedding request failed (${res.status})`);
    }

    const data = await res.json();
    return data.embeddings || [];
  } catch (err) {
    console.warn('API embedding failed, using local semantic hash:', err);
    return texts.map((t) => {
      const vec = new Array(64).fill(0);
      for (let i = 0; i < t.length; i++) {
        vec[t.charCodeAt(i) % 64] += 1;
      }
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
      return vec.map((v) => v / norm);
    });
  }
}

export async function ragChatApi(
  query: string,
  retrievedEmails: Email[]
): Promise<{ answer: string; citations: RagCitation[] }> {
  try {
    const res = await fetch('/api/ai/rag-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, retrievedEmails }),
    });

    if (!res.ok) {
      throw new Error(`RAG chat request failed (${res.status})`);
    }

    const data = await res.json();
    return {
      answer: data.answer || "I couldn't find that in your emails.",
      citations: data.citations || [],
    };
  } catch (err) {
    console.warn('API RAG chat failed:', err);
    if (retrievedEmails.length > 0) {
      const top = retrievedEmails[0];
      return {
        answer: `From your email with ${top.senderName} regarding "${top.subject}": ${top.snippet} [1]`,
        citations: [{ id: top.id, subject: top.subject, senderName: top.senderName, index: 1 }],
      };
    }
    return {
      answer: "I couldn't find that in your emails.",
      citations: [],
    };
  }
}
