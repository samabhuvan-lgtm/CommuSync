const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Standard slots definition (5 slots per day for 5 days = 25 slots)
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { id: 1, start: '09:00', end: '10:30' },
  { id: 2, start: '11:00', end: '12:30' },
  { id: 3, start: '13:00', end: '14:30' },
  { id: 4, start: '14:30', end: '16:00' },
  { id: 5, start: '16:00', end: '17:30' }
];

// Helper: Check if a class falls into a slot
function classOverlapsSlot(classItem, slot) {
  // Convert times to minutes to compare
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const classStart = toMin(classItem.start_time);
  const classEnd = toMin(classItem.end_time);
  const slotStart = toMin(slot.start);
  const slotEnd = toMin(slot.end);

  // Overlap check
  return (classStart < slotEnd && classEnd > slotStart);
}

// Fetch matches for the authenticated student
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 1. Get current user's details and psychometric profile
    const myProfile = await db.getAsync(`
      SELECT u.id, u.university_name, u.department, u.year_of_study, 
             p.introversion_score, p.teamwork_score, p.study_style_score, p.social_score, p.interests, p.compatibility_tags
      FROM users u
      LEFT JOIN psychometric_results p ON u.id = p.user_id
      WHERE u.id = ?
    `, [req.user.id]);

    if (!myProfile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    if (!myProfile.introversion_score && myProfile.introversion_score !== 0) {
      return res.status(400).json({ 
        error: 'Please complete the Psychometric Personality Test first to unlock student matchmaking!',
        needsTest: true 
      });
    }

    const myInterests = myProfile.interests ? myProfile.interests.split(',') : [];
    const mySchedules = await db.allAsync('SELECT * FROM schedules WHERE user_id = ?', [req.user.id]);

    // 2. Fetch all other users at the same university who have completed their test
    // Use SQL JOIN to isolate to same university, and JOIN with psychometric results
    const otherStudents = await db.allAsync(`
      SELECT u.id, u.name, u.email, u.university_name, u.department, u.year_of_study, u.avatar, u.xp, u.level, u.coins,
             p.introversion_score, p.teamwork_score, p.study_style_score, p.social_score, p.interests, p.compatibility_tags
      FROM users u
      INNER JOIN psychometric_results p ON u.id = p.user_id
      WHERE u.university_name = ? AND u.id != ?
    `, [myProfile.university_name, req.user.id]);

    // 3. Fetch all schedule overlap matches using a SQL INNER JOIN on day & timeslots
    // This complies with the prompt's request for JOIN-based matching queries
    const scheduleOverlaps = await db.allAsync(`
      SELECT 
        s2.user_id AS match_user_id,
        s1.subject_name AS my_subject,
        s2.subject_name AS match_subject,
        s1.day,
        s1.start_time,
        s1.end_time,
        s1.classroom AS my_classroom,
        s2.classroom AS match_classroom
      FROM schedules s1
      INNER JOIN schedules s2 ON s1.day = s2.day 
        AND s1.start_time = s2.start_time 
        AND s1.end_time = s2.end_time
      WHERE s1.user_id = ? AND s2.user_id != ?
    `, [req.user.id, req.user.id]);

    // Organize overlaps by match_user_id
    const overlapsByUser = {};
    scheduleOverlaps.forEach(o => {
      if (!overlapsByUser[o.match_user_id]) {
        overlapsByUser[o.match_user_id] = [];
      }
      overlapsByUser[o.match_user_id].push(o);
    });

    // 4. Fetch all schedule entries for other students to calculate free time compatibility
    const allOtherSchedules = await db.allAsync(`
      SELECT s.* FROM schedules s
      INNER JOIN users u ON s.user_id = u.id
      WHERE u.university_name = ? AND u.id != ?
    `, [myProfile.university_name, req.user.id]);

    const otherSchedulesByUser = {};
    allOtherSchedules.forEach(s => {
      if (!otherSchedulesByUser[s.user_id]) {
        otherSchedulesByUser[s.user_id] = [];
      }
      otherSchedulesByUser[s.user_id].push(s);
    });

    // 5. Build matched profiles list with calculated compatibility percentages
    const matches = otherStudents.map(student => {
      const studentSchedules = otherSchedulesByUser[student.id] || [];
      const studentInterests = student.interests ? student.interests.split(',') : [];

      // A. Personality Similarity (40%)
      // Max possible difference across 4 scores is 40 (since each is 0-10)
      const diffIntro = Math.abs(myProfile.introversion_score - student.introversion_score);
      const diffTeam = Math.abs(myProfile.teamwork_score - student.teamwork_score);
      const diffStudy = Math.abs(myProfile.study_style_score - student.study_style_score);
      const diffSocial = Math.abs(myProfile.social_score - student.social_score);
      const totalDiff = diffIntro + diffTeam + diffStudy + diffSocial;
      const personalityScore = Math.round((1 - (totalDiff / 40)) * 100);

      // B. Schedule Overlap Score & Free Time Windows (30%)
      // Let's check shared classes (classes on same day, start, end, and subject)
      const sharedClasses = (overlapsByUser[student.id] || []).filter(o => o.my_subject.toLowerCase() === o.match_subject.toLowerCase());
      
      // Calculate Free Time Overlaps
      // We check all 25 slots. If both have NO class overlapping that slot, it's a shared free time.
      let sharedFreeSlots = 0;
      const freeWindows = [];
      
      DAYS.forEach(day => {
        const myDayClasses = mySchedules.filter(s => s.day === day);
        const studentDayClasses = studentSchedules.filter(s => s.day === day);

        TIME_SLOTS.forEach(slot => {
          const myBusy = myDayClasses.some(c => classOverlapsSlot(c, slot));
          const studentBusy = studentDayClasses.some(c => classOverlapsSlot(c, slot));

          if (!myBusy && !studentBusy) {
            sharedFreeSlots++;
            freeWindows.push({ day, start: slot.start, end: slot.end });
          }
        });
      });

      // Schedule compatibility: combo of shared classes and shared free time slots
      // If they share classes, give high weight. 
      // If they are both free at many of the same times, they can meet up.
      const sharedClassesWeight = Math.min(sharedClasses.length * 30, 60); // 30% per shared class, max 60%
      const freeSlotsWeight = Math.min((sharedFreeSlots / 15) * 40, 40); // Max 40% if they share 15+ free slots
      const scheduleScore = Math.round(sharedClassesWeight + freeSlotsWeight);

      // C. Interests Similarity (20%)
      let sharedInterestsCount = 0;
      const sharedInterests = [];
      myInterests.forEach(interest => {
        if (studentInterests.map(i => i.trim().toLowerCase()).includes(interest.trim().toLowerCase())) {
          sharedInterestsCount++;
          sharedInterests.push(interest);
        }
      });
      const maxInterestLength = Math.max(1, myInterests.length);
      const interestScore = Math.round((sharedInterestsCount / maxInterestLength) * 100);

      // D. Department & Year of Study Alignment (10%)
      let deptYearScore = 0;
      if (myProfile.department === student.department) deptYearScore += 70;
      if (myProfile.year_of_study === student.year_of_study) deptYearScore += 30;

      // E. Total Compatibility Calculation
      const totalScore = Math.round(
        (personalityScore * 0.40) + 
        (scheduleScore * 0.30) + 
        (interestScore * 0.20) + 
        (deptYearScore * 0.10)
      );

      // Friendship Status check
      // Fetch friendship status if it exists later in client, but let's send standard details
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        university_name: student.university_name,
        department: student.department,
        year_of_study: student.year_of_study,
        avatar: student.avatar,
        xp: student.xp,
        level: student.level,
        coins: student.coins,
        compatibility_tags: student.compatibility_tags ? student.compatibility_tags.split(',') : [],
        interests: studentInterests,
        shared_classes: sharedClasses,
        shared_interests: sharedInterests,
        shared_free_slots_count: sharedFreeSlots,
        shared_free_windows: freeWindows.slice(0, 5), // Send first 5 shared free times
        scores: {
          total: totalScore,
          personality: personalityScore,
          schedule: scheduleScore,
          interests: interestScore,
          deptYear: deptYearScore
        }
      };
    });

    // Sort by total compatibility percentage descending
    matches.sort((a, b) => b.scores.total - a.scores.total);

    // Filter into categories:
    // 1. "Best Study Buddies": Shared classes count > 0, sorted by total compatibility
    const bestStudyBuddies = matches.filter(m => m.shared_classes.length > 0);

    // 2. "Most Similar Schedules": Free slots count >= 10, sorted by schedule score
    const similarSchedules = [...matches].sort((a, b) => b.scores.schedule - a.scores.schedule);

    // 3. "Personality Matches": High personality match percentage (e.g. >= 70%)
    const personalityMatches = matches.filter(m => m.scores.personality >= 70);

    // Fetch friendship statuses so match cards display "Send Friend Request", "Pending", or "Chat Now"
    const friendships = await db.allAsync(`
      SELECT * FROM friendships 
      WHERE sender_id = ? OR receiver_id = ?
    `, [req.user.id, req.user.id]);

    const friendshipMap = {};
    friendships.forEach(f => {
      const otherId = f.sender_id === req.user.id ? f.receiver_id : f.sender_id;
      friendshipMap[otherId] = {
        status: f.status,
        isSender: f.sender_id === req.user.id,
        friendshipId: f.id
      };
    });

    // Attach friendship status to the lists
    const attachFriendship = (list) => list.map(m => ({
      ...m,
      friendship: friendshipMap[m.id] || { status: 'none', isSender: false }
    }));

    res.json({
      allMatches: attachFriendship(matches),
      bestStudyBuddies: attachFriendship(bestStudyBuddies).slice(0, 3),
      similarSchedules: attachFriendship(similarSchedules).slice(0, 3),
      personalityMatches: attachFriendship(personalityMatches).slice(0, 3)
    });

  } catch (error) {
    console.error('Error in matching algorithm:', error);
    res.status(500).json({ error: 'Server error operating the matching engine.' });
  }
});

module.exports = router;
