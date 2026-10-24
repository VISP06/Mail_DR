import { Email, EmailCategory, EmailSummary, RagCitation, CategorySource } from '../types';
import { UNCATEGORIZED_CATEGORY_ID } from '../constants/app';
import { getFirebaseIdToken } from './firebase';

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
  lastResponseStatus: number | null;
  lastContentType: string | null;
}

async function getAuthHeaders(forceRefresh = false): Promise<Record<string, string>> {
  const token = await getFirebaseIdToken(forceRefresh);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function toPlainCategorizeReason(status?: number | null, rawReason?: string | null): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet';
  }

  const s = status || 0;
  const r = (rawReason || '').toLowerCase();

  if (r.includes('sign-in error') || r.includes('sign in')) {
    return 'Sign-in error: Please sign in again';
  }
  if (
    s === 0 ||
    r.includes('failed to fetch') ||
    r.includes('network') ||
    r.includes('econnrefused') ||
    r.includes('cannot reach') ||
    r.includes("can't reach") ||
    r.includes('unreachable') ||
    r.includes('load failed')
  ) {
    return "Can't reach the AI server";
  }
  if (s === 429 || r.includes('quota') || r.includes('resource_exhausted') || r.includes('rate limit') || r.includes('too many requests')) {
    return 'AI service limit reached';
  }
  if (s === 408 || s === 504 || r.includes('timeout') || r.includes('timed out') || r.includes('abort')) {
    return "AI service didn't respond";
  }
  if (s === 502 || r.includes('parse') || r.includes('json') || r.includes('unexpected') || r.includes('format')) {
    return 'AI returned an unexpected answer';
  }
  if (s === 401 || r.includes('unauthorized') || r.includes('auth')) {
    return 'Sign-in error: Please sign in again';
  }
  if (s === 503 || s === 500 || r.includes('unavailable') || r.includes('server error')) {
    return 'AI service unavailable';
  }

  return rawReason || "Can't reach the AI server";
}

export async function categorizeEmailsApi(
  emails: Email[],
  categories: EmailCategory[],
  onProgress?: (processed: number, total: number) => void
): Promise<CategorizeResponse> {
  if (emails.length === 0) {
    return {
      results: [],
      failedCount: 0,
      lastError: null,
      plainReason: null,
      lastResponseStatus: null,
      lastContentType: null,
    };
  }

  const validCategoryIds = new Set(categories.map((c) => c.id));
  const results: CategorizeResult[] = [];
  const BATCH_SIZE = 20;
  let failedCount = 0;
  let lastError: string | null = null;
  let plainReason: string | null = null;
  let lastResponseStatus: number | null = null;
  let lastContentType: string | null = null;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    let batchSuccess = false;
    let batchErrorReason: string | null = null;
    let batchHttpStatus = 0;

    // Quiet auto-retry: retry silently up to 2 more times (after 3s and 10s)
    const retryDelays = [0, 3000, 10000];

    for (let attemptIdx = 0; attemptIdx < retryDelays.length; attemptIdx++) {
      if (attemptIdx > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelays[attemptIdx]));
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        let headers = await getAuthHeaders(false);

        const requestBody = JSON.stringify({
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
        });

        let res = await fetch('/api/ai/categorize', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: requestBody,
        });

        let currentContentType = res.headers.get('content-type') || '';
        let currentStatus = res.status;

        // On 401, fetch a fresh Firebase ID token (getIdToken(true)), retry once, then report a sign-in error
        if (currentStatus === 401) {
          const raw401Body = await res.text();
          const trimmed401 = raw401Body.trim();
          console.error('[Categorize]', {
            status: currentStatus,
            contentType: currentContentType,
            startsWithAngle: trimmed401.startsWith('<'),
            startsWithBacktick: trimmed401.startsWith('`'),
          });

          const freshToken = await getFirebaseIdToken(true);
          if (!freshToken) {
            throw new Error('Sign-in error: Please sign in again');
          }

          headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${freshToken}`,
          };

          res = await fetch('/api/ai/categorize', {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: requestBody,
          });

          currentContentType = res.headers.get('content-type') || '';
          currentStatus = res.status;

          if (currentStatus === 401) {
            const rawSecond401 = await res.text();
            const trimmedSecond401 = rawSecond401.trim();
            console.error('[Categorize]', {
              status: currentStatus,
              contentType: currentContentType,
              startsWithAngle: trimmedSecond401.startsWith('<'),
              startsWithBacktick: trimmedSecond401.startsWith('`'),
            });
            throw new Error('Sign-in error: Please sign in again');
          }
        }

        clearTimeout(timeoutId);

        batchHttpStatus = currentStatus;
        lastResponseStatus = currentStatus;
        lastContentType = currentContentType;

        // Read response body text safely to check startsWith without logging content
        const rawBody = await res.text();
        const trimmed = rawBody.trim();
        const startsWithAngle = trimmed.startsWith('<');
        const startsWithBacktick = trimmed.startsWith('`');

        // Before parsing any response from the AI server, check response.ok and the Content-Type header.
        // If the status is not ok or the type is not application/json, throw an error with the status and content type instead of calling JSON.parse.
        if (!res.ok || !currentContentType.toLowerCase().includes('application/json')) {
          console.error('[Categorize]', {
            status: currentStatus,
            contentType: currentContentType,
            startsWithAngle,
            startsWithBacktick,
          });
          throw new Error(`HTTP ${currentStatus} (${currentContentType || 'unknown type'})`);
        }

        let data: any;
        try {
          data = JSON.parse(rawBody);
        } catch {
          console.error('[Categorize]', {
            status: currentStatus,
            contentType: currentContentType,
            startsWithAngle,
            startsWithBacktick,
          });
          throw new Error(`HTTP ${currentStatus} (JSON parse error)`);
        }

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
        batchSuccess = true;
        break; // Succeeded silently, break out of retry loop
      } catch (err: any) {
        const isTimeout = err?.name === 'AbortError';
        const reason = isTimeout ? 'Timeout after 20s' : err?.message || "Can't reach the AI server";
        const status = isTimeout ? 408 : batchHttpStatus || 0;
        batchHttpStatus = status;
        batchErrorReason = reason;

        if (attemptIdx < retryDelays.length - 1) {
          console.error(
            `[Categorize] Batch ${batchIndex} attempt ${attemptIdx + 1} failed (${reason}), retrying silently in ${retryDelays[attemptIdx + 1] / 1000}s...`
          );
          continue;
        } else {
          console.error(
            `[Categorize] Batch ${batchIndex} failed permanently after ${retryDelays.length} attempts:`,
            { status, reason }
          );
        }
      }
    }

    if (!batchSuccess) {
      failedCount += batch.length;
      lastError = batchHttpStatus > 0 ? `${batchHttpStatus}${batchErrorReason ? ` (${batchErrorReason})` : ''}` : (batchErrorReason || "Can't reach the AI server");
      plainReason = toPlainCategorizeReason(batchHttpStatus, batchErrorReason);

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

  return {
    results,
    failedCount,
    lastError,
    plainReason,
    lastResponseStatus,
    lastContentType,
  };
}

export async function summarizeEmailApi(email: Email): Promise<EmailSummary> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/embed', {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/rag-chat', {
      method: 'POST',
      headers,
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
