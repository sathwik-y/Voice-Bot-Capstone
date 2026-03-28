import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Whisper-based Speech-to-Text transcription endpoint
 * Uses OpenAI Whisper API or Groq Whisper for server-side transcription
 * This provides more accurate STT than browser Web Speech API
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Try Groq Whisper API first (free, fast), fall back to OpenAI
    const groqApiKey = process.env.GROQ_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    let transcript = '';

    if (groqApiKey) {
      transcript = await transcribeWithGroq(audioFile, groqApiKey);
    } else if (openaiApiKey) {
      transcript = await transcribeWithOpenAI(audioFile, openaiApiKey);
    } else {
      return NextResponse.json(
        { error: 'No STT API key configured. Set GROQ_API_KEY or OPENAI_API_KEY in .env.local', fallback: true },
        { status: 200 }
      );
    }

    return NextResponse.json({ transcript, source: 'whisper' });

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed: ' + (error.message || 'Unknown error'), fallback: true },
      { status: 200 }
    );
  }
}

async function transcribeWithGroq(audioFile: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioFile, 'audio.webm');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Whisper API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.text || '';
}

async function transcribeWithOpenAI(audioFile: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioFile, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Whisper API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.text || '';
}
