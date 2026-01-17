# Voice Pipeline Setup Guide

Phase 2 is complete! Here's how to test the voice interface.

## What's Working Now

✅ **Voice Input**: Click microphone, speak your query
✅ **Speech Recognition**: Browser converts speech to text
✅ **AI Processing**: Query sent to n8n → Gemini → MongoDB
✅ **Voice Output**: Response spoken back to you
✅ **Conversation History**: All queries saved to SQLite

## Quick Setup

### 1. Configure Environment

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Update the n8n webhook URL if your n8n instance is running on a different port/host.

### 2. Import n8n Workflow

1. Open your n8n instance (http://localhost:5678)
2. Click "Import from File"
3. Select `Capstone-n8n.json`
4. Activate the workflow

The workflow includes:
- Webhook trigger (receives query + rollNumber from Next.js)
- Google Gemini AI Agent
- MongoDB tool (queries your student collection)
- Simple memory (conversation context)

### 3. Configure MongoDB in n8n

Make sure your n8n MongoDB connection points to your academic database:
- Collection: `student`
- Fields expected: `rollNumber`, `CGPA`, `attendance`, `courses`, etc.

### 4. Start the App

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Test the Voice Interface

1. **Register/Login** with a roll number that exists in your MongoDB
2. **Click the microphone** button on the dashboard
3. **Speak** a query (works best in Chrome):
   - "What is my CGPA?"
   - "What's my attendance in Database Management?"
   - "Who teaches Operating Systems?"
4. **Hear the response** spoken back to you

## How It Works

```
User speaks → Browser STT → /api/voice/query → n8n webhook
                                                     ↓
                                              Google Gemini
                                                     ↓
                                              MongoDB Query
                                                     ↓
User hears ← Browser TTS ← JSON response ← Text Response
```

## Browser Compatibility

- **Best**: Chrome/Edge (full Web Speech API support)
- **Limited**: Firefox (speech recognition may not work)
- **Not supported**: Safari (limited speech API)

## MongoDB Data Structure

Expected student document:
```json
{
  "rollNumber": "VU22CSEN0101112",
  "name": "Student Name",
  "CGPA": 8.5,
  "attendance": {
    "DBMS": 85,
    "OS": 92
  },
  "courses": [
    {
      "code": "CS301",
      "name": "Database Management Systems",
      "faculty": "Dr. Name"
    }
  ]
}
```

## Conversation History

All queries and responses are saved to `data/auth.db` in the `conversations` table:
- Linked to user via userId
- Timestamped
- Can be viewed later (Phase 4)

## Troubleshooting

**Microphone not working?**
- Check browser permissions
- Use Chrome for best compatibility
- Speak clearly after clicking

**AI not responding?**
- Check n8n workflow is active
- Verify MongoDB connection
- Check n8n execution logs

**Wrong data returned?**
- Ensure roll number in JWT matches MongoDB
- Check MongoDB query format in n8n logs

## Next: Phase 3

Phase 3 will refine the AI integration and add:
- Better context handling
- Safe fallbacks for missing data
- Query-specific optimizations
