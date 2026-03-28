# GITAM Voice Academic Assistant

A voice-based college academic information system with AI-powered semantic understanding, role-based access control, and multi-channel access (web, phone).

**Department of Computer Science and Engineering**
GITAM School of CSE, GITAM (Deemed to be University), Visakhapatnam.

**Guide:** Muddada Murali Krishna, Assistant Professor

**Team:**
- Y Sathwik (VU22CSEN0101112)
- B Sai Vardhan (VU22CSEN0102342)
- N Samuel Ricky (VU22CSEN0101727)
- G Srivatsa (VU22CSEN0101391)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Next.js API Routes |
| Auth Database | SQLite (better-sqlite3) |
| Academic Database | MongoDB Atlas |
| AI/NLU | Google Gemini 2.5 Flash |
| Workflow Engine | n8n (self-hosted) |
| STT | Web Speech API + OpenAI Whisper (server-side) |
| TTS | Web Speech Synthesis API |
| Phone Access | Ringg AI |
| Containerization | Docker + Docker Compose |
| PWA | Service Worker + Web App Manifest |

---

## Features

### Role-Based Access Control (RBAC)

Three user roles with dedicated dashboards and enforced API permissions:

| Role | Dashboard | Capabilities |
|---|---|---|
| **Student** | `/dashboard` | Voice/text queries for CGPA, attendance, courses, faculty, schedule, room availability |
| **Faculty** | `/faculty` | View enrolled students, teaching schedule, student analytics, room availability |
| **Admin** | `/admin` | User management, system analytics, query metrics, room/timetable overview |

### AI-Powered Voice Queries

- **Zero-keyword semantic understanding** — "How am I doing?" maps to CGPA without requiring the keyword
- **Multi-turn dialogue** — 5-message sliding window context for follow-up questions
- **13 intent types** — cgpa, attendance, faculty, courses, course_details, general_status, next_class, today_schedule, empty_rooms, room_status, my_students, timetable, unknown
- **Confidence scoring** — Shows how confident the system is in understanding each query
- **Reasoning display** — Explains why an intent was chosen

### Schedule and Room Management

- **Time-aware queries** — "What's my next class?" checks real-time clock
- **Weekend detection** — Returns "No classes today, enjoy your holiday!" on Sat/Sun
- **Room availability** — Find empty classrooms in real-time
- **Room status** — See what's happening in any room right now
- **Faculty schedules** — Faculty see their teaching schedule with student counts

### Multi-Channel Access

- **Web** — Responsive PWA, installable on mobile
- **Voice** — Browser microphone with Web Speech API
- **Server STT** — Whisper API endpoint for accurate transcription
- **Phone** — Ringg AI integration for outbound calls with pre-loaded student data

### Data Architecture

- **16 student records** in MongoDB with full academic data (courses, attendance, grades, faculty, schedules)
- **26 faculty records** mapped to courses and enrolled students
- **23 rooms** with complete schedules
- **6-day timetable** (Mon-Sat) with 269 time slots
- **22 user accounts** in SQLite with RBAC roles and phone numbers

---

## Test Accounts

All passwords: `password123`

| Role | Login ID | Name | Phone |
|---|---|---|---|
| Student | `VU22CSEN0101112` | Y Sathwik | 9876543200 |
| Student | `VU22CSEN0102342` | B Sai Vardhan | 9876543201 |
| Student | `VU22CSEN0101727` | N Samuel Ricky | 9876543202 |
| Student | `VU22CSEN0101391` | G Srivatsa | 9876543203 |
| Student | `VU22CSEN0100201` | Aditya Sharma | 9876543204 |
| Student | `VU22CSEN0100305` | Priya Reddy | 9876543205 |
| Student | `VU22CSEN0100412` | Rahul Verma | 9876543206 |
| Student | `VU22CSEN0100518` | Sneha Patel | 9876543207 |
| Student | `VU22CSEN0100623` | Vikram Singh | 9876543208 |
| Student | `VU22CSEN0100734` | Ananya Iyer | 9876543209 |
| Student | `VU22CSEN0100845` | Karthik Nair | 9876543210 |
| Student | `VU22CSEN0100956` | Divya Prasad | 9876543211 |
| Student | `VU22CSEN0101067` | Arjun Menon | 9876543212 |
| Student | `VU22CSEN0101178` | Meera Krishnan | 9876543213 |
| Student | `VU22CSEN0101289` | Rohan Das | 9876543214 |
| Student | `VU22CSEN0101401` | Nikhil Joshi | 9876543215 |
| Faculty | `FAC001` | Dr. Murali Krishna M. | 9876500001 |
| Faculty | `FAC002` | Prof. Lakshmi Narayana K. | 9876500002 |
| Faculty | `FAC003` | Dr. Ravi Shankar P. | 9876500003 |
| Admin | `ADMIN001` | System Administrator | 9876500000 |

