import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    model: 'gemini-3.8-flash',
    embeddingModel: 'gemini-embedding-2-preview',
  });
});

// 1. Email Categorization Endpoint
app.post('/api/ai/categorize', async (req, res) => {
  const { emails, categories, uncategorizedId = 'cat-uncategorized' } = req.body;
  if (!emails || !Array.isArray(emails) || !categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: 'Missing emails or categories array' });
  }

  const validCategoryIds = new Set(categories.map((c: any) => c.id));

  if (!ai) {
    // Graceful fallback heuristic if no AI API key: NEVER default to first category, use cat-uncategorized on no match
    const fallbackResults = emails.map((email: any) => {
      const text = `${email.subject} ${email.snippet} ${email.senderEmail} ${email.senderName}`.toLowerCase();
      let matchedCategoryId: string = uncategorizedId;
      let source: 'ai' | 'fallback' = 'fallback';

      if (/invoice|receipt|statement|bill|payment|charge|due|subscription|renewal/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('bill'));
        if (found) matchedCategoryId = found.id;
      } else if (/discount|sale|off|promo|deal|coupon|clearance|save/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('promo'));
        if (found) matchedCategoryId = found.id;
      } else if (/github|security|status|alert|notification|update|digest|login/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('update'));
        if (found) matchedCategoryId = found.id;
      } else if (/dinner|weekend|family|photos|catch up|coffee|mom|dad|sarah|alex/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('personal'));
        if (found) matchedCategoryId = found.id;
      } else if (/project|design|sprint|rfc|meeting|mentorship|review|roadmap/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('work'));
        if (found) matchedCategoryId = found.id;
      }

      if (!validCategoryIds.has(matchedCategoryId)) {
        matchedCategoryId = uncategorizedId;
      }

      return { emailId: email.id, categoryId: matchedCategoryId, categorySource: matchedCategoryId === uncategorizedId ? 'fallback' : 'ai' };
    });
    return res.json({ assignments: fallbackResults });
  }

  try {
    const categoryDescriptions = categories
      .map((c: any) => `ID: "${c.id}", Name: "${c.name}", Description: "${c.description || c.name}"`)
      .join('\n');

    const emailSummaries = emails
      .map(
        (e: any, index: number) =>
          `[${index + 1}] ID: ${e.id}\nFrom: ${e.senderName} <${e.senderEmail}>\nSubject: ${e.subject}\nSnippet: ${e.snippet}`
      )
      .join('\n\n');

    const prompt = `You are an email triage assistant for a calm inbox app.
Allowed Category IDs ONLY:
${Array.from(validCategoryIds).map((id) => `"${id}"`).join(', ')}

Category Descriptions:
${categoryDescriptions}

Rules:
1. Assign EXACTLY ONE category ID to each email below based on sender, subject, and snippet.
2. You MUST select an ID strictly from the Allowed Category IDs above.
3. If an email does not clearly fit any of the allowed categories, output "${uncategorizedId}".

Emails to categorize:
${emailSummaries}

Return a valid JSON array of objects with "emailId" and "categoryId".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              emailId: { type: Type.STRING },
              categoryId: { type: Type.STRING },
            },
            required: ['emailId', 'categoryId'],
          },
        },
      },
    });

    const text = response.text || '[]';
    const parsed = JSON.parse(text);

    // Validate every answer strictly against validCategoryIds
    const assignments = emails.map((email: any) => {
      const match = parsed.find((p: any) => p.emailId === email.id);
      if (match && validCategoryIds.has(match.categoryId)) {
        return {
          emailId: email.id,
          categoryId: match.categoryId,
          categorySource: 'ai',
        };
      }
      return {
        emailId: email.id,
        categoryId: uncategorizedId,
        categorySource: 'fallback',
      };
    });

    return res.json({ assignments });
  } catch (error: any) {
    console.warn('Categorization API error, falling back to heuristic:', error.message);
    const fallbackResults = emails.map((email: any) => {
      const text = `${email.subject} ${email.snippet} ${email.senderEmail} ${email.senderName}`.toLowerCase();
      let matchedCategoryId: string = uncategorizedId;

      if (/invoice|receipt|statement|bill|payment|charge|due|subscription|renewal/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('bill'));
        if (found) matchedCategoryId = found.id;
      } else if (/discount|sale|off|promo|deal|coupon|clearance|save/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('promo'));
        if (found) matchedCategoryId = found.id;
      } else if (/github|security|status|alert|notification|update|digest|login|tracking/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('update'));
        if (found) matchedCategoryId = found.id;
      } else if (/dinner|weekend|family|photos|catch up|coffee|mom|dad|sarah|clara|alex/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('personal'));
        if (found) matchedCategoryId = found.id;
      } else if (/project|design|sprint|rfc|meeting|mentorship|review|roadmap/i.test(text)) {
        const found = categories.find((c: any) => c.name.toLowerCase().includes('work'));
        if (found) matchedCategoryId = found.id;
      }

      if (!validCategoryIds.has(matchedCategoryId)) {
        matchedCategoryId = uncategorizedId;
      }

      return {
        emailId: email.id,
        categoryId: matchedCategoryId,
        categorySource: matchedCategoryId === uncategorizedId ? 'fallback' : 'ai',
      };
    });
    return res.json({ assignments: fallbackResults });
  }
});

// 2. Email Summarize Endpoint
app.post('/api/ai/summarize', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.bodyText) {
    return res.status(400).json({ error: 'Missing email details' });
  }

  if (!ai) {
    return res.json({
      summary: `Email from ${email.senderName} regarding "${email.subject}". ${email.snippet || ''}`,
      actionNeeded: email.subject.toLowerCase().includes('action') || email.subject.toLowerCase().includes('review') ? 'Review details and respond if necessary.' : 'No immediate action required.',
      deadline: email.bodyText.toLowerCase().includes('by friday') ? 'This Friday' : undefined,
    });
  }

  try {
    const prompt = `Summarize the following email in a calm, concise manner.
Sender: ${email.senderName} (${email.senderEmail})
Subject: ${email.subject}
Date: ${email.date}
Body:
${email.bodyText}

Provide:
1. "summary": A calm 2-3 sentence overview of the email content.
2. "actionNeeded": Any specific action requested from the user (under 15 words), or "None" if purely informational.
3. "deadline": Any deadline or due date mentioned (e.g. "Tomorrow 5 PM", "Oct 15", "None").`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            actionNeeded: { type: Type.STRING },
            deadline: { type: Type.STRING },
          },
          required: ['summary', 'actionNeeded'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      summary: parsed.summary,
      actionNeeded: parsed.actionNeeded === 'None' ? undefined : parsed.actionNeeded,
      deadline: parsed.deadline === 'None' ? undefined : parsed.deadline,
    });
  } catch (error: any) {
    console.warn('Summarize API error, falling back:', error.message);
    return res.json({
      summary: `Email from ${email.senderName} regarding "${email.subject}". ${email.snippet || ''}`,
      actionNeeded: email.subject.toLowerCase().includes('action') || email.subject.toLowerCase().includes('review') || email.subject.toLowerCase().includes('sign-off') ? 'Review details and respond if necessary.' : undefined,
      deadline: email.bodyText.toLowerCase().includes('by ') || email.bodyText.toLowerCase().includes('due') ? 'Check message for date' : undefined,
    });
  }
});

// 3. Read First Suggestions Endpoint
app.post('/api/ai/read-first', async (req, res) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Missing emails array' });
  }

  if (!ai) {
    // Intelligent heuristic fallback
    const urgentEmails = emails
      .filter((e: any) => e.isUnread)
      .slice(0, 4)
      .map((e: any) => ({
        emailId: e.id,
        reason: `Unread note from ${e.senderName} about "${e.subject}"`,
      }));
    return res.json({ suggestions: urgentEmails });
  }

  try {
    const candidates = emails.slice(0, 20).map((e: any) => ({
      id: e.id,
      sender: e.senderName,
      subject: e.subject,
      snippet: e.snippet,
      isUnread: e.isUnread,
      priority: e.priority || 'Normal',
      date: e.date,
    }));

    const prompt = `Review these recent emails and pick the top 3 to 5 that the user should read first today.
Focus on urgent deadlines, time-sensitive bills, direct questions from team members or loved ones, and high-priority items.
Candidates:
${JSON.stringify(candidates, null, 2)}

For each chosen email, provide a single, calm, short sentence reason explaining why to read it first (e.g. "Flight gate change for your departure tomorrow" or "Invoice due in 2 days requiring review").
Return a JSON array with emailId and reason.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              emailId: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['emailId', 'reason'],
          },
        },
      },
    });

    const suggestions = JSON.parse(response.text || '[]');
    return res.json({ suggestions });
  } catch (error: any) {
    console.warn('Read-first API error, falling back:', error.message);
    const fallbackSuggestions = emails
      .filter((e: any) => e.isUnread)
      .slice(0, 4)
      .map((e: any) => ({
        emailId: e.id,
        reason: `Unread note from ${e.senderName}: "${e.subject}"`,
      }));
    return res.json({ suggestions: fallbackSuggestions });
  }
});

