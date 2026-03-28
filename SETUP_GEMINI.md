# Setting Up Gemini API for Query Understanding

This project uses Google's Gemini 2.5 Flash model to provide intelligent query understanding, which allows users to ask questions in natural, informal language.

## Why Gemini?

The Gemini preprocessing layer helps with:
- **Informal language**: "GPA?" → "What is my CGPA?"
- **Abbreviations**: "ML attendance" → "What is my attendance in Machine Learning?"
- **Misspellings**: "machien learning" → "Machine Learning"
- **Context awareness**: "Who teaches that course?" (uses previous conversation context)
- **Intent extraction**: Understands whether you're asking about CGPA, attendance, faculty, etc.

## Getting Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## Configuration

1. Open `.env.local` in the project root
2. Add your API key:
   ```bash
   GEMINI_API_KEY=your-api-key-here
   ```
3. Restart the development server:
   ```bash
   npm run dev
   ```

## Fallback Behavior

If no API key is provided, the system will use basic keyword matching as a fallback. However, this won't be as accurate as the Gemini-powered understanding.

## Testing Query Understanding

You can test the query understanding without the UI:

```bash
# Install tsx if not already installed
npm install -g tsx

# Run the test script
npx tsx scripts/test-query-understanding.ts
```

This will test various query types and show how they're normalized and understood.

## API Costs

Gemini 2.5 Flash is extremely affordable:
- **Free tier**: 15 requests per minute
- **Paid tier**: $0.075 per 1M input tokens, $0.30 per 1M output tokens

For a typical query (50 tokens input, 100 tokens output), the cost is approximately **$0.00003** per query.

For 1000 queries, that's about **$0.03** (3 cents).

## Model Information

- **Model**: `gemini-2.5-flash`
- **Purpose**: Fast, efficient reasoning for query normalization
- **Temperature**: 0.1 (low for consistent intent extraction)
- **Max tokens**: 200 (small responses for efficiency)

## Verification

To verify the Gemini integration is working:

1. Check the console when making a query
2. Look for logs like:
   ```
   Original query: GPA?
   Enhanced query: What is my CGPA?
   Intent: cgpa
   ```

3. In the UI, you'll see a green box showing:
   - Understood as: [intent]
   - Normalized query
   - Confidence percentage

## Troubleshooting

### "GEMINI_API_KEY not found" warning
- Make sure `.env.local` has the API key
- Restart the dev server after adding the key

### "403 Forbidden" or "401 Unauthorized"
- Check that your API key is valid
- Make sure you've enabled the Gemini API in Google Cloud Console

### Low confidence scores
- This is normal for very short or ambiguous queries
- The system will still try its best to understand
- More context (previous conversations) helps improve understanding

## Privacy Note

Your API key should never be committed to Git. The `.env.local` file is already in `.gitignore` to prevent this.
