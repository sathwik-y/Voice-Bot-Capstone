# Roadmap: Voice-Based College Academic Assistant

**Created:** 2025-01-17
**Depth:** Quick (3-5 phases)
**Total Phases:** 4
**Coverage:** 35/35 v1 requirements mapped

## Overview

This roadmap delivers a voice-based academic assistant through 4 focused phases. Each phase builds toward proving the core demo flow: student logs in → speaks query → receives correct voice response → conversation is saved. The structure prioritizes stability and demo reliability over feature breadth, with aggressive phase compression guided by "quick" depth setting.

## Phases

### Phase 1: Foundation & Auth

**Goal:** Users can securely create accounts and log in to access the dashboard.

**Dependencies:** None (foundation phase)

**Requirements:**
- AUTH-01: User can register with email and password
- AUTH-02: User passwords are securely hashed using bcrypt
- AUTH-03: User can log in with email and password
- AUTH-04: System generates JWT token on successful login
- AUTH-05: JWT token is stored in HTTP-only cookie
- AUTH-06: User session persists across page refreshes
- AUTH-07: Protected routes verify JWT before granting access
- DATA-01: User credentials stored in SQLite database
- UI-01: User sees login screen on first visit
- UI-02: User sees registration screen when creating account

**Success Criteria:**
1. User can create new account with email and password
2. User can log in with credentials and stay logged in across browser refreshes
3. User is redirected to login when accessing protected routes without authentication
4. User passwords are never stored in plain text (verified via database inspection)

---

### Phase 2: Voice Pipeline

**Goal:** Users can record voice queries and receive spoken responses.

**Dependencies:** Phase 1 (requires authenticated dashboard)

**Requirements:**
- VOICE-01: User can record audio in browser (3-6 second clips)
- VOICE-02: Recorded audio is sent to speech-to-text service (Whisper)
- VOICE-03: Transcribed text is displayed to user
- VOICE-04: System generates text-to-speech response (Coqui TTS)
- VOICE-05: Audio response plays automatically in browser
- VOICE-06: User can see microphone button on dashboard
- UI-03: Authenticated user sees dashboard with microphone button
- UI-04: Dashboard uses all-black theme
- UI-06: Interface is clean and minimal

**Success Criteria:**
1. User can click microphone button and record 3-6 second audio clip
2. User sees transcribed text appear after recording
3. User hears audio response play automatically in browser
4. Dashboard displays all-black theme with minimal, clean interface

---

### Phase 3: AI Integration

**Goal:** System retrieves academic data and generates accurate responses using AI orchestration.

**Dependencies:** Phase 2 (requires voice pipeline)

**Requirements:**
- AI-01: Next.js backend forwards queries to n8n webhook
- AI-02: n8n workflow receives user query and context (role, roll number)
- AI-03: n8n queries MongoDB for relevant academic data
- AI-04: LLM generates response based strictly on retrieved data
- AI-05: System responds with safe fallback when data is missing
- AI-06: System maintains short-term context (last mentioned course)
- DATA-02: Conversation history stored in SQLite per user
- DATA-03: Academic data (students, grades, attendance, courses, faculty) stored in MongoDB Atlas
- DATA-04: System retrieves data based on authenticated user's roll number
- DATA-05: System enforces role-based data access (student can only see own data)

**Success Criteria:**
1. System forwards voice query to n8n with user context (roll number, role)
2. System retrieves correct academic data from MongoDB based on authenticated user
3. System responds "I don't have that information" when data is missing (never guesses)
4. System prevents users from accessing other students' data
5. Conversation history is saved and persisted per user

---

### Phase 4: Query Capabilities

**Goal:** Users can ask academic queries and receive accurate, contextual responses.

**Dependencies:** Phase 3 (requires AI orchestration)

**Requirements:**
- QUERY-01: User can ask for their CGPA and receive correct value
- QUERY-02: User can ask for attendance in a specific course
- QUERY-03: User can ask who teaches a specific course
- QUERY-04: User can ask about course details
- QUERY-05: User can ask follow-up question using context ("Who teaches that course?")
- UI-05: User can view conversation history (optional)

**Success Criteria:**
1. User asks "What is my CGPA?" and receives correct CGPA value in voice response
2. User asks "What's my attendance in [course name]?" and receives correct percentage
3. User asks "Who teaches [course name]?" and receives correct faculty name
4. User asks follow-up question "Who teaches that course?" and system correctly infers course from previous question
5. User can optionally view conversation history on dashboard

---

## Progress

| Phase | Status | Requirements | Completion |
|-------|--------|--------------|------------|
| 1 - Foundation & Auth | Not Started | 10/10 | 0% |
| 2 - Voice Pipeline | Not Started | 9/9 | 0% |
| 3 - AI Integration | Not Started | 10/10 | 0% |
| 4 - Query Capabilities | Not Started | 6/6 | 0% |

**Overall Progress:** 0/35 requirements complete (0%)

---

## Coverage Validation

All 35 v1 requirements mapped to exactly one phase:
- Phase 1: 10 requirements (AUTH-01 to AUTH-07, DATA-01, UI-01, UI-02)
- Phase 2: 9 requirements (VOICE-01 to VOICE-06, UI-03, UI-04, UI-06)
- Phase 3: 10 requirements (AI-01 to AI-06, DATA-02 to DATA-05)
- Phase 4: 6 requirements (QUERY-01 to QUERY-05, UI-05)

No orphaned requirements. Coverage complete.

---

## Next Steps

1. Review and approve this roadmap
2. Run `/gsd:plan-phase 1` to create execution plan for Foundation & Auth
3. Execute Phase 1 plans
4. Proceed sequentially through phases 2-4

---

*Last updated: 2025-01-17*
