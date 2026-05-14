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
    try {
      const chatContext = await buildChatContext(message || '');
      systemPrompt = chatContext.systemPrompt;
      maxOutputTokens = chatContext.maxOutputTokens;
      console.log('[AI CHAT CONTEXT] Full context object:', JSON.stringify(chatContext.contextObject, null, 2));
    } catch (ctxError) {
      console.error('[AI CHAT CONTEXT] Context build failed, using fallback prompt:', ctxError);
      systemPrompt = `You are Manthaan OS Planning Intelligence for Rajasthan. Use only available baseline data and avoid guessing values. If exact metrics are unavailable, explicitly say data not available. End with 3 priority actions.`;
      maxOutputTokens = 1200;
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

    let response: Response | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Attempting chat with model: ${model}`);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens,
                topP: 0.95,
                candidateCount: 1
              }
            })
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

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text;

    if (reply) {
      return Response.json({ reply });
    }

    console.error('Gemini unexpected response:', data);
    return Response.json({ reply: 'Unable to generate response. Please try again.' });
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
