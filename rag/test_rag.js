const RAGService = require('./ragService');
require('dotenv').config();

async function testRAG() {
    console.log("=== Testing EcoPulse RAG Engine ===");
    const ragService = new RAGService();

    // Sample user footprint where travel is 55%, electricity is 25%, LPG is 10%, food is 10%
    const mockUserFootprint = {
        footprint: 720,
        percentages: [25, 10, 55, 10]
    };

    console.log("User input footprint:", mockUserFootprint);
    console.log("\nExecuting RAG retrieval and generation...");
    
    const response = await ragService.getRecommendations(mockUserFootprint);
    
    console.log("\n--- RAG RESPONSE STATUS ---", response.status);
    console.log("Primary Category:", response.topCategory);
    console.log("Grounding Confidence:", response.groundingConfidence);
    console.log("Retrieved Sources Count:", response.sources.length);
    console.log("\n--- GENERATED MARKDOWN RECOMMENDATIONS ---");
    console.log(response.recommendationsMarkdown);
    
    console.log("\n--- RETRIEVED SOURCES & CHUNKS ---");
    response.sources.forEach((s, i) => {
        console.log(`[Source ${i + 1}] Title: ${s.title} | Chunk: ${s.chunk} | Match Score: ${s.similarityScore}%`);
        console.log(`          Snippet: "${s.snippet}"\n`);
    });

    console.log("=== RAG Test Successfully Executed ===");
}

testRAG().catch(console.error);
