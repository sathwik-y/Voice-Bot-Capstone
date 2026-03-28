# MongoDB Data Structure Verification

This document describes the expected MongoDB structure for the academic assistant.

## Database: (Your MongoDB Atlas database name)

### Collection: `student`

Each student document should have the following structure:

```json
{
  "_id": "ObjectId(...)",
  "rollNumber": "VU22CSEN0101112",
  "name": "Student Name",
  "email": "student@example.com",
  "cgpa": 8.62,
  "courses": [
    {
      "courseCode": "CSE401",
      "courseName": "Advanced Coding",
      "credits": 3,
      "facultyName": "Dr. Faculty Name",
      "semester": "VIII"
    },
    {
      "courseCode": "CSE402",
      "courseName": "Advanced Operating Systems",
      "credits": 3,
      "facultyName": "Dr. Another Faculty",
      "semester": "VIII"
    }
  ],
  "attendance": [
    {
      "courseCode": "CSE401",
      "courseName": "Advanced Coding",
      "percentage": 85.5,
      "classesAttended": 34,
      "totalClasses": 40
    },
    {
      "courseCode": "CSE402",
      "courseName": "Advanced Operating Systems",
      "percentage": 92.3,
      "classesAttended": 36,
      "totalClasses": 39
    }
  ],
  "grades": [
    {
      "courseCode": "CSE301",
      "courseName": "Data Structures",
      "grade": "A",
      "gradePoints": 9,
      "semester": "VI"
    }
  ]
}
```

## Key Fields Required

1. **rollNumber** (String): Unique identifier matching the user's login
2. **cgpa** (Number): Current CGPA
3. **courses** (Array): Current enrolled courses with faculty information
4. **attendance** (Array): Attendance records per course
5. **grades** (Array): Past course grades (optional)

## Query Examples

The system will query MongoDB like this:

```javascript
db.student.findOne({ rollNumber: "VU22CSEN0101112" })
```

## Fuzzy Matching

The enhanced workflow includes fuzzy matching for course names, so queries like:
- "ML" can match "Machine Learning"
- "AOS" can match "Advanced Operating Systems"
- "attendance in advanced coding" will match the course even if capitalization differs

## Testing Your Data

To verify your MongoDB data is correct:

1. Connect to MongoDB Atlas
2. Run: `db.student.findOne({ rollNumber: "VU22CSEN0101112" })`
3. Ensure all required fields are present
4. Verify course names are clear and match what users might say

## n8n Configuration

Make sure your n8n MongoDB node is configured with:
- Collection: `student`
- Query: `{ "rollNumber": $json.rollNumber }`
- Limit: 1
