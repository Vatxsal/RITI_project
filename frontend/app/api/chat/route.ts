import { buildChatContext } from '@/lib/aiContext';

export async function POST(req: Request) {
  const { message, history } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    let systemPrompt = '';
    let maxOutputTokens = 1200;
    let hasRealData = true;
    try {
      const chatContext = await buildChatContext(message || '');
      systemPrompt = chatContext.systemPrompt;
      maxOutputTokens = chatContext.maxOutputTokens;
      hasRealData = (chatContext as any).hasRealData !== false;
      console.log('[AI CHAT CONTEXT] Full context object:', JSON.stringify(chatContext.contextObject, null, 2));
    } catch (ctxError) {
      console.error('[AI CHAT CONTEXT] Context build failed, using fallback prompt:', ctxError);
      systemPrompt = `You are Manthaan OS Planning Intelligence for Rajasthan. Use only available baseline data and avoid guessing values. If exact metrics are unavailable, explicitly say data not available. End with 3 priority actions.`;
      maxOutputTokens = 1200;
    }

    // Add web search fallback instruction when no Supabase data found
    if (!hasRealData) {
      systemPrompt += `\n\nFALLBACK INSTRUCTION: Supabase baseline data is not available for this query. Use Google Search to find current, verified data for this question about Rajasthan. When you use web search results, clearly state at the start of your answer: "⚠️ यह डेटा Supabase बेसलाइन से नहीं, बल्कि वेब सर्च से प्राप्त किया गया है — स्रोत: [source name/URL]". This is important so government officials know the data source.`;
    }

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      ...(Array.isArray(history)
        ? history.map((m: any) => ({
            role: m.who === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }))
        : []),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    const modelsToTry = [
      process.env.NEXT_PUBLIC_GEMINI_MODEL,
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-flash-latest'
    ].filter(Boolean) as string[];

    // Build request body with optional Google Search grounding
    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens,
        topP: 0.95,
        candidateCount: 1
      }
    };
    if (!hasRealData) {
      requestBody.tools = [{ googleSearch: {} }];
    }

    let response: Response | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Attempting chat with model: ${model}`);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          }
        );

        if (res.ok) {
          response = res;
          break;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`Model ${model} failed with status ${res.status}:`, errData?.error?.message || 'Unknown error');
          lastError = errData;
          continue;
        }
      } catch (err) {
        console.error(`Fetch failed for model ${model}:`, err);
        lastError = err;
        continue;
      }
    }

    if (!response) {
      console.error('All Gemini models failed. Last error:', lastError);
      return Response.json({ 
        reply: `Unable to generate response from any available AI model. ${lastError?.error?.message || ''}` 
      }, { status: 500 });
    }

    // Stream Gemini SSE → client SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!response || !response.body) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`));
            controller.close();
            return;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const json = JSON.parse(line.slice(6));
                  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
                  }
                } catch {}
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return Response.json(
      {
        reply:
          'Error connecting to planning intelligence service. Please check the server logs or try again later.'
      },
      { status: 500 }
    );
  }
}
