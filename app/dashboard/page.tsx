'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; rollNumber: string } | null>(null);
  const [loading, setLoading] = useState(true);

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
          <h2 style={{ marginBottom: '1rem' }}>Voice Interface</h2>
          <p style={{ opacity: 0.7 }}>Voice features will be added in Phase 2</p>
        </div>
      </div>
    </div>
  );
}
