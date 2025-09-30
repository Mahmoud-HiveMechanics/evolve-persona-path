// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Deno global declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Type definitions
interface RequestBody {
  action: string;
  threadId?: string;
  message?: string;
  assistantId?: string;
  runId?: string;
  toolCallId?: string;
  output?: string;
  audioBase64?: string;
  mimeType?: string;
  prompt?: string; // Add prompt field for direct_completion
}

interface OpenAIRun {
  id?: string;
  status?: string;
  required_action?: {
    submit_tool_outputs?: {
      tool_calls?: Array<{
        id?: string;
        tool_call_id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  };
}

interface ApiResponse {
  ok: boolean;
  status: number;
  error?: { message: string };
  openai?: unknown;
  threadId?: string;
  runId?: string;
}

// Permissive CORS for development and Lovable projects
const getCorsHeaders = (origin: string | null) => {
  // Allow Lovable project domains and localhost for development
  const requestOrigin = origin || '';
  
  if (requestOrigin.includes('lovableproject.com') || 
      requestOrigin.includes('localhost') ||
      requestOrigin.includes('127.0.0.1')) {
    return {
      "Access-Control-Allow-Origin": origin || '*',
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Credentials": "true"
    };
  }
  
  // Fallback to permissive for development
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", 
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "false"
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const DEFAULT_ASSISTANT_ID = Deno.env.get("ASSISTANT_ID") || "asst_0IGtbLANauxTpbn8rSj7MVy5";

    console.log("OPENAI_API_KEY set:", !!OPENAI_API_KEY);
    console.log("DEFAULT_ASSISTANT_ID:", !!DEFAULT_ASSISTANT_ID);

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, status: 500, error: { message: "OPENAI_API_KEY missing. Set the secret in Supabase dashboard." } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let bodyJson: RequestBody | null = null;
    try {
      bodyJson = await req.json() as RequestBody;
    } catch (_e) {
      return new Response(
        JSON.stringify({ ok: false, status: 400, error: { message: "Invalid or missing JSON body" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, threadId, message, assistantId, runId } = bodyJson ?? {};
    console.log("Request payload:", { action, threadId, assistantId, runId });

    if (!action) {
      return new Response(
        JSON.stringify({ ok: false, status: 400, error: { message: "Missing field: action" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiHeaders = {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2"
    };
    // For multipart requests (audio transcription), let fetch set Content-Type
    const authOnlyHeaders = {
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    };

    let response;

    switch (action) {
      case "direct_completion": {
        // Direct completion without threads for simple follow-up questions
        const { prompt } = bodyJson;
        if (!prompt) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing prompt for direct_completion" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: openaiHeaders,
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are an expert leadership assessment interviewer. Generate natural, conversational follow-up questions."
              },
              {
                role: "user", 
                content: prompt
              }
            ],
            max_tokens: 50,
            temperature: 0.7
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const followUpQuestion = data.choices?.[0]?.message?.content?.trim();
          return new Response(
            JSON.stringify({ ok: true, response: followUpQuestion }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Handle OpenAI API errors properly
          const errorData = await response.json();
          console.error("OpenAI API error:", errorData);
          return new Response(
            JSON.stringify({ 
              ok: false, 
              status: response.status, 
              error: { 
                message: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}` 
              } 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "use_existing_assistant": {
        // fetch assistant metadata for the default assistant id
        response = await fetch(`https://api.openai.com/v1/assistants/${DEFAULT_ASSISTANT_ID}`, {
          method: "GET",
          headers: openaiHeaders
        });
        break;
      }

      case "create_thread": {
        // create an empty thread, API does not accept assistant here
        response = await fetch("https://api.openai.com/v1/threads", {
          method: "POST",
          headers: openaiHeaders,
          body: JSON.stringify({})
        });
        break;
      }

      case "send_message": {
        const assistantIdToUse = assistantId || DEFAULT_ASSISTANT_ID;
        if (!threadId) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing threadId for send_message" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!message) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing message for send_message" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!assistantIdToUse) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "No assistant id available, set ASSISTANT_ID secret or include assistantId in request" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // add user message to the thread
        const addMsgRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: "POST",
          headers: openaiHeaders,
          body: JSON.stringify({
            role: "user",
            content: message
          })
        });

        if (!addMsgRes.ok) {
          const err = await addMsgRes.json().catch(() => ({ message: "failed to add message" }));
          return new Response(
            JSON.stringify({ ok: false, status: addMsgRes.status || 500, step: "add_message", error: err }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // run the assistant on the thread
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          method: "POST",
          headers: openaiHeaders,
          body: JSON.stringify({
            assistant_id: assistantIdToUse
          })
        });
        break;
      }

      case "get_run_status": {
        if (!threadId || !runId) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing threadId or runId for get_run_status" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          method: "GET",
          headers: openaiHeaders
        });
        break;
      }

      case "get_messages": {
        if (!threadId) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing threadId for get_messages" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: "GET",
          headers: openaiHeaders
        });
        break;
      }

      case "get_active_run": {
        if (!threadId) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing threadId for get_active_run" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // List runs and return the latest non-terminal run if any
        const list = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          method: "GET",
          headers: openaiHeaders
        });
        const listText = await list.text();
        let listJson: { data?: OpenAIRun[] } | null = null;
        try { 
          listJson = listText ? JSON.parse(listText) as { data?: OpenAIRun[] } : null; 
        } catch { 
          /* ignore parse errors */ 
        }
        const runs = listJson?.data || [];
        const active = runs.find((r: OpenAIRun) => !["completed","failed","cancelled","expired"].includes(r?.status || ""));
        return new Response(
          JSON.stringify({ ok: true, status: 200, openai: active || null, run: active || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "submit_tool_outputs": {
        if (!threadId || !runId) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing threadId or runId for submit_tool_outputs" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { toolCallId, output } = bodyJson ?? {};
        if (!toolCallId) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing toolCallId for submit_tool_outputs" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
          method: "POST",
          headers: openaiHeaders,
          body: JSON.stringify({
            tool_outputs: [
              { tool_call_id: toolCallId, output: String(output ?? "") }
            ]
          })
        });
        break;
      }

      case "transcribe_audio": {
        // Expect base64 audio and mimeType
        const { audioBase64, mimeType } = bodyJson ?? {};
        if (!audioBase64) {
          return new Response(
            JSON.stringify({ ok: false, status: 400, error: { message: "Missing audioBase64 for transcribe_audio" } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        try {
          // Decode base64 to bytes
          const binaryString = atob(audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const blob = new Blob([bytes], { type: mimeType || "audio/webm" });

          const form = new FormData();
          form.append("file", blob, "voice_note.webm");
          form.append("model", "whisper-1");

          const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: authOnlyHeaders,
            body: form
          });
          const txt = await resp.text();
          let json: { text?: string } | null = null;
          try { 
            json = txt ? JSON.parse(txt) as { text?: string } : null; 
          } catch (_) {
            // ignore parse errors
          }

          if (!resp.ok) {
            return new Response(
              JSON.stringify({ ok: false, status: resp.status, error: json || txt }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ ok: true, status: 200, text: json?.text || "" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, status: 500, error: { message: String(e) } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      default: {
        return new Response(
          JSON.stringify({ ok: false, status: 400, error: { message: `Unknown action: ${action}` } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // handle response
    const text = await response.text().catch(() => null);
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_e) {
      return new Response(
        JSON.stringify({ ok: false, status: 502, error: "Failed to parse OpenAI response", raw: text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // try to surface threadId and runId for convenience
    const dataObj = data as Record<string, unknown> | null;
    const threadIdOut = dataObj?.id || 
                       (dataObj?.thread as Record<string, unknown>)?.id || 
                       (dataObj?.result as Record<string, unknown>)?.id || 
                       (dataObj?.data as Record<string, unknown>)?.id || null;
    const runIdOut = dataObj?.id || 
                    (dataObj?.run as Record<string, unknown>)?.id || 
                    (dataObj?.result as Record<string, unknown>)?.run_id || null;

    // if OpenAI returned an error object, forward it
    if (!response.ok) {
      return new Response(
        JSON.stringify({ ok: false, status: response.status, error: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, status: response.status, threadId: threadIdOut, runId: runIdOut, openai: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ ok: false, status: 500, error: { message: String(error) } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});