"use client";

import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

type ChatMessage = {
  who: 'ai' | 'user';
  text: string;
};

export default function AIChatPage() {
  const responseContainerRef = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      who: 'ai',
      text: 'Namaste. All 41 Rajasthan districts are loaded across 11 development sectors with CDO-validated baseline data. Ask a planning question or request a structured report for any district, GP, ward, or constituency — powered by Manthaan OS Talk to Data.'
    }
  ]);
  const [val, setVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    const responseContainer = responseContainerRef.current;
    if (!responseContainer) return;
    responseContainer.scrollTo({ top: responseContainer.scrollHeight, behavior: 'smooth' });
  }, [msgs, loading]);

  async function copyText(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx(null), 1200);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }

  function renderMarkdown(text: string) {
    const html = marked.parse(text, { gfm: true, breaks: true }) as string;
    return { __html: html };
  }

  async function send() {
    const trimmed = val.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...msgs, { who: 'user', text: trimmed }];
    setMsgs(nextMessages);
    setVal('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextMessages.slice(-8)
        })
      });

      if (!response.body) throw new Error('No stream');

      // Add a placeholder AI message that we'll update as chunks arrive
      setMsgs((prev) => [...prev, { who: 'ai', text: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

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
              if (json.chunk) {
                accumulated += json.chunk;
                setMsgs((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { who: 'ai', text: accumulated };
                  return updated;
                });
              }
              if (json.done || json.error) break;
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('Chat request failed:', error);
      setMsgs((prev) => [
        ...prev,
        { who: 'ai', text: 'Unable to connect to the planning intelligence service. Please try again later.' }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Full 11-sector planning report for Tonk',
    'Top interventions for improving FHTC in Banswara',
    'GP level development brief — Berka 1508'
  ];

  const lightCardStyle = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as const;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24, color: '#1a2744' }}>
      <style>{`
  .ai-response table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin: 12px 0;
    font-family: 'Segoe UI', sans-serif;
  }
  .ai-response th {
    background: #1a2744;
    color: #ffffff;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .ai-response td {
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
    color: #1a1a2e;
    vertical-align: top;
  }
  .ai-response tr:nth-child(even) td {
    background: #f8fafc;
  }
  .ai-response tr:hover td {
    background: #eff6ff;
  }
  .ai-response h1, .ai-response h2 {
    font-size: 15px;
    font-weight: 700;
    color: #1a2744;
    margin: 16px 0 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
  }
  .ai-response h3 {
    font-size: 13px;
    font-weight: 700;
    color: #1a2744;
    margin: 12px 0 6px;
  }
  .ai-response p {
    margin: 6px 0;
    line-height: 1.65;
    font-size: 13px;
    color: #1a1a2e;
  }
  .ai-response ul {
    padding-left: 20px;
    margin: 6px 0;
    list-style-type: disc;
  }
  .ai-response ol {
    padding-left: 20px;
    margin: 6px 0;
    list-style-type: decimal;
  }
  .ai-response ul ul {
    list-style-type: circle;
  }
  .ai-response li {
    margin: 4px 0;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a2e;
  }
  .ai-response strong {
    color: #1a2744;
    font-weight: 700;
  }
  .ai-response code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    color: #1a2744;
  }
  .ai-response blockquote {
    border-left: 3px solid #e85d04;
    margin: 8px 0;
    padding: 8px 14px;
    background: #fff7ed;
    color: #374151;
    font-size: 13px;
  }
`}</style>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
          <div className="pg-t">Ask Manthaan OS Planning Intelligence</div>
          <div className="ai-badge">Talk to Data · Live Supabase Baseline</div>
        </div>
        <div className="pg-s">Ask any planning question or request a structured brief for district, GP, ward, or sector planning. Live data is refreshed before each response.</div>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 10, flexWrap: 'wrap' }}>
        {suggestions.map((s) => (
          <button key={s} onClick={() => setVal(s)} style={{ border: 'none', borderRadius: 8, padding: '8px 16px', background: '#ffffff', color: '#1a2744', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', fontWeight: 600, cursor: 'pointer' }}>{s}</button>
        ))}
      </div>

      <div className="cbx response-panel" style={lightCardStyle}>
        <div ref={responseContainerRef} className="cmsgs response-container" style={{ background: '#ffffff' }}>
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.who === 'ai' ? 'ai' : 'us'}`}>
              <div className={`msg-card ${m.who === 'ai' ? 'ai' : 'us'}`} style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {m.who === 'ai' ? (
                  <div className="msg-head">
                    <div className="ml">
                      <span className="ai-head-dot" aria-hidden="true" />
                      Manthaan AI
                    </div>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => copyText(m.text, i)}
                      aria-label="Copy response"
                      title="Copy response"
                    >
                      {copiedIdx === i ? '✓' : '⧉'}
                    </button>
                  </div>
                ) : (
                  <div className="ml">You</div>
                )}
                {m.who === 'ai' ? (
                  <div className="mt ai-response" dangerouslySetInnerHTML={renderMarkdown(m.text)} />
                ) : (
                  <div className="mt user-response">{m.text}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="msg ai">
              <div className="msg-card ai" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="msg-head">
                  <div className="ml">
                    <span className="ai-head-dot" aria-hidden="true" />
                    Manthaan AI
                  </div>
                </div>
                <div className="thinking-dots" aria-label="Thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="cin chat-input-bar">
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask a question or request a planning report..."
            disabled={loading}
            rows={2}
          />
          <button className="btn btn-ai" onClick={send} disabled={loading}>
            {loading ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
