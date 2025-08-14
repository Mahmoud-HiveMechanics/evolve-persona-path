import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { action, threadId, message, assistantId, runId } = await req.json();
    console.log('Chat assistant request:', { action, threadId, message, assistantId, runId });

    let response;
    const EXISTING_ASSISTANT_ID = 'asst_0IGtbLANauxTpbn8rSj7MVy5';

    switch (action) {
      case 'use_existing_assistant':
        response = await fetch(`https://api.openai.com/v1/assistants/${EXISTING_ASSISTANT_ID}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          },
        });
        break;

      case 'create_thread':
        response = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
        });
        break;

      case 'send_message':
        // Add message to thread
        await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            role: 'user',
            content: message
          }),
        });

        // Run the assistant
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            assistant_id: assistantId
          }),
        });
        break;

      case 'get_run_status':
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          },
        });
        break;

      case 'get_messages':
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          },
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const data = await response.json();
    console.log('OpenAI API response:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});