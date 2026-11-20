import React, { useEffect, useRef, useState } from 'react';
import { Compass, MapPin, Navigation, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { RoadNetwork } from '../game/roadNetwork';
import { GpsPoint, RemoteFriendInfo, SHOPS, ShopLocation } from '../game/types';

interface InteractiveMapModalProps {
  network: RoadNetwork | null;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  onlineFriends: RemoteFriendInfo[];
  gpsTarget: { x: number; z: number; label: string } | null;
  gpsRoute: GpsPoint[];
  gpsDistance: number;
  onSetWaypoint: (x: number, z: number, label: string) => void;
  onClearWaypoint: () => void;
  onClose: () => void;
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  network,
  playerX,
  playerZ,
  playerYaw,
  onlineFriends,
  gpsTarget,
  gpsRoute,
  gpsDistance,
  onSetWaypoint,
  onClearWaypoint,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(0.17);
  const [pan, setPan] = useState({ x: 65, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragMovedRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

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

    // Terrain Regions (Canyon/Forest, Urban, Beach, Ocean)
    ctx.fillStyle = '#142a21';
    ctx.fillRect(toScreenX(-2500), toScreenY(-2200), 1460 * zoom, 4400 * zoom);

    ctx.fillStyle = '#182b24';
    ctx.fillRect(toScreenX(-1040), toScreenY(-2200), 1790 * zoom, 4400 * zoom);

    ctx.fillStyle = '#4e422e';
    ctx.fillRect(toScreenX(750), toScreenY(-2200), 170 * zoom, 4400 * zoom);

    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(toScreenX(920), toScreenY(-2200), 1600 * zoom, 4400 * zoom);

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
    ctx.fillStyle = 'rgba(226, 232, 240, 0.32)';
    ctx.font = '600 11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CENTRUM PALMETTO', toScreenX(0), toScreenY(-15));
    ctx.fillText('FLAMINGO BLVD', toScreenX(740), toScreenY(-380));
    ctx.fillText('PRIEMYSELNÝ PRÍSTAV', toScreenX(120), toScreenY(1040));
    ctx.fillText('LETISKO PALMETTO INTL', toScreenX(-820), toScreenY(1520));
    ctx.fillText('KAŇON & JAZERO REDROCK', toScreenX(-1780), toScreenY(180));
    ctx.fillText('ZÁLIV CORAL KEYS', toScreenX(1180), toScreenY(120));

    // Curved Road Splines & Forest Dirt Trails
    if (network) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const edge of network.edges) {
        ctx.strokeStyle = edge.isDirt ? '#78573a' : '#475569';
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

    // Active GPS Route Line
    if (gpsRoute.length > 1) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3.5;
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
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tx, ty, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(tx, ty, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Marker
    ctx.save();
    ctx.translate(toScreenX(playerX), toScreenY(playerZ));
    ctx.rotate(-playerYaw + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [network, playerX, playerZ, playerYaw, onlineFriends, gpsTarget, gpsRoute, zoom, pan]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.09, Math.min(1.4, z + (e.deltaY < 0 ? 0.04 : -0.04))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragMovedRef.current = false;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    if (Math.hypot(dx, dy) > 3) dragMovedRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setDragging(false);
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
    } else {
      onSetWaypoint(Math.round(wx), Math.round(wz), 'Vlastný GPS bod');
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/88 p-4">
      <div className="w-full max-w-5xl rounded-lg bg-slate-900 border border-white/15 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Mapa Palmetto Bay & Coral Keys County (GPS)
              </h2>
              <p className="text-xs text-slate-400">
                Potiahni pre posun · Koliesko na priblíženie · Klikni pre nastavenie GPS trasy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gpsTarget && (
              <div className="px-3 py-1 rounded bg-cyan-950 border border-cyan-400/40 text-xs text-cyan-200 flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-cyan-300" />
                <span>
                  {gpsTarget.label} ({gpsDistance}m)
                </span>
                <button
                  onClick={onClearWaypoint}
                  className="text-cyan-300 hover:text-white ml-1"
                  title="Zrušiť GPS trasu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white"
            >
              Zavrieť (M / Tab)
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-[540px]">
          <div className="relative flex-1 bg-slate-950 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={740}
              height={540}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setDragging(false)}
              className="w-full h-full cursor-crosshair block"
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
              <button
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.08))}
                className="p-2 rounded bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white"
                title="Priblížiť"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.09, z - 0.06))}
                className="p-2 rounded bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white"
                title="Oddialiť"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(0.17);
                  setPan({ x: 65, y: 0 });
                }}
                className="p-2 rounded bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white"
                title="Resetovať pohľad"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-white/10 bg-slate-900 p-3 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Obchody & Lokality (Klik pre GPS)
            </div>
            <div className="space-y-1.5">
              {SHOPS.map((s) => {
                const isSelected = gpsTarget?.label === s.name;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSetWaypoint(s.x, s.z, s.name)}
                    className={`w-full text-left px-2.5 py-2 rounded border text-xs transition-colors flex items-start gap-2 ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400/60 text-white'
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
