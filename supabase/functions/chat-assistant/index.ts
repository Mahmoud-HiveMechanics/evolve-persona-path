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

    const { action, threadId, message, assistantId } = await req.json();
    console.log('Chat assistant request:', { action, threadId, message, assistantId });

    let response;

    switch (action) {
      case 'create_assistant':
        response = await fetch('https://api.openai.com/v1/assistants', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            name: "Leadership Assessment Coach",
            instructions: `You are an expert leadership assessment coach. Your role is to conduct a comprehensive leadership evaluation through a conversational assessment.

ASSESSMENT GUIDELINES:
1. Ask one question at a time, adapting based on previous responses
2. Use a mix of question types: multiple-choice, open-ended, and scale ratings
3. Ask 8-12 total questions, varying based on the depth of responses
4. Explore key leadership dimensions: communication, decision-making, team building, vision, emotional intelligence, adaptability, and conflict resolution

QUESTION TYPES TO USE:
- Multiple-choice: For clear preference scenarios (provide 3-4 options)
- Open-ended: For experiences and personal insights (encourage 2-3 sentence responses)
- Scale: For self-assessment ratings (1-10 scale with clear anchors)

CONVERSATION FLOW:
1. Start with a warm welcome and one engaging opening question
2. Follow up based on their answers to dig deeper
3. Adapt question difficulty and focus areas based on their responses
4. End with a comprehensive leadership profile summary

Use the ask_question function for each question. Always be encouraging and professional.`,
            model: "gpt-4-1106-preview",
            tools: [{
              type: "function",
              function: {
                name: "ask_question",
                description: "Ask a leadership assessment question",
                parameters: {
                  type: "object",
                  properties: {
                    question: {
                      type: "string",
                      description: "The question to ask"
                    },
                    type: {
                      type: "string",
                      enum: ["multiple-choice", "open-ended", "scale"],
                      description: "Type of question"
                    },
                    options: {
                      type: "array",
                      items: { type: "string" },
                      description: "Options for multiple-choice questions"
                    },
                    scale_info: {
                      type: "object",
                      properties: {
                        min: { type: "number" },
                        max: { type: "number" },
                        min_label: { type: "string" },
                        max_label: { type: "string" }
                      },
                      description: "Scale information for rating questions"
                    }
                  },
                  required: ["question", "type"]
                }
              }
            }]
          }),
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
        const { runId } = await req.json();
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