# Complete Query Guide — All Roles

Every query listed below works via both voice (mic button) and text input. The system uses semantic understanding — you don't need exact wording, these are examples of what works.

---

## Student Queries

Login with any student account (e.g. `VU22CSEN0101112` / `password123`)

### CGPA / Grades

| Query | What it returns |
|---|---|
| What's my CGPA? | Your current CGPA |
| What is my GPA? | Same — CGPA |
| How am I doing? | CGPA (semantic — no keyword needed) |
| Am I scoring well? | CGPA with context |
| How's my performance? | CGPA |
| Am I doing good? | CGPA |
| What are my grades? | CGPA and grade info |
| GPA? | CGPA (minimal query works) |
| Am I performing okay? | CGPA |
| What's my academic score? | CGPA |

### Attendance

| Query | What it returns |
|---|---|
| How's my attendance? | Attendance % for all courses |
| What is my attendance? | Same |
| Am I attending regularly? | Attendance overview (semantic) |
| How much did I attend? | Attendance percentages |
| Attendance? | All course attendance |
| What's my attendance in Advanced Coding? | Specific course attendance |
| How's my attendance in AOS? | Handles abbreviations |
| Am I attending well? | Semantic — attendance |
| How many classes did I miss? | Attendance |
| Attendance in ML? | Handles abbreviations |

### Courses

| Query | What it returns |
|---|---|
| What courses do I have? | List of enrolled courses |
| What am I studying? | Courses (semantic) |
| What subjects am I taking? | Courses |
| How many courses do I have? | Course count and list |
| What am I enrolled in? | Courses |
| Courses? | Course list |
| What are my subjects? | Courses |
| Show my courses | Course list |
| What classes am I registered for? | Courses |

### Faculty / Professors

| Query | What it returns |
|---|---|
| Who teaches Advanced Coding? | Faculty name for that course |
| Who is my professor for AOS? | Faculty name |
| Who's the prof for Social Network Analysis? | Faculty name |
| Who teaches me? | All faculty |
| Faculty? | Faculty list |
| Who's my teacher for Supply Chain? | Faculty name |
| Who teaches Solar Energy? | Faculty name |
| Who is the instructor for Capstone? | Faculty name |
| Professor for SNA? | Handles abbreviation |

### General Academic Status

| Query | What it returns |
|---|---|
| How are my academics? | Full summary — CGPA + attendance + courses |
| Show my progress | Comprehensive overview |
| How's everything going? | Full academic summary |
| Give me an overview | CGPA + attendance + course count |
| What's my academic status? | Full summary |
| How are things? | General status |
| Am I on track? | Academic overview |
| Show me everything | Full summary |

### Schedule (Time-Aware)

| Query | What it returns |
|---|---|
| What's my next class? | Next upcoming class with room, time, instructor (checks real clock) |
| When is my next lecture? | Same |
| Do I have class now? | Next class info |
| What's coming up? | Next class |
| Any class soon? | Next class |
| What classes do I have today? | Full today's schedule with rooms and instructors |
| Today's schedule | Today's classes |
| What's my timetable for today? | Today's schedule |
| Do I have any classes today? | Today's schedule |
| My schedule? | Today's schedule |
| What's happening today? | Today's schedule |
| Is there class today? | Today's schedule (returns holiday message on weekends) |

### Room Availability

| Query | What it returns |
|---|---|
| Which rooms are free? | List of currently available rooms |
| Any empty classrooms? | Available rooms right now |
| Where can I sit and work? | Empty rooms |
| Free rooms? | Available rooms |
| Is there any room available? | Room availability |
| Which classrooms are vacant? | Available rooms |
| Where can I go for lunch? | Empty rooms |
| Any room to study in? | Available rooms |

### Room Status

| Query | What it returns |
|---|---|
| What's happening in ICT 519? | Classes scheduled in that room today |
| What's in room 206? | Room schedule |
| Who's in ICT 318? | Current/scheduled class and instructor |
| Is ICT 602D free? | Room status |
| What class is in room 415? | Room schedule |

### Miscellaneous / Informal

| Query | What it returns |
|---|---|
| Help | What the system can do |
| What can you do? | Feature overview |
| Whats my cgpaa | Handles misspellings |
| attendence in machien learning | Handles misspellings |
| ML prof? | Handles abbreviations |
| AOS attendance | Abbreviation + intent |

---

## Faculty Queries

Login with faculty account (e.g. `FAC001` / `password123`)

### My Courses

