import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UNIVERSITIES } from '../data/colleges';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('Mushroom Kingdom University');
  const [department, setDepartment] = useState('Computer Science');
  const [yearOfStudy, setYearOfStudy] = useState('1st Year');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DEPARTMENTS = [
    'Computer Science',
    'Information Technology',
    'Biology',
    'Business & Management',
    'Mathematics & Physics',
    'Arts & Literature',
    'Mechanical Engineering'
  ];


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !university || !department || !yearOfStudy) {
      setError('All fields are mandatory to create your player profile!');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        university_name: university,
        department,
        year_of_study: yearOfStudy
      });
      
      // Force them to complete the psychometric test
      navigate('/personality');
    } catch (err) {
      setError(err.message || 'Registration failed. Try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mario-sky" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem 1.5rem' }}>
      
      <div className="clouds-container">
        <div className="cloud cloud-small" style={{ left: '5%', top: '20%' }}></div>
        <div className="cloud cloud-medium" style={{ left: '50%', top: '10%' }}></div>
        <div className="cloud cloud-large" style={{ left: '80%', top: '35%' }}></div>
      </div>

      <div style={{ maxWidth: '520px', width: '100%', zIndex: 10, textAlign: 'center' }}>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            color: 'var(--primary-red)', 
            textShadow: '3px 3px 0px var(--accent-yellow), 4px 4px 0px var(--nes-black)' 
          }}>
            CREATE PLAYER
          </h1>
          <p className="retro-font" style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '1px', marginTop: '0.4rem', textShadow: '2px 2px 0px #000' }}>
            JOIN THE CAMPUS GRID
          </p>
        </div>

        <div className="retro-panel" style={{ backgroundColor: '#ffffff', border: '5px solid var(--nes-black)' }}>
          
          {error && (
            <div style={{ 
              backgroundColor: '#fff0f0', 
              border: '3px solid var(--primary-red)', 
              color: 'var(--primary-red)', 
              padding: '0.8rem', 
              borderRadius: '6px', 
              fontSize: '0.85rem', 
              marginBottom: '1.2rem',
              fontWeight: '600',
              textAlign: 'left'
            }}>
              🚨 {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.3rem', color: '#555' }}>
                FULL NAME
              </label>
              <input
                type="text"
                placeholder="e.g. Luigi Jumpman"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="retro-input"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.3rem', color: '#555' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="e.g. luigi@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="retro-input"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.3rem', color: '#555' }}>
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="retro-input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              {/* Department */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.3rem', color: '#555' }}>
                  DEPARTMENT
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="retro-input"
                  style={{ height: '48px', padding: '0.5rem 1rem' }}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Year */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.3rem', color: '#555' }}>
                  YEAR OF STUDY
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="retro-input"
                  style={{ height: '48px', padding: '0.5rem 1rem' }}
                >
                  <option value="1st Year">1st Year (Newbie)</option>
                  <option value="2nd Year">2nd Year (Skilled)</option>
                  <option value="3rd Year">3rd Year (Pro)</option>
                  <option value="4th Year">4th Year (Expert)</option>
                  <option value="Postgraduate">Postgrad (Legend)</option>
                </select>
              </div>

            </div>

            {/* University Selection (MANDATORY) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-retro)', marginBottom: '0.3rem', color: '#555' }}>
                UNIVERSITY (MATCH EXCLUSIVE 🏰)
              </label>
              <input
                list="university-list"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="retro-input"
                placeholder="Type or select a university..."
                style={{ width: '100%', fontWeight: 'bold' }}
                required
              />
              <datalist id="university-list">
                {UNIVERSITIES.map(u => <option key={u} value={u} />)}
              </datalist>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-red)', marginTop: '4px', display: 'block' }}>
                💡 *Important: You will only match with students from the same university! Choose "Mushroom Kingdom University" to test matches instantly.*
              </span>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`retro-btn retro-btn-red ${loading ? 'retro-btn-disabled' : ''}`}
              style={{ width: '100%', marginTop: '0.8rem', fontSize: '0.9rem', padding: '0.9rem 1.5rem' }}
            >
              <span>{loading ? 'INITIALIZING...' : 'CREATE ACCOUNT 👑'}</span>
            </button>
          </form>

          <hr style={{ margin: '1.2rem 0', border: 'none', borderTop: '2px dashed #ccc' }} />

          <p style={{ fontSize: '0.9rem', color: '#555' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: 'var(--secondary-blue)', fontWeight: 'bold', textDecoration: 'none' }}>
              Log In here
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
};

export default Register;