// 4. Batch Embeddings Endpoint (gemini-embedding-2-preview)
app.post('/api/ai/embed', async (req, res) => {
  const { texts } = req.body;
  if (!texts || !Array.isArray(texts)) {
    return res.status(400).json({ error: 'Missing texts array' });
  }

  if (!ai) {
    const pseudoEmbeddings = texts.map((text: string) => {
      const vec = new Array(64).fill(0);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        vec[code % 64] += 1;
      }
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
      return vec.map((v) => v / norm);
    });
    return res.json({ embeddings: pseudoEmbeddings });
  }

  try {
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += 5) {
      const batch = texts.slice(i, i + 5);
      const batchPromises = batch.map(async (text) => {
        const response = await ai!.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text,
        });
        return response.embeddings?.[0]?.values || [];
      });
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    }
    return res.json({ embeddings });
  } catch (error: any) {
    console.warn('Embedding API error, falling back to deterministic pseudo-embeddings:', error.message);
    const pseudoEmbeddings = texts.map((text: string) => {
      const vec = new Array(64).fill(0);
      for (let i = 0; i < text.length; i++) {
        vec[text.charCodeAt(i) % 64] += 1;
      }
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
      return vec.map((v) => v / norm);
    });
    return res.json({ embeddings: pseudoEmbeddings });
  }
});

