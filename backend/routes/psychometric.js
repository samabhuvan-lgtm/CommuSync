const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Get psychometric test questions (to ensure frontend and backend align)
router.get('/questions', (req, res) => {
  const questions = [
    { id: 1, text: 'I prefer studying alone in a quiet library rather than in a lively group study room.', category: 'introversion', type: 'direct' },
    { id: 2, text: 'I feel energized after discussing study topics with a large group of classmates.', category: 'introversion', type: 'reversed' },
    { id: 3, text: 'I keep my thoughts to myself during class discussions unless directly asked.', category: 'introversion', type: 'direct' },
    
    { id: 4, text: 'I believe group projects are more productive and enjoyable than individual assignments.', category: 'teamwork', type: 'direct' },
    { id: 5, text: 'I prefer to divide work completely and combine it at the end rather than work collaboratively.', category: 'teamwork', type: 'reversed' },
    { id: 6, text: 'I enjoy explaining complex concepts to classmates who are struggling.', category: 'teamwork', type: 'direct' },
    
    { id: 7, text: 'I start working on assignments the day they are announced rather than waiting until the deadline.', category: 'study_style', type: 'direct' },
    { id: 8, text: 'I prefer dynamic, spur-of-the-moment study sessions over highly structured plans.', category: 'study_style', type: 'reversed' },
    { id: 9, text: 'I write down detailed weekly study goals and stick to them.', category: 'study_style', type: 'direct' },
    
    { id: 10, text: 'I like to take frequent study breaks to chat with friends or play games.', category: 'social', type: 'direct' },
    { id: 11, text: 'I prefer to keep study sessions strictly focused on academic topics without small talk.', category: 'social', type: 'reversed' },
    { id: 12, text: 'I would enjoy joining a campus study club that hosts frequent social meetups.', category: 'social', type: 'direct' }
  ];
  res.json(questions);
});

// Submit psychometric test answers
router.post('/submit', authMiddleware, async (req, res) => {
  const { answers, interests } = req.body; // answers: { "1": 4, "2": 1, ... }, interests: ['gaming', 'coding']

  if (!answers || Object.keys(answers).length < 12) {
    return res.status(400).json({ error: 'Please answer all 12 psychometric questions.' });
  }

  try {
    // Categories and question maps
    // 1-5 scale: Strongly Disagree to Strongly Agree
    const getVal = (id) => parseInt(answers[id]) || 3;

    // 1. Introversion Score (Q1 direct, Q2 reversed, Q3 direct)
    const rawIntro = getVal(1) + (6 - getVal(2)) + getVal(3);
    const introversion_score = Math.round(((rawIntro - 3) / 12) * 10);

    // 2. Teamwork Score (Q4 direct, Q5 reversed, Q6 direct)
    const rawTeam = getVal(4) + (6 - getVal(5)) + getVal(6);
    const teamwork_score = Math.round(((rawTeam - 3) / 12) * 10);

    // 3. Study Style Score (Q7 direct, Q8 reversed, Q9 direct)
    const rawStudy = getVal(7) + (6 - getVal(8)) + getVal(9);
    const study_style_score = Math.round(((rawStudy - 3) / 12) * 10);

    // 4. Social Score (Q10 direct, Q11 reversed, Q12 direct)
    const rawSocial = getVal(10) + (6 - getVal(11)) + getVal(12);
    const social_score = Math.round(((rawSocial - 3) / 12) * 10);

    // Generate tags based on scores
    const tags = [];
    if (introversion_score >= 6) {
      tags.push('Quiet Thinker');
    } else {
      tags.push('Social Butterfly');
    }

    if (teamwork_score >= 6) {
      tags.push('Team Player');
    } else {
      tags.push('Solo Player');
    }

    if (study_style_score >= 6) {
      tags.push('Consistent Planner');
    } else {
      tags.push('Chaos Crammer');
    }

    if (social_score >= 6) {
      tags.push('Active Mingler');
    } else {
      tags.push('Quiet Studier');
    }

    const compatibility_tags = tags.join(',');
    const interestsStr = (interests || []).join(',');

    // Store in DB
    // Insert or update
    await db.runAsync(`
      INSERT INTO psychometric_results (user_id, introversion_score, teamwork_score, study_style_score, social_score, interests, compatibility_tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        introversion_score = excluded.introversion_score,
        teamwork_score = excluded.teamwork_score,
        study_style_score = excluded.study_style_score,
        social_score = excluded.social_score,
        interests = excluded.interests,
        compatibility_tags = excluded.compatibility_tags
    `, [req.user.id, introversion_score, teamwork_score, study_style_score, social_score, interestsStr, compatibility_tags]);

    // Reward player with XP and Coins!
    const user = await db.getAsync('SELECT xp, level, coins FROM users WHERE id = ?', [req.user.id]);
    const xpReward = 200;
    const coinsReward = 20;
    const newXp = user.xp + xpReward;
    const newCoins = user.coins + coinsReward;
    const newLevel = Math.floor(newXp / 500) + 1;
    const levelUp = newLevel > user.level;

    await db.runAsync(`
      UPDATE users SET xp = ?, level = ?, coins = ? WHERE id = ?
    `, [newXp, newLevel, newCoins, req.user.id]);

    res.json({
      message: 'Psychometric test successfully analyzed! Compatibility tags generated!',
      scores: {
        introversion_score,
        teamwork_score,
        study_style_score,
        social_score
      },
      compatibility_tags: tags,
      interests: interests || [],
      xpGained: xpReward,
      coinsGained: coinsReward,
      levelUp,
      newLevel,
      newCoins
    });

  } catch (error) {
    console.error('Error submitting psychometric results:', error);
    res.status(500).json({ error: 'Server error analyzing personality profile.' });
  }
});

// Retrieve user's psychometric scores
router.get('/results', authMiddleware, async (req, res) => {
  try {
    const result = await db.getAsync('SELECT * FROM psychometric_results WHERE user_id = ?', [req.user.id]);
    if (!result) {
      return res.status(404).json({ error: 'No personality scores found for this user.' });
    }
    
    res.json({
      ...result,
      interests: result.interests ? result.interests.split(',') : [],
      compatibility_tags: result.compatibility_tags ? result.compatibility_tags.split(',') : []
    });
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({ error: 'Server error retrieving psychometric profile.' });
  }
});

module.exports = router;
