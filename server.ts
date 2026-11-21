import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import http from 'http';
import path from 'path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const VALID_BEHAVIORS = new Set([
  'patrol',
  'flee',
  'shelter',
  'investigate',
  'cheer',
  'confront',
  'hail_taxi',
]);

const VALID_WEATHERS = new Set(['clear', 'overcast', 'rain', 'storm', 'foggy']);
const VALID_LANGS = new Set(['en', 'sk', 'cs', 'de', 'es', 'pl']);

const LANG_NAME_MAP: Record<string, string> = {
  en: 'English',
  sk: 'Slovak (Slovenčina)',
  cs: 'Czech (Čeština)',
  de: 'German (Deutsch)',
  es: 'Spanish (Español)',
  pl: 'Polish (Polski)',
};

function normalizeLang(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : 'en';
  return VALID_LANGS.has(s) ? s : 'en';
}

function extractModelJson(raw: string | undefined | null): Record<string, any> | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  if (!cleaned) return null;

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Fallback to balanced JSON object extraction
  }

  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx >= 0 && endIdx > startIdx) {
    const slice = cleaned.slice(startIdx, endIdx + 1).replace(/,\s*([}\]])/g, '$1');
    try {
      const parsed = JSON.parse(slice);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Timeout'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function buildFallbackDispatch(
  lang: string,
  weatherPreset: string,
  wantedStars: number,
  nearbyNpcs: any[],
) {
  const isStormOrRain = weatherPreset === 'rain' || weatherPreset === 'storm';
  const copy: Record<
    string,
    { clear: string; rain: string; wanted: string; tacticClear: string; tacticWanted: string; dispatch: string; moodAlert: string; moodCalm: string }
  > = {
    en: {
      clear: 'Palmetto Bay traffic moving smoothly along Flamingo Blvd.',
      rain: 'Coastal showers over Coral Keys — pedestrians seeking shelter.',
      wanted: `PBPD units converging on Level-${wantedStars} suspect across downtown.`,
      tacticClear: 'Routine Palmetto Bay patrol',
      tacticWanted: `Perimeter lockdown (${wantedStars}-star pursuit)`,
      dispatch: 'All PBPD patrol cars maintain sector coverage.',
      moodAlert: 'alert',
      moodCalm: 'relaxed',
    },
    sk: {
      clear: 'Palmetto Bay hlási plynulú premávku pozdĺž Flamingo Blvd.',
      rain: 'Prehánky nad Coral Keys — chodci hľadajú úkryt a taxíky.',
      wanted: `Jednotky PBPD uzatvárajú obvod pri ${wantedStars}-hviezdičkovom pátraní.`,
      tacticClear: 'Štandardná hliadka obvodov PBPD',
      tacticWanted: `Taktický zátaras (${wantedStars}★ prenasledovanie)`,
      dispatch: 'Všetky jednotky PBPD na príjme.',
      moodAlert: 'ostražitý',
      moodCalm: 'pokojný',
    },
    cs: {
      clear: 'Palmetto Bay hlásí plynulý provoz podél Flamingo Blvd.',
      rain: 'Přeháňky nad Coral Keys — chodci hledají úkryt a taxi.',
      wanted: `Jednotky PBPD uzavírají sektor při ${wantedStars}-hvězdičkovém pátrání.`,
      tacticClear: 'Standardní hlídka obvodů PBPD',
      tacticWanted: `Taktický zátaras (${wantedStars}★ pronásledování)`,
      dispatch: 'Všechny jednotky PBPD na příjmu.',
      moodAlert: 'ostražitý',
      moodCalm: 'klidný',
    },
    de: {
      clear: 'Palmetto Bay meldet ruhigen Verkehr entlang des Flamingo Blvd.',
      rain: 'Küstenregen über Coral Keys — Passanten suchen Schutz.',
      wanted: `PBPD-Einheiten riegeln Sektor bei Fahndungsstufe ${wantedStars} ab.`,
      tacticClear: 'Normale Sektorstreife',
      tacticWanted: `Fahndungsring (${wantedStars}-Sterne-Verfolgung)`,
      dispatch: 'Alle PBPD-Streifen halten Position.',
      moodAlert: 'wachsam',
      moodCalm: 'entspannt',
    },
    es: {
      clear: 'Tráfico fluido en Palmetto Bay a lo largo de Flamingo Blvd.',
      rain: 'Lluvias costeras en Coral Keys — peatones buscan refugio.',
      wanted: `Unidades del PBPD cierran el perímetro en búsqueda nivel ${wantedStars}.`,
      tacticClear: 'Patrulla rutinaria de sector',
      tacticWanted: `Bloqueo táctico (persecución ${wantedStars}★)`,
      dispatch: 'Todas las unidades PBPD en frecuencia.',
      moodAlert: 'alerta',
      moodCalm: 'tranquilo',
    },
    pl: {
      clear: 'Płynny ruch w Palmetto Bay wzdłuż Flamingo Blvd.',
      rain: 'Opady nad Coral Keys — przechodnie szukają schronienia.',
      wanted: `Jednostki PBPD zamykają sektor przy pościgu ${wantedStars}★.`,
      tacticClear: 'Standardowy patrol sektorowy PBPD',
      tacticWanted: `Blokada taktyczna (pościg ${wantedStars}★)`,
      dispatch: 'Wszystkie jednostki PBPD na nasłuchu.',
      moodAlert: 'czujny',
      moodCalm: 'spokojny',
    },
  };
  const c = copy[lang] ?? copy.en;
  const bulletin = wantedStars > 0 ? c.wanted : isStormOrRain ? c.rain : c.clear;
  const policeTactic = wantedStars > 0 ? c.tacticWanted : c.tacticClear;
  const npcActions = nearbyNpcs.map((n: any) => {
    let behavior = 'patrol';
    if (wantedStars > 0) behavior = n.isCop ? 'confront' : 'flee';
    else if (isStormOrRain && !n.isCop) behavior = n.id % 2 === 0 ? 'shelter' : 'hail_taxi';
    return {
      id: Number(n.id),
      behavior,
      line: '',
      mood: wantedStars > 0 ? c.moodAlert : c.moodCalm,
    };
  });
  return {
    bulletin,
    policeTactic,
    dispatchCall: c.dispatch,
    npcActions,
  };
}

