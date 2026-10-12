import { Email, RagCitation } from '../types';
import { embedTextsApi, ragChatApi } from './geminiService';
import { ASK_INBOX_MAX_EMBEDDINGS } from '../constants/app';

const DB_NAME = 'CalmInboxVectors';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

// In-memory fallback
const inMemoryVectorCache = new Map<string, number[]>();

// IndexedDB Helper with safe try/catch
function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('Could not open IndexedDB, using in-memory cache.');
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB exception:', e);
      resolve(null);
    }
  });
}

async function getCachedVectorFromIdb(id: string): Promise<number[] | null> {
  try {
    const db = await openDatabase();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.vector)) {
          resolve(req.result.vector);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

async function saveVectorToIdb(id: string, vector: number[]): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, vector });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    // Graceful swallow
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class RagService {
  private static instance: RagService;
  private isIndexing = false;
  private indexedCount = 0;

  static getInstance(): RagService {
    if (!RagService.instance) {
      RagService.instance = new RagService();
    }
    return RagService.instance;
  }

  getIndexingStatus() {
    return {
      isIndexing: this.isIndexing,
      indexedCount: this.indexedCount,
      memoryCacheSize: inMemoryVectorCache.size,
    };
  }

  async indexEmails(
    emails: Email[],
    onProgress?: (indexed: number, total: number) => void
  ): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;

    try {
      // "ASK YOUR INBOX" must embed only the most recent ASK_INBOX_MAX_EMBEDDINGS (200) emails
      const targetEmails = [...emails]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, ASK_INBOX_MAX_EMBEDDINGS);

      const missingEmails: Email[] = [];

      // Check cache (memory first, then IndexedDB)
      for (const email of targetEmails) {
        if (inMemoryVectorCache.has(email.id)) {
          continue;
        }
        const cached = await getCachedVectorFromIdb(email.id);
        if (cached && cached.length > 0) {
          inMemoryVectorCache.set(email.id, cached);
        } else {
          missingEmails.push(email);
        }
      }

      this.indexedCount = targetEmails.length - missingEmails.length;
      onProgress?.(this.indexedCount, targetEmails.length);

      // Embed missing emails in batches of 6
      const BATCH_SIZE = 6;
      for (let i = 0; i < missingEmails.length; i += BATCH_SIZE) {
        const batch = missingEmails.slice(i, i + BATCH_SIZE);
        const textsToEmbed = batch.map(
          (e) => `From: ${e.senderName} (${e.senderEmail})\nSubject: ${e.subject}\nSnippet: ${e.snippet}\nContent: ${e.bodyText}`
        );

        const embeddings = await embedTextsApi(textsToEmbed);

        for (let j = 0; j < batch.length; j++) {
          const email = batch[j];
          const vector = embeddings[j];
          if (vector && vector.length > 0) {
            inMemoryVectorCache.set(email.id, vector);
            await saveVectorToIdb(email.id, vector);
          }
        }

        this.indexedCount += batch.length;
        onProgress?.(this.indexedCount, targetEmails.length);
      }
    } catch (err) {
      console.warn('Indexing error:', err);
    } finally {
      this.isIndexing = false;
    }
  }

  async searchRelevantEmails(query: string, allEmails: Email[], topK = 6): Promise<Email[]> {
    if (!query.trim() || allEmails.length === 0) return [];

    // Limit to the most recent 200 emails
    const targetEmails = [...allEmails]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, ASK_INBOX_MAX_EMBEDDINGS);

    // Ensure target emails have embeddings
    await this.indexEmails(targetEmails);

    // Embed the query
    const [queryVector] = await embedTextsApi([query]);
    if (!queryVector || queryVector.length === 0) {
      // Fallback: keyword search
      const qLower = query.toLowerCase();
      return targetEmails
        .filter(
          (e) =>
            e.subject.toLowerCase().includes(qLower) ||
            e.snippet.toLowerCase().includes(qLower) ||
            e.senderName.toLowerCase().includes(qLower)
        )
        .slice(0, topK);
    }

    // Rank emails by cosine similarity
    const scored: { email: Email; score: number }[] = [];
    for (const email of targetEmails) {
      const vec = inMemoryVectorCache.get(email.id);
      if (vec) {
        const score = cosineSimilarity(queryVector, vec);
        scored.push({ email, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    // Return the top 5 to 8 most similar emails
    const count = Math.min(Math.max(topK, 5), 8);
    return scored.slice(0, count).map((item) => item.email);
  }

  async ask(
    query: string,
    allEmails: Email[]
  ): Promise<{ answer: string; citations: RagCitation[]; retrievedEmails: Email[] }> {
    const relevant = await this.searchRelevantEmails(query, allEmails, 6);

    if (relevant.length === 0) {
      return {
        answer: "I couldn't find that in your emails.",
        citations: [],
        retrievedEmails: [],
      };
    }

    const { answer, citations } = await ragChatApi(query, relevant);
    return {
      answer,
      citations,
      retrievedEmails: relevant,
    };
  }
}
