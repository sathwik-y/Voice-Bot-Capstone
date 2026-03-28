/**
 * Test script for query understanding with Gemini
 * Run with: npx tsx scripts/test-query-understanding.ts
 */

import { understandQuery, enhanceQueryForN8N } from '../lib/gemini';

const testQueries = [
  // === ZERO-KEYWORD SEMANTIC QUERIES (The Ultimate Test!) ===
  "How am I doing?",
  "Am I scoring well?",
  "How are my academics?",
  "How's everything going?",
  "Show me my progress",
  "Am I performing okay?",
  "What's my performance?",
  "How's everything?",
  "Am I doing good?",
  "What am I studying?",

  // === Clear queries ===
  "What is my CGPA?",
  "What's my attendance in Machine Learning?",
  "Who teaches Advanced Operating Systems?",

  // === Informal/fuzzy queries ===
  "GPA?",
  "How much did I attend ML?",
  "Who's the prof for AOS?",
  "Attendance?",

  // === Misspellings and variations ===
  "Whats my cgpa",
  "attendance in machien learning",
  "faculty for advanced coding",

  // === Abbreviations ===
  "ML attendance",
  "AOS professor",
  "SNA teacher",

  // === Contextual queries (would need previous context in real usage) ===
  "What about that course?",
  "Who teaches it?",
];

async function testQueryUnderstanding() {
  console.log('🧪 Testing Query Understanding with Gemini 2.5 Flash\n');
  console.log('=' .repeat(80));

  for (const query of testQueries) {
    console.log(`\n📝 Original Query: "${query}"`);

    try {
      const understanding = await understandQuery(query);
      const enhanced = enhanceQueryForN8N(understanding, query);

      console.log(`   Intent: ${understanding.intent}`);
      console.log(`   Confidence: ${(understanding.confidence * 100).toFixed(0)}%`);
      console.log(`   Normalized: "${understanding.normalizedQuery}"`);
      console.log(`   Enhanced for n8n: "${enhanced}"`);

      if (understanding.reasoning) {
        console.log(`   Reasoning: ${understanding.reasoning}`);
      }

      if (understanding.entities.courseName) {
        console.log(`   Course detected: ${understanding.entities.courseName}`);
      }

      console.log('   ✓ Success');
    } catch (error: any) {
      console.log(`   ✗ Error: ${error.message}`);
    }

    console.log('-'.repeat(80));
  }

  console.log('\n✅ Test complete!');
}

// Run tests
testQueryUnderstanding().catch(console.error);