// Persistent JSON file store for Cloud Save (progress + language)
const CLOUD_DATA_DIR = path.resolve(process.cwd(), 'data');
const CLOUD_SAVES_FILE = path.join(CLOUD_DATA_DIR, 'cloud-saves.json');
let cloudWriteChain = Promise.resolve();

async function readCloudStore(): Promise<Record<string, any>> {
  try {
    const raw = await fs.readFile(CLOUD_SAVES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCloudStore(store: Record<string, any>): Promise<void> {
  cloudWriteChain = cloudWriteChain.then(async () => {
    await fs.mkdir(CLOUD_DATA_DIR, { recursive: true });
    await fs.writeFile(CLOUD_SAVES_FILE, JSON.stringify(store, null, 2), 'utf8');
  });
  return cloudWriteChain;
}

function normalizeSyncId(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

interface PlayerPresence {
  id: string;
  handle: string;
  friends: string[];
  characterId: 'dante' | 'elena' | 'kairo';
  x: number;
  y: number;
  z: number;
  yaw: number;
  inVehicle: boolean;
  vehicleType: string;
  activeMissionId: string | null;
}

interface ClientRecord {
  ws: WebSocket;
  state: PlayerPresence;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      world: 'Palmetto Bay & Coral Keys County',
      aiConfigured: Boolean(ai),
      uptime: Math.round(process.uptime()),
    });
  });

  // Cloud Save Endpoints (persists progress + selected language)
  app.get('/api/cloud-save/:syncId', async (req, res) => {
    const syncId = normalizeSyncId(req.params.syncId);
    if (syncId.length < 3) {
      return res.status(400).json({ ok: false, error: 'Invalid Sync ID (min 3 characters).' });
    }
    try {
      const store = await readCloudStore();
      const entry = store[syncId];
      if (!entry) {
        return res.status(404).json({ ok: false, error: 'Cloud save not found for this Sync ID.' });
      }
      return res.json({ ok: true, syncId, saveData: entry });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to read cloud save.' });
    }
  });

  app.post('/api/cloud-save', async (req, res) => {
    const body = req.body ?? {};
    const syncId = normalizeSyncId(body.syncId);
    if (syncId.length < 3) {
      return res.status(400).json({ ok: false, error: 'Invalid Sync ID (use 3-40 letters/numbers).' });
    }
    const saveData = body.saveData;
    if (!saveData || typeof saveData !== 'object') {
      return res.status(400).json({ ok: false, error: 'Missing saveData payload.' });
    }
    try {
      const store = await readCloudStore();
      const record = {
        ...saveData,
        language: normalizeLang(saveData.language ?? body.language),
        savedAt: new Date().toISOString(),
      };
      store[syncId] = record;
      await writeCloudStore(store);
      return res.json({
        ok: true,
        syncId,
        savedAt: record.savedAt,
        language: record.language,
      });
    } catch {
      return res.status(500).json({ ok: false, error: 'Failed to store cloud save.' });
    }
  });

  app.post('/api/ai/npc-director', async (req, res) => {
    const body = req.body ?? {};
    const lang = normalizeLang(body.language);
    const langName = LANG_NAME_MAP[lang] || 'English';
    const weatherPreset = String(body.weatherPreset || 'clear');
    const wantedStars = Number(body.wantedStars ?? 0);
    const nearbyNpcs = Array.isArray(body.nearbyNpcs) ? body.nearbyNpcs.slice(0, 6) : [];

    if (!ai) {
      return res.json(buildFallbackDispatch(lang, weatherPreset, wantedStars, nearbyNpcs));
    }

    try {
      const prompt = `You are the live city AI dispatch director for Palmetto Bay & Coral Keys County in Sunstate Outlaws: Neon Tide.
Respond STRICTLY in ${langName}. Never mention GTA trademarks (only Sunstate, Palmetto Bay, Coral Keys, PBPD, Apex Trust).
Current situation:
- Weather: ${String(body.weatherLabel || weatherPreset)} (${weatherPreset})
- Time: ${Number(body.timeHour ?? 12).toFixed(1)}h
- PBPD Wanted: ${wantedStars}/5 stars
- Player: ${String(body.characterName || 'Dante Vance')}, ${body.playerInVehicle ? `in ${body.vehicleName || 'vehicle'} (${Math.round(Number(body.playerSpeedKmh ?? 0))} km/h)` : `on foot with ${body.playerWeapon || 'fists'}`}
- Recent events: ${Array.isArray(body.recentEvents) && body.recentEvents.length > 0 ? body.recentEvents.join('; ') : 'normal traffic'}
- Active mission: ${String(body.activeMissionTitle || 'Free roam')}

Nearby NPCs (assign behavior from [patrol, flee, shelter, investigate, cheer, confront, hail_taxi]):
${JSON.stringify(nearbyNpcs)}

Keep lines vivid and short (max 65 chars per NPC line). Return valid JSON matching the schema.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bulletin: { type: Type.STRING },
                policeTactic: { type: Type.STRING },
                dispatchCall: { type: Type.STRING },
                npcActions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.INTEGER },
                      behavior: { type: Type.STRING },
                      line: { type: Type.STRING },
                      mood: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        }),
        9000,
        'AI Director timeout',
      );

      const parsed = extractModelJson(response.text);
      if (!parsed) {
        return res.json(buildFallbackDispatch(lang, weatherPreset, wantedStars, nearbyNpcs));
      }

      const fallback = buildFallbackDispatch(lang, weatherPreset, wantedStars, nearbyNpcs);
      const npcActions = Array.isArray(parsed.npcActions)
        ? parsed.npcActions.map((a: any) => ({
            id: Number(a.id),
            behavior: VALID_BEHAVIORS.has(String(a.behavior)) ? String(a.behavior) : 'patrol',
            line: String(a.line || '').slice(0, 90),
            mood: String(a.mood || fallback.npcActions[0]?.mood || 'calm').slice(0, 28),
          }))
        : fallback.npcActions;

      return res.json({
        bulletin: String(parsed.bulletin || fallback.bulletin).slice(0, 120),
        policeTactic: String(parsed.policeTactic || fallback.policeTactic).slice(0, 80),
        dispatchCall: String(parsed.dispatchCall || fallback.dispatchCall).slice(0, 110),
        npcActions,
      });
    } catch {
      // Never propagate raw JSON parse/timeout fragments to HUD; fall back cleanly to tactical dispatch
      return res.json(buildFallbackDispatch(lang, weatherPreset, wantedStars, nearbyNpcs));
    }
  });

  app.post('/api/ai/npc-chat', async (req, res) => {
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Check Settings > Secrets.',
      });
    }
    try {
      const body = req.body ?? {};
      const lang = normalizeLang(body.language);
      const langName = LANG_NAME_MAP[lang] || 'English';
      const speakerType = body.speakerType === 'copilot' ? 'copilot' : 'npc';
      const ctx = body.context ?? {};
      const systemInstruction =
        speakerType === 'copilot'
          ? `You are PALMETTO AI — tactical mobile & vehicle co-pilot in Sunstate Outlaws: Neon Tide (Palmetto Bay & Coral Keys County).
Reply strictly in ${langName}, stylish, concise (1-3 sentences), practical. Never mention GTA trademarks.`
          : `You are ${String(body.npcName || 'Citizen')} (${String(body.npcRole || 'Palmetto Bay Resident')}, mood: ${String(body.npcMood || 'neutral')}) in Palmetto Bay.
Reply strictly in ${langName} in first person (1-2 natural sentences). React to weather (${String(ctx.weatherLabel || 'Clear')}), PBPD wanted level (${Number(ctx.wantedStars ?? 0)} stars), and player message.`;

      const prompt = `Player context (${String(ctx.characterName || 'Dante Vance')}):
- Weather: ${String(ctx.weatherLabel || 'Clear')}, Time: ${Number(ctx.timeHour ?? 12).toFixed(1)}h
- PBPD Wanted: ${Number(ctx.wantedStars ?? 0)}/5
- Cash: $${Number(ctx.cash ?? 0)}, Mission: ${String(ctx.activeMission || 'Free Roam')}
- Nearby landmark: ${String(ctx.nearbyLandmark || 'Palmetto Bay')}

Player says: "${String(body.playerMessage || 'What is happening in the city?').slice(0, 260)}"`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                newBehavior: { type: Type.STRING },
                mood: { type: Type.STRING },
                tip: { type: Type.STRING },
              },
            },
          },
        }),
        14000,
        'AI Chat timeout',
      );

      const parsed = extractModelJson(response.text);
      if (!parsed) {
        return res.json({
          reply: response.text ? String(response.text).slice(0, 320) : 'Watch the streets out there.',
          newBehavior: 'patrol',
          mood: 'alert',
          tip: '',
        });
      }

      return res.json({
        reply: String(parsed.reply || 'Stay sharp out on the streets.').slice(0, 400),
        newBehavior: VALID_BEHAVIORS.has(String(parsed.newBehavior))
          ? String(parsed.newBehavior)
          : 'patrol',
        mood: String(parsed.mood || 'talkative').slice(0, 32),
        tip: String(parsed.tip || '').slice(0, 140),
      });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      return res.status(status >= 400 ? status : 500).json({
        error: String(err?.message || 'AI chat connection failed.'),
      });
    }
  });

  app.post('/api/ai/generate-mission', async (req, res) => {
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Check Settings > Secrets.',
      });
    }
    try {
      const body = req.body ?? {};
      const lang = normalizeLang(body.language);
      const langName = LANG_NAME_MAP[lang] || 'English';
      const theme = String(body.theme || 'Night courier contract in storm').slice(0, 180);
      const locations = Array.isArray(body.locations) ? body.locations.slice(0, 45) : [];

      const prompt = `Design an original 3-stage mission strictly in ${langName} for Sunstate Outlaws: Neon Tide (Palmetto Bay & Coral Keys County).
Theme: "${theme}"
Available locations with valid locationIndex:
${JSON.stringify(locations.map((l: any, idx: number) => ({ locationIndex: idx, name: l.name, kind: l.kind })))}

Rules:
- Never use GTA names.
- difficulty is integer 1..5, reward 900..3500, timeLimitSec 240..600, wantedOnStart 0..3.
- recommendedWeather in [clear, overcast, rain, storm, foggy].
- stages: 3 stages with valid locationIndex, objective in ${langName}, stageKind in [reach, deliver_car, evade_wanted, fly_ring].
- Include 2 introLines and 2 outroLines in ${langName}.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                difficulty: { type: Type.INTEGER },
                timeLimitSec: { type: Type.INTEGER },
                reward: { type: Type.INTEGER },
                wantedOnStart: { type: Type.INTEGER },
                recommendedWeather: { type: Type.STRING },
                introLines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                  },
                },
                outroLines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                  },
                },
                stages: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      objective: { type: Type.STRING },
                      locationIndex: { type: Type.INTEGER },
                      stageKind: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        }),
        16000,
        'AI Mission timeout',
      );

      const parsed = extractModelJson(response.text);
      const rawStages = parsed && Array.isArray(parsed.stages) ? parsed.stages : [];
      if (!parsed || rawStages.length === 0 || locations.length === 0) {
        return res.status(502).json({ error: 'AI did not return valid mission stages. Please retry.' });
      }

      const validStageKinds = new Set(['reach', 'deliver_car', 'evade_wanted', 'fly_ring']);
      const stages = rawStages.slice(0, 4).map((st: any, i: number) => {
        const locIdx = Math.max(
          0,
          Math.min(locations.length - 1, Math.round(Number(st.locationIndex ?? i * 3))),
        );
        const loc = locations[locIdx];
        const kind = validStageKinds.has(String(st.stageKind)) ? String(st.stageKind) : 'reach';
        return {
          objective: String(st.objective || `Go to ${loc.name}`).slice(0, 120),
          targetX: Number(loc.x) || 0,
          targetZ: Number(loc.z) || 0,
          targetY: kind === 'fly_ring' ? 45 : undefined,
          radius: kind === 'fly_ring' ? 28 : 16,
          kind,
        };
      });

      const mission = {
        id: `ai_${Date.now()}`,
        index: 99,
        title: `AI Contract: ${String(parsed.title || 'Shadow Run').slice(0, 64)}`,
        durationLabel: 'AI Generated (5–10 min)',
        difficulty: Math.max(1, Math.min(5, Math.round(Number(parsed.difficulty || 3)))) as
          | 1
          | 2
          | 3
          | 4
          | 5,
        timeLimitSec: Math.max(180, Math.min(900, Math.round(Number(parsed.timeLimitSec || 360)))),
        reward: Math.max(800, Math.min(3500, Math.round(Number(parsed.reward || 1800)))),
        wantedOnStart: Math.max(0, Math.min(3, Math.round(Number(parsed.wantedOnStart || 0)))),
        recommendedWeather: VALID_WEATHERS.has(String(parsed.recommendedWeather))
          ? String(parsed.recommendedWeather)
          : 'clear',
        introLines: Array.isArray(parsed.introLines)
          ? parsed.introLines.slice(0, 3).map((l: any) => ({
              speaker: String(l.speaker || 'Palmetto AI').slice(0, 32),
              text: String(l.text || 'New contract active.').slice(0, 180),
            }))
          : [],
        outroLines: Array.isArray(parsed.outroLines)
          ? parsed.outroLines.slice(0, 3).map((l: any) => ({
              speaker: String(l.speaker || 'Palmetto AI').slice(0, 32),
              text: String(l.text || 'Contract complete.').slice(0, 180),
            }))
          : [],
        stages,
      };

      return res.json({ mission });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      return res.status(status >= 400 ? status : 500).json({
        error: String(err?.message || 'Failed to generate AI mission.'),
      });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map<string, ClientRecord>();

  function canMeet(a: PlayerPresence, b: PlayerPresence): boolean {
    if (a.id === b.id) return false;
    const ah = a.handle.trim().toLowerCase();
    const bh = b.handle.trim().toLowerCase();
    const aHasB = a.friends.some((f) => f.trim().toLowerCase() === bh);
    const bHasA = b.friends.some((f) => f.trim().toLowerCase() === ah);
    return aHasB || bHasA;
  }

  function broadcastFriendsState(senderId: string) {
    const sender = clients.get(senderId);
    if (!sender) return;

    const payload = JSON.stringify({
      type: 'player:update',
      player: sender.state,
    });

    clients.forEach((other, otherId) => {
      if (otherId === senderId) return;
      if (other.ws.readyState === WebSocket.OPEN && canMeet(sender.state, other.state)) {
        other.ws.send(payload);
      }
    });
  }

  function sendVisibleSnapshot(targetId: string) {
    const target = clients.get(targetId);
    if (!target || target.ws.readyState !== WebSocket.OPEN) return;

    const visiblePlayers: PlayerPresence[] = [];
    clients.forEach((other, otherId) => {
      if (otherId !== targetId && canMeet(target.state, other.state)) {
        visiblePlayers.push(other.state);
      }
    });

    target.ws.send(
      JSON.stringify({
        type: 'world:snapshot',
        players: visiblePlayers,
      }),
    );
  }

  wss.on('connection', (ws) => {
    const clientId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const initialState: PlayerPresence = {
      id: clientId,
      handle: `Outlaw_${clientId.slice(-4)}`,
      friends: [],
      characterId: 'dante',
      x: 28,
      y: 0.05,
      z: 6,
      yaw: 0,
      inVehicle: false,
      vehicleType: '',
      activeMissionId: null,
    };

    clients.set(clientId, { ws, state: initialState });
    ws.send(JSON.stringify({ type: 'welcome', id: clientId }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const record = clients.get(clientId);
        if (!record) return;

        if (msg.type === 'profile:sync') {
          if (typeof msg.handle === 'string' && msg.handle.trim()) {
            record.state.handle = msg.handle.trim().slice(0, 24);
          }
          if (Array.isArray(msg.friends)) {
            record.state.friends = msg.friends
              .filter((f: unknown): f is string => typeof f === 'string')
              .map((f: string) => f.trim().slice(0, 24))
              .filter(Boolean);
          }
          sendVisibleSnapshot(clientId);
          clients.forEach((_c, oid) => {
            if (oid !== clientId) sendVisibleSnapshot(oid);
          });
          broadcastFriendsState(clientId);
        } else if (msg.type === 'state:move') {
          record.state.characterId =
            msg.characterId === 'elena'
              ? 'elena'
              : msg.characterId === 'kairo'
                ? 'kairo'
                : 'dante';
          record.state.x = Number(msg.x) || 0;
          record.state.y = Number(msg.y) || 0;
          record.state.z = Number(msg.z) || 0;
          record.state.yaw = Number(msg.yaw) || 0;
          record.state.inVehicle = Boolean(msg.inVehicle);
          record.state.vehicleType = typeof msg.vehicleType === 'string' ? msg.vehicleType : '';
          record.state.activeMissionId =
            typeof msg.activeMissionId === 'string' ? msg.activeMissionId : null;
          broadcastFriendsState(clientId);
        } else if (msg.type === 'mission:invite') {
          const targetHandle = String(msg.toHandle || '').trim().toLowerCase();
          clients.forEach((other) => {
            if (
              other.ws.readyState === WebSocket.OPEN &&
              other.state.handle.trim().toLowerCase() === targetHandle
            ) {
              other.ws.send(
                JSON.stringify({
                  type: 'mission:invite',
                  fromHandle: record.state.handle,
                  missionId: msg.missionId,
                  missionTitle: msg.missionTitle,
                }),
              );
            }
          });
        } else if (msg.type === 'mission:complete') {
          clients.forEach((other, otherId) => {
            if (
              otherId !== clientId &&
              other.ws.readyState === WebSocket.OPEN &&
              canMeet(record.state, other.state) &&
              other.state.activeMissionId === msg.missionId
            ) {
              other.ws.send(
                JSON.stringify({
                  type: 'mission:coop_complete',
                  missionId: msg.missionId,
                  byHandle: record.state.handle,
                  reward: msg.reward,
                }),
              );
            }
          });
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      const leaving = clients.get(clientId);
      clients.delete(clientId);
      if (!leaving) return;
      const payload = JSON.stringify({ type: 'player:leave', id: clientId });
      clients.forEach((other) => {
        if (other.ws.readyState === WebSocket.OPEN) {
          other.ws.send(payload);
        }
      });
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Sunstate Outlaws server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
