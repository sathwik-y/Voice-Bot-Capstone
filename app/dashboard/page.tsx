'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Conversation {
  id: number;
  query: string;
  response: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ rollNumber: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [textQuery, setTextQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Fetch user info from token
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not authenticated');
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
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

  const toggleHistory = () => {
    if (!showHistory) {
      fetchConversations();
    }
    setShowHistory(!showHistory);
  };

  const handleVoiceQuery = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
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
      setTranscript(spokenText);
      setIsListening(false);
      setIsProcessing(true);

      try {
        // Send to AI backend
        const response = await fetch('/api/voice/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ query: spokenText }),
        });

        const data = await response.json();

        if (data.response) {
          setAiResponse(data.response);

          // Speak the response
          const utterance = new SpeechSynthesisUtterance(data.response);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);

          // Refresh conversation history if visible
          if (showHistory) {
            fetchConversations();
          }
        } else {
          setAiResponse('Sorry, I could not process your request.');
        }
      } catch (error) {
        console.error('Error:', error);
        setAiResponse('An error occurred while processing your request.');
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);

      let errorMessage = 'Speech recognition failed. ';
      switch (event.error) {
        case 'network':
          errorMessage += 'Network error - please check your internet connection and make sure you\'re using HTTPS.';
          break;
        case 'not-allowed':
          errorMessage += 'Microphone access was denied. Please allow microphone access in your browser settings.';
          break;
        case 'no-speech':
          errorMessage += 'No speech detected. Please try again and speak clearly.';
          break;
        case 'aborted':
          errorMessage += 'Speech recognition was aborted.';
          break;
        case 'audio-capture':
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
          break;
        default:
          errorMessage += event.error;
      }
      alert(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleTextQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textQuery.trim()) return;

    setTranscript(textQuery);
    setIsProcessing(true);
    setAiResponse('');

    try {
      const response = await fetch('/api/voice/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: textQuery }),
      });

      const data = await response.json();

      if (data.response) {
        setAiResponse(data.response);

        // Speak the response
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);

        // Refresh conversation history if visible
        if (showHistory) {
          fetchConversations();
        }
      } else {
        setAiResponse('Sorry, I could not process your request.');
      }
    } catch (error) {
      console.error('Error:', error);
      setAiResponse('An error occurred while processing your request.');
    } finally {
      setIsProcessing(false);
      setTextQuery('');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3rem'
        }}>
          <h1 style={{ fontSize: '2rem' }}>Dashboard</h1>
          <button onClick={handleLogout}>Logout</button>
        </div>

        {user && (
          <div style={{ marginBottom: '3rem' }}>
            <p>Roll Number: {user.rollNumber}</p>
          </div>
        )}

        <div style={{
          border: '1px solid #fff',
          padding: '2rem',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Voice Assistant</h2>

          <button
            onClick={handleVoiceQuery}
            disabled={isListening || isProcessing}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: isListening ? '3px solid #4CAF50' : '2px solid #fff',
              backgroundColor: isListening ? '#1a1a1a' : '#000',
              color: '#fff',
              fontSize: '3rem',
              cursor: isListening || isProcessing ? 'not-allowed' : 'pointer',
              marginBottom: '2rem',
              transition: 'all 0.3s ease',
            }}
          >
            {isListening ? '🎤' : isProcessing ? '⏳' : '🎙️'}
          </button>

          {isListening && (
            <p style={{ color: '#4CAF50', marginBottom: '1rem' }}>Listening...</p>
          )}

          {isProcessing && (
            <p style={{ color: '#FFA500', marginBottom: '1rem' }}>Processing...</p>
          )}

          {transcript && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem' }}>You said:</p>
              <p style={{ fontStyle: 'italic' }}>"{transcript}"</p>
            </div>
          )}

          {aiResponse && (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem' }}>AI Response:</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{aiResponse}</p>
            </div>
          )}

          <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.7 }}>Or type your question:</p>
            <form onSubmit={handleTextQuery} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="What is my CGPA?"
                disabled={isProcessing}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#000',
                  border: '1px solid #fff',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '1rem',
                }}
              />
              <button
                type="submit"
                disabled={isProcessing || !textQuery.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  cursor: isProcessing || !textQuery.trim() ? 'not-allowed' : 'pointer',
                  opacity: isProcessing || !textQuery.trim() ? 0.5 : 1,
                }}
              >
                Send
              </button>
            </form>
          </div>

          <p style={{ fontSize: '0.85rem', opacity: 0.5, marginTop: '1.5rem' }}>
            Ask about your CGPA, attendance, or courses
          </p>
        </div>

        {/* Conversation History Section */}
        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={toggleHistory}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#000',
              border: '1px solid #fff',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            {showHistory ? 'Hide Conversation History' : 'Show Conversation History'}
          </button>

          {showHistory && (
            <div style={{
              marginTop: '1rem',
              border: '1px solid #333',
              borderRadius: '4px',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {conversations.length === 0 ? (
                <p style={{ padding: '1rem', textAlign: 'center', opacity: 0.7 }}>
                  No conversations yet
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #333',
                    }}
                  >
                    <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem' }}>
                      {new Date(conv.createdAt).toLocaleString()}
                    </p>
                    <p style={{ marginBottom: '0.5rem' }}>
                      <strong>You:</strong> {conv.query}
                    </p>
                    <p style={{ opacity: 0.9 }}>
                      <strong>AI:</strong> {conv.response}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
