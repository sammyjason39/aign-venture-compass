import { createClient } from "@supabase/supabase-js";

export interface AiSettings {
  mode: "local_only" | "local_cloud" | "full_cloud";
  ollama_url: string;
  ollama_model: string;
  openrouter_url: string;
  openrouter_key: string | null;
  openrouter_model: string;
}

export async function getAiSettings(supabase: any): Promise<AiSettings> {
  const { data, error } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    // Return defaults if not found
    return {
      mode: "full_cloud",
      ollama_url: "http://localhost:11434",
      ollama_model: "llama3",
      openrouter_url: "https://openrouter.ai/api/v1",
      openrouter_key: process.env.OPENROUTER_API_KEY || process.env.LOVABLE_API_KEY || null,
      openrouter_model: "google/gemini-2.5-flash",
    };
  }

  return {
    mode: data.mode as any,
    ollama_url: data.ollama_url,
    ollama_model: data.ollama_model,
    openrouter_url: data.openrouter_url,
    openrouter_key: data.openrouter_key || process.env.OPENROUTER_API_KEY || process.env.LOVABLE_API_KEY || null,
    openrouter_model: data.openrouter_model,
  };
}

export async function callAi({
  supabase,
  messages,
  systemPrompt,
  pdf,
}: {
  supabase: any;
  messages: any[];
  systemPrompt: string;
  pdf?: { base64: string; name: string };
}): Promise<string> {
  const settings = await getAiSettings(supabase);

  // Extract text from messages
  let userText = "";
  for (const msg of messages) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        userText += msg.content + "\n";
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text") {
            userText += part.text + "\n";
          }
        }
      }
    }
  }

  const userContent: any[] = [{ type: "text", text: userText.trim() }];
  if (pdf) {
    userContent.push({
      type: "file",
      file: {
        filename: pdf.name,
        file_data: `data:application/pdf;base64,${pdf.base64}`,
      },
    });
  }

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: pdf ? userContent : userText.trim() },
  ];

  if (settings.mode === "local_only") {
    return await callOllama(settings, formattedMessages);
  } else if (settings.mode === "full_cloud") {
    return await callOpenRouter(settings, formattedMessages);
  } else {
    // local_cloud (local + cloud)
    try {
      console.log("Attempting local Ollama evaluation...");
      // For Ollama, strip PDF if the model is not multimodal,
      // but let's try to send it without PDF first to avoid errors on non-multimodal models.
      const ollamaMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText.trim() }
      ];
      return await callOllama(settings, ollamaMessages);
    } catch (e) {
      console.warn("Ollama evaluation failed, falling back to OpenRouter:", e instanceof Error ? e.message : e);
      return await callOpenRouter(settings, formattedMessages);
    }
  }
}

async function callOllama(settings: AiSettings, messages: any[]): Promise<string> {
  let endpoint = settings.ollama_url;
  
  // Try native /api/chat first because it has native JSON formatting constraint "format: json"
  // which is extremely robust and guarantees valid JSON output for local models like Gemma, Llama3, etc.
  const baseUrl = endpoint.replace(/\/v1\/chat\/completions\/?$/, "").replace(/\/+$/, "");
  const chatEndpoint = `${baseUrl}/api/chat`;

  try {
    const body = {
      model: settings.ollama_model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
      })),
      format: "json",
      options: {
        temperature: 0.1, // Lower temperature for more deterministic JSON structure
      },
      stream: false
    };

    const res = await fetch(chatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.message?.content;
      if (content) return content;
    }
    console.warn(`Native Ollama /api/chat returned status ${res.status}, falling back to OpenAI compatibility endpoint...`);
  } catch (err) {
    console.warn("Native Ollama /api/chat failed, falling back to OpenAI compatibility endpoint...", err);
  }

  // Fallback to OpenAI compatibility endpoint
  let openAiEndpoint = endpoint;
  if (!openAiEndpoint.endsWith("/v1/chat/completions") && !openAiEndpoint.endsWith("/v1/chat/completions/")) {
    openAiEndpoint = openAiEndpoint.replace(/\/+$/, "") + "/v1/chat/completions";
  }

  const body = {
    model: settings.ollama_model,
    messages,
    response_format: { type: "json_object" },
    options: {
      temperature: 0.1,
    }
  };

  const res = await fetch(openAiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Ollama returned empty response");
  }
  return content;
}

async function callOpenRouter(settings: AiSettings, messages: any[]): Promise<string> {
  let endpoint = settings.openrouter_url;
  if (!endpoint.endsWith("/chat/completions") && !endpoint.endsWith("/chat/completions/")) {
    endpoint = endpoint.replace(/\/+$/, "") + "/chat/completions";
  }

  if (!settings.openrouter_key) {
    throw new Error("Missing OpenRouter API Key. Please configure it in Settings.");
  }

  const body = {
    model: settings.openrouter_model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.2,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.openrouter_key}`,
      "HTTP-Referer": "https://github.com/sammyjason39/aign-venture-compass",
      "X-Title": "Venturis Curation System",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned empty response");
  }
  return content;
}
