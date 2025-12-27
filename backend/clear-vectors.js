require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function clearVectors() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

  console.log('Clearing all vectors from index:', process.env.PINECONE_INDEX_NAME);

  await index.deleteAll();

  console.log('All vectors deleted successfully!');
}

clearVectors().catch(console.error);
