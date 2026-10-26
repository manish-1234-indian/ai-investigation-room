## 📌 Project Overview & Deadlines

* **Project Name:** AI Mystery Room


* **Core Concept:** An AI-powered web application where users create and solve mysteries generated using Gemini. Players investigate suspects, uncover clues, request hints, and identify the culprit.


* **Project Submission Link:** [https://bit.ly/ai-mystery-room-sub-form](https://www.google.com/search?q=https://bit.ly/ai-mystery-room-sub-form)[cite: 18]
* **Project Deadline:** 2nd November, 11:59 PM[cite: 18]

---

## 🛠️ Phase 1: Create a Detailed Spec Sheet (`SPEC.md`)

Before writing code, a comprehensive `SPEC.md` file must be created to serve as a blueprint[cite: 18]. It includes:

1. **Project Requirements:** Overview, problem statement, target users, core/optional features, tech stack (React, Vite, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, Gemini API), and deliverables[cite: 18].
2. **User Flow:**
* Open website $\rightarrow$ Enter mystery premise & select difficulty $\rightarrow$ Gemini generates content $\rightarrow$ Investigate & discover clues $\rightarrow$ Request hints $\rightarrow$ Accuse a suspect $\rightarrow$ View verdict, culprit, explanation, and score $\rightarrow$ Restart[cite: 18, 19].


3. **UI and Page Specifications:**
* **Home:** Intro & start button[cite: 19].
* **Create Mystery:** Premise input & difficulty selector[cite: 19].
* **Investigation Room:** Story, suspect cards, clues, hints, progress[cite: 19].
* **Accusation:** Suspect selection & submission[cite: 19].
* **Results:** Verdict, score, culprit, explanation[cite: 19].


4. **Backend & Database Design:** Suggested API endpoints include:
* `POST /api/cases` (Generate mystery)[cite: 19]
* `GET /api/cases/:id` (Retrieve active mystery)[cite: 19]
* `POST /api/cases/:id/clues/:clueId/discover` (Discover a clue)[cite: 19]
* `POST /api/cases/:id/hints` (Request a hint)[cite: 19]
* `POST /api/cases/:id/accuse` (Submit accusation)[cite: 19]
* `GET /api/cases/:id/result` (Retrieve completed result)[cite: 19]
* *Security Rule:* Keep the culprit and solution hidden on the backend until the accusation is submitted[cite: 19].


5. **AI Behavior & Scoring Rules:**
* **Difficulty Matrix:**
* **Easy:** 3 Suspects, 5 Clues, 2 Hints[cite: 20]
* **Medium:** 4 Suspects, 7 Clues, 3 Hints[cite: 20]
* **Hard:** 5 Suspects, 9 Clues, 3 Hints[cite: 20]


* **Scoring Logic:** Correct accusation grants Easy: 100, Medium: 150, Hard: 200 points. Each clue found: +5 points. Each hint used: -10 points (Minimum score: 0)[cite: 20].


6. **Acceptance Criteria:** Conditions ensuring feature completeness, robust error handling, and deployment functionality[cite: 21].

---

## 💻 Phase 2: Set Up the Project

Instructions for initializing the workspace:

* **Frontend Setup (React + Vite):**
```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios

```


* **Backend Setup (Express + MongoDB):**
```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv mongoose @google/genai zod
npm install --save-dev nodemon

```


* **Environment Variables (`backend.env`):** Configure `PORT`, `MONGODB_URI`, `GEMINI_API_KEY`, and `CLIENT_URL` securely without exposing secrets to GitHub[cite: 21].

---

## ⚡ Phase 3: Build the Application

* Build incrementally following the `SPEC.md`[cite: 21].
* Set up Express/MongoDB, integrate Gemini for structured data generation, validate outputs, build React views, and wire up clues, hints, accusations, and scoring logic[cite: 21].

---

## 🚀 Phase 4: Test and Deploy

* Verify edge cases, invalid AI responses, and API failures[cite: 21, 22].
* Deploy the backend to a hosting provider, set up MongoDB Atlas, and deploy the frontend to **Vercel**[cite: 22].

---

## 📋 Final Submission Checklist

1. Finalized `SPEC.md`[cite: 22]
2. Fully built and tested application[cite: 22]
3. Deployed application tested live[cite: 22]
4. **Required Submissions:** GitHub Repository link and Live Website URL via the submission form[cite: 22].