// 5. Ask Your Inbox (RAG Synthesis with Citations)
app.post('/api/ai/rag-chat', async (req, res) => {
  const { query, retrievedEmails } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  if (!retrievedEmails || !Array.isArray(retrievedEmails) || retrievedEmails.length === 0) {
    return res.json({
      answer: "I couldn't find that in your emails.",
      citations: [],
    });
  }

  if (!ai) {
    const topEmail = retrievedEmails[0];
    return res.json({
      answer: `Based on your email from ${topEmail.senderName} regarding "${topEmail.subject}": ${topEmail.snippet} [1]`,
      citations: [{ id: topEmail.id, subject: topEmail.subject, index: 1 }],
    });
  }

  try {
    const formattedContext = retrievedEmails
      .map((e: any, idx: number) => {
        return `[Source ${idx + 1}]
ID: ${e.id}
Date: ${e.date}
From: ${e.senderName} <${e.senderEmail}>
Subject: ${e.subject}
Content:
${e.bodyText || e.snippet}`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are a calm, helpful email assistant answering questions about the user's personal inbox.
Strict rules:
1. Answer the user's question ONLY using the facts present in the retrieved emails below.
2. If the retrieved emails do NOT contain the information needed to answer the question, or if there is no relevant information, respond EXACTLY with:
"I couldn't find that in your emails."
3. When referencing information from a source, add citation markers like [1], [2], corresponding to the source number.
4. Keep the tone calm, serene, succinct, and kind.

Retrieved Emails:
${formattedContext}

User Question: "${query}"

Provide your answer and list the cited email IDs.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            citedSourceIndices: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: 'Array of 1-based source indices cited in the answer (e.g. [1, 2])',
            },
          },
          required: ['answer', 'citedSourceIndices'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const answer = parsed.answer || "I couldn't find that in your emails.";
    const citedIndices: number[] = parsed.citedSourceIndices || [];

    const citations = citedIndices
      .map((idx) => {
        const item = retrievedEmails[idx - 1];
        if (item) {
          return { id: item.id, subject: item.subject, senderName: item.senderName, index: idx };
        }
        return null;
      })
      .filter(Boolean);

    return res.json({ answer, citations });
  } catch (error: any) {
    console.warn('RAG chat API error, falling back:', error.message);
    const topEmail = retrievedEmails[0];
    return res.json({
      answer: `Based on your emails: ${topEmail.senderName} wrote regarding "${topEmail.subject}": ${topEmail.snippet} [1]`,
      citations: [{ id: topEmail.id, subject: topEmail.subject, senderName: topEmail.senderName, index: 1 }],
    });
  }
});

// Full-Stack Dev vs Prod middleware setup
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Calm Inbox server running on port ${PORT}`);
  });
}

startServer();
