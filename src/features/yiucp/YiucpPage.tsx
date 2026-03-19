import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { askYiucp, getSuggestionChips } from '@/services/yiucpService.ts';
import { YiucpMascot } from './YiucpMascot.tsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) {
        return '<tr class="yiucp-table-sep"></tr>';
      }
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    // Lists
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  // Wrap table rows in table
  html = html.replace(
    /(<tr>[\s\S]*?<\/tr>(\s*<br\/>)*\s*<tr class="yiucp-table-sep"><\/tr>(\s*<br\/>)*\s*(<tr>[\s\S]*?<\/tr>(\s*<br\/>)*)*)/g,
    '<div style="overflow-x:auto;margin:8px 0"><table class="yiucp-table">$1</table></div>'
  );

  // Wrap li items in ul
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  // Clean up double ul
  html = html.replace(/<\/ul>\s*<br\/>\s*<ul>/g, '');

  return html;
}

export function YiucpPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const { orgType, roles } = usePermissions();

  const chips = getSuggestionChips(orgType ?? 'platform', roles);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (text?: string) => {
    const query = (text ?? inputText).trim();
    if (!query || isLoading) return;

    setShowGreeting(false);
    setInputText('');

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await askYiucp({
        query,
        orgId: organization?.id ?? '',
        orgType: orgType ?? 'platform',
        roles,
        userId: user?.id ?? '',
      });

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.error ?? response.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Error al procesar tu consulta: ${err instanceof Error ? err.message : 'Error desconocido'}. Intenta de nuevo.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? 'usuario';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      maxWidth: 900,
      margin: '0 auto',
    }}>
      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {/* Greeting */}
        {showGreeting && messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 20,
            paddingTop: 40,
          }}>
            <YiucpMascot state="greeting" size={140} />

            <div style={{ textAlign: 'center', maxWidth: 500 }}>
              <h1 style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: 4,
                animation: 'yiucpFadeIn 0.6s ease-out 0.3s both',
              }}>
                <span style={{ color: '#D3010A' }}>Hola, {firstName}</span>
              </h1>
              <p style={{
                fontSize: 20,
                fontWeight: 500,
                color: '#64748B',
                marginBottom: 8,
                animation: 'yiucpFadeIn 0.6s ease-out 0.5s both',
              }}>
                ¿En qué puedo ayudarte hoy?
              </p>
              <p style={{
                fontSize: 13,
                color: '#94A3B8',
                animation: 'yiucpFadeIn 0.6s ease-out 0.7s both',
              }}>
                Soy Yiucp, tu asistente inteligente de Rhino Toyo Parts.
                Puedo consultar datos de órdenes, inventario, almacén y más.
              </p>
            </div>

            {/* Suggestion chips */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'center',
              maxWidth: 600,
              animation: 'yiucpFadeIn 0.6s ease-out 0.9s both',
            }}>
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 20,
                    border: '1.5px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#D3010A';
                    e.currentTarget.style.color = '#D3010A';
                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <Sparkles size={14} />
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 10,
              animation: 'yiucpFadeIn 0.3s ease-out',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{ flexShrink: 0, marginTop: 4 }}>
                <YiucpMascot state="idle" size={36} />
              </div>
            )}
            <div
              style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                backgroundColor: msg.role === 'user' ? '#D3010A' : '#FFFFFF',
                color: msg.role === 'user' ? '#FFFFFF' : '#1E293B',
                border: msg.role === 'assistant' ? '1px solid #E2E0DE' : 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={
                msg.role === 'assistant'
                  ? { __html: renderMarkdown(msg.content) }
                  : undefined
              }
            >
              {msg.role === 'user' ? msg.content : undefined}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', animation: 'yiucpFadeIn 0.3s ease-out' }}>
            <YiucpMascot state="thinking" size={36} />
            <div style={{
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E0DE',
              color: '#94A3B8',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ animation: 'yiucpDots 1.4s ease-in-out infinite' }}>Consultando datos</span>
              <span style={{ display: 'flex', gap: 2 }}>
                <span style={{ animation: 'yiucpDot 1.4s ease-in-out infinite', animationDelay: '0s' }}>.</span>
                <span style={{ animation: 'yiucpDot 1.4s ease-in-out infinite', animationDelay: '0.2s' }}>.</span>
                <span style={{ animation: 'yiucpDot 1.4s ease-in-out infinite', animationDelay: '0.4s' }}>.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #E2E0DE',
        backgroundColor: '#FFFFFF',
      }}>
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          maxWidth: 800,
          margin: '0 auto',
          backgroundColor: '#F8FAFC',
          borderRadius: 24,
          border: '1.5px solid #E2E8F0',
          padding: '4px 4px 4px 20px',
          transition: 'border-color 0.15s',
        }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#D3010A'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregúntale a Yiucp..."
            disabled={isLoading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 15,
              color: '#1E293B',
              padding: '12px 0',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: inputText.trim() && !isLoading ? '#D3010A' : '#E2E8F0',
              color: inputText.trim() && !isLoading ? '#FFFFFF' : '#94A3B8',
              cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <Send size={18} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 8 }}>
          Yiucp puede cometer errores. Verifica la información importante.
        </p>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes yiucpFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes yiucpDot {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        .yiucp-table {
          border-collapse: collapse;
          font-size: 13px;
          width: 100%;
        }
        .yiucp-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #F1F5F9;
          white-space: nowrap;
        }
        .yiucp-table tr:first-child td {
          font-weight: 600;
          color: #475569;
          background: #F8FAFC;
          border-bottom: 2px solid #E2E8F0;
        }
        .yiucp-table-sep { display: none; }
        .yiucp-table tr:hover td {
          background: #F8FAFC;
        }
      `}</style>
    </div>
  );
}
