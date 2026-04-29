# Exam Module Implementation

## 1) Backend Folder Structure

- server/src/models/Exam.js
- server/src/models/ExamQuestion.js
- server/src/models/ExamAttempt.js
- server/src/models/ExamAnswer.js
- server/src/controllers/exam.controller.js
- server/src/routes/exam.routes.js
- server/src/validation/request.validation.js (exam validators added)
- server/src/app.js (exam route mounted)
- server/src/models/Grade.js (examAttempt relation added)

## 2) Roles and Permissions

- super_admin (platform admin): full access
- school_admin: same exam workflow permissions as teacher
- teacher: exam create/manage and text answer manual grading
- director: exam results visibility
- student: active exam view, start, submit, own attempt view

Rule implemented:
- Teacher and school_admin cannot re-grade already manually graded text answer.
- super_admin can override/re-grade.

## 3) REST API Endpoints

Base: /api/exams

### Common
- GET /server-time

### Staff (teacher, school_admin, super_admin; director has view only)
- GET /manage
- POST /
- POST /:examId/questions
- PATCH /:examId/publish
- GET /:examId/results
- PATCH /answers/:answerId/manual-grade

### Student
- GET /active
- POST /:examId/start
- GET /attempts/:attemptId
- POST /attempts/:attemptId/submit

## 4) MongoDB Schema Mapping

### exams
- id
- title
- school
- class
- subject
- durationMinutes
- startTime
- endTime
- isPublished
- createdByUser
- createdByTeacher
- createdByRole

### questions
- id
- exam
- school
- class
- questionText
- type (test|text)
- options[]
- correctAnswer
- points
- order

### attempts
- id
- exam
- student
- school
- class
- startedAt
- expiresAt
- finishedAt
- status
- autoScore
- manualScore
- totalScore
- maxScore
- isFinalScore
- submittedAnswersCount
- timeSpentSeconds

### answers
- id
- attempt
- exam
- question
- student
- school
- type
- answer
- isCorrect
- needsManualReview
- awardedScore
- maxScore
- evaluationMode
- evaluatedByUser
- evaluatedAt
- gradingComment

## 5) Core Workflow Logic

### START EXAM
- Checks student school/class scope
- Checks exam is published and current time is between start and end
- Checks existing attempt:
  - if in_progress and not expired -> returns existing attempt
  - otherwise reject (MVP one attempt only)
- Creates attempt with expiresAt = min(now + duration, exam endTime)

### SUBMIT EXAM
- Backend checks attempt ownership and status in_progress
- Backend checks timeout using expiresAt
- Auto checks test answers
- Marks text answers for manual review
- Calculates auto score and updates attempt
- If no manual pending:
  - finalizes attempt and upserts Grade (for overall rating)
- If manual pending:
  - status = awaiting_manual_review

### MANUAL GRADE (TEXT)
- Only staff roles with exam scope can grade
- Teacher/school_admin cannot re-grade an already graded answer
- super_admin can override
- Recalculates attempt totals and status
- When all manual answers graded, finalizes and upserts Grade

## 6) Frontend Pages List (Recommended)

- Teacher/SchoolAdmin: ExamListManage page
- Teacher/SchoolAdmin: ExamCreate page
- Teacher/SchoolAdmin: ExamQuestionBuilder page
- Teacher/SchoolAdmin: ExamResultMonitor page
- Student: ActiveExamList page
- Student: ExamAttempt page (timer + questions)
- Student: ExamResult page
- Director: ExamAnalytics page (read-only)

## 7) Timer and Anti-Cheat Notes

- Timer sync:
  - Backend returns serverTime and remainingSeconds on start/attempt fetch
  - Frontend timer should derive from backend serverTime
- Anti-cheat optional:
  - Frontend can detect tab switch visibility change
  - Send warnings counter to backend as future extension

## 8) MVP Constraints Implemented

- One student one attempt per exam (unique index)
- Backend time enforcement
- Test auto-check + text manual grading
- Final score persistence
- Director and school_admin results visibility
