/**
 * Recursive text chunker implementation for RAG pipeline.
 * Splits documents into manageable chunks with configurable overlap.
 */

function chunkText(text, chunkSize = 400, chunkOverlap = 50) {
    if (!text || text.trim().length === 0) return [];
    
    // Split text into paragraphs first (double newline or single heading)
    const sections = text.split(/\n(?=#|\n)/);
    const chunks = [];

    let currentChunk = "";

    for (const section of sections) {
        const trimmedSection = section.trim();
        if (!trimmedSection) continue;

        if ((currentChunk.length + trimmedSection.length) <= chunkSize) {
            currentChunk += (currentChunk ? "\n\n" : "") + trimmedSection;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }
            // Start new chunk with overlap from the end of the previous chunk if available
            if (currentChunk.length > chunkOverlap) {
                const overlapText = currentChunk.slice(-chunkOverlap);
                currentChunk = overlapText + "\n\n" + trimmedSection;
            } else {
                currentChunk = trimmedSection;
            }
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

module.exports = { chunkText };
