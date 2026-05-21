const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbPath;
if (process.env.DATABASE_PATH) {
  // Use a custom database path, e.g., on Render or Railway persistent volumes
  dbPath = process.env.DATABASE_PATH;
  
  // Ensure the target directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (mkdirErr) {
      console.error(`Failed to create directory for database at ${dbDir}:`, mkdirErr);
    }
  }

  // If the database does not exist, copy the seeded/empty database from project directory
  if (!fs.existsSync(dbPath)) {
    const srcPath = path.resolve(__dirname, 'campussync.db');
    try {
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dbPath);
        console.log(`Database copied to custom path ${dbPath} successfully`);
      } else {
        console.log('No source database found to copy, a new empty database will be created at:', dbPath);
      }
    } catch (e) {
      console.error(`Failed to copy database to ${dbPath}:`, e);
    }
  } else {
    console.log(`Database already exists at custom path ${dbPath}`);
  }
} else if (process.env.VERCEL) {
  // On Vercel, we must write to /tmp as the root folder is read-only
  dbPath = '/tmp/campussync.db';
  
  // If the database does not exist in /tmp, copy the seeded/empty database from project directory
  if (!fs.existsSync(dbPath)) {
    const srcPath = path.resolve(__dirname, 'campussync.db');
    try {
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dbPath);
        console.log('Database copied to /tmp successfully');
      } else {
        console.log('No source database found to copy, a new empty database will be created in /tmp');
      }
    } catch (e) {
      console.error('Failed to copy database to /tmp:', e);
    }
  } else {
    console.log('Database already exists in /tmp');
  }
} else {
  // Local development
  dbPath = path.resolve(__dirname, 'campussync.db');
}

let resolveReady;
const readyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

// The exported database interface delegating to either sqlite3 or sql.js
const db = {
  ready: readyPromise,
  runAsync: function (sql, params = []) {
    return activeDb.runAsync(sql, params);
  },
  allAsync: function (sql, params = []) {
    return activeDb.allAsync(sql, params);
  },
  getAsync: function (sql, params = []) {
    return activeDb.getAsync(sql, params);
  }
};

let activeDb;

// Check if we should use WebAssembly sql.js (if on Vercel)
const useSqlJs = !!process.env.VERCEL;

