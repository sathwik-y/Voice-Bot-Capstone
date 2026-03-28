/**
 * Live System Test - Tests actual API with real credentials
 * This simulates what happens when a user interacts with the system
 */

const https = require('https');
const http = require('http');

// Simple fetch wrapper
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const rawHeaders = res.headers;
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: {
            get: (name) => {
              const lower = name.toLowerCase();
              return rawHeaders[lower];
            },
            raw: rawHeaders
          },
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  rollNumber: 'VU22CSEN0101112',
  password: 'sathwik982'
};

// Test queries covering different scenarios
const TEST_QUERIES = [
  // Semantic queries (ZERO keywords)
  { query: "How am I doing?", expectedIntent: "cgpa", type: "SEMANTIC" },
  { query: "How are my academics?", expectedIntent: "general_status", type: "SEMANTIC" },
  { query: "Am I scoring well?", expectedIntent: "cgpa", type: "SEMANTIC" },
  { query: "What am I studying?", expectedIntent: "courses", type: "SEMANTIC" },

  // Traditional queries (with keywords)
  { query: "What is my CGPA?", expectedIntent: "cgpa", type: "TRADITIONAL" },
  { query: "What courses do I have?", expectedIntent: "courses", type: "TRADITIONAL" },

  // Informal queries
  { query: "GPA?", expectedIntent: "cgpa", type: "INFORMAL" },
  { query: "Courses?", expectedIntent: "courses", type: "INFORMAL" },
];

let authToken = null;

async function login() {
  console.log('\n🔐 Step 1: Authenticating...');
  console.log(`   User: ${TEST_USER.rollNumber}`);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    // Extract cookie
    const cookies = response.headers.get('set-cookie');
    if (cookies && typeof cookies === 'string') {
      const tokenMatch = cookies.match(/token=([^;]+)/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
      }
    } else if (Array.isArray(cookies)) {
      const tokenCookie = cookies.find(c => c.includes('token='));
      if (tokenCookie) {
        const tokenMatch = tokenCookie.match(/token=([^;]+)/);
        if (tokenMatch) {
          authToken = tokenMatch[1];
        }
      }
    }

    const data = await response.json();
    console.log('   ✅ Login successful!');
    console.log(`   User: ${data.user.rollNumber}`);
    return true;
  } catch (error) {
    console.error('   ❌ Login failed:', error.message);
    return false;
  }
}

async function testQuery(queryObj) {
  const { query, expectedIntent, type } = queryObj;

  console.log(`\n📝 Testing: "${query}"`);
  console.log(`   Type: ${type}`);
  console.log(`   Expected Intent: ${expectedIntent}`);

  try {
    const response = await fetch(`${BASE_URL}/api/voice/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`   🎯 Detected Intent: ${data.intent}`);
    console.log(`   📊 Confidence: ${Math.round(data.confidence * 100)}%`);
    console.log(`   🔄 Normalized: "${data.normalizedQuery}"`);
    if (data.reasoning) {
      console.log(`   💭 Reasoning: ${data.reasoning}`);
    }
    console.log(`   💬 Response: "${data.response}"`);

    // Verify intent matches expected
    if (data.intent === expectedIntent) {
      console.log('   ✅ Intent matches expected!');
    } else {
      console.log(`   ⚠️  Intent mismatch! Expected: ${expectedIntent}, Got: ${data.intent}`);
    }

    return {
      success: true,
      intentMatch: data.intent === expectedIntent,
      data
    };
  } catch (error) {
    console.error('   ❌ Query failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 LIVE SYSTEM TEST - Voice Academic Assistant');
  console.log('═══════════════════════════════════════════════════════════');

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Test queries
  console.log('\n\n🔬 Step 2: Testing Query Understanding...');
  console.log('═══════════════════════════════════════════════════════════');

  const results = {
    total: TEST_QUERIES.length,
    successful: 0,
    intentMatches: 0,
    failed: 0
  };

  for (const queryObj of TEST_QUERIES) {
    const result = await testQuery(queryObj);

    if (result.success) {
      results.successful++;
      if (result.intentMatch) {
        results.intentMatches++;
      }
    } else {
      results.failed++;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Step 3: Summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:           ${results.total}`);
  console.log(`Successful Queries:    ${results.successful} / ${results.total}`);
  console.log(`Intent Matches:        ${results.intentMatches} / ${results.total}`);
  console.log(`Failed:                ${results.failed}`);
  console.log(`Success Rate:          ${Math.round((results.successful / results.total) * 100)}%`);
  console.log(`Intent Accuracy:       ${Math.round((results.intentMatches / results.total) * 100)}%`);

  if (results.successful === results.total && results.intentMatches === results.total) {
    console.log('\n🎉 ALL TESTS PASSED! System working perfectly!');
  } else if (results.successful === results.total) {
    console.log('\n✅ All queries succeeded, some intent mismatches');
  } else {
    console.log('\n⚠️  Some tests failed - check errors above');
  }

  console.log('═══════════════════════════════════════════════════════════');
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
