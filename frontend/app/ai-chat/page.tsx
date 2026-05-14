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

      const data = await response.json();
      const reply = data?.reply || 'Unable to get a response from planning intelligence. Please try again.';
      setMsgs((prev) => [...prev, { who: 'ai', text: reply }] );
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

  return (
    <div className="ai-chat-page">
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
          <div className="pg-t">Ask Manthaan OS Planning Intelligence</div>
          <div className="ai-badge">Talk to Data · Live Supabase Baseline</div>
        </div>
        <div className="pg-s">Ask any planning question or request a structured brief for district, GP, ward, or sector planning. Live data is refreshed before each response.</div>
      </div>

      <div className="qs qs-row">
        {suggestions.map((s) => (
          <button key={s} className="qsb" onClick={() => setVal(s)}>{s}</button>
        ))}
      </div>

      <div className="cbx response-panel">
        <div ref={responseContainerRef} className="cmsgs response-container">
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.who === 'ai' ? 'ai' : 'us'}`}>
              <div className={`msg-card ${m.who === 'ai' ? 'ai' : 'us'}`}>
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
              <div className="msg-card ai">
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
