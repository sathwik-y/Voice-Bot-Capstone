'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => {
        // Route based on role
        const role = data.user?.role || 'student';
        switch (role) {
          case 'admin':
            router.push('/admin');
            break;
          case 'faculty':
            router.push('/faculty');
            break;
          default:
            router.push('/dashboard');
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</p>
    </div>
  );
}
