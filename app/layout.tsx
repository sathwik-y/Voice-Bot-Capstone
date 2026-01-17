import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voice Academic Assistant',
  description: 'Voice-based college academic information system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