| Query | What it returns |
|---|---|
| Which courses do I teach? | Course list with room, schedule, student count |
| What are my courses? | Same |
| What do I teach? | Course list |
| My courses? | Course list |
| Which subject am I teaching? | Course details |
| How many courses do I have? | Course count with details |

### My Students

| Query | What it returns |
|---|---|
| Who are my students? | Student names and roll numbers |
| Which students are in my class? | Enrolled student list |
| How many students do I have? | Student count per course |
| Student list? | Enrolled students |
| Show my enrolled students | Student names and roll numbers |
| Who's taking my course? | Student list |
| Class roster? | Student list |

### Schedule (Time-Aware)

| Query | What it returns |
|---|---|
| What's my next class? | Next teaching slot with room, student count |
| When do I teach next? | Next class |
| Do I have a class now? | Next upcoming class |
| What classes do I have today? | Today's teaching schedule |
| Today's schedule? | Full teaching schedule for today |
| My timetable for today? | Today's classes |
| Am I free right now? | Next class (if none, says done for the day) |
| Any more classes today? | Remaining classes |

### Room Availability

| Query | What it returns |
|---|---|
| Which rooms are free? | Currently available rooms |
| Any empty rooms? | Available classrooms |
| Is ICT 519 free? | Specific room status |
| What's in room 302? | Room schedule |

### Student Data Lookup

| Query | What it returns |
|---|---|
| What is the CGPA of VU22CSEN0101112? | That student's CGPA |
| Show attendance for VU22CSEN0102342 | That student's attendance |
| How is Sathwik doing? | Looks up student data |

### General

| Query | What it returns |
|---|---|
| What can you help me with? | Role-appropriate feature overview |
| What information can you give me? | Feature list for faculty |

---

## Admin Queries

Login with admin account (`ADMIN001` / `password123`)

### Room Management

| Query | What it returns |
|---|---|
| Which rooms are free? | All currently available rooms |
| Which rooms are occupied? | Occupied rooms with class info |
| What's happening in ICT 519? | Room schedule for today |
| What's in room 208? | Classes, instructors, times |
| Is ICT 602D free right now? | Current room status |
| Room status? | Overview of all rooms |
| Which rooms are being used right now? | Currently occupied rooms |
| Show all room allocations | Room schedule overview |

### Timetable

| Query | What it returns |
|---|---|
| Show the timetable | Full timetable overview |
| What's the schedule for today? | Today's full schedule across all rooms |
| Room allocations? | Timetable info |
| What classes are happening now? | Current time slot classes |

### Student Data (Any Student)

| Query | What it returns |
|---|---|
| What is the CGPA of VU22CSEN0101112? | Specific student's CGPA |
| Show attendance for VU22CSEN0102342 | Specific student's attendance |
| What courses does VU22CSEN0100201 have? | Student's course list |
| Who teaches VU22CSEN0101391? | Faculty for that student |

### General

| Query | What it returns |
|---|---|
| What can you do? | Admin feature overview |
| What data do you have? | Feature list for admin |

---

## Weekend / Holiday Behavior

Any schedule-related query asked on **Saturday or Sunday** returns:

> "It's Saturday/Sunday! No classes today — enjoy your holiday!"

This applies to all roles (student, faculty, admin) for these intents:
- next_class
- today_schedule

Room queries still work on weekends (all rooms show as available).

---

## Semantic Understanding Examples

The system doesn't need exact keywords. These all work:

| What you say | What the system understands |
|---|---|
| "How am I doing?" | CGPA query |
| "Am I scoring well?" | CGPA query |
| "Am I attending regularly?" | Attendance query |
| "What am I studying?" | Courses query |
| "How are my academics?" | Full summary |
| "Show my progress" | Full summary |
| "How's everything?" | Full summary |
| "GPA?" | CGPA query |
| "Doing okay?" | CGPA query |
| "Any class soon?" | Next class query |
| "Where can I sit?" | Empty rooms query |

---

## Follow-up Queries (Context-Aware)

The system remembers your last 5 messages. You can ask follow-ups:

1. "How's my attendance in Advanced Coding?" → 90%
2. "What about AOS?" → Uses context, returns AOS attendance
3. "Who teaches it?" → Uses context, returns AOS faculty

---

## Tips

- **Voice works best in Chrome/Edge** (Web Speech API)
- **Speak naturally** — the AI handles informal language, abbreviations, and misspellings
- **Quick query buttons** on the student dashboard provide one-click common questions
- **Conversation history** is available via the History button
- **Stop Speaking** button appears when TTS is active
- **Refreshing the page** automatically stops any ongoing TTS
