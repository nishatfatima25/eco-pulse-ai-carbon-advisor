const fs = require('fs');
const path = require('path');

let GoogleGenerativeAI = null;
try {
    GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (err) {
    // SDK will be loaded once npm install completes
}

/**
 * Lightweight, transparent Vector Store Implementation using Cosine Similarity.
 * Supports Gemini Embeddings (`text-embedding-004`) with a deterministic term-frequency vector fallback.
 */
class VectorStore {
    constructor(dbFilePath = path.join(__dirname, '../data/vectorStore.json')) {
        this.dbFilePath = dbFilePath;
        this.documents = []; // Array of { id, text, metadata, embedding }
    }

    // Cosine similarity formula: (A · B) / (||A|| * ||B||)
    static cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Generates a vector embedding for given text using Gemini API or fallback TF-IDF vectorizer.
     */
    async getEmbedding(text, apiKey = process.env.GEMINI_API_KEY) {
        if (!GoogleGenerativeAI) {
            try {
                GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
            } catch (e) {}
        }

        if (GoogleGenerativeAI && apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
                const result = await model.embedContent(text);
                if (result && result.embedding && result.embedding.values) {
                    return result.embedding.values;
                }
            } catch (err) {
                console.warn("[VectorStore] Gemini Embedding API warning, utilizing fallback vectorizer:", err.message);
            }
        }

        // Fallback: Deterministic Term-Frequency Hashing Vector (128 dimensions)
        return this.fallbackVectorize(text);
    }

    fallbackVectorize(text, dimensions = 128) {
        const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        const vector = new Array(dimensions).fill(0);
        
        for (const word of words) {
            let hash = 0;
            for (let i = 0; i < word.length; i++) {
                hash = (hash << 5) - hash + word.charCodeAt(i);
                hash |= 0;
            }
            const index = Math.abs(hash) % dimensions;
            vector[index] += 1;
        }

        // Normalize vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
    }

    async addDocument(text, metadata = {}) {
        const apiKey = process.env.GEMINI_API_KEY;
        const embedding = await this.getEmbedding(text, apiKey);
        const doc = {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            text,
            metadata,
            embedding
        };
        this.documents.push(doc);
    }

    async save() {
        const dir = path.dirname(this.dbFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.dbFilePath, JSON.stringify(this.documents, null, 2), 'utf-8');
        console.log(`[VectorStore] Saved ${this.documents.length} vectors to ${this.dbFilePath}`);
    }

    load() {
        if (fs.existsSync(this.dbFilePath)) {
            const rawData = fs.readFileSync(this.dbFilePath, 'utf-8');
            this.documents = JSON.parse(rawData);
            console.log(`[VectorStore] Loaded ${this.documents.length} vectors from ${this.dbFilePath}`);
        } else {
            console.warn(`[VectorStore] No existing vector DB file found at ${this.dbFilePath}`);
        }
    }

    /**
     * Performs Top-K similarity search against indexed vector database.
     */
    async similaritySearch(query, topK = 3) {
        if (this.documents.length === 0) {
            this.load();
        }

        if (this.documents.length === 0) {
            return [];
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const queryEmbedding = await this.getEmbedding(query, apiKey);

        const scoredDocs = this.documents.map(doc => {
            const score = VectorStore.cosineSimilarity(queryEmbedding, doc.embedding);
            return {
                text: doc.text,
                metadata: doc.metadata,
                score
            };
        });

        // Sort descending by cosine similarity score
        scoredDocs.sort((a, b) => b.score - a.score);

        return scoredDocs.slice(0, topK);
    }
}

module.exports = VectorStore;
