const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Register a new student
router.post('/register', async (req, res) => {
  const { name, email, password, university_name, department, year_of_study, answers, interests } = req.body;

  if (!name || !email || !password || !university_name || !department || !year_of_study) {
    return res.status(400).json({ error: 'All fields (name, email, password, university_name, department, year_of_study) are mandatory.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'A student with this email is already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Choose a random cool default avatar
    const avatars = ['mario', 'luigi', 'peach', 'toad', 'yoshi'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    // Insert user into database
    const result = await db.runAsync(`
      INSERT INTO users (name, email, password, university_name, department, year_of_study, avatar, xp, level, coins)
      VALUES (?, ?, ?, ?, ?, ?, ?, 100, 1, 10)
    `, [name, email, hashedPassword, university_name, department, year_of_study, randomAvatar]);

    const userId = result.lastID;

    let hasCompletedTest = false;
    let psychometric = null;
    let initialXp = 100;
    let initialCoins = 10;
    let initialLevel = 1;

    if (answers && interests && Object.keys(answers).length >= 12) {
      const getVal = (id) => parseInt(answers[id]) || 3;

      // 1. Introversion Score
      const rawIntro = getVal(1) + (6 - getVal(2)) + getVal(3);
      const introversion_score = Math.round(((rawIntro - 3) / 12) * 10);

      // 2. Teamwork Score
      const rawTeam = getVal(4) + (6 - getVal(5)) + getVal(6);
      const teamwork_score = Math.round(((rawTeam - 3) / 12) * 10);

      // 3. Study Style Score
      const rawStudy = getVal(7) + (6 - getVal(8)) + getVal(9);
      const study_style_score = Math.round(((rawStudy - 3) / 12) * 10);

      // 4. Social Score
      const rawSocial = getVal(10) + (6 - getVal(11)) + getVal(12);
      const social_score = Math.round(((rawSocial - 3) / 12) * 10);

      const tags = [];
      if (introversion_score >= 6) tags.push('Quiet Thinker');
      else tags.push('Social Butterfly');

      if (teamwork_score >= 6) tags.push('Team Player');
      else tags.push('Solo Player');

      if (study_style_score >= 6) tags.push('Consistent Planner');
      else tags.push('Chaos Crammer');

      if (social_score >= 6) tags.push('Active Mingler');
      else tags.push('Quiet Studier');

      const compatibility_tags = tags.join(',');
      const interestsStr = (interests || []).join(',');

      // Store in DB
      await db.runAsync(`
        INSERT INTO psychometric_results (user_id, introversion_score, teamwork_score, study_style_score, social_score, interests, compatibility_tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, introversion_score, teamwork_score, study_style_score, social_score, interestsStr, compatibility_tags]);

      // Add stage rewards for the test!
      initialXp += 200;
      initialCoins += 20;
      initialLevel = Math.floor(initialXp / 500) + 1;

      // Update the user's starting XP, level, and coins
      await db.runAsync(`
        UPDATE users SET xp = ?, level = ?, coins = ? WHERE id = ?
      `, [initialXp, initialLevel, initialCoins, userId]);

      hasCompletedTest = true;
      psychometric = {
        user_id: userId,
        introversion_score,
        teamwork_score,
        study_style_score,
        social_score,
        interests: interestsStr,
        compatibility_tags
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, university_name },
      process.env.JWT_SECRET || 'super_mario_secret_campus_sync_key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Student registered successfully! Welcome to CampusSync!',
      token,
      user: {
        id: userId,
        name,
        email,
        university_name,
        department,
        year_of_study,
        avatar: randomAvatar,
        xp: initialXp,
        level: initialLevel,
        coins: initialCoins,
        hasCompletedTest,
        psychometric
      }
    });

  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ 
      error: 'Server error during student registration.',
      details: error.message,
      stack: error.stack
    });
  }
});

// Login student
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Check if they completed psychometric test
    const psychometric = await db.getAsync('SELECT * FROM psychometric_results WHERE user_id = ?', [user.id]);
    const hasCompletedTest = !!psychometric;

    const token = jwt.sign(
      { id: user.id, email: user.email, university_name: user.university_name },
      process.env.JWT_SECRET || 'super_mario_secret_campus_sync_key',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Logged in successfully! Let us sync!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        university_name: user.university_name,
        department: user.department,
        year_of_study: user.year_of_study,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        coins: user.coins,
        hasCompletedTest,
        psychometric: psychometric || null
      }
    });

  } catch (error) {
    console.error('Error logging in student:', error);
    res.status(500).json({ 
      error: 'Server error during student login.',
      details: error.message,
      stack: error.stack
    });
  }
});

// Get current user profile details
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.getAsync(`
      SELECT id, name, email, university_name, department, year_of_study, avatar, xp, level, coins, created_at 
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const psychometric = await db.getAsync('SELECT * FROM psychometric_results WHERE user_id = ?', [req.user.id]);
    const hasCompletedTest = !!psychometric;

    res.json({
      ...user,
      hasCompletedTest,
      psychometric: psychometric || null
    });
  } catch (error) {
    console.error('Error getting student profile:', error);
    res.status(500).json({ error: 'Server error retrieving profile.' });
  }
});

// Update Profile (Avatar)
router.put('/profile', authMiddleware, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) {
    return res.status(400).json({ error: 'Avatar selection is required.' });
  }

  try {
    await db.runAsync('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
    res.json({ message: 'Character avatar updated!', avatar });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Server error updating avatar.' });
  }
});

// Reward XP & Coins (Gamified element)
router.post('/reward', authMiddleware, async (req, res) => {
  const { xpGained, coinsGained } = req.body;

  if (xpGained === undefined || coinsGained === undefined) {
    return res.status(400).json({ error: 'XP and coins values are required.' });
  }

  try {
    const user = await db.getAsync('SELECT xp, level, coins FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let newXp = user.xp + xpGained;
    let newCoins = user.coins + coinsGained;
    
    // Level up calculation: e.g. every 500 XP is 1 level
    let newLevel = Math.floor(newXp / 500) + 1;
    let levelUp = newLevel > user.level;

    await db.runAsync(`
      UPDATE users SET xp = ?, level = ?, coins = ? WHERE id = ?
    `, [newXp, newLevel, newCoins, req.user.id]);

    res.json({
      message: levelUp ? 'LEVEL UP! Super Star status achieved!' : 'XP and Coins earned!',
      xp: newXp,
      level: newLevel,
      coins: newCoins,
      levelUp
    });
  } catch (error) {
    console.error('Error rewarding student:', error);
    res.status(500).json({ error: 'Server error updating achievements.' });
  }
});

module.exports = router;
