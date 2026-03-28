'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Conversation {
  id: number;
  query: string;
  response: string;
  intent: string;
  confidence: number;
  createdAt: string;
}

interface User {
  rollNumber: string;
  name: string;
  role: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [textQuery, setTextQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [normalizedQuery, setNormalizedQuery] = useState('');
  const [queryIntent, setQueryIntent] = useState('');
  const [queryConfidence, setQueryConfidence] = useState<number>(0);
  const [queryReasoning, setQueryReasoning] = useState('');
  const [responseTime, setResponseTime] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => {
        if (data.user.role === 'admin') { router.push('/admin'); return; }
        if (data.user.role === 'faculty') { router.push('/faculty'); return; }
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => router.push('/login'));

    // Stop TTS on page unload/refresh
    const stopTTS = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
    window.addEventListener('beforeunload', stopTTS);
    return () => { stopTTS(); window.removeEventListener('beforeunload', stopTTS); };
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const processQuery = async (queryText: string, source: 'voice' | 'text' = 'text') => {
    setTranscript(queryText);
    setIsProcessing(true);
    setAiResponse('');
    setNormalizedQuery('');
    setQueryIntent('');
    setQueryConfidence(0);
    setQueryReasoning('');

    try {
      const response = await fetch('/api/voice/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: queryText, source }),
      });

      const data = await response.json();

      if (data.response) {
        setAiResponse(data.response);
        setNormalizedQuery(data.normalizedQuery || '');
        setQueryIntent(data.intent || '');
        setQueryConfidence(data.confidence || 0);
        setQueryReasoning(data.reasoning || '');
        setResponseTime(data.responseTimeMs || 0);
        speakResponse(data.response);
        if (showHistory) fetchConversations();
      } else if (data.error) {
        setAiResponse('Error: ' + data.error);
      } else {
        setAiResponse('Sorry, I could not process your request.');
      }
    } catch (error) {
      console.error('Query error:', error);
      setAiResponse('Connection error. Please check that n8n is running and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Browser Speech Recognition (Web Speech API)
  const handleVoiceQuery = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Please use Chrome or Edge, or use the text input below.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setAiResponse('');
    };

    recognition.onresult = async (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setIsListening(false);
      await processQuery(spokenText, 'voice');
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      const messages: Record<string, string> = {
        'network': 'Network error - check your internet connection.',
        'not-allowed': 'Microphone access denied.',
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found.',
      };
      alert(messages[event.error] || `Speech error: ${event.error}`);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Whisper-based recording (server-side STT)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setIsProcessing(true);

        // Send to Whisper endpoint
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          const data = await res.json();

          if (data.transcript) {
            await processQuery(data.transcript, 'voice');
          } else if (data.fallback) {
            // Whisper not configured, fall back to browser STT
            setIsProcessing(false);
            handleVoiceQuery();
          } else {
            setIsProcessing(false);
            alert('Transcription failed. Using browser speech recognition instead.');
            handleVoiceQuery();
          }
        } catch {
          setIsProcessing(false);
          handleVoiceQuery();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (isListening) {
      return;
    } else {
      // Use browser Speech Recognition (works without API key)
      handleVoiceQuery();
    }
  };

  const handleTextQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textQuery.trim()) return;
    const q = textQuery;
    setTextQuery('');
    await processQuery(q, 'text');
  };

  const quickQueries = [
    { text: "What's my CGPA?", icon: '📊' },
    { text: "How's my attendance?", icon: '📋' },
    { text: "What courses do I have?", icon: '📚' },
    { text: "How am I doing?", icon: '🤔' },
    { text: "Who teaches Machine Learning?", icon: '👩‍🏫' },
    { text: "Show my progress", icon: '📈' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '1rem 1rem 3rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 0', marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              Voice Academic Assistant
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {user?.name || user?.rollNumber}{' '}
              <span className="badge badge-student">Student</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchConversations(); }}>
              History
            </button>
            <button className="btn-ghost" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>
              Logout
            </button>
          </div>
        </header>

        {/* Main Voice Interface */}
        <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Ask me anything about your academics
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
            Tap the mic to speak, or type your question below
          </p>

          {/* Mic Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <button
              className={`mic-button ${isListening || isRecording ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={handleMicClick}
              disabled={isProcessing}
            >
              {isListening || isRecording ? (
                <div className="voice-wave">
                  <span /><span /><span /><span /><span />
                </div>
              ) : isProcessing ? (
                <div className="spinner" style={{ width: 28, height: 28 }} />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          </div>

          {(isListening || isRecording) && (
            <p style={{ color: 'var(--accent-green)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>
              Listening... Speak now
            </p>
          )}

          {isProcessing && (
            <p style={{ color: 'var(--accent-orange)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>
              Processing your query...
            </p>
          )}

          {/* Transcript */}
          {transcript && !isListening && (
            <div style={{
              textAlign: 'left', marginBottom: '1rem',
              padding: '1rem', background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                You asked
              </p>
              <p style={{ fontSize: '1rem' }}>&ldquo;{transcript}&rdquo;</p>

              {queryIntent && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-intent">{queryIntent}</span>
                  {queryConfidence > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {Math.round(queryConfidence * 100)}% confident
                    </span>
                  )}
                  {responseTime > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(responseTime / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              )}

              {normalizedQuery && normalizedQuery !== transcript && (
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Interpreted as: &ldquo;{normalizedQuery}&rdquo;
                </p>
              )}

              {queryReasoning && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {queryReasoning}
                </p>
              )}
            </div>
          )}

          {/* AI Response */}
          {aiResponse && (
            <div style={{
              textAlign: 'left',
              padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59, 130, 246, 0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  AI Response
                </p>
                {isSpeaking && (
                  <button className="btn-ghost" onClick={stopSpeaking} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-red)' }}>
                    Stop Speaking
                  </button>
                )}
              </div>
              <p style={{ fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiResponse}</p>
            </div>
          )}

          {/* Text Input */}
          <form onSubmit={handleTextQuery} style={{
            display: 'flex', gap: '0.5rem', marginTop: '1.5rem',
          }}>
            <input
              type="text"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder="Type your question here..."
              disabled={isProcessing}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isProcessing || !textQuery.trim()}
              style={{ whiteSpace: 'nowrap', padding: '0.75rem 1.25rem' }}
            >
              {isProcessing ? <span className="spinner" /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>
        </div>

        {/* Quick Queries */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Questions
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {quickQueries.map((q) => (
              <button
                key={q.text}
                className="btn-secondary"
                onClick={() => processQuery(q.text, 'text')}
                disabled={isProcessing}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', fontSize: '0.85rem' }}
              >
                <span>{q.icon}</span> {q.text}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation History */}
        {showHistory && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Conversation History
            </h3>
            {conversations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No conversations yet. Try asking a question!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 500, overflowY: 'auto' }}>
                {conversations.map((conv) => (
                  <div key={conv.id} style={{
                    padding: '1rem', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {conv.intent && <span className="badge badge-intent">{conv.intent}</span>}
                        {conv.confidence > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {Math.round(conv.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(conv.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--accent-blue)' }}>Q:</strong> {conv.query}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--accent-green)' }}>A:</strong> {conv.response}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
