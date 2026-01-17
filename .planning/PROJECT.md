# Voice-Based College Academic Assistant

## What This Is

A voice-based AI assistant that allows college students to query academic information (CGPA, attendance, course details, faculty assignments) using natural speech and receive spoken responses. The system provides fast, conversational access to data that currently requires navigating a complex, multi-step web portal.

## Core Value

Students can access their academic information by simply asking a question out loud, without needing to learn portal navigation, click through multiple screens, or visually scan tables.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User registration and authentication with email/password
- [ ] JWT-based session management with HTTP-only cookies
- [ ] Browser-based voice recording (3-6 second audio clips)
- [ ] Speech-to-text conversion of student queries
- [ ] AI-based query understanding and response generation
- [ ] Academic data retrieval (CGPA, attendance per course, course information, faculty assignments)
- [ ] Text-to-speech response generation
- [ ] Per-user conversation history storage
- [ ] Short-term context awareness (remember last mentioned course for follow-up questions)
- [ ] Safe fallback responses when requested data is unavailable
- [ ] Dashboard interface with microphone button for voice interaction

### Out of Scope

- Multi-role implementation (faculty, parent roles) — architecturally planned but not implemented for MVP, student role only for capstone demo
- Long conversation context across multiple topics — only last mentioned entity tracking needed for demo
- Real-time audio streaming — short audio clips sufficient for capstone
- Phone or IVR-based access — browser-based interaction only
- Natural-sounding voice synthesis — clear, robotic TTS acceptable for evaluation
- Production-grade deployment — local or controlled demo environment sufficient
- Multi-language support — English only for MVP
- Administrative dashboards or analytics — core interaction flow only
- Integration with official college APIs — no APIs available, using manually populated data

## Context

This project solves a personally experienced problem: the college student portal is cluttered, unintuitive, and requires multiple clicks and page loads to access simple information like CGPA or attendance. Even basic queries require logging in, navigating to the right section, clicking through tabs, and visually scanning tables. This is inefficient for frequent, repetitive queries and especially difficult for non-technical users or after-hours access.

The academic data (student records, grades, attendance, courses, faculty mappings) is manually populated in MongoDB Atlas as sample institutional data, since the college does not provide official APIs. This controlled dataset is sufficient to demonstrate correctness of queries, access control, and AI reasoning over structured data.

The system uses n8n for AI orchestration to cleanly separate AI logic from application code, enabling modular agent-style workflows that are easy to iterate, debug visually, and explain during evaluation.

The capstone demo focuses on proving ONE flow works flawlessly: student logs in → speaks "What is my CGPA?" → hears correct answer in voice → conversation is saved. This single scenario demonstrates end-to-end functionality across authentication, voice input, AI reasoning, database access, voice output, and persistence.

## Constraints

- **Timeline**: Short development window (few days) — prioritize MVP stability and demo reliability over feature breadth
- **Deployment**: Local or controlled environment — not production-grade public deployment, SQLite acceptable for auth and history
- **Data Availability**: No official college APIs — using manually populated sample data in MongoDB Atlas
- **Voice Quality**: Robotic TTS acceptable — evaluators care about correctness and stability, not voice naturalness
- **Scope**: Student role only for live demo — faculty and parent roles architecturally planned but not fully implemented
- **Context Depth**: Short-term only — remember last mentioned entity (e.g., course) for immediate follow-up, no deep multi-turn memory required

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js monolith for frontend and backend | Reduces complexity, eliminates need for separate backend framework, faster development | — Pending |
| SQLite for auth and conversation history | Simple setup, predictable behavior, sufficient for local demo with low concurrency | — Pending |
| MongoDB Atlas for academic data | Flexible schema for semi-structured records, already manually populated | — Pending |
| n8n for AI orchestration | Separates AI logic from application code, enables modular workflows, visual debugging, easier to explain | — Pending |
| Student role only for demo | Avoids half-baked multi-role implementation, keeps demo stable and reliable | — Pending |
| Short audio clips (3-6 seconds) instead of streaming | Simpler implementation, sufficient for typical academic queries, reduces failure points | — Pending |
| Safe fallbacks when data missing | System never guesses or hallucinates, responds honestly when information unavailable | — Pending |

---
*Last updated: 2025-01-17 after initialization*
