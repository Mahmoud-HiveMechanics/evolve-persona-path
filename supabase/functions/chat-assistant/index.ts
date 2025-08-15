import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const DEFAULT_ASSISTANT_ID = Deno.env.get("ASSISTANT_ID") || "asst_0IGtbLANauxTpbn8rSj7MVy5";

    console.log("OPENAI_API_KEY set:", !!OPENAI_API_KEY);
    console.log("DEFAULT_ASSISTANT_ID:", !!DEFAULT_ASSISTANT_ID);

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing. Set the secret in Supabase dashboard." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let bodyJson = null;
    try {
      bodyJson = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid or missing JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, threadId, message, assistantId, runId } = bodyJson ?? {};
    console.log("Request payload:", { action, threadId, assistantId, runId });

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing field: action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const openaiHeaders = {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2"
    };

    let response;

    switch (action) {
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
          return new Response(JSON.stringify({ error: "Missing threadId for send_message" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (!message) {
          return new Response(JSON.stringify({ error: "Missing message for send_message" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (!assistantIdToUse) {
          return new Response(JSON.stringify({ error: "No assistant id available, set ASSISTANT_ID secret or include assistantId in request" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
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
          const err = await addMsgRes.json().catch(() => ({ error: "failed to add message" }));
          return new Response(JSON.stringify({ ok: false, step: "add_message", error: err }), {
            status: addMsgRes.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
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
          return new Response(JSON.stringify({ error: "Missing threadId or runId for get_run_status" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          method: "GET",
          headers: openaiHeaders
        });
        break;
      }

      case "get_messages": {
        if (!threadId) {
          return new Response(JSON.stringify({ error: "Missing threadId for get_messages" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: "GET",
          headers: openaiHeaders
        });
        break;
      }

      default: {
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // handle response
    const text = await response.text().catch(() => null);
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to parse OpenAI response", raw: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // try to surface threadId and runId for convenience
    const threadIdOut = data?.id || data?.thread?.id || data?.result?.id || data?.data?.id || null;
    const runIdOut = data?.id || data?.run?.id || data?.result?.run_id || null;

    // if OpenAI returned an error object, forward it
    if (!response.ok) {
      return new Response(JSON.stringify({ ok: false, status: response.status, error: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, status: response.status, threadId: threadIdOut, runId: runIdOut, openai: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});