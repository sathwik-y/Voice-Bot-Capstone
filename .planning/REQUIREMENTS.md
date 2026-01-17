# Requirements: Voice-Based College Academic Assistant

**Defined:** 2025-01-17
**Core Value:** Students can access their academic information by simply asking a question out loud, without needing to navigate complex portal UI.

## v1 Requirements

Requirements for capstone demonstration. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can register with email and password
- [ ] **AUTH-02**: User passwords are securely hashed using bcrypt
- [ ] **AUTH-03**: User can log in with email and password
- [ ] **AUTH-04**: System generates JWT token on successful login
- [ ] **AUTH-05**: JWT token is stored in HTTP-only cookie
- [ ] **AUTH-06**: User session persists across page refreshes
- [ ] **AUTH-07**: Protected routes verify JWT before granting access

### Voice Interaction

- [ ] **VOICE-01**: User can record audio in browser (3-6 second clips)
- [ ] **VOICE-02**: Recorded audio is sent to speech-to-text service (Whisper)
- [ ] **VOICE-03**: Transcribed text is displayed to user
- [ ] **VOICE-04**: System generates text-to-speech response (Coqui TTS)
- [ ] **VOICE-05**: Audio response plays automatically in browser
- [ ] **VOICE-06**: User can see microphone button on dashboard

### AI Orchestration

- [ ] **AI-01**: Next.js backend forwards queries to n8n webhook
- [ ] **AI-02**: n8n workflow receives user query and context (role, roll number)
- [ ] **AI-03**: n8n queries MongoDB for relevant academic data
- [ ] **AI-04**: LLM generates response based strictly on retrieved data
- [ ] **AI-05**: System responds with safe fallback when data is missing
- [ ] **AI-06**: System maintains short-term context (last mentioned course)

### Academic Queries

- [ ] **QUERY-01**: User can ask for their CGPA and receive correct value
- [ ] **QUERY-02**: User can ask for attendance in a specific course
- [ ] **QUERY-03**: User can ask who teaches a specific course
- [ ] **QUERY-04**: User can ask about course details
- [ ] **QUERY-05**: User can ask follow-up question using context ("Who teaches that course?")

### Data Management

- [ ] **DATA-01**: User credentials stored in SQLite database
- [ ] **DATA-02**: Conversation history stored in SQLite per user
- [ ] **DATA-03**: Academic data (students, grades, attendance, courses, faculty) stored in MongoDB Atlas
- [ ] **DATA-04**: System retrieves data based on authenticated user's roll number
- [ ] **DATA-05**: System enforces role-based data access (student can only see own data)

### User Interface

- [ ] **UI-01**: User sees login screen on first visit
- [ ] **UI-02**: User sees registration screen when creating account
- [ ] **UI-03**: Authenticated user sees dashboard with microphone button
- [ ] **UI-04**: Dashboard uses all-black theme
- [ ] **UI-05**: User can view conversation history (optional)
- [ ] **UI-06**: Interface is clean and minimal

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Role Support

- **ROLE-01**: Faculty can log in and query student enrollment data
- **ROLE-02**: Parents can access student progress with consent
- **ROLE-03**: Admin dashboard for user management

### Advanced Voice Features

- **VOICE-07**: Real-time audio streaming instead of clips
- **VOICE-08**: Phone/IVR-based access
- **VOICE-09**: Natural-sounding voice synthesis

### Enhanced Context

- **CONTEXT-01**: Multi-turn conversation memory across topics
- **CONTEXT-02**: Cross-course reasoning and comparisons
- **CONTEXT-03**: Conversation summaries

### Additional Features

- **FEAT-01**: Multi-language support
- **FEAT-02**: Analytics dashboard for usage patterns
- **FEAT-03**: Email verification for registration
- **FEAT-04**: Password reset via email

## Out of Scope

| Feature | Reason |
|---------|--------|
| Official college API integration | No APIs available, using manually populated data |
| Production-grade deployment | Local/controlled demo sufficient for capstone |
| Multi-tenancy for multiple colleges | Single institution focus for MVP |
| Mobile native apps | Browser-based interface sufficient |
| Real-time notifications | Not core to voice query interaction |
| Grade predictions or analytics | Core value is data access, not insights |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| DATA-01 | Phase 1 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| VOICE-01 | Phase 2 | Pending |
| VOICE-02 | Phase 2 | Pending |
| VOICE-03 | Phase 2 | Pending |
| VOICE-04 | Phase 2 | Pending |
| VOICE-05 | Phase 2 | Pending |
| VOICE-06 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 2 | Pending |
| UI-06 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| AI-05 | Phase 3 | Pending |
| AI-06 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| DATA-05 | Phase 3 | Pending |
| QUERY-01 | Phase 4 | Pending |
| QUERY-02 | Phase 4 | Pending |
| QUERY-03 | Phase 4 | Pending |
| QUERY-04 | Phase 4 | Pending |
| QUERY-05 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35/35 (100%)
- Unmapped: 0

**Phase Distribution:**
- Phase 1 (Foundation & Auth): 10 requirements
- Phase 2 (Voice Pipeline): 9 requirements
- Phase 3 (AI Integration): 10 requirements
- Phase 4 (Query Capabilities): 6 requirements

---
*Requirements defined: 2025-01-17*
*Last updated: 2025-01-17 after roadmap creation*
