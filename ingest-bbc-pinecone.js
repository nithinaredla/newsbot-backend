require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const axios = require('axios');
const feedparser = require('feedparser-promised');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

// Configuration
const PINECONE_INDEX_NAME = 'news-articles';
const RSS_FEEDS = [
  "http://feeds.bbci.co.uk/news/world/rss.xml",
  "http://feeds.bbci.co.uk/news/business/rss.xml",
  "http://feeds.bbci.co.uk/news/technology/rss.xml",
];
const MAX_ARTICLES = 50;
const BATCH_SIZE = 50;

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

async function getJinaEmbedding(text) {
  try {
    const response = await axios.post(
      'https://api.jina.ai/v1/embeddings',
      {
        input: [text],
        model: "jina-embeddings-v2-base-en"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JINA_API_KEY}`
        },
        timeout: 30000
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Error getting Jina embedding:', error.message);
    throw error;
  }
}

async function scrapeArticle(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    return article ? article.textContent : null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
}

async function chunkText(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.substring(start, end).trim();
    
    if (chunk.length > 100) { // Only include meaningful chunks
      chunks.push(chunk);
    }
    
    start += chunkSize - overlap;
  }
  
  return chunks;
}

async function ingestArticlesToPinecone() {
  try {
    console.log('Starting BBC news ingestion to Pinecone...');

    // Create or get Pinecone index
    const indexList = await pinecone.listIndexes();
    let pineconeIndex;

    if (indexList.indexes.some(index => index.name === PINECONE_INDEX_NAME)) {
      console.log('Pinecone index already exists');
      pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);
    } else {
      console.log('Creating new Pinecone index...');
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: 768,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 60000));
      pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);
    }

    // Fetch articles from RSS feeds
    let allArticles = [];
    
    for (const feedUrl of RSS_FEEDS) {
      try {
        const articles = await feedparser.parse(feedUrl);
        allArticles = [...allArticles, ...articles.slice(0, MAX_ARTICLES)];
        
        if (allArticles.length >= MAX_ARTICLES) {
          allArticles = allArticles.slice(0, MAX_ARTICLES);
          break;
        }
      } catch (error) {
        console.error(`Error parsing feed ${feedUrl}:`, error.message);
      }
    }

    console.log(`Found ${allArticles.length} articles from RSS feeds`);

    // Process articles
    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < allArticles.length; i++) {
      const article = allArticles[i];
      console.log(`Processing article ${i + 1}/${allArticles.length}: ${article.title}`);

      try {
        const articleText = await scrapeArticle(article.link);
        
        if (!articleText) {
          console.log(`Skipping article - no content: ${article.title}`);
          continue;
        }

        // Chunk the article
        const chunks = await chunkText(articleText);
        console.log(`Created ${chunks.length} chunks for: ${article.title}`);

        // Process each chunk
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex];
          const chunkId = `${article.guid || article.link}-${chunkIndex}`;

          try {
            // Get embedding for the chunk
            const embedding = await getJinaEmbedding(chunk);

            // Prepare vector for Pinecone
            const vector = {
              id: chunkId,
              values: embedding,
              metadata: {
                title: article.title,
                url: article.link,
                authors: article.author || 'BBC News',
                date_publish: article.pubDate || new Date().toISOString(),
                text: chunk,
                chunk_id: chunkIndex,
                source: 'bbc-news',
                ingested_at: new Date().toISOString()
              }
            };

            // Upsert to Pinecone
            await pineconeIndex.upsert([vector]);
            successfulCount++;
            
            console.log(`✓ Uploaded chunk ${chunkIndex + 1}/${chunks.length} of: ${article.title}`);

            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (chunkError) {
            console.error(`Error processing chunk ${chunkIndex} of ${article.title}:`, chunkError.message);
            failedCount++;
          }
        }

      } catch (articleError) {
        console.error(`Error processing article ${article.title}:`, articleError.message);
        failedCount++;
      }

      // Delay between articles
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n=== Ingestion Summary ===');
    console.log(`Total chunks processed: ${successfulCount + failedCount}`);
    console.log(`Successfully ingested: ${successfulCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('Ingestion completed!');

  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

// Run ingestion
ingestArticlesToPinecone();