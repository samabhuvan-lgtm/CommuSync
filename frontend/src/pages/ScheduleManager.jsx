import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import { Calendar, Plus, Trash2, Edit3, X, AlertTriangle, BookOpen } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { id: 1, label: '09:00 - 10:30', start: '09:00', end: '10:30' },
  { id: 2, label: '11:00 - 12:30', start: '11:00', end: '12:30' },
  { id: 3, label: '13:00 - 14:30', start: '13:00', end: '14:30' },
  { id: 4, label: '14:30 - 16:00', start: '14:30', end: '16:00' },
  { id: 5, label: '16:00 - 17:30', start: '16:00', end: '17:30' }
];

// Curated list of color maps based on subject names for retro block colors
const getSubjectColor = (subject = '') => {
  const name = subject.toLowerCase();
  if (name.includes('data') || name.includes('comput')) return '#eef5ff'; // Blue theme
  if (name.includes('web') || name.includes('code') || name.includes('dev')) return '#effbeb'; // Green theme
  if (name.includes('design') || name.includes('art') || name.includes('game')) return '#fffdeb'; // Yellow theme
  if (name.includes('math') || name.includes('phys')) return '#ffebec'; // Red theme
  return '#f5f5f5'; // Neutral
};

const ScheduleManager = () => {
  const { token, gainReward } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal Controls
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // Null = Add new, otherwise ID to edit

  // Form State
  const [subjectName, setSubjectName] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [classroom, setClassroom] = useState('');
  const [facultyName, setFacultyName] = useState('');

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const openAddModal = (day = 'Monday', slot = TIME_SLOTS[0]) => {
    setError('');
    setSuccess('');
    setEditingId(null);
    setSubjectName('');
    setSelectedDay(day);
    setStartTime(slot.start);
    setEndTime(slot.end);
    setClassroom('');
    setFacultyName('');
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setError('');
    setSuccess('');
    setEditingId(item.id);
    setSubjectName(item.subject_name);
    setSelectedDay(item.day);
    setStartTime(item.start_time);
    setEndTime(item.end_time);
    setClassroom(item.classroom);
    setFacultyName(item.faculty_name || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectName || !selectedDay || !startTime || !endTime || !classroom) {
      setError('All fields except faculty name are required!');
      return;
    }

    setError('');
    setSuccess('');

    const payload = {
      subject_name: subjectName,
      day: selectedDay,
      start_time: startTime,
      end_time: endTime,
      classroom,
      faculty_name: facultyName
    };

    try {
      let url = `${API_BASE}/api/schedules`;
      let method = 'POST';

      if (editingId) {
        url += `/${editingId}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingId ? 'Class updated!' : 'Class added! XP +50!');
        
        if (!editingId) {
          // Reward XP for scheduling!
          await gainReward(50, 0);
        }

        await fetchSchedules();
        setTimeout(() => setModalOpen(false), 800);
      } else {
        setError(data.error || 'Conflict detected! Try another slot.');
      }
    } catch (err) {
      console.error('Schedule submit error:', err);
      setError('Network error saving class.');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm('Delete this course from your weekly timetable?')) return;

    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/schedules/${editingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Class removed!');
        await fetchSchedules();
        setTimeout(() => setModalOpen(false), 800);
      } else {
        setError('Failed to delete class.');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Helper to find a class matching a day and timeslot
  const findClassAt = (day, slot) => {
    // Converts times to compare
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const slotStart = toMin(slot.start);
    const slotEnd = toMin(slot.end);

    return schedules.find(c => {
      if (c.day !== day) return false;
      const classStart = toMin(c.start_time);
      const classEnd = toMin(c.end_time);
      return (classStart < slotEnd && classEnd > slotStart);
    });
  };

  if (loading) return <LoadingScreen text="LOADING WEEKLY TIMETABLE..." />;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0', paddingBottom: '3rem' }}>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Title Panel */}
        <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', color: 'var(--primary-red)', marginBottom: '0.4rem' }}>
              WEEKLY SCHEDULE 📅
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#555' }}>
              Map out your courses. We'll use these to find peers with shared classes and free slots!
            </p>
          </div>
          <button 
            onClick={() => openAddModal('Monday', TIME_SLOTS[0])}
            className="retro-btn retro-btn-red shake-on-hover"
          >
            <Plus size={16} />
            <span>ADD COURSE</span>
          </button>
        </div>

        {/* Timetable Grid */}
        <div className="retro-panel" style={{ border: '4px solid var(--nes-black)', padding: '1rem', overflowX: 'auto', backgroundColor: '#ffffff' }}>
          
          <div style={{ minWidth: '850px' }}>
            {/* Days Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', gap: '4px', marginBottom: '4px' }}>
              <div className="timetable-header">TIME</div>
              {DAYS.map(day => (
                <div key={day} className="timetable-header">{day.toUpperCase()}</div>
              ))}
            </div>

            {/* Time Rows */}
            {TIME_SLOTS.map(slot => (
              <div key={slot.id} style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', gap: '4px', marginBottom: '4px' }}>
                
                {/* Time range label column */}
                <div className="timetable-time-col">
                  {slot.label}
                </div>

                {/* Day cells */}
                {DAYS.map(day => {
                  const classItem = findClassAt(day, slot);

                  return (
                    <div 
                      key={day} 
                      className="timetable-cell"
                      onClick={() => {
                        if (classItem) {
                          openEditModal(classItem);
                        } else {
                          openAddModal(day, slot);
                        }
                      }}
                    >
                      {classItem ? (
                        <div 
                          className="class-card" 
                          style={{ 
                            backgroundColor: getSubjectColor(classItem.subject_name),
                            border: '3px solid var(--nes-black)'
                          }}
                        >
                          <div style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {classItem.subject_name}
                          </div>
                          
                          <div style={{ fontSize: '0.65rem', color: '#666', marginTop: 'auto' }}>
                            🏰 {classItem.classroom}
                          </div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                            👨‍🏫 {classItem.faculty_name ? classItem.faculty_name.split(' ').pop() : 'TBD'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ 
                          height: '100%', 
                          width: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          opacity: 0.15,
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }} className="shake-on-hover">
                          ➕ FREE
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            ))}
          </div>

        </div>

        {/* Timetable Legend Tips */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
          <div className="retro-panel" style={{ flex: 1, minWidth: '280px', border: '3px solid var(--nes-black)', padding: '1rem' }}>
            <h3 className="retro-font" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--primary-blue)' }}>
              ⚡ SCHEDULE STRATEGY
            </h3>
            <ul style={{ fontSize: '0.85rem', paddingLeft: '1.2rem', color: '#555', lineHeight: '1.5' }}>
              <li>Classes on identical timeslots are checked for matching studies.</li>
              <li>Free slots (where you have no classes) are compared with matching students to find <b>shared free windows</b>!</li>
              <li>Schedules only match with students inside your same college.</li>
            </ul>
          </div>
          
          <div className="retro-panel" style={{ flex: 1, minWidth: '280px', border: '3px solid var(--nes-black)', padding: '1rem' }}>
            <h3 className="retro-font" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--accent-green)' }}>
              🎮 GAMIFIED PLANNING
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.5' }}>
              Every class you schedule acts as a quest completion! Earn <b>+50 XP</b> for planning a class. Power up your student level to look highly active on peer match cards!
            </div>
          </div>
        </div>

      </div>

      {/* Course Modal (Add / Edit) */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div className="retro-panel" style={{ 
            maxWidth: '480px', 
            width: '100%', 
            border: '5px solid var(--nes-black)',
            backgroundColor: '#ffffff'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 className="retro-font" style={{ fontSize: '1rem', color: 'var(--primary-red)' }}>
                {editingId ? 'EDIT COURSE' : 'NEW COURSE'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <X size={20} color="var(--nes-black)" />
              </button>
            </div>

            {/* Error alerts */}
            {error && (
              <div style={{ 
                backgroundColor: '#fff0f0', 
                border: '3px solid var(--primary-red)', 
                color: 'var(--primary-red)', 
                padding: '0.6rem', 
                borderRadius: '6px', 
                fontSize: '0.8rem', 
                marginBottom: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Success alerts */}
            {success && (
              <div style={{ 
                backgroundColor: '#effbeb', 
                border: '3px solid var(--accent-green)', 
                color: 'var(--accent-green)', 
                padding: '0.6rem', 
                borderRadius: '6px', 
                fontSize: '0.8rem', 
                marginBottom: '1rem',
                fontWeight: '600'
              }}>
                ⭐ {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              
              {/* Subject name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.2rem', color: '#555' }}>
                  SUBJECT NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="retro-input"
                  required
                />
              </div>

              {/* Day selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.2rem', color: '#555' }}>
                  WEEK DAY
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="retro-input"
                  style={{ height: '42px', padding: '0.3rem 0.8rem' }}
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Timings row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.2rem', color: '#555' }}>
                    START TIME
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="retro-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.2rem', color: '#555' }}>
                    END TIME
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="retro-input"
                    required
                  />
                </div>
              </div>

              {/* Classroom */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.2rem', color: '#555' }}>
                  CLASSROOM LOCATION
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 101, Lab 3"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  className="retro-input"
                  required
                />
              </div>

              {/* Faculty */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.2rem', color: '#555' }}>
                  FACULTY NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Miyamoto"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="retro-input"
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="retro-btn"
                    style={{ backgroundColor: 'var(--primary-red)', color: '#fff', padding: '0.8rem 1rem' }}
                    title="Remove class"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="retro-btn"
                  style={{ flex: 1 }}
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  className="retro-btn retro-btn-yellow"
                  style={{ flex: 2 }}
                >
                  {editingId ? 'SAVE CHANGES' : 'ADD TO GRID'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default ScheduleManager;
