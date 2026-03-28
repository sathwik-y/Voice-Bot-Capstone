# Comprehensive Testing Guide

This guide walks through testing all features of the Voice-Based College Academic Assistant, including the new intelligent query understanding capabilities.

## Prerequisites

1. **Environment Setup**
   ```bash
   # Install dependencies
   npm install

   # Ensure .env.local has required variables
   # - N8N_WEBHOOK_URL
   # - JWT_SECRET
   # - GEMINI_API_KEY (optional but recommended)
   ```

2. **Services Running**
   - Next.js dev server: `npm run dev`
   - n8n workflow: Deployed and active at the webhook URL
   - MongoDB Atlas: Database populated with student data

3. **Test Account**
   - Roll Number: `VU22CSEN0101112`
   - Password: (Check database or create new account)

## Test Suite

### 1. Authentication Tests

#### Test 1.1: User Registration
1. Navigate to http://localhost:3000/register
2. Enter a new roll number (e.g., `TEST001`)
3. Enter a password
4. Click Register
5. ✓ Should redirect to login page

#### Test 1.2: User Login
1. Navigate to http://localhost:3000/login
2. Enter roll number: `VU22CSEN0101112`
3. Enter password
4. Click Login
5. ✓ Should redirect to dashboard

#### Test 1.3: Session Persistence
1. After logging in, refresh the page
2. ✓ Should remain logged in (not redirected to login)

#### Test 1.4: Protected Routes
1. Open a new incognito window
2. Try to access http://localhost:3000/dashboard
3. ✓ Should redirect to login page

### 2. Voice Interaction Tests

#### Test 2.1: Microphone Permission
1. On dashboard, click the microphone button
2. ✓ Browser should request microphone permission
3. Grant permission
4. ✓ Button should show listening state (🎤 icon)

#### Test 2.2: Speech Recognition
1. Click microphone button
2. Speak clearly: "What is my CGPA?"
3. ✓ Should transcribe speech to text
4. ✓ Should display transcribed text
5. ✓ Should send to backend and show response

#### Test 2.3: Text-to-Speech Response
1. After query response
2. ✓ Should automatically speak the response aloud
3. ✓ Audio should be clear and understandable

#### Test 2.4: Text Input Fallback
1. Type a question in the text input: "What courses do I have?"
2. Click Send
3. ✓ Should process query same as voice
4. ✓ Should speak response

### 3. Query Understanding Tests

#### Test 3.1: Clear/Formal Queries
Test these queries (via voice or text):

| Query | Expected Intent | Expected Response |
|-------|----------------|-------------------|
| "What is my CGPA?" | cgpa | Your CGPA value |
| "What is my attendance in Advanced Coding?" | attendance | Attendance percentage |
| "Who teaches Machine Learning?" | faculty | Faculty name |
| "What courses am I enrolled in?" | courses | List of courses |

✓ All should work correctly

#### Test 3.2: Informal/Fuzzy Queries
Test these challenging queries:

| Query | Should Understand As | Notes |
|-------|---------------------|-------|
| "GPA?" | "What is my CGPA?" | Very short query |
| "How much did I attend ML?" | Attendance query | Informal + abbreviation |
| "Who's the prof for AOS?" | Faculty query | Informal + abbreviation |
| "Attendance?" | Attendance query | Single word |
| "Courses?" | Course list query | Single word |

✓ Check that:
1. Normalized query shows in green box
2. Intent is correctly identified
3. Response is accurate
4. Confidence is displayed

#### Test 3.3: Misspellings and Typos
Test queries with intentional errors:

| Query | Should Still Work |
|-------|-------------------|
| "Whats my cgpa" | ✓ Yes |
| "attendance in machien learning" | ✓ Yes |
| "faculty for advanced codding" | ✓ Yes |

✓ System should handle gracefully via Gemini normalization

#### Test 3.4: Abbreviations
Test common course abbreviations:

| Abbreviation | Full Course Name |
|--------------|------------------|
| ML | Machine Learning |
| AOS | Advanced Operating Systems |
| SNA | Social Network Analysis |

Example queries:
- "What's my ML attendance?"
- "Who teaches AOS?"
- "Tell me about SNA"

✓ Should match to full course names

#### Test 3.5: Context-Aware Follow-ups
1. Ask: "What courses do I have?"
2. Wait for response listing courses
3. Ask: "Who teaches the first one?" OR "What about Advanced Coding?"
4. ✓ Should use context from previous query
5. ✓ Should provide accurate response

### 4. UI/UX Tests

#### Test 4.1: Query Understanding Feedback
1. Type an informal query: "GPA?"
2. Submit
3. ✓ Green box should appear showing:
   - "Understood as: cgpa"
   - Confidence percentage
   - Normalized query: "What is my CGPA?"

#### Test 4.2: Suggestion Buttons
1. Click "What's my CGPA?" button
2. ✓ Should auto-fill text input
3. Click Send
4. ✓ Should process query

#### Test 4.3: Conversation History
1. Click "Show Conversation History"
2. ✓ Should display past conversations
3. ✓ Should show timestamps
4. ✓ Should show both query and response
5. Click "Hide Conversation History"
6. ✓ Should collapse

#### Test 4.4: Loading States
1. Submit a query
2. ✓ Microphone button should show ⏳ (processing)
3. ✓ "Processing..." text should appear
4. ✓ Send button should be disabled during processing

#### Test 4.5: Responsive Design
1. Test on different screen sizes
2. ✓ Should remain usable on mobile
3. ✓ Buttons should be clickable
4. ✓ Text should be readable

### 5. Error Handling Tests

#### Test 5.1: No Microphone
1. Use a device without microphone
2. Try voice input
3. ✓ Should show error message
4. ✓ Text input should still work

