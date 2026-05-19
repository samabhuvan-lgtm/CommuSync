const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// 1. Send friend request
router.post('/friend-request', authMiddleware, async (req, res) => {
  const { receiver_id } = req.body;

  if (!receiver_id) {
    return res.status(400).json({ error: 'Receiver student ID is required.' });
  }

  if (parseInt(receiver_id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot add yourself as a friend! That is a solo player action.' });
  }

  try {
    // Check if friendship already exists
    const existing = await db.getAsync(`
      SELECT * FROM friendships 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `, [req.user.id, receiver_id, receiver_id, req.user.id]);

    if (existing) {
      return res.status(400).json({ 
        error: `Friendship already exists. Status: ${existing.status}`,
        status: existing.status 
      });
    }

    // Insert friendship request as pending
    await db.runAsync(`
      INSERT INTO friendships (sender_id, receiver_id, status)
      VALUES (?, ?, 'pending')
    `, [req.user.id, receiver_id]);

    // Give 10 XP for initiating connection!
    const user = await db.getAsync('SELECT xp, level FROM users WHERE id = ?', [req.user.id]);
    const newXp = user.xp + 10;
    const newLevel = Math.floor(newXp / 500) + 1;
    await db.runAsync('UPDATE users SET xp = ?, level = ? WHERE id = ?', [newXp, newLevel, req.user.id]);

    res.status(201).json({ 
      message: 'Friend request sent! Awaiting response. XP +10!',
      status: 'pending'
    });

  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Server error processing friend request.' });
  }
});

// 2. Accept or Reject friend request
router.put('/friend-request/:friendshipId', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params;
  const { action } = req.body; // 'accepted' or 'rejected'

  if (!action || !['accepted', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Action must be either "accepted" or "rejected".' });
  }

  try {
    // Find the request (make sure current user is the receiver)
    const request = await db.getAsync('SELECT * FROM friendships WHERE id = ?', [friendshipId]);
    
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }

    if (request.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only respond to requests sent to you.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request has already been ${request.status}.` });
    }

    if (action === 'accepted') {
      await db.runAsync('UPDATE friendships SET status = "accepted" WHERE id = ?', [friendshipId]);

      // Gamify: Both users get 100 XP and 10 Coins for sealing a bond!
      await db.runAsync('UPDATE users SET xp = xp + 100, coins = coins + 10 WHERE id = ? OR id = ?', [request.sender_id, request.receiver_id]);
      
      // Update levels if applicable
      const usersToUpdate = [request.sender_id, request.receiver_id];
      for (const uid of usersToUpdate) {
        const u = await db.getAsync('SELECT xp, level FROM users WHERE id = ?', [uid]);
        const calcLevel = Math.floor(u.xp / 500) + 1;
        if (calcLevel > u.level) {
          await db.runAsync('UPDATE users SET level = ? WHERE id = ?', [calcLevel, uid]);
        }
      }

      res.json({ message: 'Friend request accepted! Connection successfully synced! Both players get +100 XP and +10 Coins!', status: 'accepted' });
    } else {
      await db.runAsync('DELETE FROM friendships WHERE id = ?', [friendshipId]);
      res.json({ message: 'Friend request declined.', status: 'none' });
    }

  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Server error responding to friend request.' });
  }
});

// 3. Get list of accepted friends
router.get('/friends', authMiddleware, async (req, res) => {
  try {
    const friends = await db.allAsync(`
      SELECT 
        f.id AS friendship_id,
        u.id AS friend_id,
        u.name,
        u.email,
        u.university_name,
        u.department,
        u.year_of_study,
        u.avatar,
        u.xp,
        u.level,
        p.compatibility_tags
      FROM friendships f
      INNER JOIN users u ON (f.sender_id = u.id OR f.receiver_id = u.id)
      LEFT JOIN psychometric_results p ON u.id = p.user_id
      WHERE f.status = 'accepted' AND u.id != ? AND (f.sender_id = ? OR f.receiver_id = ?)
    `, [req.user.id, req.user.id, req.user.id]);

    const formattedFriends = friends.map(f => ({
      friendship_id: f.friendship_id,
      id: f.friend_id,
      name: f.name,
      email: f.email,
      university_name: f.university_name,
      department: f.department,
      year_of_study: f.year_of_study,
      avatar: f.avatar,
      xp: f.xp,
      level: f.level,
      compatibility_tags: f.compatibility_tags ? f.compatibility_tags.split(',') : []
    }));

    res.json(formattedFriends);
  } catch (error) {
    console.error('Error fetching friends list:', error);
    res.status(500).json({ error: 'Server error retrieving friends list.' });
  }
});

// 4. Get pending requests
router.get('/pending-requests', authMiddleware, async (req, res) => {
  try {
    // Requests received (awaiting acceptance)
    const received = await db.allAsync(`
      SELECT f.id AS friendship_id, u.id AS sender_id, u.name, u.email, u.avatar, u.department
      FROM friendships f
      INNER JOIN users u ON f.sender_id = u.id
      WHERE f.receiver_id = ? AND f.status = 'pending'
    `, [req.user.id]);

    // Requests sent (awaiting response)
    const sent = await db.allAsync(`
      SELECT f.id AS friendship_id, u.id AS receiver_id, u.name, u.email, u.avatar, u.department
      FROM friendships f
      INNER JOIN users u ON f.receiver_id = u.id
      WHERE f.sender_id = ? AND f.status = 'pending'
    `, [req.user.id]);

    res.json({ received, sent });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Server error fetching pending requests.' });
  }
});

// 5. Get chat history with a specific friend
router.get('/chats/:friendId', authMiddleware, async (req, res) => {
  const { friendId } = req.params;

  try {
    // Verify friendship is active
    const friendship = await db.getAsync(`
      SELECT * FROM friendships 
      WHERE status = 'accepted' AND 
            ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
    `, [req.user.id, friendId, friendId, req.user.id]);

    if (!friendship) {
      return res.status(403).json({ error: 'Access denied. You must be accepted friends to chat!' });
    }

    const chats = await db.allAsync(`
      SELECT c.*, u.name AS sender_name, u.avatar AS sender_avatar
      FROM chats c
      INNER JOIN users u ON c.sender_id = u.id
      WHERE (c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?)
      ORDER BY c.timestamp ASC
    `, [req.user.id, friendId, friendId, req.user.id]);

    res.json(chats);
  } catch (error) {
    console.error('Error loading chat history:', error);
    res.status(500).json({ error: 'Server error loading chats.' });
  }
});

// 6. Save a chat message (HTTP Fallback or manual trigger)
router.post('/chats/:friendId', authMiddleware, async (req, res) => {
  const { friendId } = req.params;
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be blank.' });
  }

  try {
    // Verify friendship
    const friendship = await db.getAsync(`
      SELECT * FROM friendships 
      WHERE status = 'accepted' AND 
            ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
    `, [req.user.id, friendId, friendId, req.user.id]);

    if (!friendship) {
      return res.status(403).json({ error: 'You are only allowed to send messages to active friends.' });
    }

    const result = await db.runAsync(`
      INSERT INTO chats (sender_id, receiver_id, message)
      VALUES (?, ?, ?)
    `, [req.user.id, friendId, message]);

    const newChatId = result.lastID;
    const newChatObj = await db.getAsync(`
      SELECT c.*, u.name AS sender_name, u.avatar AS sender_avatar
      FROM chats c
      INNER JOIN users u ON c.sender_id = u.id
      WHERE c.id = ?
    `, [newChatId]);

    // Reward 2 XP per chat message sent to keep students active (capped daily, but simple here)
    await db.runAsync('UPDATE users SET xp = xp + 2 WHERE id = ?', [req.user.id]);

    res.status(201).json(newChatObj);
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Server error saving chat message.' });
  }
});

// 7. Get user's groups
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const groups = await db.allAsync(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
      FROM study_groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `, [req.user.id]);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Server error loading groups.' });
  }
});

