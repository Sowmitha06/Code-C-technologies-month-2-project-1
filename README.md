# Quizzard — Online Quiz & Exam Platform (MERN)
**Features:** quiz creation (admin), timed exams, multiple-choice, automatic result calculation
**Advanced:** leaderboards (per quiz + overall), PDF certificates (PDFKit), analytics dashboard

## Run
Requires Node 18+ and MongoDB.
```
cd server && cp .env.example .env && npm i && npm run seed && npm run dev
cd client && npm i && npm run dev        # http://localhost:5173
```
Admin login after seeding: admin@quiz.com / admin123 (students register from the login screen).
Grading and the timer run on the server: correct answers never reach the browser, and late submissions are rejected.
