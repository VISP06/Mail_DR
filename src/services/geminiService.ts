import { Email, EmailCategory, EmailSummary, ReadFirstItem, RagCitation, CategorySource } from '../types';
import { UNCATEGORIZED_CATEGORY_ID } from '../constants/app';

export interface CategorizeResult {
  emailId: string;
  categoryId: string;
  categorySource: CategorySource;
}

export async function categorizeEmailsApi(
  emails: Email[],
  categories: EmailCategory[],
  onProgress?: (processed: number, total: number) => void
): Promise<CategorizeResult[]> {
  if (emails.length === 0) return [];

  const validCategoryIds = new Set(categories.map((c) => c.id));
  const results: CategorizeResult[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: batch.map((e) => ({
            id: e.id,
            senderName: e.senderName,
            senderEmail: e.senderEmail,
            subject: e.subject,
            snippet: e.snippet,
          })),
          categories: categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
          })),
          uncategorizedId: UNCATEGORIZED_CATEGORY_ID,
        }),
      });

      if (!res.ok) {
        throw new Error(`Categorization failed (${res.status})`);
      }

      const data = await res.json();
      const assignments = data.assignments || [];

      for (const email of batch) {
        const match = assignments.find((a: any) => a.emailId === email.id);
        if (match && validCategoryIds.has(match.categoryId)) {
          results.push({
            emailId: email.id,
            categoryId: match.categoryId,
            categorySource: (match.categorySource as CategorySource) || 'ai',
          });
        } else {
          results.push({
            emailId: email.id,
            categoryId: UNCATEGORIZED_CATEGORY_ID,
            categorySource: 'fallback',
          });
        }
      }
    } catch (err) {
      console.warn('Batch categorization error, applying safe fallback:', err);
      // On any failure or unknown value, assign "Uncategorized" with source "fallback". NEVER default to the first category.
      for (const email of batch) {
        results.push({
          emailId: email.id,
          categoryId: UNCATEGORIZED_CATEGORY_ID,
          categorySource: 'fallback',
        });
      }
      throw err;
    }

    onProgress?.(results.length, emails.length);
  }

  return results;
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

export async function getReadFirstSuggestionsApi(emails: Email[]): Promise<ReadFirstItem[]> {
  try {
    const res = await fetch('/api/ai/read-first', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    });

    if (!res.ok) {
      throw new Error(`Read-first suggestions failed (${res.status})`);
    }

    const data = await res.json();
    return data.suggestions || [];
  } catch (err) {
    console.warn('API read-first unavailable, picking top unread items:', err);
    return emails
      .filter((e) => e.isUnread)
      .slice(0, 4)
      .map((e) => ({
        emailId: e.id,
        reason: `Unread note from ${e.senderName}: "${e.subject}"`,
      }));
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
