'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  rollNumber: string;
  name: string;
  role: string;
  createdAt: string;
  queryCount: number;
  lastActive: string | null;
}

interface Analytics {
  usersByRole: { role: string; count: number }[];
  totalConversations: number;
  queriesByIntent: { intent: string; count: number }[];
  queriesPerDay: { date: string; count: number }[];
  activeUsers: { rollNumber: string; name: string; role: string; queryCount: number }[];
  avgConfidence: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ rollNumber: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'voice'>('analytics');

  // Voice query states
  const [textQuery, setTextQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    const stopTTS = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
    window.addEventListener('beforeunload', stopTTS);
    return () => { stopTTS(); window.removeEventListener('beforeunload', stopTTS); };
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => { if (res.ok) return res.json(); throw new Error(); })
      .then((data) => {
        if (data.user.role !== 'admin') { router.push('/dashboard'); return; }
        setCurrentUser(data.user);
        setLoading(false);
        fetchData();
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const fetchData = async () => {
    try {
      const [usersRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/analytics', { credentials: 'include' }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  const deleteUser = async (userId: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        setDeleteConfirm(null);
        fetchData(); // Refresh analytics
      }
    } catch (error) {
      console.error('Delete failed:', error);
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
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert('Not supported.'); return; }
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

  const roleCount = (role: string) => analytics?.usersByRole.find(r => r.role === role)?.count || 0;

  return (
    <div style={{ minHeight: '100vh', padding: '1rem 1rem 3rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)',
        }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {currentUser?.name || currentUser?.rollNumber}{' '}
              <span className="badge badge-admin">Admin</span>
            </p>
          </div>
          <button className="btn-ghost" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>Logout</button>
        </header>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          {(['analytics', 'users', 'voice'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--accent-orange)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent-orange)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 600 : 400, fontSize: '0.9rem', textTransform: 'capitalize',
            }}>{tab}</button>
          ))}
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <>
            <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <span className="stat-value">{users.length}</span>
                <span className="stat-label">Total Users</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{roleCount('student')}</span>
                <span className="stat-label">Students</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{roleCount('faculty')}</span>
                <span className="stat-label">Faculty</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{analytics.totalConversations}</span>
                <span className="stat-label">Total Queries</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{Math.round(analytics.avgConfidence * 100)}%</span>
                <span className="stat-label">Avg Confidence</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Queries by Intent */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Queries by Intent</h3>
                {analytics.queriesByIntent.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No data yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {analytics.queriesByIntent.map((item) => {
                      const maxCount = Math.max(...analytics.queriesByIntent.map(i => i.count));
                      return (
                        <div key={item.intent}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.85rem' }}>{item.intent}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.count}</span>
                          </div>
                          <div className="confidence-bar">
                            <div className="confidence-bar-fill" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Queries per Day */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Queries (Last 7 Days)</h3>
                {analytics.queriesPerDay.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No data yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {analytics.queriesPerDay.map((day) => (
                      <div key={day.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{day.count} queries</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Most Active Users */}
              <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Most Active Users</h3>
                {analytics.activeUsers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No data yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {analytics.activeUsers.map((u, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{u.rollNumber}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.name || '-'}</span>
                          <span className={`badge badge-${u.role}`}>{u.role}</span>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.queryCount} queries</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              User Management ({users.length} users)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['ID', 'Name', 'Role', 'Queries', 'Last Active', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>{u.rollNumber}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{u.name || '-'}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`badge badge-${u.role}`}>{u.role}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{u.queryCount}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'Never'}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {deleteConfirm === u.id ? (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn-danger" onClick={() => deleteUser(u.id)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Confirm</button>
                            <button className="btn-ghost" onClick={() => setDeleteConfirm(null)} style={{ fontSize: '0.75rem' }}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn-ghost" onClick={() => setDeleteConfirm(u.id)} style={{ color: 'var(--accent-red)', fontSize: '0.75rem' }}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Voice Query (Admin Access)</h3>

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
              <input type="text" value={textQuery} onChange={(e) => setTextQuery(e.target.value)} placeholder="Admin query..." disabled={isProcessing} style={{ flex: 1 }} />
              <button type="submit" className="btn-primary" disabled={isProcessing || !textQuery.trim()}>Send</button>
            </form>

            {transcript && <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>You asked: &ldquo;{transcript}&rdquo;</p>}
            {aiResponse && (
              <div style={{ textAlign: 'left', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', textTransform: 'uppercase', fontWeight: 600 }}>Response</p>
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
