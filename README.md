# CampusSync 🏰⭐

**CampusSync** is a highly engaging, gamified, Mario-inspired student community web application. Designed for university students, it combines a nostalgic retro NES-style interface with a production-grade full-stack architecture to help students schedule courses, find study buddies with identical classes or free time-slots, complete personality assessments, and chat in real-time.

---

## 🎮 Gamified Aesthetics & Features

*   **Retro NES Mario Theme**: Pixel-art buttons, thick blocky shadow panels, floating background clouds, and character badges.
*   **XP & Leveling System**: Earn +50 XP for planning classes, +200 XP for personality assessments, and +100 XP for connecting with peers. Level up to display high status on cards!
*   **Spinning Gold Coins**: Accumulate coins by completing tasks.
*   **Selectable Character Avatars**: Swap between Mario 🔴, Luigi 🟢, Peach 🌸, Toad 🍄, and Yoshi 🦖.

---

## 🛠️ Technology Stack

*   **Frontend**: React JS with JSX, React Router, Context API, Lucide Icons, Vanilla CSS (Custom retro design system).
*   **Backend**: Node.js, Express.js REST API, Socket.io (Real-time Messaging & Statuses), JWT Session Tokens, bcrypt password hashing.
*   **Database**: SQLite (Zero-config development database using standard raw SQL normalization and heavy SQL joins). Easily portable to MySQL or PostgreSQL.

---

## 🗄️ Database Schema Design

The database is normalized to ensure data integrity and query efficiency. Below is the SQL representation of the database tables:

```sql
-- 1. Users Table (Core account information & gamified stats)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  university_name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  year_of_study VARCHAR(50) NOT NULL,
  avatar VARCHAR(50) DEFAULT 'mario',
  xp INT DEFAULT 100,
  level INT DEFAULT 1,
  coins INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Schedules Table (Color-coded weekly course schedules)
CREATE TABLE schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  day VARCHAR(50) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  classroom VARCHAR(100) NOT NULL,
  faculty_name VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Psychometric Results Table (12-Question personality scores and tags)
CREATE TABLE psychometric_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  introversion_score INT NOT NULL,  -- Scale 0-10
  teamwork_score INT NOT NULL,      -- Scale 0-10
  study_style_score INT NOT NULL,   -- Scale 0-10
  social_score INT NOT NULL,        -- Scale 0-10
  interests TEXT,                   -- Comma-separated hobbies
  compatibility_tags TEXT,          -- Comma-separated badges
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Friendships Table (Social network bonds)
CREATE TABLE friendships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(sender_id, receiver_id)
);

-- 5. Chats Table (Real-time message logs)
CREATE TABLE chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🧠 SQL Matching Algorithm Logic

CampusSync utilizes heavy **SQL JOIN** operations to compute compatible students from the same university. The algorithm grades compatibility based on four segments:

### 1. Same University Constraint (Mandatory Isolation)
```sql
SELECT u.* FROM users u WHERE u.university_name = ? AND u.id != ?
```

### 2. Exact Shared Classes Overlap (INNER JOIN)
Finds classmates who are attending the exact same course at the same time:
```sql
SELECT 
  s2.user_id AS match_user_id,
  s1.subject_name AS shared_subject,
  s1.day,
  s1.start_time
FROM schedules s1
INNER JOIN schedules s2 ON s1.day = s2.day 
  AND s1.start_time = s2.start_time 
  AND s1.end_time = s2.end_time
  AND LOWER(s1.subject_name) = LOWER(s2.subject_name)
WHERE s1.user_id = ? AND s2.user_id != ?
```

### 3. Personality Similarity Index (LEFT JOIN)
Integrates psychometric scores to evaluate compatibility using absolute differences:
```sql
SELECT 
  u.id, u.name, 
  p.introversion_score, p.teamwork_score, p.study_style_score, p.social_score
FROM users u
LEFT JOIN psychometric_results p ON u.id = p.user_id
WHERE u.university_name = ?
```
*Mathematical Score (40% Weight)*:  
`Diff = |my_intro - peer_intro| + |my_team - peer_team| + |my_study - peer_study| + |my_social - peer_social|`  
`Similarity% = (1 - (Diff / 40)) * 100`

### 4. Shared Free-Time Windows
Dividing the Mon-Fri academic week into 25 blocks (5 per day), we find slots where **both** students have no scheduled classes, denoting slots they can meet and study together.

---

## 🚀 Local Installation & Running Guide

Ensure you have **Node.js (v18+)** and **npm** installed on your system.

### Step 1: Clone & Navigate
Place the files into your directory:
`C:\Users\ADMIN\Desktop\New folder\commusync`

### Step 2: Set Up Backend
1.  Navigate into backend folder:
    ```bash
    cd backend
    ```
2.  Install dependencies (Express, SQLite, Socket.io, JWT, bcrypt):
    ```bash
    npm install
    ```
3.  Create `.env` file (pre-configured):
    ```env
    PORT=5000
    JWT_SECRET=super_mario_secret_campus_sync_key
    ```
4.  Start backend service (It will auto-initialize the SQLite database and seed 5 Mario-themed students at "Mushroom Kingdom University"):
    ```bash
    node server.js
    ```

### Step 3: Set Up Frontend
1.  Open a new terminal window and navigate into the frontend folder:
    ```bash
    cd frontend
    ```
2.  Install packages (React, React Router, Framer Motion, Socket.io-client, Lucide Icons):
    ```bash
    npm install
    ```
3.  Launch development server:
    ```bash
    npm run dev
    ```
4.  Open the displayed localhost URL in your browser (typically `http://localhost:5173`).

---

## 🎮 Testing Sandbox (Quick Logins)

To evaluate matches, schedules, and chat systems instantly, log in using any of the following seeded accounts (all passwords are **`password123`**):

*   **Mario Jumpman**: `mario@mku.edu` (Computer Science, 3rd Year) - *High study activity*
*   **Luigi Jumpman**: `luigi@mku.edu` (Computer Science, 3rd Year) - *Shares 2 classes with Mario*
*   **Princess Peach**: `peach@mku.edu` (Business, 4th Year) - *High Level leader*
*   **Yoshi T-Rex**: `yoshi@mku.edu` (Biology, 2nd Year) - *Shares Botany with Luigi*
*   **Bowser Koopa**: `bowser@koopa.edu` (Koopa University) - *Will NOT show in Mushroom Kingdom matching list, proving mandatory university filtering!*

---

## 🌐 Production Deployment Instructions

### 1. Database Migration (MySQL or PostgreSQL)
1.  Establish a managed SQL instance on Render, Railway, or AWS RDS.
2.  Import the schema from this README into your SQL database.
3.  Replace the `backend/database.js` connection module with a pool manager like `knex` or standard `mysql2` client:
    ```javascript
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    ```

### 2. Deploying Backend REST API
1.  Host on **Render**, **Railway**, or **Heroku**.
2.  Add environment variables in host provider dashboard:
    *   `PORT=8080`
    *   `JWT_SECRET=your_production_secure_key`
    *   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (if migrated to MySQL/Postgres).

### 3. Deploying Frontend React Application
1.  Host on **Vercel** or **Netlify**.
2.  Update the api endpoints in React files (e.g. `AuthContext.jsx`, `SocialHub.jsx`) to point to your live backend API URL instead of `http://localhost:5000`.
3.  Trigger Vercel build command: `npm run build` with output directory set to `dist`.

---

**Have fun syncing in the Mushroom Kingdom! 🍄🏰⭐**
