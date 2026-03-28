'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  id: number;
  rollNumber: string;
  name: string;
  totalQueries: number;
  lastQueryAt: string | null;
  createdAt: string;
}

interface IntentStat {
  intent: string;
  count: number;
}

interface RecentQuery {
  query: string;
  intent: string;
  confidence: number;
  createdAt: string;
}

export default function FacultyDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ rollNumber: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [popularIntents, setPopularIntents] = useState<IntentStat[]>([]);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'voice'>('overview');

  // Voice query states (faculty can also use voice)
  const [textQuery, setTextQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Stop TTS on page unload/refresh
    const stopTTS = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
    window.addEventListener('beforeunload', stopTTS);
    return () => { stopTTS(); window.removeEventListener('beforeunload', stopTTS); };
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => { if (res.ok) return res.json(); throw new Error(); })
      .then((data) => {
        if (data.user.role === 'student') { router.push('/dashboard'); return; }
        if (data.user.role === 'admin') { router.push('/admin'); return; }
        setUser(data.user);
        setLoading(false);
        fetchStudentData();
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const fetchStudentData = async () => {
    try {
      const res = await fetch('/api/faculty/students', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setPopularIntents(data.popularIntents || []);
        setRecentQueries(data.recentQueries || []);
      }
    } catch (error) {
      console.error('Failed to fetch student data:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  const processQuery = async (queryText: string) => {
    setTranscript(queryText);
    setIsProcessing(true);
    setAiResponse('');
    try {
      const response = await fetch('/api/voice/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: queryText, source: 'text' }),
      });
      const data = await response.json();
      setAiResponse(data.response || data.error || 'No response');
      if (data.response && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch { setAiResponse('Connection error.'); }
    finally { setIsProcessing(false); }
  };

  const handleVoiceQuery = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { alert('Microphone denied.'); return; }

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onstart = () => { setIsListening(true); setAiResponse(''); };
    recognition.onresult = (event: any) => { setIsListening(false); processQuery(event.results[0][0].transcript); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const totalQueries = students.reduce((sum, s) => sum + (s.totalQueries || 0), 0);

  return (
    <div style={{ minHeight: '100vh', padding: '1rem 1rem 3rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)',
        }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Faculty Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {user?.name || user?.rollNumber}{' '}
              <span className="badge badge-faculty">Faculty</span>
            </p>
          </div>
          <button className="btn-ghost" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>Logout</button>
        </header>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
          {(['overview', 'students', 'voice'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent-purple)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 600 : 400, fontSize: '0.9rem', textTransform: 'capitalize',
            }}>{tab}</button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <span className="stat-value">{students.length}</span>
                <span className="stat-label">Total Students</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{totalQueries}</span>
                <span className="stat-label">Total Queries</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{popularIntents.length}</span>
                <span className="stat-label">Intent Types</span>
              </div>
            </div>

            {/* Popular Intents */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Popular Query Types</h3>
              {popularIntents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No queries yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {popularIntents.map((intent) => (
                    <div key={intent.intent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                      <span className="badge badge-intent">{intent.intent}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{intent.count} queries</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Student Queries */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Student Queries</h3>
              {recentQueries.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No queries yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 400, overflowY: 'auto' }}>
                  {recentQueries.map((q, i) => (
                    <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span className="badge badge-intent">{q.intent}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(q.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem' }}>{q.query}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Registered Students</h3>
            {students.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No students registered yet</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {['Roll Number', 'Name', 'Queries', 'Last Active', 'Joined'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>{s.rollNumber}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{s.name || '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{s.totalQueries || 0}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.lastQueryAt ? new Date(s.lastQueryAt).toLocaleDateString() : 'Never'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Voice Tab (Faculty can also query) */}
        {activeTab === 'voice' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Voice Query (Faculty Access)</h3>

            <button
              className={`mic-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={handleVoiceQuery}
              disabled={isProcessing}
              style={{ margin: '0 auto 1.5rem' }}
            >
              {isListening ? (
                <div className="voice-wave"><span /><span /><span /><span /><span /></div>
              ) : isProcessing ? (
                <div className="spinner" style={{ width: 28, height: 28 }} />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>

            <form onSubmit={(e) => { e.preventDefault(); if (textQuery.trim()) { processQuery(textQuery); setTextQuery(''); } }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text" value={textQuery} onChange={(e) => setTextQuery(e.target.value)}
                placeholder="Ask about student data, classes..." disabled={isProcessing} style={{ flex: 1 }}
              />
              <button type="submit" className="btn-primary" disabled={isProcessing || !textQuery.trim()}>Send</button>
            </form>

            {transcript && <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>You asked: &ldquo;{transcript}&rdquo;</p>}
            {aiResponse && (
              <div style={{ textAlign: 'left', padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', textTransform: 'uppercase', fontWeight: 600 }}>Response</p>
                  {isSpeaking && (
                    <button className="btn-ghost" onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-red)' }}>
                      Stop Speaking
                    </button>
                  )}
                </div>
                <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiResponse}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
