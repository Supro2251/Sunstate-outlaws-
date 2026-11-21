import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  MapPin,
  Navigation,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getLocalizedMissionTitle, getUi } from '../game/i18n';
import { HIDDEN_MISSIONS } from '../game/missions';
import { RoadNetwork } from '../game/roadNetwork';
import { GpsPoint, LanguageCode, RemoteFriendInfo, SHOPS, ShopLocation } from '../game/types';

interface InteractiveMapModalProps {
  network: RoadNetwork | null;
  language?: LanguageCode;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  onlineFriends: RemoteFriendInfo[];
  discoveredHiddenIds: string[];
  completedHiddenIds: string[];
  accentHex?: string;
  gpsTarget: { x: number; z: number; label: string } | null;
  gpsRoute: GpsPoint[];
  gpsDistance: number;
  onSetWaypoint: (x: number, z: number, label: string) => void;
  onClearWaypoint: () => void;
  onClose: () => void;
}

const PARK_ZONES = [
  { x: 80, z: -490, r: 44 },
  { x: 445, z: -100, r: 46 },
  { x: 660, z: 320, r: 44 },
  { x: -1380, z: -320, r: 46 },
  { x: -520, z: 860, r: 44 },
];

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  network,
  language = 'en',
  playerX,
  playerZ,
  playerYaw,
  onlineFriends,
  discoveredHiddenIds,
  completedHiddenIds,
  accentHex = '#22d3ee',
  gpsTarget,
  gpsRoute,
  gpsDistance,
  onSetWaypoint,
  onClearWaypoint,
  onClose,
}) => {
  const ui = getUi(language);
  const isSkCs = language === 'sk' || language === 'cs';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(0.22);
  const [pan, setPan] = useState(() => ({
    x: -playerX * 0.22,
    y: -playerZ * 0.22,
  }));
  const [dragging, setDragging] = useState(false);
  const dragMovedRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const centerOnPlayer = (targetZoom?: number) => {
    const z = targetZoom ?? zoom;
    setPan({ x: -playerX * z, y: -playerZ * z });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0c1322';
    ctx.fillRect(0, 0, w, h);

    const toScreenX = (wx: number) => w * 0.5 + pan.x + wx * zoom;
    const toScreenY = (wz: number) => h * 0.5 + pan.y + wz * zoom;

    // Terrain Regions (Canyon/Forest, Lush Urban Grass, Beach, Ocean)
    ctx.fillStyle = '#142a21';
    ctx.fillRect(toScreenX(-2500), toScreenY(-2200), 1460 * zoom, 4400 * zoom);

    ctx.fillStyle = '#182b24';
    ctx.fillRect(toScreenX(-1040), toScreenY(-2200), 1790 * zoom, 4400 * zoom);

    ctx.fillStyle = '#4e422e';
    ctx.fillRect(toScreenX(750), toScreenY(-2200), 170 * zoom, 4400 * zoom);

    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(toScreenX(920), toScreenY(-2200), 1600 * zoom, 4400 * zoom);

    // Landscaped Parks
    for (const pk of PARK_ZONES) {
      const px = toScreenX(pk.x);
      const py = toScreenY(pk.z);
      ctx.fillStyle = '#22543d';
      ctx.beginPath();
      ctx.arc(px, py, pk.r * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#34d39944';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Redrock Lake & Coral Island
    ctx.fillStyle = '#0c4a6e';
    ctx.beginPath();
    ctx.arc(toScreenX(-2080), toScreenY(240), 142 * zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4e422e';
    ctx.beginPath();
    ctx.arc(toScreenX(1240), toScreenY(-220), 52 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Sunset Pier & Palmetto International Airport Runways
    ctx.fillStyle = '#926239';
    ctx.fillRect(toScreenX(850), toScreenY(-9), 190 * zoom, 18 * zoom);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(toScreenX(-1310), toScreenY(1180), 920 * zoom, 680 * zoom);
    ctx.fillStyle = '#475569';
    ctx.fillRect(toScreenX(-1090), toScreenY(1637), 540 * zoom, 46 * zoom);
    ctx.fillRect(toScreenX(-1010), toScreenY(1132), 380 * zoom, 36 * zoom);
    ctx.fillRect(toScreenX(350), toScreenY(-1136), 340 * zoom, 32 * zoom);

    // Geographic Watermark Labels
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.font = '600 11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    const districtLabels = isSkCs
      ? [
          'CENTRUM PALMETTO',
          'FLAMINGO BLVD',
          'PRIEMYSELNÝ PRÍSTAV',
          'LETISKO PALMETTO INTL',
          'KAŇON & JAZERO REDROCK',
          'ZÁLIV CORAL KEYS',
        ]
      : [
          'PALMETTO DOWNTOWN',
          'FLAMINGO BLVD',
          'INDUSTRIAL HARBOR',
          'PALMETTO INTL AIRPORT',
          'REDROCK CANYON & LAKE',
          'CORAL KEYS BAY',
        ];
    ctx.fillText(districtLabels[0], toScreenX(0), toScreenY(-15));
    ctx.fillText(districtLabels[1], toScreenX(740), toScreenY(-380));
    ctx.fillText(districtLabels[2], toScreenX(120), toScreenY(1040));
    ctx.fillText(districtLabels[3], toScreenX(-820), toScreenY(1520));
    ctx.fillText(districtLabels[4], toScreenX(-1780), toScreenY(180));
    ctx.fillText(districtLabels[5], toScreenX(1180), toScreenY(120));

    // Curved Road Splines with Curbs & Junctions
    if (network) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const edge of network.edges) {
        if (edge.isDirt) continue;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.max(3.5, (edge.width + 4.2) * zoom);
        ctx.beginPath();
        edge.samples.forEach((p, idx) => {
          const sx = toScreenX(p.x);
          const sy = toScreenY(p.z);
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
      }
      for (const edge of network.edges) {
        ctx.strokeStyle = edge.isDirt ? '#78573a' : '#334155';
        ctx.lineWidth = Math.max(2, edge.width * zoom);
        ctx.beginPath();
        edge.samples.forEach((p, idx) => {
          const sx = toScreenX(p.x);
          const sy = toScreenY(p.z);
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
      }
    }

    // Active Road-Only GPS Route Line
    if (gpsRoute.length > 1) {
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      gpsRoute.forEach((p, idx) => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.z);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    }

    // Uncompleted Random Missions in World
    HIDDEN_MISSIONS.forEach((hm) => {
      if (completedHiddenIds.includes(hm.id)) return;
      const hx = toScreenX(hm.x);
      const hy = toScreenY(hm.z);
      const isDiscovered = discoveredHiddenIds.includes(hm.id);
      ctx.fillStyle = isDiscovered ? '#fbbf24' : 'rgba(251, 191, 36, 0.55)';
      ctx.beginPath();
      ctx.arc(hx, hy, isDiscovered ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#090d1b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (isDiscovered) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '600 9.5px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`★ ${getLocalizedMissionTitle(hm.id, hm.title, language)}`, hx + 7, hy + 3);
      }
    });

    // Shop Icons & Labels
    SHOPS.forEach((s) => {
      const sx = toScreenX(s.x);
      const sy = toScreenY(s.z);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#090d1b';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, sx + 8, sy + 3);
    });

    // Online Friends
    onlineFriends.forEach((f) => {
      const fx = toScreenX(f.x);
      const fy = toScreenY(f.z);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(fx, fy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bbf7d0';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(f.handle, fx + 8, fy + 3);
    });

    // GPS Waypoint Target
    if (gpsTarget) {
      const tx = toScreenX(gpsTarget.x);
      const ty = toScreenY(gpsTarget.z);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tx, ty, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.arc(tx, ty, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Prominent Player Position Halo + Orientation Cone + Directional Arrow
    const px = toScreenX(playerX);
    const py = toScreenY(playerZ);
    ctx.save();
    ctx.translate(px, py);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(Math.PI - playerYaw);

    ctx.fillStyle = `${accentHex}44`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-16, -38);
    ctx.lineTo(16, -38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7.5, 8);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-7.5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const youLabel =
      language === 'de' ? 'DU' : language === 'es' ? 'TÚ' : isSkCs || language === 'pl' ? 'TY' : 'YOU';
    ctx.fillStyle = accentHex;
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(youLabel, px, py + 24);
  }, [
    network,
    language,
    isSkCs,
    playerX,
    playerZ,
    playerYaw,
    onlineFriends,
    discoveredHiddenIds,
    completedHiddenIds,
    accentHex,
    gpsTarget,
    gpsRoute,
    zoom,
    pan,
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.09, Math.min(1.4, z + (e.deltaY < 0 ? 0.04 : -0.04))));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDragging(true);
    dragMovedRef.current = false;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    if (Math.hypot(dx, dy) > 4) dragMovedRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    if (dragMovedRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const wx = (cx - canvas.width * 0.5 - pan.x) / zoom;
    const wz = (cy - canvas.height * 0.5 - pan.y) / zoom;

    let clickedShop: ShopLocation | null = null;
    for (const s of SHOPS) {
      if (Math.hypot(s.x - wx, s.z - wz) < 16 / zoom) {
        clickedShop = s;
        break;
      }
    }
    if (clickedShop) {
      onSetWaypoint(clickedShop.x, clickedShop.z, clickedShop.name);
      return;
    }

    for (const hm of HIDDEN_MISSIONS) {
      if (completedHiddenIds.includes(hm.id)) continue;
      if (Math.hypot(hm.x - wx, hm.z - wz) < 15 / zoom) {
        const label = discoveredHiddenIds.includes(hm.id)
          ? `${getLocalizedMissionTitle(hm.id, hm.title, language)}`
          : `${isSkCs ? 'Neznáma lokalita' : 'Unknown Location'} (${hm.district})`;
        onSetWaypoint(hm.x, hm.z, label);
        return;
      }
    }

    onSetWaypoint(Math.round(wx), Math.round(wz), isSkCs ? 'Vlastný GPS bod' : 'Custom GPS Pin');
  };

  const headingDeg = Math.round((((180 - (playerYaw * 180) / Math.PI) % 360) + 360) % 360);

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/88 p-2 sm:p-4">
      <div
        className="w-full max-w-5xl rounded-lg bg-slate-900 border shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        style={{ borderColor: `${accentHex}55` }}
      >
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5" style={{ color: accentHex }} />
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-white">{ui.mapHeader}</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {ui.mapSubCoords} {Math.round(playerX)}, {Math.round(playerZ)} · {ui.mapSubHeading}{' '}
                {headingDeg}° · {ui.mapSubClick}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {gpsTarget && (
              <div
                className="px-2.5 py-1 rounded bg-slate-950 border text-xs text-slate-100 flex items-center gap-2"
                style={{ borderColor: `${accentHex}66` }}
              >
                <Navigation className="w-3.5 h-3.5" style={{ color: accentHex }} />
                <span>
                  {gpsTarget.label} ({gpsDistance}m)
                </span>
                <button onClick={onClearWaypoint} className="text-slate-300 hover:text-white ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => centerOnPlayer()}
              className="px-3 py-1.5 min-h-[38px] rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5" style={{ color: accentHex }} /> {ui.centerOnPlayerBtn}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 min-h-[38px] rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white"
            >
              {ui.closeBtn}
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-[72vh] max-h-[540px]">
          <div className="relative flex-1 min-h-[240px] bg-slate-950 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={740}
              height={540}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => setDragging(false)}
              className="w-full h-full cursor-crosshair block touch-none"
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
              <button
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.08))}
                className="p-2.5 rounded bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.09, z - 0.06))}
                className="p-2.5 rounded bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => centerOnPlayer(0.24)}
                className="p-2.5 rounded bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white"
              >
                <Crosshair className="w-4 h-4" style={{ color: accentHex }} />
              </button>
              <button
                onClick={() => {
                  setZoom(0.15);
                  setPan({ x: 55, y: 0 });
                }}
                className="p-2.5 rounded bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full md:w-64 h-44 md:h-auto border-t md:border-t-0 md:border-l border-white/10 bg-slate-900 p-3 overflow-y-auto shrink-0">
            <div className="text-xs font-semibold text-slate-300 mb-2">{ui.buildingsListTitle}</div>
            <div className="space-y-1.5">
              {SHOPS.map((s) => {
                const isSelected = gpsTarget?.label === s.name;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSetWaypoint(s.x, s.z, s.name)}
                    style={
                      isSelected
                        ? { borderColor: accentHex, backgroundColor: `${accentHex}1f` }
                        : undefined
                    }
                    className={`w-full text-left px-2.5 py-2 rounded border text-xs transition-colors flex items-start gap-2 ${
                      isSelected
                        ? 'text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: s.color }} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{s.shortLabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
