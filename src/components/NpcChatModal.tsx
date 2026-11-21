import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles, User, X } from 'lucide-react';
import { getUi } from '../game/i18n';
import { LanguageCode } from '../game/types';

interface NpcChatModalProps {
  npc: { id: number; name: string; role: string; mood: string };
  language?: LanguageCode;
  weatherLabel: string;
  onSendMessage: (
    npc: { id: number; name: string; role: string; mood: string },
    text: string,
  ) => Promise<{ reply: string; mood?: string; tip?: string; error?: string }>;
  onClose: () => void;
}

interface ChatMsg {
  sender: 'player' | 'npc';
  text: string;
  tip?: string;
}

export const NpcChatModal: React.FC<NpcChatModalProps> = ({
  npc,
  language = 'en',
  weatherLabel,
  onSendMessage,
  onClose,
}) => {
  const ui = getUi(language);
  const isSkCs = language === 'sk' || language === 'cs';
  const [currentMood, setCurrentMood] = useState(npc.mood);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: 'npc',
      text: isSkCs
        ? `Ahoj, tu ${npc.name}. Počasie je práve ${weatherLabel.toLowerCase()} — čo potrebuješ?`
        : `Hey there, I'm ${npc.name}. Weather looks ${weatherLabel.toLowerCase()} right now — what do you need?`,
    },
  ]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setError('');
    setMessages((prev) => [...prev, { sender: 'player', text }]);
    setLoading(true);
    const res = await onSendMessage({ ...npc, mood: currentMood }, text);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.mood) setCurrentMood(res.mood);
    setMessages((prev) => [
      ...prev,
      { sender: 'npc', text: res.reply || '...', tip: res.tip },
    ]);
  };

  const quickPrompts = isSkCs
    ? [
        'Čo sa práve deje v tejto štvrti?',
        'Kde tu nájdem najbližšiu prácu alebo políciu?',
        'Ako zvládaš dnešné počasie?',
      ]
    : [
        "What's happening in this district?",
        'Where is the nearest gig or PBPD patrol?',
        'How are you handling this weather?',
      ];

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-cyan-400/35 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{npc.name}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                  {currentMood}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {npc.role} · {ui.npcDialogTag}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto bg-slate-950/60">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.sender === 'player' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[86%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  m.sender === 'player'
                    ? 'bg-cyan-500 text-slate-950 font-medium'
                    : 'bg-slate-800 border border-white/10 text-slate-100'
                }`}
              >
                {m.text}
              </div>
              {m.tip && (
                <div className="mt-1 px-2 py-0.5 rounded bg-amber-950/70 border border-amber-400/30 text-[10px] text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Tip: {m.tip}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-xs text-cyan-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> {npc.name} {ui.npcTyping}
            </div>
          )}
          {error && (
            <div className="p-2 rounded bg-rose-950/80 border border-rose-400/40 text-xs text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/10 bg-slate-900 flex flex-wrap gap-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              disabled={loading}
              onClick={() => void send(q)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-white/10"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="p-3 bg-slate-950 border-t border-white/10 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ui.npcPlaceholder}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> {ui.sendBtn}
          </button>
        </form>
      </div>
    </div>
  );
};
