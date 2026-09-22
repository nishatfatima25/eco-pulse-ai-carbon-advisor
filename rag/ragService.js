require('dotenv').config();
const VectorStore = require('./vectorStore');
const path = require('path');

let GoogleGenerativeAI = null;
try {
    GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (err) {}

class RAGService {
    constructor() {
        this.vectorStore = new VectorStore();
        this.vectorStore.load();
    }

    /**
     * Constructs a targeted semantic search query from user's emission percentages.
     * percentages format: [Electricity%, Cylinder/LPG%, Travel%, Food%]
     */
    buildQueryFromFootprint(footprintData) {
        const { percentages = [25, 25, 25, 25], footprint = 500 } = footprintData;
        const categories = [
            { name: "Electricity & Grid Power", pct: percentages[0] || 0, keyword: "electricity energy appliance air conditioner solar" },
            { name: "LPG & Cooking Gas", pct: percentages[1] || 0, keyword: "LPG cooking cylinder pressure cooker induction" },
            { name: "Transportation & Travel", pct: percentages[2] || 0, keyword: "transportation car driving vehicle flight public transit" },
            { name: "Dietary & Food", pct: percentages[3] || 0, keyword: "diet meat food waste plant-based vegetarian" }
        ];

        // Sort by highest emission category
        categories.sort((a, b) => b.pct - a.pct);

        // Top 2 emission drivers form our semantic query
        const topCategories = categories.slice(0, 2);
        const queryText = topCategories.map(c => c.keyword).join(" ");
        
        return {
            queryText,
            topCategoryName: topCategories[0].name,
            topCategoryPct: Math.round(topCategories[0].pct)
        };
    }

    async getRecommendations(footprintData) {
        const { queryText, topCategoryName, topCategoryPct } = this.buildQueryFromFootprint(footprintData);
        
        // 1. Semantic Retrieval (Top-K = 3)
        const retrievedChunks = await this.vectorStore.similaritySearch(queryText, 3);

        if (!retrievedChunks || retrievedChunks.length === 0) {
            return {
                status: "insufficient_context",
                message: "No relevant sustainability documents were found in the knowledge base.",
                recommendationsMarkdown: "Insufficient context in knowledge base.",
                sources: []
            };
        }

        // Prepare context text and sources metadata
        const contextText = retrievedChunks.map((c, i) => `[Source ${i + 1}: ${c.metadata.title} (Chunk ${c.metadata.chunkIndex})]\n${c.text}`).join("\n\n");
        const sources = retrievedChunks.map(c => ({
            title: c.metadata.title,
            file: c.metadata.sourceFile,
            chunk: c.metadata.chunkIndex,
            snippet: c.text.substring(0, 150) + "...",
            similarityScore: parseFloat((c.score * 100).toFixed(1))
        }));

        // 2. Concise Prompt Engineering to ensure clean, untruncated completion
        const systemPrompt = `You are EcoPulse AI, a concise Sustainability Advisor.
Using ONLY the retrieved knowledge context below, write 3 brief, complete recommendations for a user whose highest emission category is ${topCategoryName} (${topCategoryPct}%).

RETRIEVED CONTEXT:
${contextText}

CONCISE INSTRUCTIONS:
- Write exactly 3 short, complete bullet points (1-2 sentences each).
- Cite the source at the end of each bullet (e.g. [Source 1]).
- Keep recommendations under 30 words per bullet point so the response is fully completed.

REQUIRED FORMAT:
### 🌿 Key Carbon Reduction Recommendations
- **Action 1**: Short recommendation text... [Source 1]
- **Action 2**: Short recommendation text... [Source 2]
- **Action 3**: Short recommendation text... [Source 3]

### 💡 Expected Impact
1 short sentence summarizing expected carbon savings.`;

        // 3. Clean environment variable key
        const rawApiKey = process.env.GEMINI_API_KEY || '';
        const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, '');
        
        if (!GoogleGenerativeAI) {
            try { GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI; } catch (e) {}
        }

        if (GoogleGenerativeAI && apiKey && apiKey.length > 10 && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            const modelsToTry = [
                "gemini-3.6-flash",
                "gemini-1.5-flash",
                "gemini-1.5-flash-8b",
                "gemini-2.0-flash-exp"
            ];
            
            for (const modelName of modelsToTry) {
                for (let attempt = 1; attempt <= 2; attempt++) {
                    try {
                        const genAI = new GoogleGenerativeAI(apiKey);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        
                        const result = await model.generateContent({
                            contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
                        });

                        const generatedText = result.response ? result.response.text() : null;
                        if (generatedText && generatedText.trim().length > 50) {
                            return {
                                status: "success",
                                query: queryText,
                                topCategory: topCategoryName,
                                recommendationsMarkdown: generatedText,
                                sources: sources,
                                groundingConfidence: `High (Retrieval Augmented - ${modelName})`
                            };
                        }
                    } catch (err) {
                        if (err.message.includes("503") && attempt === 1) {
                            await new Promise(r => setTimeout(r, 1000));
                            continue;
                        }
                        console.warn(`[RAGService] Gemini Model '${modelName}' notice:`, err.message);
                        break;
                    }
                }
            }
        }

        // 4. Grounded Rule-Based Fallback
        const chunk1Text = retrievedChunks[0] ? retrievedChunks[0].text : "Optimize highest emission sources.";
        const chunk2Text = retrievedChunks[1] ? retrievedChunks[1].text : "Switch to energy efficient alternatives.";
        
        const fallbackMarkdown = `### 🌿 Key Carbon Reduction Recommendations (Grounded Context)

- **Target ${topCategoryName}**: Based on your footprint analysis, ${topCategoryName.toLowerCase()} is your largest contributor (${topCategoryPct}%).
- **Direct Action**: ${chunk1Text.substring(0, 180)}... [Source 1]
- **Secondary Optimization**: ${chunk2Text.substring(0, 180)}... [Source 2]

> *Note: Running in local offline RAG mode.*`;

        return {
            status: "success_fallback",
            query: queryText,
            topCategory: topCategoryName,
            recommendationsMarkdown: fallbackMarkdown,
            sources: sources,
            groundingConfidence: "Medium (Direct Chunk Extraction)"
        };
    }
}

module.exports = RAGService;
