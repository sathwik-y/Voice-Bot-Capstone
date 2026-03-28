# Quick Start Guide

Get the Voice-Based College Academic Assistant running in 5 minutes.

## 1. Install Dependencies
```bash
npm install
```

## 2. Configure Environment

Create/edit `.env.local`:
```bash
# n8n webhook URL (already configured)
N8N_WEBHOOK_URL=https://n8n.sathwiky.dev/webhook/capstone-voice

# JWT Secret
JWT_SECRET=your-secret-key-change-this-in-production-use-a-long-random-string

# Gemini API Key (RECOMMENDED - get from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your-gemini-api-key-here
```

### Get Gemini API Key (Recommended)
1. Visit https://aistudio.google.com/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy and paste into `.env.local`

**Note**: Works without Gemini API key, but query understanding will be less accurate.

## 3. Start Development Server
```bash
npm run dev
```

Server starts at: http://localhost:3000

## 4. Test the Application

### Option A: Login with Existing Account
1. Navigate to http://localhost:3000
2. Login with:
   - Roll Number: `VU22CSEN0101112`
   - Password: (check database or create new account)

### Option B: Register New Account
1. Click "Register"
2. Enter any roll number (must match MongoDB data for queries to work)
3. Create password
4. Login

## 5. Try Some Queries

### Via Voice
1. Click the microphone button 🎙️
2. Allow microphone access
3. Speak: "What is my CGPA?"
4. Listen to the response

### Via Text
Type in the input box:
- "What is my CGPA?"
- "What courses do I have?"
- "What's my attendance?"

### Try Informal Queries (New Feature!)
- "GPA?"
- "How much did I attend ML?"
- "Courses?"

### Try Semantic Queries (ZERO Keywords!)
- "How am I doing?" → Understands you want CGPA
- "How are my academics?" → Gives full summary
- "Am I scoring well?" → Checks your CGPA
- "What am I studying?" → Lists your courses

Watch the green box show how your query was understood!

## 6. View Conversation History
1. Click "Show Conversation History" button
2. See all past queries and responses
3. Click "Hide" to collapse

## What to Expect

### ✅ Working Features
- User registration and login
- Voice input (speech-to-text)
- Text input
- Intelligent query understanding (with Gemini)
- AI responses based on your data
- Voice output (text-to-speech)
- Conversation history
- Query suggestions

### 🎯 Cool New Features
- **Informal Language**: Say "GPA?" instead of full questions
- **Abbreviations**: "ML" → "Machine Learning"
- **Typo Handling**: Misspellings are corrected
- **Understanding Feedback**: See how queries were interpreted
- **Confidence Scores**: Know how certain the system is

### 🔍 Understanding Feedback
When you ask a question, you'll see:
```
You said: "GPA?"

Understood as: cgpa (85% confident)
"What is my CGPA?"
```

This shows:
- Original query
- Detected intent
- Confidence level
- Normalized query

## Troubleshooting

### "Speech recognition not supported"
➡️ Use Chrome or Edge browser

### "Microphone access denied"
➡️ Grant permission in browser settings

### Queries not being understood
➡️ Check that GEMINI_API_KEY is set in `.env.local`
➡️ Restart server after adding the key

### No response from AI
➡️ Check n8n webhook URL is correct
➡️ Verify n8n workflow is active
➡️ Check MongoDB connection

### Server won't start
```bash
# Kill any existing Node processes
# Then restart
npm run dev
```

## Testing Tools

### Check Database Contents
```bash
node scripts/check-db.js
```

### Test Query Understanding
```bash
npx tsx scripts/test-query-understanding.ts
```

## File Structure

```
Capstone/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Login, register, logout
│   │   ├── voice/query/  # Main query endpoint
│   │   └── conversations/# History endpoint
│   ├── dashboard/        # Main UI
│   ├── login/            # Login page
│   └── register/         # Registration page
├── lib/
│   ├── auth.ts           # JWT & bcrypt utilities
│   ├── db.ts             # SQLite helpers
│   └── gemini.ts         # NEW: Query understanding
├── scripts/              # Testing utilities
├── data/                 # SQLite database
└── .env.local            # Configuration
```

## Next Steps

1. **Read** `IMPROVEMENTS.md` - See all new features
2. **Read** `TESTING_GUIDE.md` - Comprehensive testing
3. **Read** `SETUP_GEMINI.md` - Detailed Gemini setup
4. **Update** n8n workflow (optional) - Use `Capstone-n8n-enhanced.json`

## Demo Checklist

Before demoing:
- [ ] Server running at http://localhost:3000
- [ ] n8n workflow active and responding
- [ ] Gemini API key configured (recommended)
- [ ] Test login works
- [ ] Test at least one query
- [ ] Voice input working
- [ ] Conversation history visible

## Support

For issues:
1. Check server console logs
2. Check browser console (F12)
3. Review `TESTING_GUIDE.md`
4. Check `IMPROVEMENTS.md` for feature details

## Key URLs

- **App**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Register**: http://localhost:3000/register
- **Dashboard**: http://localhost:3000/dashboard (requires login)

---

**Ready to go!** 🚀

The app is now enhanced with intelligent query understanding. Try asking questions in natural, informal language and see how well it understands you!
