# Fix n8n for general_status Intent

Your query understanding is working perfectly! But n8n needs an update to handle the new `general_status` intent.

## The Issue

```
✅ Frontend: "How are my academics?" → Understood as general_status
❌ n8n: Doesn't know what to do with general_status → "I don't have that information"
```

## Quick Fix (5 minutes)

### Option 1: Import Enhanced Workflow (Easiest)

1. **Go to n8n**: https://n8n.sathwiky.dev
2. **Click** "Import from File"
3. **Select**: `D:\Capstone\Capstone-n8n-enhanced.json`
4. **Activate** the new workflow
5. **Done!**

### Option 2: Update Existing Workflow Manually

1. **Go to n8n**: https://n8n.sathwiky.dev
2. **Open** "Capstone Voice Assistant" workflow
3. **Find** the "AI Response Generator" node (the LLM Chain node)
4. **Click** to edit it
5. **Replace the prompt expression** with this:

```javascript
={{
  const studentData = $json;
  const query = $('Webhook').item.json.query;
  const intent = $('Webhook').item.json.intent;

  let contextHint = '';
  let responseStyle = '1-2 short sentences';

  if (intent === 'general_status') {
    contextHint = `\n\nIMPORTANT: The user is asking for an OVERALL SUMMARY. Provide:\n- CGPA\n- Average attendance across all courses\n- Number of courses enrolled\nKeep it to 2-3 sentences max.`;
    responseStyle = '2-3 sentences covering CGPA, attendance, and courses';
  }

  return `You are an academic assistant. Answer this student's question based ONLY on their data below.

Student Data:
${JSON.stringify(studentData, null, 2)}

Student Question: ${query}${contextHint}

RULES:
1. Answer in ${responseStyle} suitable for voice output.
2. NEVER make up information. Only use the data provided above.
3. If data is missing, say "I don't have that information in your records."
4. Be specific and accurate.
5. Don't mention JSON or technical terms in your response.
6. For general_status intent, calculate average attendance and provide comprehensive overview.
7. Keep responses concise and natural for text-to-speech playback.`;
}}
```

6. **Save** the workflow
7. **Test** again!

## Test After Fix

Try these queries:
- ✅ "How are my academics?" → Should give full summary
- ✅ "How am I doing?" → Should give CGPA
- ✅ "What is my CGPA?" → Should work as before

## Why This Happened

Your frontend is sending the `intent` field to n8n, but the old n8n workflow wasn't checking for it. The updated prompt checks if `intent === 'general_status'` and gives special instructions to the LLM.

## Alternative: Use cgpa Queries Instead

If you don't want to update n8n right now, just ask specific questions:
- ❌ "How are my academics?" → general_status (needs n8n update)
- ✅ "How am I doing?" → cgpa (works now!)
- ✅ "What is my CGPA?" → cgpa (works now!)
- ✅ "What courses do I have?" → courses (works now!)

The semantic understanding still works - it just converts to intents your n8n already handles!
