const express = require('express');
const router = express.Router();
const RAGService = require('../rag/ragService');

const ragService = new RAGService();

/**
 * POST /api/ai/recommendations
 * Input: { footprint: number, percentages: [elec%, lpg%, travel%, food%] }
 * Output: { status, query, topCategory, recommendationsMarkdown, sources, groundingConfidence }
 */
router.post('/recommendations', async (req, res) => {
    try {
        const { footprint, percentages } = req.body;

        if (!percentages || !Array.isArray(percentages)) {
            return res.status(400).json({
                error: "Invalid input: 'percentages' array [electricity%, lpg%, travel%, food%] is required."
            });
        }

        const result = await ragService.getRecommendations({ footprint, percentages });
        return res.json(result);
    } catch (error) {
        console.error("[AIRoutes] Error generating RAG recommendations:", error);
        return res.status(500).json({
            error: "Failed to generate AI recommendations",
            details: error.message
        });
    }
});

module.exports = router;
