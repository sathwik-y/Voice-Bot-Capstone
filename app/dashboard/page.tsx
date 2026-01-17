'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ rollNumber: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleVoiceQuery = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

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
      alert('Error: ' + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
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
            {/* <p style={{ marginBottom: '0.5rem' }}>Email: {user.email}</p> */}
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

          <p style={{ fontSize: '0.85rem', opacity: 0.5, marginTop: '2rem' }}>
            Click the microphone and ask about your CGPA, attendance, or courses
          </p>
        </div>
      </div>
    </div>
  );
}
