import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  createInboundAgent,
  listAgents,
  getVoices,
  getWorkspaceNumbers,
  attachInboundNumber,
  configureWebhook,
  makeOutboundCall,
  getCallHistory,
  getWorkspaceInfo,
} from '@/lib/ringg';

/**
 * Phone integration API
 * POST - Setup/configure Ringg AI phone agent
 * GET - Get agent status and call history
 */

export async function POST(request: NextRequest) {
  try {
    // Admin-only for setup operations
    const token = request.cookies.get('token')?.value;
    const payload = token ? verifyToken(token) : null;

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'get-voices': {
        const voices = await getVoices(body.language || 'en-US');
        return NextResponse.json({ voices });
      }

      case 'create-agent': {
        if (!payload || payload.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        const webhookUrl = body.webhookUrl || `${request.nextUrl.origin}/api/phone/webhook`;
        const voiceId = body.voiceId;
        if (!voiceId) {
          return NextResponse.json({ error: 'voiceId required. Use get-voices first.' }, { status: 400 });
        }
        const agent = await createInboundAgent(voiceId, webhookUrl);
        return NextResponse.json({ agent, message: 'Agent created successfully' });
      }

      case 'attach-number': {
        if (!payload || payload.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        const { agentId, numberId } = body;
        if (!agentId || !numberId) {
          return NextResponse.json({ error: 'agentId and numberId required' }, { status: 400 });
        }
        const result = await attachInboundNumber(agentId, numberId);
        return NextResponse.json({ result, message: 'Number attached to agent' });
      }

      case 'configure-webhook': {
        if (!payload || payload.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        const callbackUrl = body.callbackUrl || `${request.nextUrl.origin}/api/phone/webhook`;
        const hookResult = await configureWebhook(body.agentId, callbackUrl);
        return NextResponse.json({ result: hookResult, message: 'Webhook configured' });
      }

      case 'outbound-call': {
        if (!payload || payload.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        const callResult = await makeOutboundCall(body.agentId, body.phoneNumber, body.customArgs);
        return NextResponse.json({ call: callResult });
      }

      case 'get-numbers': {
        const numbers = await getWorkspaceNumbers();
        return NextResponse.json({ numbers });
      }

      case 'list-agents': {
        const agents = await listAgents();
        return NextResponse.json({ agents });
      }

      case 'call-history': {
        const history = await getCallHistory(body.limit || 20, body.offset || 0);
        return NextResponse.json({ history });
      }

      default:
        return NextResponse.json({
          error: 'Invalid action',
          validActions: ['get-voices', 'create-agent', 'attach-number', 'configure-webhook', 'outbound-call', 'get-numbers', 'list-agents', 'call-history'],
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Phone API error:', error);
    return NextResponse.json(
      { error: 'Phone integration error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [agents, history, workspace] = await Promise.allSettled([
      listAgents(),
      getCallHistory(10),
      getWorkspaceInfo(),
    ]);

    return NextResponse.json({
      agents: agents.status === 'fulfilled' ? agents.value : null,
      recentCalls: history.status === 'fulfilled' ? history.value : null,
      workspace: workspace.status === 'fulfilled' ? workspace.value : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch phone status: ' + error.message },
      { status: 500 }
    );
  }
}
