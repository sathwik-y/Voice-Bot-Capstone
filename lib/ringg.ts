/**
 * Ringg AI Integration - Phone call-to-query access
 *
 * Enables users to call a phone number and interact with
 * the voice assistant via traditional telephone.
 *
 * API Docs: https://docs.ringg.ai
 * Base URL: https://prod-api.ringg.ai/ca/api/v0
 */

const RINGG_API_KEY = process.env.RINGG_API_KEY || '';
const RINGG_BASE_URL = 'https://prod-api.ringg.ai/ca/api/v0';

async function ringgFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${RINGG_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': RINGG_API_KEY,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ringg API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Get available voices for the agent
 */
export async function getVoices(language: string = 'en-US'): Promise<any> {
  return ringgFetch(`/agent/voices?language=${language}`);
}

/**
 * Create an inbound voice agent
 */
export async function createInboundAgent(voiceId: string, webhookUrl: string): Promise<any> {
  return ringgFetch('/public/agent', {
    method: 'POST',
    body: JSON.stringify({
      agent_name: 'GITAM Voice Academic Assistant',
      agent_type: 'inbound',
      primary_language: 'en-US',
      voice_id: voiceId,
      intro_message: 'Hello! Welcome to the GITAM Voice Academic Assistant. I can help you with your CGPA, attendance, courses, and faculty information. Please tell me your roll number first.',
      introduction_and_objective: `You are a helpful academic assistant for GITAM University students.
Your goal is to answer questions about student academics including CGPA, attendance, courses, and faculty.
First, ask the caller for their roll number to identify them.
Then, answer their questions using the data retrieved from the system.
Be concise and clear - phone conversations should be brief.`,
      response_guidelines: `Be polite, concise, and natural.
Keep responses to 1-2 sentences suitable for phone conversation.
If you don't have information, say so honestly.
Always confirm the roll number before answering queries.
Available query types: CGPA, attendance, courses, faculty, general academic status.`,
      task: 'Answer incoming phone calls from students and help them with academic information queries.',
    }),
  });
}

/**
 * Get all agents
 */
export async function listAgents(): Promise<any> {
  return ringgFetch('/agent/all');
}

/**
 * Get workspace phone numbers
 */
export async function getWorkspaceNumbers(): Promise<any> {
  return ringgFetch('/workspace/numbers');
}

/**
 * Attach a phone number to an agent for inbound calls
 */
export async function attachInboundNumber(agentId: string, numberId: string): Promise<any> {
  return ringgFetch('/agent/v1', {
    method: 'PATCH',
    body: JSON.stringify({
      operation: 'attach_inbound_number',
      agent_id: agentId,
      number_id: numberId,
    }),
  });
}

/**
 * Configure webhook event subscriptions for an agent
 */
export async function configureWebhook(agentId: string, callbackUrl: string): Promise<any> {
  return ringgFetch('/agent/v1', {
    method: 'PATCH',
    body: JSON.stringify({
      operation: 'edit_event_subscriptions',
      agent_id: agentId,
      event_subscriptions: [
        {
          event_type: ['call_started', 'call_completed', 'all_processing_completed'],
          callback_url: callbackUrl,
          headers: { 'Content-Type': 'application/json' },
          method_type: 'POST',
        },
      ],
    }),
  });
}

/**
 * Initiate an outbound call
 */
export async function makeOutboundCall(
  agentId: string,
  phoneNumber: string,
  customArgs?: Record<string, string>
): Promise<any> {
  return ringgFetch('/calling/outbound/individual', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: agentId,
      phone_number: phoneNumber,
      custom_args_values: customArgs || {},
    }),
  });
}

/**
 * Get call history
 */
export async function getCallHistory(limit: number = 20, offset: number = 0): Promise<any> {
  return ringgFetch(`/calling/history?limit=${limit}&offset=${offset}`);
}

/**
 * Get workspace info
 */
export async function getWorkspaceInfo(): Promise<any> {
  return ringgFetch('/workspace');
}
