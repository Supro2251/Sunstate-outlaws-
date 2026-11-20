import React, { useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { RoadNetwork } from '../game/roadNetwork';
import { GpsPoint, MinimapBlip } from '../game/types';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  blips: MinimapBlip[];
  wantedStars: number;
  network: RoadNetwork | null;
  gpsRoute: GpsPoint[];
  gpsTarget: { x: number; z: number; label: string } | null;
  gpsDistance: number;
  gpsTurnHint: string;
  accentHex?: string;
  onOpenMap: () => void;
}

const PARK_ZONES = [
  { x: 80, z: -490, r: 44 },
  { x: 445, z: -100, r: 46 },
  { x: 660, z: 320, r: 44 },
  { x: -1380, z: -320, r: 46 },
  { x: -520, z: 860, r: 44 },
];

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerYaw,
  blips,
  wantedStars,
  network,
  gpsRoute,
  gpsTarget,
  gpsDistance,
  gpsTurnHint,
  accentHex = '#22d3ee',
  onOpenMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.145;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const toMapX = (wx: number) => w * 0.5 + (wx - playerX) * scale;
    const toMapY = (wz: number) => h * 0.5 + (wz - playerZ) * scale;

    // Western Canyon & Pine Forest
    const forestRight = toMapX(-1040);
    if (forestRight > 0) {
      ctx.fillStyle = '#152c22';
      ctx.fillRect(0, 0, forestRight, h);
    }

    // Lush Grass Ground Blocks & Parks
    ctx.fillStyle = '#162821';
    ctx.fillRect(Math.max(0, forestRight), 0, Math.max(0, toMapX(750) - Math.max(0, forestRight)), h);

    for (const pk of PARK_ZONES) {
      ctx.fillStyle = '#22543d';
      ctx.beginPath();
      ctx.arc(toMapX(pk.x), toMapY(pk.z), pk.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Redrock Lake
    ctx.fillStyle = '#0c4a6e';
    ctx.beginPath();
    ctx.arc(toMapX(-2080), toMapY(240), 142 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Beach & Ocean (x > 750 sand, x > 920 ocean)
    const sandLeft = toMapX(750);
    const oceanLeft = toMapX(920);
    ctx.fillStyle = '#5c4d35';
    ctx.fillRect(sandLeft, 0, Math.max(0, oceanLeft - sandLeft), h);
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(oceanLeft, 0, w - oceanLeft, h);

    // Palmetto International Airport Apron & Runways
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(toMapX(-1310), toMapY(1180), 920 * scale, 680 * scale);
    ctx.fillStyle = '#475569';
    ctx.fillRect(toMapX(-1090), toMapY(1637), 540 * scale, 46 * scale);
    ctx.fillRect(toMapX(-1010), toMapY(1132), 380 * scale, 36 * scale);

    // Sunset Pier
    ctx.fillStyle = '#926239';
    ctx.fillRect(toMapX(850), toMapY(-9), 190 * scale, 18 * scale);

    // Curved Road Splines & Sidewalk Shoulders
    if (network) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Curb outline pass
      for (const edge of network.edges) {
        if (edge.isDirt) continue;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.max(3, (edge.width + 3.2) * scale);
        ctx.beginPath();
        edge.samples.forEach((p, idx) => {
          const mx = toMapX(p.x);
          const my = toMapY(p.z);
          if (idx === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        });
        ctx.stroke();
      }
      // Asphalt/Dirt core pass
      for (const edge of network.edges) {
        ctx.strokeStyle = edge.isDirt ? '#7c5d40' : '#334155';
        ctx.lineWidth = Math.max(2, edge.width * scale);
        ctx.beginPath();
        edge.samples.forEach((p, idx) => {
          const mx = toMapX(p.x);
          const my = toMapY(p.z);
          if (idx === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        });
        ctx.stroke();
      }
    }

    // Active Road-Following GPS Route Polyline
    if (gpsRoute.length > 1) {
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      gpsRoute.forEach((p, idx) => {
        const mx = toMapX(p.x);
        const my = toMapY(p.z);
        if (idx === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      });
      ctx.stroke();
    }

    // Blips
    blips.forEach((b) => {
      const rawX = toMapX(b.x);
      const rawY = toMapY(b.z);
      const bx = Math.max(6, Math.min(w - 6, rawX));
      const by = Math.max(6, Math.min(h - 6, rawY));

      if (b.type === 'waypoint' || b.type === 'target') {
        ctx.fillStyle = b.type === 'waypoint' ? accentHex : '#facc15';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (b.type === 'friend') {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'shop') {
        if (rawX < -8 || rawX > w + 8 || rawY < -8 || rawY > h + 8) return;
        ctx.fillStyle = b.color;
        ctx.fillRect(bx - 3, by - 3, 6, 6);
      } else if (b.type === 'police') {
        ctx.fillStyle = Math.floor(Date.now() / 220) % 2 === 0 ? '#ef4444' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        if (rawX < 0 || rawX > w || rawY < 0 || rawY > h) return;
        ctx.fillStyle = 'rgba(203, 213, 225, 0.5)';
        ctx.fillRect(bx - 1.5, by - 1.5, 3, 3);
      }
    });

    // Player Orientation Cone + Directional Arrow (always synchronized to playerYaw)
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(Math.PI - playerYaw);

    // Subtle viewing/heading cone
    ctx.fillStyle = `${accentHex}33`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-11, -24);
    ctx.lineTo(11, -24);
    ctx.closePath();
    ctx.fill();

    // Crisp Arrow
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -8.5);
    ctx.lineTo(5.8, 6);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5.8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (wantedStars > 0) {
      ctx.strokeStyle = Math.floor(Date.now() / 260) % 2 === 0 ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    }
  }, [playerX, playerZ, playerYaw, blips, wantedStars, network, gpsRoute, accentHex]);

  return (
    <div
      className="w-[216px] rounded-md overflow-hidden border bg-slate-950/92 shadow-lg"
      style={{ borderColor: `${accentHex}55` }}
    >
      <button
        onClick={onOpenMap}
        className="block w-full text-left relative group"
        title="Otvoriť celú GPS mapu (M)"
      >
        <canvas ref={canvasRef} width={216} height={148} className="block" />
        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/90 border border-white/15 text-[10px] font-medium text-slate-200 group-hover:text-white">
          M · Mapa
        </span>
      </button>

      {gpsTarget ? (
        <div
          className="px-2 py-1.5 bg-slate-950/95 border-t flex items-center justify-between gap-1.5 text-[11px]"
          style={{ borderTopColor: `${accentHex}55` }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <Navigation className="w-3 h-3 shrink-0" style={{ color: accentHex }} />
            <span className="truncate text-slate-100 font-medium">{gpsTurnHint}</span>
          </div>
          <span className="font-mono-num font-semibold shrink-0" style={{ color: accentHex }}>
            {gpsDistance}m
          </span>
        </div>
      ) : (
        <div className="px-2 py-1 bg-slate-950/95 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-display font-semibold tracking-wide" style={{ color: accentHex }}>
            PALMETTO BAY
          </span>
          <span className="font-mono-num text-slate-400">
            {Math.round(playerX)}, {Math.round(playerZ)}
          </span>
        </div>
      )}
    </div>
  );
};
