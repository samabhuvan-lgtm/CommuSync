import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import { Award, Compass, Star, Smile, Sparkles, CheckSquare, Square } from 'lucide-react';

const PsychometricTest = () => {
  const { user, token, syncProfile, gainReward } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.hasCompletedTest) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);


  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [step, setStep] = useState(1); // 1: Test, 2: Interests, 3: Victory Results
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Results returned from backend after submit
  const [resultsData, setResultsData] = useState(null);

  const INTERESTS_LIST = [
    { id: 'gaming', name: 'Gaming 🎮' },
    { id: 'coding', name: 'Coding 💻' },
    { id: 'sports', name: 'Sports ⚽' },
    { id: 'music', name: 'Music 🎵' },
    { id: 'reading', name: 'Reading 📚' },
    { id: 'baking', name: 'Baking 🍰' },
    { id: 'cooking', name: 'Cooking 🍳' },
    { id: 'hiking', name: 'Hiking 🥾' },
    { id: 'anime', name: 'Anime 💮' },
    { id: 'gardening', name: 'Gardening 🌿' }
  ];

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/psychometric/questions`);
        if (response.ok) {
          const data = await response.json();
          setQuestions(data);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  if (loading) return <LoadingScreen text="BOOTING PSYCHOMETRIC TEST..." />;

  const handleAnswerSelect = (score) => {
    const questionId = questions[currentIdx].id;
    setAnswers(prev => ({ ...prev, [questionId]: score }));

    // Move to next question or interests step
    if (currentIdx < questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, 200);
    } else {
      setTimeout(() => {
        setStep(2); // Go to interests selection
      }, 200);
    }
  };

  const handleInterestToggle = (id) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(prev => prev.filter(item => item !== id));
    } else {
      setSelectedInterests(prev => [...prev, id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) {
      alert('Please select at least one interest to customize your matching profile!');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/psychometric/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers,
          interests: selectedInterests
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResultsData(data);
        await syncProfile(); // update local state
        setStep(3); // Victory screen
      } else {
        const err = await response.json();
        alert(err.error || 'Submission failed.');
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const qPercent = Math.round(((currentIdx) / questions.length) * 100);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0', paddingBottom: '3rem' }}>
      <Navbar />

      <div style={{ maxWidth: '700px', margin: '1.5rem auto', padding: '0 1rem' }}>
        
        {/* STEP 1: Questions */}
        {step === 1 && questions.length > 0 && (
          <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', padding: '2rem' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-red)' }}>
                <Compass className="star-bounce" />
                <span className="retro-font" style={{ fontSize: '0.8rem' }}>PSYCHO TEST</span>
              </div>
              <span className="retro-font" style={{ fontSize: '0.75rem', color: '#666' }}>
                LEVEL 1-{currentIdx + 1} / {questions.length}
              </span>
            </div>

            {/* Timed progress bar */}
            <div className="mario-progress-container" style={{ height: '16px', marginBottom: '2.5rem' }}>
              <div className="mario-progress-bar progress-yellow" style={{ width: `${qPercent}%` }}></div>
            </div>

            {/* Question Text */}
            <div className="retro-panel" style={{ 
              backgroundColor: '#fffdeb', 
              border: '3px solid var(--nes-black)',
              textAlign: 'center',
              padding: '2.2rem 1.5rem',
              marginBottom: '2.5rem',
              minHeight: '130px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--nes-black)', lineHeight: '1.5' }}>
                "{questions[currentIdx].text}"
              </p>
            </div>

            {/* Option blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', padding: '0 0.5rem' }}>
                <span>STRONGLY DISAGREE</span>
                <span>STRONGLY AGREE</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem' }}>
                {[1, 2, 3, 4, 5].map(score => {
                  const isSelected = answers[questions[currentIdx].id] === score;
                  let bg = '#ffffff';
                  if (isSelected) {
                    if (score <= 2) bg = 'var(--primary-red)';
                    else if (score === 3) bg = 'var(--accent-yellow)';
                    else bg = 'var(--accent-green)';
                  }
                  return (
                    <button
                      key={score}
                      onClick={() => handleAnswerSelect(score)}
                      className="retro-btn shake-on-hover"
                      style={{
                        height: '65px',
                        fontSize: '1.3rem',
                        backgroundColor: bg,
                        color: isSelected ? (score === 3 ? '#222' : '#fff') : '#222',
                        boxShadow: isSelected ? 'none' : '4px 4px 0px #000',
                        transform: isSelected ? 'translate(4px, 4px)' : 'none',
                        border: '3px solid var(--nes-black)'
                      }}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Back button */}
            {currentIdx > 0 && (
              <button 
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="retro-btn"
                style={{ marginTop: '2rem', padding: '6px 12px', fontSize: '0.7rem' }}
              >
                ← Back
              </button>
            )}

          </div>
        )}

        {/* STEP 2: Interests Checklist */}
        {step === 2 && (
          <div className="retro-panel" style={{ border: '4px solid var(--nes-black)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>
                SELECT INTERESTS 🎒
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#555' }}>
                Choose your favorite hobbies. We will match you with students sharing these!
              </p>
            </div>

            {/* Interests Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '2rem' }}>
              {INTERESTS_LIST.map(interest => {
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <div
                    key={interest.id}
                    onClick={() => handleInterestToggle(interest.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.9rem 1.2rem',
                      border: '3px solid var(--nes-black)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? 'none' : '3px 3px 0px #000',
                      transform: isSelected ? 'translate(3px, 3px)' : 'none',
                      backgroundColor: isSelected ? '#effbeb' : '#ffffff',
                      userSelect: 'none'
                    }}
                    className="shake-on-hover"
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{interest.name}</span>
                    {isSelected ? (
                      <CheckSquare size={20} color="var(--accent-green)" />
                    ) : (
                      <Square size={20} color="#777" />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setStep(1)} 
                className="retro-btn"
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={submitting || selectedInterests.length === 0}
                className="retro-btn retro-btn-green"
                style={{ flex: 2 }}
              >
                <span>{submitting ? 'PROCESSING...' : 'LOCK IN ANSWERS 🔒'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Victory / Personality Results */}
        {step === 3 && resultsData && (
          <div className="retro-panel" style={{ border: '5px solid var(--nes-black)', padding: '2.5rem 1.5rem', textAlign: 'center', backgroundColor: '#fffbeb' }}>
            
            {/* Victory Badge */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }} className="animated-block">
              <span style={{ fontSize: '3rem' }}>👑</span>
              <div style={{
                position: 'absolute',
                top: -10,
                right: -10,
                fontSize: '1.5rem',
                animation: 'starBounce 1.5s infinite alternate'
              }}>⭐</div>
            </div>

            <h1 className="retro-font" style={{ fontSize: '1.8rem', color: 'var(--primary-red)', marginBottom: '0.5rem', textShadow: '2px 2px 0 #000' }}>
              VICTORY!
            </h1>
            <p className="retro-font" style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginBottom: '1.5rem' }}>
              STAGES CLEARED • LEVEL COMPLETED
            </p>

            {/* Reward Notification Panel */}
            <div className="retro-panel" style={{ 
              border: '3px solid var(--nes-black)', 
              boxShadow: 'none', 
              backgroundColor: 'var(--nes-black)', 
              color: '#ffffff',
              padding: '1rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--accent-yellow)', marginBottom: '0.5rem' }}>
                STAGE REWARDS EARNED
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '1.1rem', fontFamily: 'var(--font-retro)' }}>
                <span style={{ color: '#5cd5fa' }}>+ {resultsData.xpGained} XP</span>
                <span style={{ color: 'var(--accent-yellow)' }}>+ {resultsData.coinsGained} COINS 🟡</span>
              </div>
              {resultsData.levelUp && (
                <div style={{ color: 'var(--primary-red)', marginTop: '8px', animation: 'miniShake 0.5s linear infinite', fontSize: '0.8rem' }}>
                  ⭐ LEVEL UP ACHIEVED! ⭐
                </div>
              )}
            </div>

            {/* Calculated Tags */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.8rem' }}>
                YOUR PERSONALITY BADGES
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem' }}>
                {resultsData.compatibility_tags.map(tag => (
                  <span 
                    key={tag} 
                    style={{
                      fontFamily: 'var(--font-retro)',
                      fontSize: '0.65rem',
                      background: 'var(--primary-blue)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: '2px solid var(--nes-black)',
                      boxShadow: '2px 2px 0px #000'
                    }}
                  >
                    🏆 {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Score Grid details */}
            <div style={{ 
              border: '3px solid var(--nes-black)', 
              borderRadius: '8px', 
              padding: '1.2rem 1rem', 
              backgroundColor: '#fff',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              <h4 className="retro-font" style={{ fontSize: '0.75rem', marginBottom: '1rem', color: '#444', textAlign: 'center' }}>
                PSYCHO SCORES (0-10)
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {/* Introversion */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <span>INTROVERT vs EXTROVERT</span>
                    <span>{resultsData.scores.introversion_score > 5 ? 'Introvert' : 'Extrovert'} ({resultsData.scores.introversion_score}/10)</span>
                  </div>
                  <div className="mario-progress-container" style={{ height: '10px', marginTop: '3px' }}>
                    <div className="mario-progress-bar progress-red" style={{ width: `${resultsData.scores.introversion_score * 10}%` }}></div>
                  </div>
                </div>

                {/* Teamwork */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <span>TEAMWORK INCLINATION</span>
                    <span>{resultsData.scores.teamwork_score > 5 ? 'Cooperative' : 'Solo Player'} ({resultsData.scores.teamwork_score}/10)</span>
                  </div>
                  <div className="mario-progress-container" style={{ height: '10px', marginTop: '3px' }}>
                    <div className="mario-progress-bar progress-blue" style={{ width: `${resultsData.scores.teamwork_score * 10}%` }}></div>
                  </div>
                </div>

                {/* Study Style */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <span>STUDY PATTERNS</span>
                    <span>{resultsData.scores.study_style_score > 5 ? 'Planner' : 'Crammer'} ({resultsData.scores.study_style_score}/10)</span>
                  </div>
                  <div className="mario-progress-container" style={{ height: '10px', marginTop: '3px' }}>
                    <div className="mario-progress-bar progress-yellow" style={{ width: `${resultsData.scores.study_style_score * 10}%` }}></div>
                  </div>
                </div>

                {/* Social */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <span>SOCIAL PREFERENCE</span>
                    <span>{resultsData.scores.social_score > 5 ? 'Active' : 'Quiet'} ({resultsData.scores.social_score}/10)</span>
                  </div>
                  <div className="mario-progress-container" style={{ height: '10px', marginTop: '3px' }}>
                    <div className="mario-progress-bar progress-green" style={{ width: `${resultsData.scores.social_score * 10}%` }}></div>
                  </div>
                </div>

              </div>
            </div>

            <button 
              onClick={() => navigate('/social')}
              className="retro-btn retro-btn-yellow shake-on-hover"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
            >
              <span>FIND COMPATIBLE MATCHES 🚀</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
};

export default PsychometricTest;