// 8. Create a new group
router.post('/groups', authMiddleware, async (req, res) => {
  const { name, description, memberIds } = req.body;
  if (!name || !memberIds || !Array.isArray(memberIds)) {
    return res.status(400).json({ error: 'Name and memberIds are required.' });
  }
  
  try {
    const result = await db.runAsync(
      'INSERT INTO study_groups (name, description, creator_id) VALUES (?, ?, ?)',
      [name, description || '', req.user.id]
    );
    const groupId = result.lastID;
    
    // Add creator
    await db.runAsync('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, req.user.id]);
    
    // Add members
    for (const memberId of memberIds) {
      if (memberId !== req.user.id) {
         await db.runAsync('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, memberId]);
      }
    }
    
    res.status(201).json({ id: groupId, name, description, message: 'Group created successfully!' });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Server error creating group.' });
  }
});

// 9. Get group messages
router.get('/groups/:groupId/chats', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    // Check if member
    const isMember = await db.getAsync('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id]);
    if (!isMember) return res.status(403).json({ error: 'Not a member of this group.' });

    const messages = await db.allAsync(`
      SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
      FROM group_messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.timestamp ASC
    `, [groupId]);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching group chats:', error);
    res.status(500).json({ error: 'Server error loading group chats.' });
  }
});

// 10. Send group message
router.post('/groups/:groupId/chats', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { message } = req.body;
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be blank.' });
  }
  
  try {
    const isMember = await db.getAsync('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id]);
    if (!isMember) return res.status(403).json({ error: 'Not a member of this group.' });

    const result = await db.runAsync(
      'INSERT INTO group_messages (group_id, sender_id, message) VALUES (?, ?, ?)',
      [groupId, req.user.id, message]
    );

    const newMessage = await db.getAsync(`
      SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
      FROM group_messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [result.lastID]);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending group chat:', error);
    res.status(500).json({ error: 'Server error sending group chat.' });
  }
});

module.exports = router;