---

## Available Queries

### Student Queries

| Query | What it does |
|---|---|
| "What's my CGPA?" | Returns current CGPA |
| "How am I doing?" | Semantic — returns CGPA |
| "How's my attendance?" | Attendance percentages per course |
| "What courses do I have?" | Lists enrolled courses |
| "Who teaches Advanced Coding?" | Faculty name for a course |
| "How are my academics?" | Full summary (CGPA + attendance + courses) |
| "What's my next class?" | Time-aware next upcoming class |
| "What classes do I have today?" | Today's full schedule with rooms |
| "Which rooms are free?" | Currently available classrooms |
| "What's in room ICT 519?" | What's happening in that room |

### Faculty Queries

| Query | What it does |
|---|---|
| "Which courses do I teach?" | Lists courses with room, schedule, student count |
| "Which students are in my class?" | Lists enrolled students by name and roll number |
| "What's my next class?" | Next teaching slot with room and student count |
| "What classes do I have today?" | Today's teaching schedule |
| "Which rooms are free?" | Available classrooms |
| "What information can you give me?" | Overview of available features |

### Admin Queries

| Query | What it does |
|---|---|
| "Which rooms are free?" | Room availability |
| "What's in ICT 519?" | Room status with current/scheduled classes |
| "Show the timetable" | Timetable overview |
| Student queries by roll number | Look up any student's data |

### Weekend/Holiday Behavior

All schedule queries on Saturday/Sunday return: "No classes today, enjoy your holiday!"

---

## Setup

### Prerequisites

- Node.js 22+
- MongoDB Atlas account (or local MongoDB)
- n8n instance (self-hosted or cloud)
- Gemini API key

### Installation

```bash
# Clone and install
git clone <repo-url>
cd Capstone
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# Seed databases
node scripts/seed-users.js        # SQLite users (22 accounts)
node scripts/seed-mongodb.js      # MongoDB students (16 records)
node scripts/seed-academic.js     # MongoDB faculty + timetable + rooms

# Start development server
npm run dev
```

### Environment Variables

```
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/capstone-voice
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
RINGG_API_KEY=your-ringg-key
GROQ_API_KEY=optional-for-whisper
```

### Docker

```bash
docker-compose up --build
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with role, name, phone |
| POST | `/api/auth/login` | Login, returns JWT cookie |
| GET | `/api/auth/me` | Get current user info |
| PATCH | `/api/auth/me` | Update phone number |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/verify` | Check authentication status |

### Voice and Query
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/voice/query` | Process voice/text query (all roles) |
| POST | `/api/voice/transcribe` | Whisper STT transcription |
| GET | `/api/conversations` | Get conversation history |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users with stats |
| DELETE | `/api/admin/users` | Delete a user |
| GET | `/api/admin/analytics` | System-wide analytics |

### Faculty
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/faculty/students` | Student list and query analytics |

### Phone (Ringg AI)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/phone/call` | Initiate outbound call to student |
| POST | `/api/phone/webhook` | Receive call events from Ringg |
| GET/POST | `/api/phone` | Agent management |

---

## Architecture

```
Browser (PWA)
  |-- Web Speech API (STT/TTS)
  |-- Next.js Frontend (React 19)
       |
  Next.js API Routes
       |-- JWT Auth + RBAC
       |-- Gemini 2.5 Flash (Intent Extraction)
       |-- Direct MongoDB (Schedule/Room/Faculty queries)
       |-- n8n Webhook (Academic data queries)
       |       |-- MongoDB Atlas (Student collection)
       |       |-- Gemini 2.0 Flash (Response generation)
       |-- SQLite (Users, Conversations, Analytics)
       |-- Ringg AI (Phone calls)
```

---

## Testing

```bash
# Start server
npm run dev

# Run E2E tests (22 tests)
node scripts/test-e2e.js

# Test query understanding
npx tsx scripts/test-query-understanding.ts
```

---

## n8n Workflow

The n8n workflow (`Capstone-n8n.json`) handles student academic queries:

1. **Webhook** receives query + intent + rollNumber
2. **MongoDB** fetches student data by rollNumber
3. **Code node** filters data based on intent (cgpa/attendance/courses/faculty/general_status)
4. **Prompt Generator** builds context-aware prompt
5. **Gemini LLM** generates natural language response
6. **Respond to Webhook** returns JSON response

Schedule, room, and faculty queries bypass n8n and query MongoDB directly.
