const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Get all schedules for the current student
router.get('/', authMiddleware, async (req, res) => {
  try {
    const schedules = await db.allAsync('SELECT * FROM schedules WHERE user_id = ?', [req.user.id]);
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Server error retrieving schedules.' });
  }
});

// Add a new class to schedule
router.post('/', authMiddleware, async (req, res) => {
  const { subject_name, day, start_time, end_time, classroom, faculty_name } = req.body;

  if (!subject_name || !day || !start_time || !end_time || !classroom) {
    return res.status(400).json({ error: 'All schedule details except faculty name are mandatory.' });
  }

  try {
    // Optional check: detect direct scheduling overlaps for the user themselves
    const overlap = await db.getAsync(`
      SELECT * FROM schedules 
      WHERE user_id = ? AND day = ? AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (? <= start_time AND ? > start_time)
      )
    `, [req.user.id, day, start_time, start_time, end_time, end_time, start_time, end_time]);

    if (overlap) {
      return res.status(400).json({ 
        error: `Schedule conflict! You already have '${overlap.subject_name}' at this time on ${day}.` 
      });
    }

    const result = await db.runAsync(`
      INSERT INTO schedules (user_id, subject_name, day, start_time, end_time, classroom, faculty_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, subject_name, day, start_time, end_time, classroom, faculty_name || '']);

    const newScheduleId = result.lastID;

    // Gamify: Give 50 XP for scheduling a subject!
    const user = await db.getAsync('SELECT xp, level FROM users WHERE id = ?', [req.user.id]);
    const xpGained = 50;
    const newXp = user.xp + xpGained;
    const newLevel = Math.floor(newXp / 500) + 1;
    const levelUp = newLevel > user.level;

    await db.runAsync('UPDATE users SET xp = ?, level = ? WHERE id = ?', [newXp, newLevel, req.user.id]);

    res.status(201).json({
      message: 'Class added to schedule successfully!',
      schedule: {
        id: newScheduleId,
        user_id: req.user.id,
        subject_name,
        day,
        start_time,
        end_time,
        classroom,
        faculty_name
      },
      xpGained,
      levelUp,
      newLevel
    });
  } catch (error) {
    console.error('Error adding schedule:', error);
    res.status(500).json({ error: 'Server error saving class schedule.' });
  }
});

// Update a schedule entry
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { subject_name, day, start_time, end_time, classroom, faculty_name } = req.body;

  if (!subject_name || !day || !start_time || !end_time || !classroom) {
    return res.status(400).json({ error: 'All schedule details except faculty name are mandatory.' });
  }

  try {
    // Check ownership
    const entry = await db.getAsync('SELECT * FROM schedules WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!entry) {
      return res.status(404).json({ error: 'Schedule entry not found or access denied.' });
    }

    // Check overlap with other classes except this one
    const overlap = await db.getAsync(`
      SELECT * FROM schedules 
      WHERE user_id = ? AND day = ? AND id != ? AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (? <= start_time AND ? > start_time)
      )
    `, [req.user.id, day, id, start_time, start_time, end_time, end_time, start_time, end_time]);

    if (overlap) {
      return res.status(400).json({ 
        error: `Schedule conflict! You already have '${overlap.subject_name}' at this time on ${day}.` 
      });
    }

    await db.runAsync(`
      UPDATE schedules 
      SET subject_name = ?, day = ?, start_time = ?, end_time = ?, classroom = ?, faculty_name = ?
      WHERE id = ? AND user_id = ?
    `, [subject_name, day, start_time, end_time, classroom, faculty_name || '', id, req.user.id]);

    res.json({
      message: 'Schedule entry updated successfully!',
      schedule: {
        id: parseInt(id),
        user_id: req.user.id,
        subject_name,
        day,
        start_time,
        end_time,
        classroom,
        faculty_name
      }
    });

  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Server error updating schedule.' });
  }
});

// Delete a schedule entry
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const entry = await db.getAsync('SELECT * FROM schedules WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!entry) {
      return res.status(404).json({ error: 'Schedule entry not found or access denied.' });
    }

    await db.runAsync('DELETE FROM schedules WHERE id = ?', [id]);
    res.json({ message: 'Schedule entry removed successfully.', id: parseInt(id) });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Server error deleting schedule.' });
  }
});

module.exports = router;
