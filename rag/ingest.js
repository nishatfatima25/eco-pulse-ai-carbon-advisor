const fs = require('fs');
const path = require('path');
const { chunkText } = require('./chunker');
const VectorStore = require('./vectorStore');
require('dotenv').config();

async function runIngestion() {
    console.log("=== Starting EcoPulse RAG Knowledge Base Ingestion ===");
    
    const kbDir = path.join(__dirname, '../data/knowledge_base');
    if (!fs.existsSync(kbDir)) {
        console.error(`Error: Knowledge base directory not found at ${kbDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(kbDir).filter(file => file.endsWith('.md'));
    console.log(`Found ${files.length} knowledge base documents:`, files);

    const vectorStore = new VectorStore();

    for (const file of files) {
        const filePath = path.join(kbDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Chunk document into ~400 character chunks with 50 char overlap
        const chunks = chunkText(content, 400, 50);
        console.log(`Processing '${file}' -> ${chunks.length} chunks generated.`);

        for (let i = 0; i < chunks.length; i++) {
            await vectorStore.addDocument(chunks[i], {
                sourceFile: file,
                chunkIndex: i + 1,
                title: file.replace('.md', '').replace('_', ' ').toUpperCase()
            });
        }
    }

    await vectorStore.save();
    console.log("=== Ingestion Successfully Completed ===");
}

if (require.main === module) {
    runIngestion().catch(console.error);
}

module.exports = { runIngestion };
