import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { AlertItem } from '../types/security';
import { api } from '../api/client';

interface AssistantChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextAlert: AlertItem | null;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  isFallback?: boolean;
}

export const AssistantChatDrawer: React.FC<AssistantChatDrawerProps> = ({
  isOpen,
  onClose,
  contextAlert,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Hello! I am your Shield Labs Bot assistant. How can I help you understand your PC security today? Feel free to ask about any alert, download, or setting.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contextAlert) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `I noticed you're reviewing the alert: "${contextAlert.title}". Would you like me to explain what this program was doing and why it was suspended?`,
        },
      ]);
    }
  }, [contextAlert]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setInputText('');
    const updatedMessages = [...messages, { sender: 'user' as const, text }];
    setMessages(updatedMessages);
    setIsSending(true);

    try {
      const historyToSend = updatedMessages.slice(-6).map((m) => ({ sender: m.sender, text: m.text }));
      const res = await api.askSecurityAssistant(text, contextAlert || undefined, historyToSend);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: res.reply, isFallback: res.is_fallback },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'I was unable to connect to the assistant service right now. Your PC remains fully protected locally.',
          isFallback: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const samplePrompts = [
    'What does "quarantining a file" actually do?',
    'What is a canary file and how does it catch ransomware?',
    'Is certutil a virus or a normal Windows program?',
    'How does Panic Mode protect me if I suspect an attack?',
  ];

  return (
    <div
      role="dialog"
      aria-label="Shield Labs Bot Assistant"
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/90">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Security Assistant</h2>
            <span className="text-[11px] text-emerald-700 font-semibold">Calm Plain-English Guidance</span>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close assistant panel"
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === 'user' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-xs'
                  : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-xs shadow-2xs'
              }`}
            >
              <p>{msg.text}</p>
              {msg.isFallback && (
                <span className="block text-[10px] text-slate-400 mt-1 italic">
                  Local offline guidance
                </span>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 text-slate-500 text-xs pl-8">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>Analyzing in plain English...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 space-y-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
          Common Questions:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.slice(0, 2).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] text-left px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors truncate max-w-full shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question about an alert or setting..."
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          aria-label="Send question"
          className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
