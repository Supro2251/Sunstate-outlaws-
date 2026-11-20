import 'dotenv/config';
import express from 'express';
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

  app.post('/api/ai/npc-director', async (req, res) => {
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY nie je nastavený. Skontroluj Settings > Secrets.',
      });
    }
    try {
      const body = req.body ?? {};
      const nearbyNpcs = Array.isArray(body.nearbyNpcs) ? body.nearbyNpcs.slice(0, 8) : [];
      const prompt = `Si AI režisér mesta Palmetto Bay & Coral Keys County v open-world akčnej hre Sunstate Outlaws: Neon Tide.
Reaguj výhradne po slovensky. Nikdy nepoužívaj ochranné známky z GTA (len Sunstate, Palmetto Bay, Coral Keys, PBPD, Apex Trust).
Aktuálny stav okolia:
- Počasie: ${String(body.weatherLabel || body.weatherPreset || 'Jasno')} (${String(body.weatherPreset || 'clear')})
- Herný čas: ${Number(body.timeHour ?? 12).toFixed(1)}h
- Hľadaný PBPD: ${Number(body.wantedStars ?? 0)}/5 hviezdičiek
- Hráč: ${String(body.characterName || 'Dante Vance')}, ${body.playerInVehicle ? `vo vozidle ${body.vehicleName || ''} (${Math.round(Number(body.playerSpeedKmh ?? 0))} km/h)` : `pešo so zbraňou ${body.playerWeapon || 'fists'}`}
- Posledné udalosti v meste: ${Array.isArray(body.recentEvents) && body.recentEvents.length > 0 ? body.recentEvents.join('; ') : 'pokojná mestská premávka'}
- Aktívna misia: ${String(body.activeMissionTitle || 'Voľná jazda')}

Blízke NPC v okolí (vyber pre každé id najlogickejšie správanie z [patrol, flee, shelter, investigate, cheer, confront, hail_taxi]):
${JSON.stringify(nearbyNpcs)}

Pravidlá adaptácie:
- Pri daždi/búrke civilisti prirodzene hľadajú úkryt (shelter) alebo mávajú na taxík (hail_taxi).
- Pri streľbe, vysokej rýchlosti blízko chodcov alebo vysokom wanted lvl civilisti utekajú (flee) alebo odvážnejší zasahujú/nadávajú (confront).
- Keď hráč prechádza v superšporte bez hľadania, niektorí fandia (cheer).
- Ak hráč ide v taxíku a je dážď/hmla, niekto môže chcieť taxík (hail_taxi).
- PBPD policajti pri wanted > 0 alebo streľbe volia confront/investigate.
Vráť krátke, živé slovenské hlášky (max 75 znakov na hlášku).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bulletin: {
                type: Type.STRING,
                description: 'Krátka správa mestského dispečingu alebo rádia (max 95 znakov).',
              },
              policeTactic: {
                type: Type.STRING,
                description: 'Aktuálna taktika PBPD polície v slovenčine (max 65 znakov).',
              },
              dispatchCall: {
                type: Type.STRING,
                description: 'Krátke vysielačkové hlásenie PBPD (max 85 znakov).',
              },
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
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const npcActions = Array.isArray(parsed.npcActions)
        ? parsed.npcActions.map((a: any) => ({
            id: Number(a.id),
            behavior: VALID_BEHAVIORS.has(String(a.behavior)) ? String(a.behavior) : 'patrol',
            line: String(a.line || '').slice(0, 90),
            mood: String(a.mood || 'ostražitý').slice(0, 28),
          }))
        : [];

      return res.json({
        bulletin: String(parsed.bulletin || 'Palmetto Bay hlási plynulú premávku.').slice(0, 120),
        policeTactic: String(parsed.policeTactic || 'Štandardná hliadka obvodov').slice(0, 80),
        dispatchCall: String(parsed.dispatchCall || 'Všetky jednotky PBPD na príjme.').slice(0, 110),
        npcActions,
      });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      return res.status(status >= 400 ? status : 500).json({
        error: err?.message || 'Chyba komunikácie s Gemini AI režisérom.',
      });
    }
  });

  app.post('/api/ai/npc-chat', async (req, res) => {
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY nie je nastavený. Skontroluj Settings > Secrets.',
      });
    }
    try {
      const body = req.body ?? {};
      const speakerType = body.speakerType === 'copilot' ? 'copilot' : 'npc';
      const ctx = body.context ?? {};
      const systemInstruction =
        speakerType === 'copilot'
          ? `Si PALMETTO AI — taktický palubný a mobilný asistent v hre Sunstate Outlaws: Neon Tide (Palmetto Bay & Coral Keys County).
Odpovedaj vždy po slovensky, štýlovo, stručne (1-3 vety) a prakticky podľa situácie hráča. Nikdy nepoužívaj mená z GTA.`
          : `Si obyvateľ alebo policajt menom ${String(body.npcName || 'Občan')} (${String(body.npcRole || 'Obyvateľ Palmetto Bay')}, aktuálna nálada: ${String(body.npcMood || 'neutrálna')}) v meste Palmetto Bay.
Odpovedaj priamo v prvej osobe po slovensky (1-2 prirodzené vety). Reaguj na počasie (${String(ctx.weatherLabel || 'Jasno')}), hľadanie políciou (${Number(ctx.wantedStars ?? 0)} hviezdičiek) aj správu hráča.`;

      const prompt = `Kontext hráča (${String(ctx.characterName || 'Dante Vance')}):
- Počasie: ${String(ctx.weatherLabel || 'Jasno')}, čas: ${Number(ctx.timeHour ?? 12).toFixed(1)}h
- Hľadanie PBPD: ${Number(ctx.wantedStars ?? 0)}/5
- Hotovosť: $${Number(ctx.cash ?? 0)}, Misia: ${String(ctx.activeMission || 'Voľná jazda')}
- Blízka lokalita: ${String(ctx.nearbyLandmark || 'Palmetto Bay')}

Hráč hovorí: "${String(body.playerMessage || 'Čo sa deje v meste?').slice(0, 260)}"`;

      const response = await ai.models.generateContent({
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
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        reply: String(parsed.reply || 'Dávaj si dnes na uliciach pozor.').slice(0, 400),
        newBehavior: VALID_BEHAVIORS.has(String(parsed.newBehavior))
          ? String(parsed.newBehavior)
          : 'patrol',
        mood: String(parsed.mood || 'komunikatívny').slice(0, 32),
        tip: String(parsed.tip || '').slice(0, 140),
      });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      return res.status(status >= 400 ? status : 500).json({
        error: err?.message || 'Chyba komunikácie s Gemini AI chatom.',
      });
    }
  });

  app.post('/api/ai/generate-mission', async (req, res) => {
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY nie je nastavený. Skontroluj Settings > Secrets.',
      });
    }
    try {
      const body = req.body ?? {};
      const theme = String(body.theme || 'Nočný kuriérsky kontrakt v búrke').slice(0, 180);
      const locations = Array.isArray(body.locations) ? body.locations.slice(0, 45) : [];

      const prompt = `Navrhni originálnu 3-etapovú misiu v slovenčine pre open-world hru Sunstate Outlaws: Neon Tide (Palmetto Bay & Coral Keys County).
Téma od hráča: "${theme}"
Dostupné existujúce lokality s indexmi (MUSÍŠ použiť len platné locationIndex z tohto zoznamu):
${JSON.stringify(locations.map((l: any, idx: number) => ({ locationIndex: idx, name: l.name, kind: l.kind })))}

Pravidlá:
- Názov misie bez GTA mien (žiadne Vice City, Los Santos, LSPD, Maze Bank).
- difficulty je celé číslo 1 až 5, reward medzi 900 a 6500, timeLimitSec medzi 240 a 600, wantedOnStart medzi 0 a 3.
- recommendedWeather je jedno z: clear, overcast, rain, storm, foggy.
- stages musí mať presne 3 etapy, každá s locationIndex (platný index zo zoznamu vyššie), objective (jasný popis v slovenčine), stageKind z [reach, deliver_car, evade_wanted, fly_ring].
- Pridaj 2 úvodné dialógy (introLines) a 2 záverečné dialógy (outroLines).`;

      const response = await ai.models.generateContent({
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
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const rawStages = Array.isArray(parsed.stages) ? parsed.stages : [];
      if (rawStages.length === 0 || locations.length === 0) {
        return res.status(502).json({ error: 'AI nevygenerovalo platné etapy misie.' });
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
          objective: String(st.objective || `Presuň sa na bod ${loc.name}`).slice(0, 120),
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
        title: `AI Kontrakt: ${String(parsed.title || 'Tieňový presun').slice(0, 64)}`,
        durationLabel: 'AI Generovaná (5–10 min)',
        difficulty: Math.max(1, Math.min(5, Math.round(Number(parsed.difficulty || 3)))) as
          | 1
          | 2
          | 3
          | 4
          | 5,
        timeLimitSec: Math.max(180, Math.min(900, Math.round(Number(parsed.timeLimitSec || 360)))),
        reward: Math.max(800, Math.min(7500, Math.round(Number(parsed.reward || 2200)))),
        wantedOnStart: Math.max(0, Math.min(3, Math.round(Number(parsed.wantedOnStart || 0)))),
        recommendedWeather: VALID_WEATHERS.has(String(parsed.recommendedWeather))
          ? String(parsed.recommendedWeather)
          : 'clear',
        introLines: Array.isArray(parsed.introLines)
          ? parsed.introLines.slice(0, 3).map((l: any) => ({
              speaker: String(l.speaker || 'Palmetto AI').slice(0, 32),
              text: String(l.text || 'Máme novú zákazku v meste.').slice(0, 180),
            }))
          : [],
        outroLines: Array.isArray(parsed.outroLines)
          ? parsed.outroLines.slice(0, 3).map((l: any) => ({
              speaker: String(l.speaker || 'Palmetto AI').slice(0, 32),
              text: String(l.text || 'Skvelá práca, kontrakt je hotový.').slice(0, 180),
            }))
          : [],
        stages,
      };

      return res.json({ mission });
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      return res.status(status >= 400 ? status : 500).json({
        error: err?.message || 'Nepodarilo sa vygenerovať AI misiu.',
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
