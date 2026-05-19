import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import { 
  Award, Calendar, BookOpen, Clock, Compass, 
  MessageSquare, UserCheck, Star, Sparkles, CheckSquare, Square
} from 'lucide-react';

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

const Dashboard = () => {
  const { user, token, gainReward } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Instagram-style state updates
  const [quests, setQuests] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [toast, setToast] = useState(null);
  const [postLikes, setPostLikes] = useState({ quests: false, classes: false });

  // Floating notifications handler
  const handleFeedAction = async (postKey, action, subjectName) => {
    if (action === 'like') {
      const alreadyLiked = postLikes[postKey];
      setPostLikes(prev => ({ ...prev, [postKey]: !alreadyLiked }));
      
      if (!alreadyLiked) {
        setToast(`❤️ You liked ${subjectName}! Gained +5 XP!`);
        await gainReward(5, 0); // Trigger database rewards
      } else {
        setToast(`💔 Unliked ${subjectName}`);
      }
    } else if (action === 'comment') {
      const commentText = prompt("Type your comment to share with your study group:", "Let's sync up!");
      if (commentText) {
        setToast(`💬 Commented: "${commentText}" on ${subjectName}! Gained +10 XP!`);
        await gainReward(10, 0);
      }
    } else if (action === 'share') {
      setToast(`✈️ Shared timetable info for ${subjectName}! Gained +1 Gold Coin!`);
      await gainReward(0, 1);
    }

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Fetch schedules
        const schedRes = await fetch('http://localhost:5001/api/schedules', { headers });
        let schedData = [];
        if (schedRes.ok) {
          schedData = await schedRes.json();
          setSchedules(schedData);
        }

        // 2. Fetch matches (if test completed)
        let matchesData = { allMatches: [] };
        if (user.hasCompletedTest) {
          const matchRes = await fetch('http://localhost:5001/api/matching', { headers });
          if (matchRes.ok) {
            matchesData = await matchRes.json();
            setMatches(matchesData.allMatches.slice(0, 5)); // Grab top 5 for stories
          }
        }

        // 3. Formulate dynamic quests based on live DB state
        const schedulePlanned = schedData.length >= 3;
        const testDone = user.hasCompletedTest;
        const levelUp = user.level > 1;

        setQuests([
          { id: 1, text: 'Unlock matching by finishing Personality Test', points: '200 XP', done: testDone },
          { id: 2, text: 'Populate your timetable with 3+ courses', points: '150 XP', done: schedulePlanned },
          { id: 3, text: 'Achieve Level 2 by gaining Star Points', points: '100 XP', done: levelUp },
          { id: 4, text: 'Interact with peers to earn Gold Coins', points: 'Daily', done: user.coins > 10 }
        ]);

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, token]);

  if (loading) return <LoadingScreen text="ENTERING CAMPUS CASTLE..." />;

  // Filter schedules to today's day (or next day)
  const getDaysClasses = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    // If weekend or empty, default to Monday
    const targetDay = (today === 'Saturday' || today === 'Sunday') ? 'Monday' : today;
    
    return {
      day: targetDay,
      classes: schedules.filter(s => s.day === targetDay).sort((a,b) => a.start_time.localeCompare(b.start_time))
    };
  };

  const todayClasses = getDaysClasses();

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3.5rem', transition: 'background-color 0.3s' }} className="mario-sky">
      {/* Floating clouds overlay (automatically styles dark sky in dark mode) */}
      <div className="clouds-container">
        <div className="cloud cloud-small"></div>
        <div className="cloud cloud-medium"></div>
        <div className="cloud cloud-large"></div>
      </div>

      <Navbar />

      {/* Floating Retro RPG Toast Notifications */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 5000,
          background: 'var(--accent-yellow)',
          border: '4px solid var(--nes-black)',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '4px 4px 0px #000',
          animation: 'starBounce 0.5s ease-in-out infinite alternate',
          fontFamily: 'var(--font-retro)',
          fontSize: '0.75rem',
          color: 'var(--nes-black)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⭐</span> {toast}
        </div>
      )}

      {/* Full-Screen Instagram-Style Story Overlay */}
      {activeStory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.95)', // Sleek backdrop blur
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="retro-panel" style={{
            maxWidth: '420px',
            width: '100%',
            backgroundColor: 'var(--cloud-white)',
            border: '4px solid var(--nes-black)',
            boxShadow: '8px 8px 0px var(--nes-black)',
            borderRadius: '16px',
            padding: '1.8rem',
            position: 'relative'
          }}>
            {/* Instagram story indicator segment lines */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.2rem' }}>
              <div style={{ height: '4px', flex: 1, backgroundColor: 'var(--primary-red)', borderRadius: '2px' }}></div>
              <div style={{ height: '4px', flex: 1, backgroundColor: 'var(--accent-yellow)', borderRadius: '2px' }}></div>
              <div style={{ height: '4px', flex: 1, backgroundColor: '#cbd5e1', borderRadius: '2px' }}></div>
            </div>

            {/* Close Button */}
            <button 
              onClick={() => setActiveStory(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                border: '3px solid var(--nes-black)',
                background: 'var(--cloud-white)',
                fontSize: '1rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0px #000'
              }}
              className="retro-font"
            >
              ✕
            </button>

            {/* Profile Header */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: '3.5rem',
                background: '#ffffff',
                border: '4px solid var(--nes-black)',
                borderRadius: '50%',
                width: '85px',
                height: '85px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '3px 3px 0px rgba(0,0,0,0.15)'
              }}>
                {getAvatarEmoji(activeStory.avatar)}
              </div>
              <div>
                <h2 className="retro-font" style={{ fontSize: '0.95rem', color: 'var(--primary-red)', marginBottom: '3px' }}>
                  {activeStory.name}
                </h2>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                  🎓 {activeStory.department}
                </div>
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-retro)', color: 'var(--accent-green)', marginTop: '4px' }}>
                  ⚡ {activeStory.scores.total}% COMPATIBILITY
                </div>
              </div>
            </div>

            {/* Story Details Card */}
            <div className="retro-panel" style={{
              background: '#effbeb',
              padding: '1rem',
              border: '3px solid var(--nes-black)',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              color: 'var(--nes-black)'
            }}>
              <h4 className="retro-font" style={{ fontSize: '0.65rem', color: 'var(--accent-green)', marginBottom: '0.5rem' }}>
                🧠 PSYCHOMETRIC SYNC PROFILE
              </h4>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#334155' }}>
                ⭐ <b>Introversion Sync:</b> {activeStory.scores.personality}% Synced<br />
                📚 <b>Study Habit:</b> {Array.isArray(activeStory.compatibility_tags) ? (activeStory.compatibility_tags[1] || 'Balanced Planner') : 'Balanced Planner'}<br />
                ❤️ <b>Interests:</b> {Array.isArray(activeStory.interests) ? activeStory.interests.join(', ') : (activeStory.interests || 'coding, gaming')}<br />
                👥 <b>Badges:</b> {Array.isArray(activeStory.compatibility_tags) ? activeStory.compatibility_tags.join(', ') : (activeStory.compatibility_tags || 'Student Learner')}
              </p>
            </div>

            {/* IG Direct Message Call-to-action */}
            <button 
              onClick={() => {
                setActiveStory(null);
                navigate('/social');
              }}
              className="retro-btn retro-btn-yellow"
              style={{ width: '100%', padding: '10px', fontSize: '0.8rem' }}
            >
              💬 SLIDE INTO DMs / START CHAT
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', position: 'relative', zIndex: 10 }}>
        
        {/* ========================================================
           📸 INSTAGRAM-STYLE "CAMPUS STORIES" ROW
           ======================================================== */}
        <div className="retro-panel" style={{
          padding: '0.8rem 1.2rem',
          marginBottom: '1.5rem',
          border: '4px solid var(--nes-black)',
          backgroundColor: 'var(--cloud-white)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          borderRadius: '12px'
        }}>
          <div style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-retro)',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>📸 CAMPUS STORIES (TOP COMPATIBILITY)</span>
            <span style={{ fontSize: '0.55rem', background: 'var(--primary-red)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>LIVE</span>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '1.2rem',
            overflowX: 'auto',
            padding: '0.5rem 0',
            scrollbarWidth: 'none', /* Firefox */
          }} className="stories-container">
            
            {/* Self Story Bubble */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: '70px' }}>
              <div style={{
                padding: '3px',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #fbd000, #e52521)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--nes-black)'
              }}>
                <div style={{
                  background: 'var(--cloud-white)',
                  borderRadius: '50%',
                  width: '55px',
                  height: '55px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  border: '1px solid #ccc'
                }}>
                  {getAvatarEmoji(user.avatar)}
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>You</span>
            </div>

            {/* Suggested Study Buddy Stories */}
            {user.hasCompletedTest && matches.length > 0 ? (
              matches.map(match => (
                <div 
                  key={match.id} 
                  onClick={() => setActiveStory(match)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: '70px' }}
                  className="shake-on-hover"
                >
                  <div style={{
                    padding: '3px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #ec4899, #f43f5e, #eab308)', // Beautiful pink-red-yellow story gradient
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--nes-black)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{
                      background: 'var(--cloud-white)',
                      borderRadius: '50%',
                      width: '55px',
                      height: '55px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                      border: '1px solid #ccc'
                    }}>
                      {getAvatarEmoji(match.avatar)}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>
                    {match.name.split(' ')[0]} 🔥
                  </span>
                </div>
              ))
            ) : (
              // Fictional locked placeholder bubbles
              ['luigi', 'toad', 'yoshi', 'peach'].map(name => (
                <div 
                  key={name}
                  onClick={() => navigate('/personality')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: '70px', opacity: 0.8 }}
                >
                  <div style={{
                    padding: '3px',
                    borderRadius: '50%',
                    background: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--nes-black)'
                  }}>
                    <div style={{
                      background: '#e2e8f0',
                      borderRadius: '50%',
                      width: '55px',
                      height: '55px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      border: '1px solid #ccc'
                    }}>
                      🔒
                    </div>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', marginTop: '4px', color: '#64748b' }}>Unlock Story</span>
                </div>
              ))
            )}

          </div>
        </div>

        {/* ========================================================
           FEED CONTENT SECTION: Profiles & Instagram-Style Posts
           ======================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 350px) 1fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'stretch' }}>
          
          {/* LEFT COLUMN: Student Profile Card */}
          <div className="contra-profile-panel animate-block" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.8rem' }}>
            {/* Tactical hazard stripes at top */}
            <div className="contra-hazard-strip"></div>
            
            {/* Player 1 Badge Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', width: '100%' }}>
              <span className="contra-badge contra-badge-red">P1 STATUS</span>
              <span className="retro-font" style={{ fontSize: '0.6rem', color: 'var(--accent-yellow)', textShadow: '0 0 4px var(--accent-yellow)' }}>ONLINE ⚡</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%' }}>
              <div style={{ 
                fontSize: '3rem', 
                background: '#1b1f2b', 
                border: '3px solid var(--accent-yellow)',
                borderRadius: '50%',
                width: '75px',
                height: '75px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0px 0px 10px var(--accent-yellow)'
              }}>
                {getAvatarEmoji(user.avatar)}
              </div>

              <div style={{ overflow: 'hidden' }}>
                <h2 style={{ fontSize: '0.95rem', color: '#ffffff', textShadow: '0px 0px 6px rgba(255,255,255,0.6)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.name}
                </h2>
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-retro)', color: 'var(--mario-peach)', marginTop: '4px', fontWeight: 'bold' }}>
                  YEAR: {user.year_of_study || '3rd Year'}
                </div>
              </div>
            </div>

            {/* University Tag */}
            <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
              <span className="contra-badge contra-badge-gold" style={{ fontSize: '0.52rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                🏰 {user.university_name}
              </span>
            </div>

            {/* Carbon Fiber stats block */}
            <div className="contra-stats-box" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', color: '#a1a1aa', marginBottom: '4px' }}>
                <span>ENERGY (XP)</span>
                <span style={{ color: 'var(--accent-yellow)' }}>{user.xp} XP</span>
              </div>
              
              {/* Segmented LED Energy cells */}
              <div className="contra-led-bar">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const percentage = (user.xp % 500) / 500;
                  const litCells = Math.max(1, Math.round(percentage * 10));
                  return (
                    <div 
                      key={idx} 
                      className={`contra-led-cell ${idx < litCells ? 'lit' : ''}`}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 'bold', color: '#ffffff', marginTop: '6px' }}>
                <span style={{ color: '#94a3b8' }}>COMBAT LEVEL</span>
                <span style={{ color: 'var(--primary-red)', textShadow: '0 0 5px var(--primary-red)' }}>LV.{user.level}</span>
              </div>
            </div>

            {/* Tactical steel actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem', width: '100%' }}>
              <Link to="/personality" className="retro-btn retro-btn-red" style={{ flex: 1, padding: '8px', fontSize: '0.65rem' }}>
                RETAKE TEST
              </Link>
              <Link to="/schedule" className="retro-btn retro-btn-yellow" style={{ flex: 1, padding: '8px', fontSize: '0.65rem', boxShadow: '2px 2px 0px #000000' }}>
                EDIT PLANS
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Quests styled as Instagram Feed Post */}
          <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '12px' }}>
            {/* Post Header */}
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', borderBottom: '3px solid var(--nes-black)', backgroundColor: 'var(--cloud-white)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏆</span>
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--nes-black)' }}>
                    @campussync_quests
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Castle Quest Board • Level 1-1</span>
                </div>
              </div>
              <span style={{ fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>•••</span>
            </div>

            {/* Post Content */}
            <div style={{ padding: '1.2rem', backgroundColor: 'var(--feed-content-bg)', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {quests.map(quest => (
                <div 
                  key={quest.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.8rem 1rem',
                    border: '3px solid var(--nes-black)',
                    borderRadius: '8px',
                    backgroundColor: quest.done ? 'var(--quest-done-bg)' : 'var(--cloud-white)',
                    transform: quest.done ? 'translate(2px, 2px)' : 'none',
                    boxShadow: quest.done ? 'none' : '2px 2px 0px #000',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {quest.done ? (
                      <CheckSquare size={20} color="var(--accent-green)" />
                    ) : (
                      <Square size={20} color="#777" />
                    )}
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      textDecoration: quest.done ? 'line-through' : 'none',
                      color: quest.done ? '#666' : '#222'
                    }}>
                      {quest.text}
                    </span>
                  </div>
                  
                  <span className="retro-font" style={{ 
                    fontSize: '0.65rem', 
                    color: quest.done ? 'var(--accent-green)' : '#999' 
                  }}>
                    {quest.points}
                  </span>
                </div>
              ))}
            </div>

            {/* Post Footer Interaction Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', borderTop: '3px solid var(--nes-black)', backgroundColor: 'var(--cloud-white)' }}>
              <div style={{ display: 'flex', gap: '1.2rem' }}>
                <button 
                  onClick={() => handleFeedAction('quests', 'like', 'Campus Quests')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: 0 }}
                  title="Like Quests"
                >
                  {postLikes.quests ? '❤️' : '🤍'}
                </button>
                <button 
                  onClick={() => handleFeedAction('quests', 'comment', 'Campus Quests')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: 0 }}
                  title="Comment"
                >
                  💬
                </button>
                <button 
                  onClick={() => handleFeedAction('quests', 'share', 'Campus Quests')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: 0 }}
                  title="Share / Sync"
                >
                  ✈️
                </button>
              </div>
              <div className="retro-font" style={{ fontSize: '0.6rem', color: '#64748b' }}>
                {postLikes.quests ? '1,201 LIKES' : '1,200 LIKES'}
              </div>
            </div>
          </div>

        </div>

        {/* MIDDLE SECTION: Classes Glance Feed Post & Personality Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'stretch' }}>
          
          {/* Classes Glance styled as Instagram Feed Post */}
          <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '12px' }}>
            {/* Post Header */}
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', borderBottom: '3px solid var(--nes-black)', backgroundColor: 'var(--cloud-white)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎒</span>
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--nes-black)' }}>
                    @{user.name.split(' ')[0].toLowerCase()}_classes
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    {todayClasses.day}'s Class Feed • {user.university_name}
                  </span>
                </div>
              </div>
              <Link to="/schedule" style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--secondary-blue)', textDecoration: 'none', fontFamily: 'var(--font-retro)' }}>
                FULL MAP →
              </Link>
            </div>

            {/* Post Content */}
            <div style={{ padding: '1.2rem', backgroundColor: 'var(--feed-content-bg)', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {todayClasses.classes.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                  <Calendar size={32} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>No classes scheduled for {todayClasses.day}!</p>
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>Click 'FULL MAP' to add academic classes.</p>
                </div>
              ) : (
                todayClasses.classes.map(item => (
                  <div 
                    key={item.id}
                    style={{
                      border: '2px solid var(--nes-black)',
                      borderRadius: '8px',
                      padding: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--feed-item-bg)'
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e293b' }}>{item.subject_name}</h4>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        👨‍🏫 {item.faculty_name || 'TBD'} • Room: <b>{item.classroom}</b>
                      </span>
                    </div>
                    
                    <div className="retro-font" style={{ fontSize: '0.6rem', background: 'var(--nes-black)', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}>
                      {item.start_time} - {item.end_time}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Post Footer Interaction Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', borderTop: '3px solid var(--nes-black)', backgroundColor: 'var(--cloud-white)' }}>
              <div style={{ display: 'flex', gap: '1.2rem' }}>
                <button 
                  onClick={() => handleFeedAction('classes', 'like', `${todayClasses.day}'s Timetable`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: 0 }}
                  title="Like Classes"
                >
                  {postLikes.classes ? '❤️' : '🤍'}
                </button>
                <button 
                  onClick={() => handleFeedAction('classes', 'comment', `${todayClasses.day}'s Timetable`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: 0 }}
                  title="Comment"
                >
                  💬
                </button>
                <button 
                  onClick={() => handleFeedAction('classes', 'share', `${todayClasses.day}'s Timetable`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: 0 }}
                  title="Share / Sync"
                >
                  ✈️
                </button>
              </div>
              <div className="retro-font" style={{ fontSize: '0.6rem', color: '#64748b' }}>
                {postLikes.classes ? '81 LIKES' : '80 LIKES'}
              </div>
            </div>
          </div>

          {/* Personality Insight Panel */}
          <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', display: 'flex', flexDirection: 'column', borderRadius: '12px' }}>
            <h2 className="retro-font" style={{ fontSize: '0.9rem', color: 'var(--accent-green)', marginBottom: '1rem' }}>
              PSYCHOMETRIC METRICS 🧠
            </h2>

            {user.hasCompletedTest && user.psychometric ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                
                {/* Custom Tags */}
                <div>
                  <h3 style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    Active Personality Badges
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.2rem' }}>
                    {user.psychometric.compatibility_tags ? user.psychometric.compatibility_tags.split(',').map(tag => (
                      <span 
                        key={tag} 
                        style={{
                          fontFamily: 'var(--font-retro)',
                          fontSize: '0.55rem',
                          background: 'var(--primary-blue)',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: '1.5px solid var(--nes-black)',
                          boxShadow: '1.5px 1.5px 0px #000'
                        }}
                      >
                        🏷️ {tag}
                      </span>
                    )) : 'Student Learner'}
                  </div>
                </div>

                {/* Score Chart Glances */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {/* Introversion */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 'bold' }}>
                      <span>Introvert vs Extrovert</span>
                      <span>{user.psychometric.introversion_score}/10</span>
                    </div>
                    <div className="mario-progress-container" style={{ height: '8px' }}>
                      <div className="mario-progress-bar progress-red" style={{ width: `${user.psychometric.introversion_score * 10}%` }}></div>
                    </div>
                  </div>

                  {/* Teamwork */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 'bold' }}>
                      <span>Teamwork inclination</span>
                      <span>{user.psychometric.teamwork_score}/10</span>
                    </div>
                    <div className="mario-progress-container" style={{ height: '8px' }}>
                      <div className="mario-progress-bar progress-blue" style={{ width: `${user.psychometric.teamwork_score * 10}%` }}></div>
                    </div>
                  </div>
                </div>

                <Link to="/personality" className="retro-btn" style={{ fontSize: '0.65rem', padding: '6px', textAlign: 'center', marginTop: 'auto' }}>
                  Analyze Full Scores
                </Link>

              </div>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem 1rem' }}>
                <Sparkles size={32} className="star-bounce" style={{ color: 'var(--accent-yellow)', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Personality Locked!</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', marginBottom: '1rem' }}>Take the psychometric test to discover study tags.</p>
                <Link to="/personality" className="retro-btn retro-btn-yellow" style={{ fontSize: '0.7rem' }}>
                  START PSYCHO QUEST
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM ROW: TOP MATCH RECOMMENDATIONS */}
        <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 className="retro-font" style={{ fontSize: '0.9rem', color: 'var(--brick-brown)' }}>
              SUGGESTED STUDY BUDDIES AT {user.university_name.toUpperCase()}
            </h2>
            <Link to="/social" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--secondary-blue)', textDecoration: 'none' }}>
              Open Match Deck →
            </Link>
          </div>

          {!user.hasCompletedTest ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold', marginBottom: '1rem' }}>
                Study recommendations are locked until you clear the Personality Test!
              </p>
              <Link to="/personality" className="retro-btn retro-btn-red">
                TAKE PSYCHO TEST NOW
              </Link>
            </div>
          ) : matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                No other matching students registered at your university yet. Share the app with class buddies to synchronize schedules! 🏰
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {matches.slice(0, 3).map(match => (
                <div 
                  key={match.id}
                  style={{
                    border: '3px solid var(--nes-black)',
                    borderRadius: '8px',
                    padding: '0.8rem 1rem',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  className="shake-on-hover"
                >
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.8rem' }}>{getAvatarEmoji(match.avatar)}</span>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{match.name.split(' ')[0]}</h4>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {match.department.substring(0, 15)}...
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="retro-font" style={{ fontSize: '0.55rem', color: 'var(--accent-green)', display: 'block', marginBottom: '4px' }}>
                      {match.scores.total}% SYNCED
                    </span>
                    
                    <button 
                      onClick={() => navigate('/social')}
                      className="retro-btn"
                      style={{ padding: '4px 8px', fontSize: '0.6rem', backgroundColor: 'var(--accent-yellow)' }}
                    >
                      CONNECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