if (useSqlJs) {
  console.log('Initializing SQLite database using sql.js WebAssembly (Vercel safe)');
  const initSqlJs = require('sql.js');
  
  initSqlJs().then(async (SQL) => {
    let dbBuffer;
    if (fs.existsSync(dbPath)) {
      dbBuffer = fs.readFileSync(dbPath);
    } else {
      dbBuffer = Buffer.alloc(0);
    }
    
    const sqljsDb = new SQL.Database(dbBuffer);
    
    const saveToFile = function () {
      try {
        const data = sqljsDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
      } catch (err) {
        console.error('Failed to write database file:', err);
      }
    };
    
    activeDb = {
      runAsync: async function (sql, params = []) {
        const stmt = sqljsDb.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        
        saveToFile();
        
        const lastInsertIdRes = sqljsDb.exec("SELECT last_insert_rowid() AS id;");
        const lastID = lastInsertIdRes[0] && lastInsertIdRes[0].values[0] ? lastInsertIdRes[0].values[0][0] : undefined;
        const changesRes = sqljsDb.exec("SELECT changes() AS count;");
        const changes = changesRes[0] && changesRes[0].values[0] ? changesRes[0].values[0][0] : 0;
        
        return { lastID, changes };
      },
      
      allAsync: async function (sql, params = []) {
        const stmt = sqljsDb.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },
      
      getAsync: async function (sql, params = []) {
        const stmt = sqljsDb.prepare(sql);
        stmt.bind(params);
        let row = undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      }
    };
    
    try {
      await initializeTables();
    } catch (initErr) {
      console.error('Error initializing tables (sql.js):', initErr);
    }
    resolveReady();
  }).catch((err) => {
    console.error('Failed to initialize sql.js:', err);
    resolveReady();
  });
} else {
  // Use standard native sqlite3 for local development
  const sqlite3 = require('sqlite3').verbose();
  
  const sqliteDb = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
      resolveReady();
    } else {
      console.log('Connected to the SQLite database at:', dbPath);
      sqliteDb.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
        if (pragmaErr) console.error('Error enabling foreign keys:', pragmaErr);
      });
      try {
        await initializeTables();
      } catch (initErr) {
        console.error('Error initializing tables:', initErr);
      }
      resolveReady();
    }
  });
  
  activeDb = {
    runAsync: function (sql, params = []) {
      return new Promise((resolve, reject) => {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve(this); // 'this' contains lastID and changes
        });
      });
    },
    
    allAsync: function (sql, params = []) {
      return new Promise((resolve, reject) => {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    },
    
    getAsync: function (sql, params = []) {
      return new Promise((resolve, reject) => {
        sqliteDb.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  };
}

async function initializeTables() {
  try {
    // 1. Users Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        university_name TEXT NOT NULL,
        department TEXT NOT NULL,
        year_of_study TEXT NOT NULL,
        avatar TEXT DEFAULT 'mario',
        xp INTEGER DEFAULT 100,
        level INTEGER DEFAULT 1,
        coins INTEGER DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Schedules Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_name TEXT NOT NULL,
        day TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        classroom TEXT NOT NULL,
        faculty_name TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 3. Psychometric Results Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS psychometric_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        introversion_score INTEGER NOT NULL,
        teamwork_score INTEGER NOT NULL,
        study_style_score INTEGER NOT NULL,
        social_score INTEGER NOT NULL,
        interests TEXT,
        compatibility_tags TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 4. Friendships Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(sender_id, receiver_id)
      )
    `);

    // 5. Chats Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 6. Groups Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS study_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        creator_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 7. Group Members Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 8. Group Messages Table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS group_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('SQL Database tables initialized successfully.');
    // Seeding enabled for local development/running
    await seedSampleData();
  } catch (error) {
    console.error('Error creating database tables:', error);
  }
}

async function seedSampleData() {
  try {
    const userCount = await db.getAsync('SELECT COUNT(*) as count FROM users');
    if (userCount.count > 0) {
      console.log('Database already has data. Skipping seeding.');
      return;
    }

    console.log('Seeding sample data for CampusSync...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create 5 sample students at Mushroom Kingdom University
    const students = [
      {
        name: 'Mario Jumpman',
        email: 'mario@mku.edu',
        password: hashedPassword,
        university_name: 'Mushroom Kingdom University',
        department: 'Computer Science',
        year_of_study: '3rd Year',
        avatar: 'mario',
        xp: 1500,
        level: 5,
        coins: 120,
      },
      {
        name: 'Luigi Jumpman',
        email: 'luigi@mku.edu',
        password: hashedPassword,
        university_name: 'Mushroom Kingdom University',
        department: 'Computer Science',
        year_of_study: '3rd Year',
        avatar: 'luigi',
        xp: 900,
        level: 3,
        coins: 80,
      },
      {
        name: 'Princess Peach',
        email: 'peach@mku.edu',
        password: hashedPassword,
        university_name: 'Mushroom Kingdom University',
        department: 'Business & Management',
        year_of_study: '4th Year',
        avatar: 'peach',
        xp: 2200,
        level: 7,
        coins: 250,
      },
      {
        name: 'Toad T. Stool',
        email: 'toad@mku.edu',
        password: hashedPassword,
        university_name: 'Mushroom Kingdom University',
        department: 'Information Technology',
        year_of_study: '1st Year',
        avatar: 'toad',
        xp: 300,
        level: 1,
        coins: 15,
      },
      {
        name: 'Yoshi T-Rex',
        email: 'yoshi@mku.edu',
        password: hashedPassword,
        university_name: 'Mushroom Kingdom University',
        department: 'Biology',
        year_of_study: '2nd Year',
        avatar: 'yoshi',
        xp: 1100,
        level: 4,
        coins: 95,
      },
      // 1 Bowser at Koopa University to show university isolation filter
      {
        name: 'Bowser Koopa',
        email: 'bowser@koopa.edu',
        password: hashedPassword,
        university_name: 'Koopa University',
        department: 'Computer Science',
        year_of_study: '4th Year',
        avatar: 'bowser',
        xp: 3000,
        level: 10,
        coins: 500,
      }
    ];

    const userIds = [];
    for (const student of students) {
      const result = await db.runAsync(`
        INSERT INTO users (name, email, password, university_name, department, year_of_study, avatar, xp, level, coins)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        student.name,
        student.email,
        student.password,
        student.university_name,
        student.department,
        student.year_of_study,
        student.avatar,
        student.xp,
        student.level,
        student.coins
      ]);
      userIds.push({ name: student.name, id: result.lastID });
    }

    console.log('Seeded users:', userIds);

    const mId = userIds.find(u => u.name === 'Mario Jumpman').id;
    const lId = userIds.find(u => u.name === 'Luigi Jumpman').id;
    const pId = userIds.find(u => u.name === 'Princess Peach').id;
    const tId = userIds.find(u => u.name === 'Toad T. Stool').id;
    const yId = userIds.find(u => u.name === 'Yoshi T-Rex').id;
    const bId = userIds.find(u => u.name === 'Bowser Koopa').id;

    // Seed Psychometric Results
    // Score fields: introversion_score, teamwork_score, study_style_score, social_score
    // Scores range from 0-10.
    // Introversion: 0 (Extrovert) to 10 (Introvert)
    // Teamwork: 0 (Solo) to 10 (Team-oriented)
    // Study Style: 0 (Crammer/Last-min) to 10 (Consistent Planner)
    // Social: 0 (Quiet Study) to 10 (Party/Social Studier)
    const psychometrics = [
      {
        user_id: mId,
        introversion: 3, // Extroverted
        teamwork: 8,     // Highly cooperative
        study_style: 6,  // Moderately consistent
        social: 8,       // Very social
        interests: 'gaming,coding,sports,pizza',
        compatibility_tags: 'Extroverted Gamer,Team Player,Active Studier'
      },
      {
        user_id: lId,
        introversion: 8, // Highly Introverted
        teamwork: 7,     // Good team player but quiet
        study_style: 7,  // Good planner
        social: 3,       // Low social preference
        interests: 'gaming,gardening,baking,reading',
        compatibility_tags: 'Quiet Thinker,Cooperative,Solo Player'
      },
      {
        user_id: pId,
        introversion: 2, // Very Extroverted
        teamwork: 9,     // Ultimate leader/team player
        study_style: 9,  // Top organizer
        social: 9,       // Super social
        interests: 'politics,fashion,baking,tennis',
        compatibility_tags: 'Charismatic Leader,Strategic Thinker,Social Butterfly'
      },
      {
        user_id: tId,
        introversion: 4, // Moderately Extroverted
        teamwork: 6,     // Decent teammate
        study_style: 5,  // Dynamic crammer
        social: 6,       // Social preferences
        interests: 'music,hiking,camping,coffee',
        compatibility_tags: 'Casual Helper,Outdoorsy,Social Explorer'
      },
      {
        user_id: yId,
        introversion: 5, // Balanced
        teamwork: 8,     // Very cooperative
        study_style: 7,  // Balanced studier
        social: 7,       // Social preferences
        interests: 'sports,fitness,anime,cooking',
        compatibility_tags: 'Balanced Learner,Sports Fanatic,Team Motivator'
      },
      {
        user_id: bId,
        introversion: 9, // Lone wolf
        teamwork: 1,     // Terrible teamwork
        study_style: 4,  // Chaos crammer
        social: 1,       // Anti-social
        interests: 'gaming,lava,rock music,heavy metal',
        compatibility_tags: 'Lone Wolf,Chaos Crammer,Hard Rocker'
      }
    ];

    for (const p of psychometrics) {
      await db.runAsync(`
        INSERT INTO psychometric_results (user_id, introversion_score, teamwork_score, study_style_score, social_score, interests, compatibility_tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [p.user_id, p.introversion, p.teamwork, p.study_style, p.social, p.interests, p.compatibility_tags]);
    }
    console.log('Seeded psychometric results.');

    // Seed Schedules
    // Let's create some schedule overlaps!
    // Mario & Luigi share Computer Science schedules.
    // Mario & Yoshi have some overlapping times.
    const schedules = [
      // Mario's Schedule (Monday, Wednesday, Friday)
      { user_id: mId, subject: 'Data Structures', day: 'Monday', start: '09:00', end: '10:30', classroom: 'Room 101', faculty: 'Prof. K. T. Stool' },
      { user_id: mId, subject: 'Data Structures', day: 'Wednesday', start: '09:00', end: '10:30', classroom: 'Room 101', faculty: 'Prof. K. T. Stool' },
      { user_id: mId, subject: 'Web Development', day: 'Tuesday', start: '11:00', end: '12:30', classroom: 'Lab 3', faculty: 'Dr. Luigi' },
      { user_id: mId, subject: 'Web Development', day: 'Thursday', start: '11:00', end: '12:30', classroom: 'Lab 3', faculty: 'Dr. Luigi' },
      { user_id: mId, subject: 'Game Design', day: 'Friday', start: '14:00', end: '16:00', classroom: 'Room 404', faculty: 'Miyamoto Sensei' },

      // Luigi's Schedule (Shares Data Structures and Web Development at the same time!)
      { user_id: lId, subject: 'Data Structures', day: 'Monday', start: '09:00', end: '10:30', classroom: 'Room 101', faculty: 'Prof. K. T. Stool' },
      { user_id: lId, subject: 'Data Structures', day: 'Wednesday', start: '09:00', end: '10:30', classroom: 'Room 101', faculty: 'Prof. K. T. Stool' },
      { user_id: lId, subject: 'Web Development', day: 'Tuesday', start: '11:00', end: '12:30', classroom: 'Lab 3', faculty: 'Dr. Luigi' },
      { user_id: lId, subject: 'Web Development', day: 'Thursday', start: '11:00', end: '12:30', classroom: 'Lab 3', faculty: 'Dr. Luigi' },
      { user_id: lId, subject: 'Gardening & Botany', day: 'Friday', start: '10:00', end: '12:00', classroom: 'Greenhouse B', faculty: 'Prof. Yoshi' },

      // Peach's Schedule (Business courses)
      { user_id: pId, subject: 'Kingdom Microeconomics', day: 'Monday', start: '11:00', end: '12:30', classroom: 'Auditorium A', faculty: 'Chancellor Toad' },
      { user_id: pId, subject: 'Kingdom Microeconomics', day: 'Wednesday', start: '11:00', end: '12:30', classroom: 'Auditorium A', faculty: 'Chancellor Toad' },
      { user_id: pId, subject: 'Strategic Diplomacy', day: 'Tuesday', start: '14:00', end: '15:30', classroom: 'Royal Library', faculty: 'Elder Toad' },
      { user_id: pId, subject: 'Strategic Diplomacy', day: 'Thursday', start: '14:00', end: '15:30', classroom: 'Royal Library', faculty: 'Elder Toad' },

      // Toad's Schedule (IT - overlaps in Monday Data Structures and Friday Game Design)
      { user_id: tId, subject: 'Database Management', day: 'Monday', start: '14:00', end: '15:30', classroom: 'Lab 2', faculty: 'Dr. Luigi' },
      { user_id: tId, subject: 'Web Development', day: 'Tuesday', start: '11:00', end: '12:30', classroom: 'Lab 3', faculty: 'Dr. Luigi' }, // Overlap with Mario & Luigi!
      { user_id: tId, subject: 'Game Design', day: 'Friday', start: '14:00', end: '16:00', classroom: 'Room 404', faculty: 'Miyamoto Sensei' }, // Overlap with Mario!

      // Yoshi's Schedule (Biology, and overlaps in Botany)
      { user_id: yId, subject: 'Herbivore Biology', day: 'Monday', start: '10:00', end: '11:30', classroom: 'Room 205', faculty: 'Prof. Yoshi' },
      { user_id: yId, subject: 'Gardening & Botany', day: 'Friday', start: '10:00', end: '12:00', classroom: 'Greenhouse B', faculty: 'Prof. Yoshi' }, // Overlap with Luigi!

      // Bowser's Schedule (Koopa Uni - has Web Development at Koopa)
      { user_id: bId, subject: 'Lava Architecture', day: 'Monday', start: '09:00', end: '11:00', classroom: 'Volcano Lab 1', faculty: 'Kamek' },
      { user_id: bId, subject: 'Lava Architecture', day: 'Wednesday', start: '09:00', end: '11:00', classroom: 'Volcano Lab 1', faculty: 'Kamek' },
      { user_id: bId, subject: 'Web Development', day: 'Tuesday', start: '11:00', end: '12:30', classroom: 'Koopa Lab 1', faculty: 'Kamek' }
    ];

    for (const s of schedules) {
      await db.runAsync(`
        INSERT INTO schedules (user_id, subject_name, day, start_time, end_time, classroom, faculty_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [s.user_id, s.subject, s.day, s.start, s.end, s.classroom, s.faculty]);
    }
    console.log('Seeded class schedules.');

    // Seed friendships
    // Mario & Luigi are accepted friends
    // Mario & Peach have a pending friendship request
    // Toad has sent a request to Luigi
    await db.runAsync(`
      INSERT INTO friendships (sender_id, receiver_id, status)
      VALUES (?, ?, 'accepted')
    `, [mId, lId]);

    await db.runAsync(`
      INSERT INTO friendships (sender_id, receiver_id, status)
      VALUES (?, ?, 'pending')
    `, [mId, pId]);

    await db.runAsync(`
      INSERT INTO friendships (sender_id, receiver_id, status)
      VALUES (?, ?, 'pending')
    `, [tId, lId]);

    console.log('Seeded friendships.');

    // Seed some initial chats between Mario & Luigi
    await db.runAsync(`
      INSERT INTO chats (sender_id, receiver_id, message)
      VALUES (?, ?, 'Hey bro! Let us do some group study today!')
    `, [mId, lId]);

    await db.runAsync(`
      INSERT INTO chats (sender_id, receiver_id, message)
      VALUES (?, ?, 'Sure Mario! I will meet you at Library Room 101 at 4 PM.')
    `, [lId, mId]);

    console.log('Seeded chat history.');
    console.log('Sample data seeding complete!');
  } catch (error) {
    console.error('Error seeding sample data:', error);
  }
}

module.exports = db;
