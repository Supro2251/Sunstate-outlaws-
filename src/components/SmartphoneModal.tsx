import React, { useState } from 'react';
import {
  Ambulance,
  Bot,
  Car,
  Delete,
  Flame,
  Flag,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { getUi } from '../game/i18n';
import { CharacterTheme, LanguageCode } from '../game/types';

interface SmartphoneModalProps {
  language?: LanguageCode;
  godMode: boolean;
  weatherLabel: string;
  aiBulletin: string;
  characterName: string;
  characterHomeName: string;
  reputationRank: string;
  characterTheme: CharacterTheme;
  onCallService: (service: 'police' | 'ems' | 'fire' | 'taxi') => void;
  onDialCheat: (code: string) => { ok: boolean; message: string };
  onAskAiCopilot: (
    text: string,
  ) => Promise<{ reply: string; mood?: string; tip?: string; error?: string }>;
  onGenerateAiMission: (
    theme: string,
  ) => Promise<{ ok: boolean; title?: string; error?: string }>;
  onClose: () => void;
}

type PhoneTab = 'dialer' | 'ai_chat' | 'ai_missions';

export const SmartphoneModal: React.FC<SmartphoneModalProps> = ({
  language = 'en',
  godMode,
  weatherLabel,
  aiBulletin,
  characterName,
  characterHomeName,
  reputationRank,
  characterTheme,
  onCallService,
  onDialCheat,
  onAskAiCopilot,
  onGenerateAiMission,
  onClose,
}) => {
  const ui = getUi(language);
  const isSkCs = language === 'sk' || language === 'cs';
  const [tab, setTab] = useState<PhoneTab>('dialer');
  const [digits, setDigits] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const initialGreeting = isSkCs
    ? `Palmetto AI online pre ${characterName} (${reputationRank}). Počasie: ${weatherLabel}. Opýtaj sa na taktiku, misie alebo stav mesta.`
    : `Palmetto AI online for ${characterName} (${reputationRank}). Weather: ${weatherLabel}. Ask about PBPD tactics, contracts, or city alerts.`;

  const [aiMessages, setAiMessages] = useState<Array<{ from: 'user' | 'ai'; text: string }>>([
    { from: 'ai', text: initialGreeting },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [missionTheme, setMissionTheme] = useState('');
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionError, setMissionError] = useState('');

  const accentHex = characterTheme.accentHex;

  const cheatLabels: Record<string, string> = isSkCs
    ? {
        '3324': 'Nesmrteľnosť',
        '2532': 'Zrušiť hľadanie',
        '4325': 'Zdravie & Auto',
        '5342': 'Vrtuľník',
        '7645': 'Taxík',
        '7726': 'Superšport',
        '8654': 'Lietadlo',
        '9975': 'Stíhačka',
      }
    : {
        '3324': 'God Mode',
        '2532': 'Clear Wanted',
        '4325': 'Heal & Repair',
        '5342': 'Helicopter',
        '7645': 'Spawn Taxi',
        '7726': 'Supercar',
        '8654': 'Prop Plane',
        '9975': 'Fighter Jet',
      };

  const quickAiQuestions = isSkCs
    ? ['Aká je taktika PBPD?', 'Kde zarobím rýchle peniaze?', 'Čo robia ľudia vonku?']
    : ['What is PBPD dispatch tactic?', 'Best way to earn cash?', 'What are citizens doing?'];

  const quickMissionIdeas = isSkCs
    ? [
        'Tajná nočná dodávka zo Sunstate Motors na letisko',
        'Útek pred PBPD počas silnej búrky k Pulse Studio Loft',
        'Letecký prieskum ponad ostrov Coral Keys a pobrežie',
      ]
    : [
        'Midnight secret delivery from Sunstate Motors to Airport',
        'Stormy PBPD escape back to Pulse Studio Loft',
        'Aerial recon flight over Coral Keys Island & coast',
      ];

  const appendDigit = (d: string) => {
    setDigits((prev) => (prev.length < 8 ? prev + d : prev));
  };

  const handleCallNumber = () => {
    if (!digits) return;
    const res = onDialCheat(digits);
    setStatusMsg(res.message);
    if (res.ok) setDigits('');
  };

  const handleSendAi = async (overrideText?: string) => {
    const text = (overrideText ?? aiInput).trim();
    if (!text || aiLoading) return;
    setAiInput('');
    setAiError('');
    setAiMessages((prev) => [...prev, { from: 'user', text }]);
    setAiLoading(true);
    const res = await onAskAiCopilot(text);
    setAiLoading(false);
    if (res.error) {
      setAiError(res.error);
      return;
    }
    setAiMessages((prev) => [...prev, { from: 'ai', text: res.reply || '...' }]);
  };

  const handleCreateMission = async (themeText: string) => {
    const clean = themeText.trim();
    if (!clean || missionLoading) return;
    setMissionError('');
    setMissionLoading(true);
    const res = await onGenerateAiMission(clean);
    setMissionLoading(false);
    if (!res.ok) {
      setMissionError(res.error || 'Failed to generate AI mission.');
      return;
    }
    onClose();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-end p-6 bg-slate-950/45">
      <div
        className="w-[344px] rounded-2xl bg-slate-900 border-2 shadow-2xl overflow-hidden flex flex-col"
        style={{ borderColor: `${accentHex}70` }}
      >
        {/* Phone Top Speaker & Character-Themed Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" style={{ color: accentHex }} />
              <span className="font-display text-sm font-bold text-white">{ui.phoneHeader}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {characterName} · {reputationRank} · {characterHomeName.split(' (')[0]}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* App Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-950/80 border-b border-white/10 text-[11px]">
          <button
            onClick={() => setTab('dialer')}
            className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
              tab === 'dialer'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5" /> {ui.tabServices}
          </button>
          <button
            onClick={() => setTab('ai_chat')}
            style={tab === 'ai_chat' ? { backgroundColor: accentHex, color: '#020617' } : undefined}
            className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
              tab === 'ai_chat' ? '' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> {ui.tabAiChat}
          </button>
          <button
            onClick={() => setTab('ai_missions')}
            className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 ${
              tab === 'ai_missions'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> {ui.tabAiMission}
          </button>
        </div>

        {tab === 'dialer' && (
          <div className="p-4 space-y-4">
            {/* Emergency & City Services */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {ui.emergencyServicesTitle}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    onCallService('ems');
                    onClose();
                  }}
                  className="p-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-400/35 text-rose-100 flex items-center gap-2"
                >
                  <Ambulance className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{ui.callEms}</span>
                </button>
                <button
                  onClick={() => {
                    onCallService('fire');
                    onClose();
                  }}
                  className="p-2.5 rounded-lg bg-orange-950/70 hover:bg-orange-900 border border-orange-400/35 text-orange-100 flex items-center gap-2"
                >
                  <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>{ui.callFire}</span>
                </button>
                <button
                  onClick={() => {
                    onCallService('police');
                    onClose();
                  }}
                  className="p-2.5 rounded-lg bg-sky-950/70 hover:bg-sky-900 border border-sky-400/35 text-sky-100 flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{ui.callPolice}</span>
                </button>
                <button
                  onClick={() => {
                    onCallService('taxi');
                    onClose();
                  }}
                  className="p-2.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-400/35 text-amber-100 flex items-center gap-2"
                >
                  <Car className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{ui.callTaxi}</span>
                </button>
              </div>
            </div>

            {/* Cheat Keypad Dialer */}
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {ui.cheatDialerTitle}
                </span>
                {godMode && (
                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> GOD MODE
                  </span>
                )}
              </div>

              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-white/15 flex items-center justify-between mb-2.5">
                <span className="font-mono-num text-lg tracking-widest" style={{ color: accentHex }}>
                  {digits || '----'}
                </span>
                <button
                  onClick={() => setDigits((p) => p.slice(0, -1))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              {statusMsg && (
                <div className="mb-2 px-2.5 py-1 rounded bg-slate-800 text-[11px] text-amber-300 text-center">
                  {statusMsg}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                  <button
                    key={d}
                    onClick={() => appendDigit(d)}
                    className="py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm font-mono-num font-bold text-white"
                  >
                    {d}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCallNumber}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> {ui.dialBtn}
              </button>

              <div className="mt-2.5 p-2.5 rounded bg-slate-950/90 border border-white/10 text-[10px] text-slate-400 space-y-1 select-none cursor-default">
                <div className="text-slate-300 font-semibold flex items-center justify-between">
                  <span>{ui.cheatListTitle}</span>
                  <span className="text-[9px] text-slate-500">{ui.cheatListHint}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pointer-events-none">
                  {Object.entries(cheatLabels).map(([code, label]) => (
                    <div key={code}>
                      <span className="font-mono-num text-slate-200">{code}</span> — {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'ai_chat' && (
          <div className="p-3.5 flex flex-col gap-2.5">
            <div className="px-2.5 py-1.5 rounded bg-cyan-950/60 border border-cyan-400/25 text-[11px] text-cyan-200">
              <span className="font-semibold">{ui.dispatchPrefix}</span> {aiBulletin}
            </div>

            <div className="h-60 overflow-y-auto space-y-2 p-2 rounded-lg bg-slate-950 border border-white/10">
              {aiMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] px-2.5 py-1.5 rounded-lg text-xs leading-relaxed ${
                      m.from === 'user'
                        ? 'bg-cyan-500 text-slate-950 font-medium'
                        : 'bg-slate-800 text-slate-100 border border-white/10'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {aiLoading && <div className="text-[11px] text-cyan-300">{ui.aiThinking}</div>}
              {aiError && (
                <div className="p-2 rounded bg-rose-950/80 border border-rose-400/35 text-[11px] text-rose-200">
                  {aiError}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {quickAiQuestions.map((q) => (
                <button
                  key={q}
                  disabled={aiLoading}
                  onClick={() => void handleSendAi(q)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendAi();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={ui.askAiPlaceholder}
                className="flex-1 px-2.5 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {tab === 'ai_missions' && (
          <div className="p-4 space-y-3">
            <div className="text-xs text-slate-300 leading-relaxed">{ui.aiMissionDesc}</div>

            <textarea
              rows={3}
              value={missionTheme}
              onChange={(e) => setMissionTheme(e.target.value)}
              placeholder={ui.aiMissionPlaceholder}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
            />

            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {ui.quickIdeasTitle}
              </div>
              {quickMissionIdeas.map((preset) => (
                <button
                  key={preset}
                  disabled={missionLoading}
                  onClick={() => void handleCreateMission(preset)}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[11px] text-slate-200"
                >
                  {preset}
                </button>
              ))}
            </div>

            {missionError && (
              <div className="p-2 rounded bg-rose-950/80 border border-rose-400/35 text-[11px] text-rose-200">
                {missionError}
              </div>
            )}

            <button
              disabled={missionLoading || !missionTheme.trim()}
              onClick={() => void handleCreateMission(missionTheme)}
              className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {missionLoading ? ui.generatingMissionBtn : ui.generateMissionBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
