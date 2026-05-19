import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import io from 'socket.io-client';
import { 
  Users, MessageCircle, Send, Star, Zap, UserPlus, Check, X, 
  UserCheck, Shield, Sparkles, BookOpen, Clock, Heart, Award
} from 'lucide-react';

const SocialHub = () => {
  const { user, token, gainReward } = useAuth();
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [matchingError, setMatchingError] = useState('');
  
  // Sockets
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Data States
  const [bestStudyBuddies, setBestStudyBuddies] = useState([]);
  const [similarSchedules, setSimilarSchedules] = useState([]);
  const [personalityMatches, setPersonalityMatches] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [studyGroups, setStudyGroups] = useState([]);

  // Active Navigation
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' or 'friends'
  const [activeSubTab, setActiveSubTab] = useState('buddies'); // 'buddies', 'schedules', 'personality'
  
  // Chat State
  const [activeChatFriend, setActiveChatFriend] = useState(null); // friend object
  const [activeChatGroup, setActiveChatGroup] = useState(null); // group object
  const [chats, setChats] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const chatEndRef = useRef(null);

  // Group Creation State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState([]);

  // Load Match suggestions and Friends
  const fetchAllSocialData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // 1. Fetch matching profiles
      const matchRes = await fetch('http://localhost:5001/api/matching', { headers });
      if (matchRes.ok) {
        const matchesData = await matchRes.json();
        setBestStudyBuddies(matchesData.bestStudyBuddies);
        setSimilarSchedules(matchesData.similarSchedules);
        setPersonalityMatches(matchesData.personalityMatches);
        setMatchingError('');
      } else {
        const err = await matchRes.json();
        if (err.needsTest) {
          setMatchingError('needs_test');
        } else {
          setMatchingError('failed');
        }
      }

      // 2. Fetch friends
      const friendsRes = await fetch('http://localhost:5001/api/social/friends', { headers });
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData);
      }

      // 3. Fetch pending requests
      const pendingRes = await fetch('http://localhost:5001/api/social/pending-requests', { headers });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingReceived(pendingData.received);
        setPendingSent(pendingData.sent);
      }

      // 4. Fetch group suggestions
      const groupsRes = await fetch('http://localhost:5001/api/social/groups', { headers });
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setStudyGroups(groupsData);
      }

    } catch (err) {
      console.error('Error fetching social dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSocialData();
  }, [token]);

  // Socket Connection setup
  useEffect(() => {
    if (!user) return;

    // Connect to local Node Socket.io server
    socketRef.current = io('http://localhost:5001');

    // Identify user
    socketRef.current.emit('identify', user.id);

    // Online Users list listener
    socketRef.current.on('online_users', (userIds) => {
      setOnlineUsers(userIds);
    });

    // Realtime chat message receiver
    socketRef.current.on('receive_message', (msg) => {
      // Check if message belongs to active chat
      if (activeChatFriend && 
         ((msg.sender_id === user.id && msg.receiver_id === activeChatFriend.id) || 
          (msg.sender_id === activeChatFriend.id && msg.receiver_id === user.id))) {
        setChats(prev => [...prev, msg]);
      }
      
      // Re-fetch friends to see if order changes or notifications trigger, 
      // and update XP/level since sending rewards 2 XP
      if (msg.sender_id === user.id) {
        gainReward(2, 0); // Mock XP progress locally
      }
    });

    socketRef.current.on('receive_group_message', (msg) => {
      if (activeChatGroup && msg.group_id === activeChatGroup.id) {
        setChats(prev => [...prev, msg]);
      }
      if (msg.sender_id === user.id) {
        gainReward(2, 0);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, activeChatFriend, activeChatGroup]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  // Load chat history with selected friend
  const startChatting = async (friend) => {
    setActiveChatGroup(null);
    setActiveChatFriend(friend);
    setChats([]);
    setActiveTab('friends'); // Switch tab to friends view to show chat

    try {
      const response = await fetch(`http://localhost:5001/api/social/chats/${friend.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const chatHistory = await response.json();
        setChats(chatHistory);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const startChattingGroup = async (group) => {
    setActiveChatFriend(null);
    setActiveChatGroup(group);
    setChats([]);
    setActiveTab('friends');

    socketRef.current?.emit('join_group', group.id);

    try {
      const response = await fetch(`http://localhost:5001/api/social/groups/${group.id}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const chatHistory = await response.json();
        setChats(chatHistory);
      }
    } catch (err) {
      console.error('Failed to load group chat history:', err);
    }
  };

  // Send a chat message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current) return;
    
    if (!activeChatFriend && !activeChatGroup) return;

    if (activeChatFriend) {
      socketRef.current.emit('send_message', {
        senderId: user.id,
        receiverId: activeChatFriend.id,
        message: typedMessage
      });
    } else if (activeChatGroup) {
      socketRef.current.emit('send_group_message', {
        senderId: user.id,
        groupId: activeChatGroup.id,
        message: typedMessage
      });
    }

    setTypedMessage('');
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedFriendsForGroup.length === 0) {
      alert('Enter a group name and select at least one friend!');
      return;
    }
    try {
      const response = await fetch('http://localhost:5001/api/social/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName, memberIds: [...selectedFriendsForGroup, user.id] })
      });
      if (response.ok) {
        alert('Group created successfully! XP +20!');
        setShowCreateGroup(false);
        setNewGroupName('');
        setSelectedFriendsForGroup([]);
        fetchAllSocialData();
      } else {
        alert('Error creating group.');
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  // Send Friend Request
  const handleSendFriendRequest = async (receiverId) => {
    try {
      const response = await fetch('http://localhost:5001/api/social/friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiver_id: receiverId })
      });

      if (response.ok) {
        alert('Friend request sent! XP +10!');
        await fetchAllSocialData();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to send request.');
      }
    } catch (err) {
      console.error('Request error:', err);
    }
  };

  // Accept/Decline Friend Request
  const handleResponseFriendRequest = async (friendshipId, action) => {
    try {
      const response = await fetch(`http://localhost:5001/api/social/friend-request/${friendshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        if (action === 'accepted') {
          alert('Friend request accepted! Connection Synced! XP +100 and COINS +10! ⭐');
        } else {
          alert('Request declined.');
        }
        await fetchAllSocialData();
      }
    } catch (err) {
      console.error('Error answering friend request:', err);
    }
  };

  const getAvatarEmoji = (id) => {
    switch (id) {
      case 'mario': return '🔴';
      case 'luigi': return '🟢';
      case 'peach': return '🌸';
      case 'toad': return '🍄';
      case 'yoshi': return '🦖';
      default: return '🔴';
    }
  };

  if (loading) return <LoadingScreen text="SYNCHRONIZING SOCIAL NETWORK..." />;

  // Filter list based on selected category subtab
  const getSelectedMatches = () => {
    if (activeSubTab === 'buddies') return bestStudyBuddies;
    if (activeSubTab === 'schedules') return similarSchedules;
    return personalityMatches;
  };

  const activeMatches = getSelectedMatches();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0', paddingBottom: '3rem' }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('matches')}
            className={`retro-btn ${activeTab === 'matches' ? 'retro-btn-red' : ''}`}
            style={{ fontSize: '0.85rem', padding: '1rem' }}
          >
            <Users size={16} />
            <span>FIND MATCHES (SAME UNIVERSITY)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('friends')}
            className={`retro-btn ${activeTab === 'friends' ? 'retro-btn-green' : ''}`}
            style={{ fontSize: '0.85rem', padding: '1rem' }}
          >
            <MessageCircle size={16} />
            <span>CHATS & CONNECTIONS ({friends.length})</span>
          </button>
        </div>

        {/* TAB 1: Match deck suggestions */}
        {activeTab === 'matches' && (
          <div>
            
            {/* If user hasn't completed test */}
            {matchingError === 'needs_test' ? (
              <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: '#fffbeb' }}>
                <Star size={48} className="star-bounce" style={{ color: 'var(--accent-yellow)', marginBottom: '1rem' }} />
                <h2 className="retro-font" style={{ fontSize: '1.1rem', color: 'var(--primary-red)', marginBottom: '1rem' }}>
                  MATCHING ENGINE LOCKED 🔒
                </h2>
                <p style={{ maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  To match with students at <b>{user.university_name}</b>, you must first clear the Personality Psychometric stage! Complete the test to calculate your scores.
                </p>
                <a href="/personality" className="retro-btn retro-btn-yellow">
                  TAKE PERSONALITY TEST 🚀
                </a>
              </div>
            ) : (
              <div>
                
                {/* MATCH SUBTABS */}
                <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', padding: '0.8rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', backgroundColor: '#ffffff' }}>
                  <button
                    onClick={() => setActiveSubTab('buddies')}
                    className="retro-btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.7rem',
                      backgroundColor: activeSubTab === 'buddies' ? 'var(--primary-red)' : '#ffffff',
                      color: activeSubTab === 'buddies' ? '#ffffff' : 'var(--nes-black)',
                      boxShadow: activeSubTab === 'buddies' ? 'none' : '2px 2px 0px #000',
                      transform: activeSubTab === 'buddies' ? 'translate(2px, 2px)' : 'none'
                    }}
                  >
                    <BookOpen size={12} />
                    <span>STUDY BUDDIES (SHARED CLASSES)</span>
                  </button>

                  <button
                    onClick={() => setActiveSubTab('schedules')}
                    className="retro-btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.7rem',
                      backgroundColor: activeSubTab === 'schedules' ? 'var(--primary-blue)' : '#ffffff',
                      color: activeSubTab === 'schedules' ? '#ffffff' : 'var(--nes-black)',
                      boxShadow: activeSubTab === 'schedules' ? 'none' : '2px 2px 0px #000',
                      transform: activeSubTab === 'schedules' ? 'translate(2px, 2px)' : 'none'
                    }}
                  >
                    <Clock size={12} />
                    <span>SCHEDULE TWINS (SHARED FREE TIME)</span>
                  </button>

                  <button
                    onClick={() => setActiveSubTab('personality')}
                    className="retro-btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.7rem',
                      backgroundColor: activeSubTab === 'personality' ? 'var(--accent-yellow)' : '#ffffff',
                      color: 'var(--nes-black)',
                      boxShadow: activeSubTab === 'personality' ? 'none' : '2px 2px 0px #000',
                      transform: activeSubTab === 'personality' ? 'translate(2px, 2px)' : 'none'
                    }}
                  >
                    <Heart size={12} />
                    <span>PERSONALITY SYNCED</span>
                  </button>
                </div>

                {/* Match Cards Display */}
                {activeMatches.length === 0 ? (
                  <div className="retro-panel" style={{ border: '3px solid var(--nes-black)', textAlign: 'center', padding: '3rem 1rem' }}>
                    <p style={{ fontSize: '1rem', color: '#666', fontWeight: 'bold' }}>
                      No matches found in this category yet. Keep updating your schedules! 🏰
                    </p>
                  </div>
                ) : (
                  <div className="retro-grid">
                    {activeMatches.map(match => (
                      <div 
                        key={match.id} 
                        className="retro-panel shake-on-hover"
                        style={{ border: '4px solid var(--nes-black)', display: 'flex', flexDirection: 'column', height: '100%', padding: '1.2rem' }}
                      >
                        {/* Upper Details */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '2rem' }}>{getAvatarEmoji(match.avatar)}</span>
                            <div>
                              <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{match.name}</h3>
                              <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: '600' }}>
                                {match.department} • {match.year_of_study}
                              </span>
                            </div>
                          </div>
                          
                          {/* Compatibility Badge */}
                          <div style={{ 
                            fontFamily: 'var(--font-retro)', 
                            fontSize: '0.65rem', 
                            background: 'var(--accent-yellow)', 
                            border: '2px solid var(--nes-black)',
                            padding: '4px 6px',
                            boxShadow: '1px 1px 0px #000',
                            borderRadius: '4px'
                          }}>
                            {match.scores.total}% MATCH
                          </div>
                        </div>

                        {/* Level stats */}
                        <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-retro)', color: 'var(--primary-red)', marginBottom: '0.8rem' }}>
                          <span>LV.{match.level}</span>
                          <span>XP: {match.xp}</span>
                        </div>

                        {/* Personality badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '1rem' }}>
                          {match.compatibility_tags.slice(0, 2).map(tag => (
                            <span 
                              key={tag} 
                              style={{ 
                                fontSize: '0.65rem', 
                                background: '#f5f5f5', 
                                border: '1px solid #ccc', 
                                padding: '2px 8px', 
                                borderRadius: '10px',
                                fontWeight: 'bold'
                              }}
                            >
                              🏷️ {tag}
                            </span>
                          ))}
                        </div>

                        {/* Matching specific logic details */}
                        <div style={{ 
                          backgroundColor: '#f9f9f9', 
                          border: '2px dashed #ccc', 
                          borderRadius: '6px', 
                          padding: '0.6rem',
                          fontSize: '0.75rem',
                          color: '#555',
                          marginBottom: '1.2rem',
                          marginTop: 'auto'
                        }}>
                          {activeSubTab === 'buddies' && (
                            <div>
                              <span style={{ fontWeight: 'bold', color: 'var(--primary-red)' }}>📚 Shared Classes ({match.shared_classes.length}):</span>
                              <div style={{ marginTop: '3px' }}>
                                {match.shared_classes.slice(0, 2).map((c, i) => (
                                  <div key={i}>• {c.my_subject} ({c.day} {c.start_time})</div>
                                ))}
                              </div>
                            </div>
                          )}

                          {activeSubTab === 'schedules' && (
                            <div>
                              <span style={{ fontWeight: 'bold', color: 'var(--primary-blue)' }}>🕒 Free Slots overlap ({match.shared_free_slots_count} slots):</span>
                              <div style={{ marginTop: '3px' }}>
                                Shared free times on: {match.shared_free_windows.length > 0 
                                  ? match.shared_free_windows.slice(0, 2).map(w => `${w.day} ${w.start}`).join(', ') 
                                  : 'Contact them to coordinate!'}
                              </div>
                            </div>
                          )}

                          {activeSubTab === 'personality' && (
                            <div>
                              <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>🧠 Personality scores similarity:</span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', marginTop: '3px' }}>
                                <div>• Study: {match.scores.personality}% match</div>
                                <div>• Interests: {match.shared_interests.slice(0, 2).join(', ') || 'General'}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions button */}
                        {match.friendship.status === 'none' && (
                          <button
                            onClick={() => handleSendFriendRequest(match.id)}
                            className="retro-btn retro-btn-red"
                            style={{ width: '100%', fontSize: '0.75rem' }}
                          >
                            <UserPlus size={14} />
                            <span>CONNECT / BE BUDDY</span>
                          </button>
                        )}

                        {match.friendship.status === 'pending' && match.friendship.isSender && (
                          <button
                            disabled
                            className="retro-btn retro-btn-disabled"
                            style={{ width: '100%', fontSize: '0.75rem' }}
                          >
                            <span>PENDING RESPONCE</span>
                          </button>
                        )}

                        {match.friendship.status === 'pending' && !match.friendship.isSender && (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleResponseFriendRequest(match.friendship.friendshipId, 'accepted')}
                              className="retro-btn retro-btn-green"
                              style={{ flex: 1, padding: '8px', fontSize: '0.7rem' }}
                            >
                              ACCEPT
                            </button>
                            <button
                              onClick={() => handleResponseFriendRequest(match.friendship.friendshipId, 'rejected')}
                              className="retro-btn"
                              style={{ padding: '8px', fontSize: '0.7rem' }}
                            >
                              DECLINE
                            </button>
                          </div>
                        )}

                        {match.friendship.status === 'accepted' && (
                          <button
                            onClick={() => startChatting(match)}
                            className="retro-btn retro-btn-green"
                            style={{ width: '100%', fontSize: '0.75rem' }}
                          >
                            <MessageCircle size={14} />
                            <span>CHAT NOW 💬</span>
                          </button>
                        )}

                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* Study Groups Recommendations Section */}
            <div style={{ marginTop: '3.5rem' }}>
              <h2 className="retro-font" style={{ fontSize: '1.1rem', color: 'var(--primary-blue)', marginBottom: '1.2rem', textAlign: 'center' }}>
                🏰 RECOMMENDED GUILDS & STUDY GROUPS
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {studyGroups.map(group => (
                  <div 
                    key={group.id} 
                    className="retro-panel" 
                    style={{ 
                      border: '3px solid var(--nes-black)',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '1.8rem' }}>{group.badge}</span>
                      <h3 style={{ fontSize: '0.95rem', color: group.themeColor, fontWeight: '800' }}>
                        {group.name}
                      </h3>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.4', marginBottom: '1rem' }}>
                      {group.description}
                    </p>

                    <button 
                      onClick={() => alert(`Joined ${group.name}! XP +20!`)}
                      className="retro-btn"
                      style={{ marginTop: 'auto', padding: '6px 12px', fontSize: '0.7rem', width: '100%' }}
                    >
                      ENTER CASTLE ROOM
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Chats and Connections */}
        {activeTab === 'friends' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 350px) 1fr', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            
            {/* Sidebar lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <button
                onClick={() => setShowCreateGroup(!showCreateGroup)}
                className="retro-btn retro-btn-blue"
                style={{ width: '100%', fontSize: '0.8rem', padding: '10px' }}
              >
                <Users size={14} style={{ marginRight: '5px' }}/> CREATE GROUP CHAT
              </button>

              {showCreateGroup && (
                <div className="retro-panel" style={{ border: '3px solid var(--nes-black)', backgroundColor: '#fffdeb' }}>
                  <h3 className="retro-font" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>NEW GROUP</h3>
                  <input
                    type="text"
                    placeholder="Group Name"
                    className="retro-input"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    style={{ width: '100%', marginBottom: '10px', fontSize: '0.8rem' }}
                  />
                  <div style={{ fontSize: '0.7rem', marginBottom: '5px', fontWeight: 'bold' }}>SELECT BUDDIES:</div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px', border: '2px solid #ccc', padding: '5px' }}>
                    {friends.map(f => (
                      <label key={f.id} style={{ display: 'block', fontSize: '0.75rem', marginBottom: '5px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedFriendsForGroup.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedFriendsForGroup([...selectedFriendsForGroup, f.id]);
                            else setSelectedFriendsForGroup(selectedFriendsForGroup.filter(id => id !== f.id));
                          }}
                          style={{ marginRight: '5px' }}
                        />
                        {getAvatarEmoji(f.avatar)} {f.name}
                      </label>
                    ))}
                  </div>
                  <button className="retro-btn retro-btn-green" onClick={handleCreateGroup} style={{ width: '100%', fontSize: '0.7rem' }}>
                    CONFIRM CREATE
                  </button>
                </div>
              )}
              
              {/* Received Pending Requests */}
              {pendingReceived.length > 0 && (
                <div className="retro-panel" style={{ border: '3px solid var(--nes-black)', backgroundColor: '#fffdeb' }}>
                  <h3 className="retro-font" style={{ fontSize: '0.75rem', color: 'var(--primary-red)', marginBottom: '0.8rem' }}>
                    INCOMING REQUESTS ({pendingReceived.length})
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {pendingReceived.map(req => (
                      <div key={req.friendship_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px dashed #ccc' }}>
                        <span>{getAvatarEmoji(req.avatar)} {req.name.split(' ')[0]}</span>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          <button 
                            onClick={() => handleResponseFriendRequest(req.friendship_id, 'accepted')}
                            style={{ border: 'none', background: 'var(--accent-green)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem' }}
                          >
                            ✓
                          </button>
                          <button 
                            onClick={() => handleResponseFriendRequest(req.friendship_id, 'rejected')}
                            style={{ border: 'none', background: 'var(--primary-red)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem' }}
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div className="retro-panel" style={{ border: '3px solid var(--nes-black)' }}>
                <h3 className="retro-font" style={{ fontSize: '0.8rem', color: 'var(--primary-blue)', marginBottom: '1rem' }}>
                  SYNCED BUDDIES ({friends.length})
                </h3>
                
                {friends.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#777', fontStyle: 'italic' }}>
                    No buddies synced yet. Go check the Match Deck suggestions!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {friends.map(friend => {
                      const isOnline = onlineUsers.includes(friend.id);
                      const isSelected = activeChatFriend && activeChatFriend.id === friend.id;

                      return (
                        <div
                          key={friend.id}
                          onClick={() => startChatting(friend)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#eef5ff' : 'transparent',
                            border: isSelected ? '2px solid var(--secondary-blue)' : '2px solid transparent'
                          }}
                          className="shake-on-hover"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>{getAvatarEmoji(friend.avatar)}</span>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{friend.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#666' }}>LV.{friend.level} • {friend.department.substring(0, 15)}</div>
                            </div>
                          </div>

                          {/* Online Dot */}
                          <div 
                            style={{ 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '50%', 
                              backgroundColor: isOnline ? 'var(--accent-green)' : '#ccc',
                              border: '1px solid #333'
                            }} 
                            title={isOnline ? 'Online now' : 'Offline'}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* Study Groups List */}
              <div className="retro-panel" style={{ border: '3px solid var(--nes-black)' }}>
                <h3 className="retro-font" style={{ fontSize: '0.8rem', color: 'var(--primary-red)', marginBottom: '1rem' }}>
                  MY GROUPS ({studyGroups.length})
                </h3>
                
                {studyGroups.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#777', fontStyle: 'italic' }}>
                    You are not in any groups yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {studyGroups.map(group => {
                      const isSelected = activeChatGroup && activeChatGroup.id === group.id;

                      return (
                        <div
                          key={group.id}
                          onClick={() => startChattingGroup(group)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#fff0f0' : 'transparent',
                            border: isSelected ? '2px solid var(--primary-red)' : '2px solid transparent'
                          }}
                          className="shake-on-hover"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🏰</span>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{group.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#666' }}>{group.member_count} Members</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Chat Container */}
            <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', padding: '0', display: 'flex', flexDirection: 'column', height: '500px', backgroundColor: '#ffffff' }}>
              
              {activeChatFriend || activeChatGroup ? (
                <>
                  {/* Chat Header */}
                  <div style={{ 
                    padding: '0.8rem 1.2rem', 
                    borderBottom: '3px solid var(--nes-black)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: '#f9f9f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.8rem' }}>
                        {activeChatGroup ? '🏰' : getAvatarEmoji(activeChatFriend?.avatar)}
                      </span>
                      <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                          {activeChatGroup ? activeChatGroup.name : activeChatFriend?.name}
                        </h3>
                        <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: '600' }}>
                          {activeChatGroup ? `${activeChatGroup.member_count} Members` : activeChatFriend?.university_name}
                        </span>
                      </div>
                    </div>
                    
                    {!activeChatGroup && (
                      <span className="retro-font" style={{ fontSize: '0.65rem', color: 'var(--accent-green)' }}>
                        {activeChatFriend && onlineUsers.includes(activeChatFriend.id) ? '● ONLINE' : '● OFFLINE'}
                      </span>
                    )}
                  </div>

                  {/* Messages list */}
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '1.2rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    backgroundColor: '#fcfcfc',
                    gap: '0.8rem'
                  }}>
                    {chats.length === 0 ? (
                      <div style={{ margin: 'auto', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                        🏰 No messages yet. Say hello and coordinate some class study!
                      </div>
                    ) : (
                      chats.map((chat) => {
                        const isMe = chat.sender_id === user.id;
                        return (
                          <div 
                            key={chat.id} 
                            className={`chat-bubble ${isMe ? 'chat-bubble-sent' : 'chat-bubble-received'}`}
                            style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
                          >
                            {!isMe && activeChatGroup && (
                              <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 'bold', marginBottom: '2px' }}>
                                {chat.sender_name}
                              </div>
                            )}
                            <div style={{ fontSize: '0.85rem', color: '#333' }}>
                              {chat.message}
                            </div>
                            <span style={{ display: 'block', fontSize: '0.6rem', color: '#999', textAlign: 'right', marginTop: '4px' }}>
                              {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Form input */}
                  <form 
                    onSubmit={handleSendMessage}
                    style={{ 
                      padding: '0.8rem', 
                      borderTop: '3px solid var(--nes-black)', 
                      display: 'flex', 
                      gap: '0.5rem',
                      backgroundColor: '#f9f9f9'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Type a message... (Earn +2 XP!)"
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      style={{ flex: 1, border: '2px solid var(--nes-black)', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.9rem', outline: 'none' }}
                    />
                    <button 
                      type="submit" 
                      className="retro-btn retro-btn-yellow"
                      style={{ padding: '0.6rem 1.2rem' }}
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', padding: '2rem', textAlign: 'center' }}>
                  <MessageCircle size={48} style={{ marginBottom: '1rem', color: '#ccc' }} />
                  <h3 className="retro-font" style={{ fontSize: '0.85rem', color: 'var(--nes-black)', marginBottom: '0.5rem' }}>
                    SELECT BUDDY OR GROUP
                  </h3>
                  <p style={{ fontSize: '0.8rem', maxWidth: '300px' }}>
                    Click an active buddy or a group in your synced list to initialize communication channels!
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default SocialHub;