#### Test 5.2: Network Errors
1. Disconnect internet
2. Try a query
3. ✓ Should show error message
4. ✓ Should not crash

#### Test 5.3: n8n Service Down
1. Stop n8n or use invalid webhook URL
2. Try a query
3. ✓ Should timeout gracefully
4. ✓ Should show error message

#### Test 5.4: Missing Gemini API Key
1. Remove GEMINI_API_KEY from .env.local
2. Restart server
3. Try a query
4. ✓ Should fall back to keyword matching
5. ✓ Should still function (may be less accurate)

### 6. Data Accuracy Tests

#### Test 6.1: CGPA Query
1. Ask: "What is my CGPA?"
2. ✓ Response should match CGPA in MongoDB
3. Verify by checking database:
   ```bash
   node scripts/check-db.js
   ```

#### Test 6.2: Attendance Query
1. Ask: "What is my attendance in [Course Name]?"
2. ✓ Should return correct percentage
3. ✓ Should match MongoDB data

#### Test 6.3: Faculty Query
1. Ask: "Who teaches [Course Name]?"
2. ✓ Should return correct faculty name
3. ✓ Should match MongoDB data

#### Test 6.4: Course List Query
1. Ask: "What courses am I enrolled in?"
2. ✓ Should list all current courses
3. ✓ Should match MongoDB data

### 7. Security Tests

#### Test 7.1: JWT Verification
1. Log in and get JWT cookie
2. Manually delete cookie
3. Try to access dashboard
4. ✓ Should redirect to login

#### Test 7.2: Role-Based Access
1. User A logs in with roll number A
2. ✓ Should only see their own data
3. User B logs in with roll number B
4. ✓ Should only see their own data
5. ✓ User A cannot see User B's data

#### Test 7.3: Password Security
1. Check database:
   ```bash
   node scripts/check-db.js
   ```
2. ✓ Passwords should be hashed (not plain text)
3. ✓ Should start with `$2b$` (bcrypt)

### 8. Performance Tests

#### Test 8.1: Query Response Time
1. Submit multiple queries
2. ✓ Responses should come within 3-5 seconds
3. ✓ No significant delays

#### Test 8.2: Conversation History Loading
1. After 10+ conversations
2. Click Show History
3. ✓ Should load quickly (< 1 second)

#### Test 8.3: Concurrent Users
1. Open multiple browser tabs
2. Log in with different users
3. Submit queries simultaneously
4. ✓ All should work without conflicts

### 9. Gemini Integration Tests

#### Test 9.1: Query Normalization
Run the test script:
```bash
npx tsx scripts/test-query-understanding.ts
```

✓ Check output for:
- Correct intent extraction
- Reasonable confidence scores (> 0.5)
- Proper normalization

#### Test 9.2: Fallback Behavior
1. Temporarily set invalid GEMINI_API_KEY
2. Submit a query
3. ✓ Should use fallback keyword matching
4. ✓ Check console for fallback message
5. Restore correct API key

### 10. n8n Workflow Tests

#### Test 10.1: MongoDB Connection
1. Submit a query
2. Check n8n workflow execution
3. ✓ MongoDB node should successfully fetch data
4. ✓ Should return student record

#### Test 10.2: LLM Response Generation
1. Check n8n workflow execution logs
2. ✓ Gemini model should generate response
3. ✓ Response should be based on student data

#### Test 10.3: Enhanced Workflow (Optional)
If using `Capstone-n8n-enhanced.json`:
1. Import workflow to n8n
2. Activate it
3. Test fuzzy course matching
4. ✓ "ML attendance" should match "Machine Learning"

## Test Results Checklist

| Category | Tests Passed | Tests Failed | Notes |
|----------|-------------|--------------|-------|
| Authentication | __ / 4 | | |
| Voice Interaction | __ / 4 | | |
| Query Understanding | __ / 5 | | |
| UI/UX | __ / 5 | | |
| Error Handling | __ / 4 | | |
| Data Accuracy | __ / 4 | | |
| Security | __ / 3 | | |
| Performance | __ / 3 | | |
| Gemini Integration | __ / 2 | | |
| n8n Workflow | __ / 3 | | |
| **TOTAL** | __ / 41 | | |

## Debugging Tools

### View Console Logs
```bash
# Server logs show:
# - Original query
# - Enhanced query
# - Intent detection
# - n8n response status
```

### Check Database
```bash
node scripts/check-db.js
```

### Test Query Understanding
```bash
npx tsx scripts/test-query-understanding.ts
```

### View n8n Workflow
- Access n8n dashboard
- Check workflow executions
- View node outputs

## Common Issues and Solutions

### Issue: "Speech recognition not supported"
**Solution**: Use Chrome or Edge browser

### Issue: "Microphone access denied"
**Solution**: Grant permission in browser settings

### Issue: Queries not being understood correctly
**Solution**:
1. Check GEMINI_API_KEY is set
2. Restart server after adding key
3. Check console for Gemini errors

### Issue: No response from AI
**Solution**:
1. Check n8n webhook URL is correct
2. Verify n8n workflow is active
3. Check MongoDB connection in n8n

### Issue: Wrong data returned
**Solution**:
1. Verify MongoDB data for roll number
2. Check data structure matches expected format
3. Run: `node scripts/check-db.js`

## Sign-off

After completing all tests:

- [ ] All critical features working
- [ ] No major bugs found
- [ ] Documentation reviewed
- [ ] Ready for demo

**Tested By**: _________________
**Date**: _________________
**Environment**: _________________
**Notes**: _________________________________________________

---

**Last Updated**: February 8, 2026
**Version**: Enhanced with Query Understanding
