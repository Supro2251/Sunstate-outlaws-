import * as THREE from 'three';
import { GpsPoint } from './types';

export interface RoadNode {
  id: number;
  x: number;
  z: number;
  name: string;
}

export interface RoadEdge {
  id: number;
  from: number;
  to: number;
  width: number;
  isDirt?: boolean;
  curve: THREE.CatmullRomCurve3;
  samples: GpsPoint[];
  length: number;
}

export interface RoadNetwork {
  nodes: RoadNode[];
  edges: RoadEdge[];
  adjacency: Map<number, Array<{ to: number; edgeId: number; cost: number }>>;
}

/**
 * Expanded ~5600m x 5600m Non-Grid Road Network for Palmetto Bay & Coral Keys County:
 * Connects Downtown Roundabout, Flamingo Blvd Coastal Highway, Outer Coral Expressways,
 * Bridges, Overpasses, Industrial Port, Palmetto International Airport, Northern Airstrip,
 * and Western Pine Canyon & Forest Dirt Trails.
 */
export function createRoadNetwork(): RoadNetwork {
  const nodes: RoadNode[] = [
    // Central Downtown Roundabout (radius ~55m around 0,0)
    { id: 0, x: 0, z: -55, name: 'Kruhový objazd Sever' },
    { id: 1, x: 55, z: 0, name: 'Kruhový objazd Východ' },
    { id: 2, x: 0, z: 55, name: 'Kruhový objazd Juh' },
    { id: 3, x: -55, z: 0, name: 'Kruhový objazd Západ' },

    // Inner Downtown & Business District
    { id: 4, x: -140, z: -240, name: 'QuickStop 24 Križovatka' },
    { id: 5, x: -310, z: -310, name: 'Apex Trust Námestie' },
    { id: 6, x: 240, z: -260, name: 'Velvet Fit Bulvár' },
    { id: 7, x: 280, z: 360, name: 'Ironclad Armory' },
    { id: 8, x: -260, z: 140, name: 'Crown Tailors' },
    { id: 9, x: -160, z: 260, name: 'Podjazd Centrum' },
    { id: 10, x: 180, z: 120, name: 'Nadjazd Juh' },
    { id: 11, x: 120, z: -200, name: 'Nadjazd Sever' },

    // Northern Midtown & Bayview Ridge
    { id: 12, x: 150, z: -520, name: 'SharpClip Studio' },
    { id: 13, x: 190, z: -620, name: 'Apex Customs Sever' },
    { id: 14, x: -360, z: -640, name: 'Nemocnica Palmetto' },
    { id: 15, x: -120, z: -1120, name: 'Bayview Ridge' },
    { id: 16, x: 560, z: -860, name: 'Marina Loft' },
    { id: 17, x: 520, z: -1120, name: 'Severné Letisko' },

    // Curved Flamingo Boulevard (Eastern Coastal Highway)
    { id: 18, x: 690, z: -240, name: 'InkWave Parlor' },
    { id: 19, x: 780, z: -380, name: 'Východný Most' },
    { id: 20, x: 840, z: 0, name: 'Sunset Sands Mólo' },
    { id: 21, x: 680, z: 180, name: 'SunSip Mart' },
    { id: 22, x: 740, z: 520, name: 'Pobrežný Heliport' },
    { id: 23, x: 460, z: 680, name: 'Južný Most' },

    // Southern Industrial Port, Dealership & Airport Link
    { id: 24, x: 260, z: 820, name: 'Sunstate Motors' },
    { id: 25, x: -180, z: 620, name: 'Apex Customs Prístav' },
    { id: 26, x: -60, z: 1080, name: 'Priemyselný Prístav' },
    { id: 27, x: 340, z: 980, name: 'Prístavný Sklad' },
    { id: 28, x: -820, z: 1150, name: 'Letisko Severná Brána' },

    // Western Suburbs & Fire Station
    { id: 29, x: -540, z: -150, name: 'Threads & Co.' },
    { id: 30, x: -480, z: 480, name: 'Hasičská Stanica' },
    { id: 31, x: -920, z: 340, name: "Dante's Hideout" },
    { id: 32, x: -780, z: 120, name: 'Parkovisko Suburbs' },
    { id: 33, x: -640, z: -640, name: 'Západný Riečny Most' },
    { id: 34, x: -840, z: -520, name: 'Horský Podjazd' },

    // Western Forest & Meadow Dirt Trails
    { id: 35, x: -1320, z: 120, name: 'Západná Lúka' },
    { id: 36, x: -1260, z: -380, name: 'Lesný Priesmyk' },
    { id: 37, x: -1180, z: -980, name: 'Severný Les' },
    { id: 38, x: -1120, z: 760, name: 'Južná Lúka' },
    { id: 39, x: 460, z: -160, name: 'Parkovisko Midtown' },

    // --- EXPANDED WORLD OUTER RING, INTERNATIONAL AIRPORT & CANYON HIGHWAYS ---
    { id: 40, x: -720, z: 1360, name: 'Palmetto Intl Terminál' },
    { id: 41, x: -1280, z: 1360, name: 'Letiskový Hangár Západ' },
    { id: 42, x: -1280, z: 1840, name: 'Palmetto Intl Južná dráha' },
    { id: 43, x: -340, z: 1840, name: 'Letiskový Okruh Juh' },
    { id: 44, x: 240, z: 1580, name: 'Južný Prístavný Bulvár' },
    { id: 45, x: 760, z: 1260, name: 'Južná Pobrežná Diaľnica' },
    { id: 46, x: 840, z: -1360, name: 'Severná Zátoka' },
    { id: 47, x: 220, z: -1780, name: 'North Key Vyhliadka' },
    { id: 48, x: -640, z: -1760, name: 'Severný Horský Tunel' },
    { id: 49, x: -1580, z: -1480, name: 'Borovicový Kaňon Sever' },
    { id: 50, x: -2060, z: -640, name: 'Západný Kaňon' },
    { id: 51, x: -2080, z: 240, name: 'Jazero Redrock' },
    { id: 52, x: -1860, z: 1020, name: 'Lesná Vyhliadka Juh' },
  ];

  const nodeMap = new Map<number, RoadNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const edges: RoadEdge[] = [];
  const adjacency = new Map<number, Array<{ to: number; edgeId: number; cost: number }>>();
  nodes.forEach((n) => adjacency.set(n.id, []));

  const addCurvedEdge = (
    from: number,
    to: number,
    midPoints: Array<[number, number]>,
    width = 18,
    isDirt = false,
  ) => {
    const nA = nodeMap.get(from)!;
    const nB = nodeMap.get(to)!;
    const pts: THREE.Vector3[] = [new THREE.Vector3(nA.x, 0.05, nA.z)];
    midPoints.forEach(([mx, mz]) => pts.push(new THREE.Vector3(mx, 0.05, mz)));
    pts.push(new THREE.Vector3(nB.x, 0.05, nB.z));

    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
    const length = curve.getLength();
    const numSamples = Math.max(12, Math.ceil(length / 10));
    const sampledVecs = curve.getSpacedPoints(numSamples);
    const samples: GpsPoint[] = sampledVecs.map((v) => ({ x: v.x, z: v.z }));

    const id = edges.length;
    edges.push({ id, from, to, width, isDirt, curve, samples, length });

    adjacency.get(from)!.push({ to, edgeId: id, cost: length });
    adjacency.get(to)!.push({ to: from, edgeId: id, cost: length });
  };

  // Central Downtown Roundabout
  addCurvedEdge(0, 1, [[39, -39]], 16);
  addCurvedEdge(1, 2, [[39, 39]], 16);
  addCurvedEdge(2, 3, [[-39, 39]], 16);
  addCurvedEdge(3, 0, [[-39, -39]], 16);

  // Inner City Spokes & Curves
  addCurvedEdge(0, 4, [[-50, -145]], 18);
  addCurvedEdge(0, 11, [[58, -125]], 18);
  addCurvedEdge(1, 10, [[118, 60]], 18);
  addCurvedEdge(1, 20, [[420, 15]], 20);
  addCurvedEdge(2, 9, [[-75, 165]], 18);
  addCurvedEdge(3, 8, [[-155, 65]], 18);
  addCurvedEdge(3, 29, [[-295, -75]], 18);

  // Business District Loop
  addCurvedEdge(4, 5, [[-230, -295]], 17);
  addCurvedEdge(4, 11, [[-10, -225]], 17);
  addCurvedEdge(11, 6, [[185, -235]], 17);
  addCurvedEdge(6, 39, [[360, -210]], 17);
  addCurvedEdge(39, 18, [[580, -205]], 17);
  addCurvedEdge(10, 7, [[235, 240]], 18);
  addCurvedEdge(7, 21, [[490, 260]], 18);
  addCurvedEdge(9, 8, [[-220, 200]], 17);
  addCurvedEdge(8, 29, [[-410, 0]], 17);

  // Northern Loop & Bridges
  addCurvedEdge(6, 12, [[205, -395]], 18);
  addCurvedEdge(12, 13, [[170, -570]], 18);
  addCurvedEdge(13, 14, [[-80, -650]], 18);
  addCurvedEdge(14, 5, [[-345, -480]], 17);
  addCurvedEdge(14, 15, [[-270, -900]], 18);
  addCurvedEdge(15, 17, [[200, -1160]], 18);
  addCurvedEdge(17, 16, [[545, -990]], 18);
  addCurvedEdge(13, 16, [[390, -750]], 18);
  addCurvedEdge(16, 19, [[700, -610]], 18);

  // Coastal Flamingo Boulevard
  addCurvedEdge(19, 18, [[755, -310]], 19);
  addCurvedEdge(18, 20, [[780, -110]], 19);
  addCurvedEdge(20, 21, [[775, 100]], 19);
  addCurvedEdge(21, 22, [[725, 355]], 19);
  addCurvedEdge(22, 23, [[620, 620]], 18);

  // Southern Port, Dealership & Airport Highway
  addCurvedEdge(23, 24, [[360, 760]], 18);
  addCurvedEdge(24, 27, [[310, 910]], 18);
  addCurvedEdge(27, 26, [[140, 1060]], 18);
  addCurvedEdge(26, 25, [[-130, 860]], 18);
  addCurvedEdge(25, 9, [[-175, 440]], 18);
  addCurvedEdge(25, 7, [[50, 480]], 17);
  addCurvedEdge(25, 30, [[-340, 560]], 18);
  addCurvedEdge(26, 28, [[-450, 1140]], 19);
  addCurvedEdge(30, 28, [[-660, 840]], 18);

  // Western Suburbs & River Bridge
  addCurvedEdge(30, 31, [[-710, 425]], 17);
  addCurvedEdge(31, 32, [[-860, 230]], 17);
  addCurvedEdge(32, 29, [[-660, -25]], 17);
  addCurvedEdge(29, 34, [[-710, -340]], 17);
  addCurvedEdge(34, 33, [[-740, -590]], 17);
  addCurvedEdge(33, 14, [[-500, -645]], 17);
  addCurvedEdge(33, 15, [[-430, -920]], 17);

  // Inner Forest & Meadow Dirt Trails
  addCurvedEdge(31, 35, [[-1140, 230]], 13, true);
  addCurvedEdge(35, 36, [[-1330, -130]], 13, true);
  addCurvedEdge(36, 34, [[-1050, -455]], 13, true);
  addCurvedEdge(36, 37, [[-1260, -690]], 13, true);
  addCurvedEdge(37, 15, [[-680, -1080]], 13, true);
  addCurvedEdge(31, 38, [[-1040, 560]], 13, true);
  addCurvedEdge(38, 28, [[-980, 970]], 13, true);

  // Palmetto International Airport Terminal & Runway Loop (South)
  addCurvedEdge(28, 40, [[-770, 1265]], 20);
  addCurvedEdge(40, 41, [[-1020, 1340]], 18);
  addCurvedEdge(41, 42, [[-1320, 1610]], 18);
  addCurvedEdge(42, 43, [[-820, 1875]], 19);
  addCurvedEdge(43, 44, [[-30, 1740]], 20);
  addCurvedEdge(44, 26, [[90, 1320]], 19);
  addCurvedEdge(44, 45, [[540, 1440]], 20);
  addCurvedEdge(45, 22, [[805, 910]], 20);

  // Outer Northern Expressway & Coast
  addCurvedEdge(17, 46, [[710, -1240]], 19);
  addCurvedEdge(46, 16, [[740, -1090]], 18);
  addCurvedEdge(46, 47, [[610, -1620]], 20);
  addCurvedEdge(47, 48, [[-210, -1820]], 20);
  addCurvedEdge(48, 15, [[-420, -1420]], 19);

  // Outer Pine Mountain & Canyon Dirt Trails (West)
  addCurvedEdge(48, 49, [[-1160, -1660]], 15, true);
  addCurvedEdge(49, 37, [[-1410, -1220]], 14, true);
  addCurvedEdge(49, 50, [[-1920, -1080]], 15, true);
  addCurvedEdge(50, 36, [[-1660, -500]], 14, true);
  addCurvedEdge(50, 51, [[-2140, -190]], 15, true);
  addCurvedEdge(51, 35, [[-1710, 190]], 14, true);
  addCurvedEdge(51, 52, [[-2020, 660]], 15, true);
  addCurvedEdge(52, 38, [[-1480, 910]], 14, true);
  addCurvedEdge(52, 41, [[-1580, 1210]], 15, true);

  return { nodes, edges, adjacency };
}

export interface RoadProjection {
  edgeId: number;
  segIdx: number; // segment between samples[segIdx] and samples[segIdx + 1]
  t: number; // [0..1] along segment
  point: GpsPoint;
  distFromFrom: number;
  distToTo: number;
  distSq: number;
}

export function getEdgeArcDistances(edge: RoadEdge): number[] {
  const acc: number[] = [0];
  for (let i = 1; i < edge.samples.length; i++) {
    const prev = edge.samples[i - 1];
    const cur = edge.samples[i];
    acc.push(acc[i - 1] + Math.hypot(cur.x - prev.x, cur.z - prev.z));
  }
  return acc;
}

export function projectPointOntoRoad(network: RoadNetwork, x: number, z: number): RoadProjection {
  let best: RoadProjection = {
    edgeId: 0,
    segIdx: 0,
    t: 0,
    point: { x: network.nodes[0].x, z: network.nodes[0].z },
    distFromFrom: 0,
    distToTo: network.edges[0]?.length ?? 0,
    distSq: Infinity,
  };

  for (const edge of network.edges) {
    const samples = edge.samples;
    if (samples.length < 2) continue;
    let cumDist = 0;
    const segLens: number[] = [];
    let totalSegLen = 0;
    for (let i = 0; i < samples.length - 1; i++) {
      const l = Math.hypot(samples[i + 1].x - samples[i].x, samples[i + 1].z - samples[i].z);
      segLens.push(l);
      totalSegLen += l;
    }

    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const abLenSq = abx * abx + abz * abz;
      const t =
        abLenSq > 1e-6
          ? Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / abLenSq))
          : 0;
      const px = a.x + abx * t;
      const pz = a.z + abz * t;
      const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);

      const dFrom = cumDist + segLens[i] * t;
      const dTo = Math.max(0, totalSegLen - dFrom);

      if (dSq < best.distSq) {
        best = {
          edgeId: edge.id,
          segIdx: i,
          t,
          point: { x: px, z: pz },
          distFromFrom: dFrom,
          distToTo: dTo,
          distSq: dSq,
        };
      }
      cumDist += segLens[i];
    }
  }

  return best;
}

export function getRightLanePointOnEdge(
  edge: RoadEdge,
  sampleIdx: number,
  reverse: boolean,
): { x: number; z: number; yaw: number } {
  const samples = edge.samples;
  const maxIdx = samples.length - 1;
  const idx = Math.max(0, Math.min(maxIdx, sampleIdx));
  const i0 = Math.max(0, idx - 1);
  const i1 = Math.min(maxIdx, idx + 1);
  const p0 = reverse ? samples[i1] : samples[i0];
  const p1 = reverse ? samples[i0] : samples[i1];
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  const len = Math.hypot(dx, dz) || 1;
  const tx = dx / len;
  const tz = dz / len;
  // Right-hand lane relative to travel direction T=(tx, tz) with +Y up: right = (-tz, tx)
  const rx = -tz;
  const rz = tx;
  const laneOffset = edge.isDirt ? edge.width * 0.16 : edge.width * 0.24;
  return {
    x: samples[idx].x + rx * laneOffset,
    z: samples[idx].z + rz * laneOffset,
    yaw: Math.atan2(tx, tz),
  };
}

export function findNearestRoadNode(network: RoadNetwork, x: number, z: number): number {
  let bestId = 0;
  let bestDist = Infinity;
  for (const n of network.nodes) {
    const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
    if (d < bestDist) {
      bestDist = d;
      bestId = n.id;
    }
  }
  return bestId;
}

export function computeGpsRoute(
  network: RoadNetwork,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
): { points: GpsPoint[]; distance: number; turnHint: string } {
  const startProj = projectPointOntoRoad(network, startX, startZ);
  const endProj = projectPointOntoRoad(network, endX, endZ);
  const startEdge = network.edges[startProj.edgeId];
  const endEdge = network.edges[endProj.edgeId];

  if (!startEdge || !endEdge) {
    return { points: [{ x: startX, z: startZ }, { x: endX, z: endZ }], distance: 0, turnHint: 'Cieľ v dosahu' };
  }

  // Multi-source Dijkstra from startEdge.from & startEdge.to
  const dist = new Map<number, number>();
  const prev = new Map<number, { node: number; edgeId: number } | null>();
  const sourceNodeFor = new Map<number, number>();
  const unvisited = new Set<number>();

  network.nodes.forEach((n) => {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
    unvisited.add(n.id);
  });

  if (startEdge.from === startEdge.to) {
    dist.set(startEdge.from, Math.min(startProj.distFromFrom, startProj.distToTo));
    sourceNodeFor.set(startEdge.from, startEdge.from);
  } else {
    dist.set(startEdge.from, startProj.distFromFrom);
    sourceNodeFor.set(startEdge.from, startEdge.from);
    dist.set(startEdge.to, startProj.distToTo);
    sourceNodeFor.set(startEdge.to, startEdge.to);
  }

  while (unvisited.size > 0) {
    let curr = -1;
    let minD = Infinity;
    unvisited.forEach((id) => {
      const d = dist.get(id)!;
      if (d < minD) {
        minD = d;
        curr = id;
      }
    });
    if (curr === -1 || minD === Infinity) break;
    unvisited.delete(curr);

    const neighbors = network.adjacency.get(curr) ?? [];
    for (const nb of neighbors) {
      if (!unvisited.has(nb.to)) continue;
      const alt = minD + nb.cost;
      if (alt < dist.get(nb.to)!) {
        dist.set(nb.to, alt);
        prev.set(nb.to, { node: curr, edgeId: nb.edgeId });
        sourceNodeFor.set(nb.to, sourceNodeFor.get(curr) ?? curr);
      }
    }
  }

  const pushUnique = (arr: GpsPoint[], p: GpsPoint) => {
    const last = arr[arr.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 1.2) {
      arr.push({ x: p.x, z: p.z });
    }
  };

  let routePoints: GpsPoint[] = [];

  // Check if direct travel on the exact same road edge is strictly shorter than turning around
  const sameEdgeDirectCost =
    startEdge.id === endEdge.id
      ? Math.abs(endProj.distFromFrom - startProj.distFromFrom)
      : Infinity;

  const costViaEndFrom = (dist.get(endEdge.from) ?? Infinity) + endProj.distFromFrom;
  const costViaEndTo = (dist.get(endEdge.to) ?? Infinity) + endProj.distToTo;
  const bestGraphCost = Math.min(costViaEndFrom, costViaEndTo);

  if (Math.hypot(startX - startProj.point.x, startZ - startProj.point.z) > 4) {
    routePoints.push({ x: startX, z: startZ });
  }
  pushUnique(routePoints, startProj.point);

  if (startEdge.id === endEdge.id && sameEdgeDirectCost <= bestGraphCost + 1) {
    if (endProj.segIdx > startProj.segIdx) {
      for (let i = startProj.segIdx + 1; i <= endProj.segIdx; i++) {
        pushUnique(routePoints, startEdge.samples[i]);
      }
    } else if (endProj.segIdx < startProj.segIdx) {
      for (let i = startProj.segIdx; i >= endProj.segIdx + 1; i--) {
        pushUnique(routePoints, startEdge.samples[i]);
      }
    }
    pushUnique(routePoints, endProj.point);
  } else {
    const endEntryNode = costViaEndFrom <= costViaEndTo ? endEdge.from : endEdge.to;
    const edgeChain: Array<{ edgeId: number; reverse: boolean }> = [];
    let walker: number | null = endEntryNode;
    while (walker !== null) {
      const step = prev.get(walker);
      if (!step) break;
      const edge = network.edges[step.edgeId];
      edgeChain.unshift({ edgeId: step.edgeId, reverse: edge.from !== step.node });
      walker = step.node;
    }

    const chosenStartExitNode = sourceNodeFor.get(endEntryNode) ?? startEdge.to;

    // 1. Walk along startEdge from startProj to chosenStartExitNode
    if (chosenStartExitNode === startEdge.from) {
      for (let i = startProj.segIdx; i >= 0; i--) {
        pushUnique(routePoints, startEdge.samples[i]);
      }
    } else {
      for (let i = startProj.segIdx + 1; i < startEdge.samples.length; i++) {
        pushUnique(routePoints, startEdge.samples[i]);
      }
    }

    // 2. Walk along intermediate shortest-path road edges
    for (const item of edgeChain) {
      const edge = network.edges[item.edgeId];
      const pts = item.reverse ? [...edge.samples].reverse() : edge.samples;
      for (const p of pts) {
        pushUnique(routePoints, p);
      }
    }

    // 3. Walk along endEdge from endEntryNode to endProj
    if (endEntryNode === endEdge.from) {
      for (let i = 0; i <= endProj.segIdx; i++) {
        pushUnique(routePoints, endEdge.samples[i]);
      }
    } else {
      for (let i = endEdge.samples.length - 1; i >= endProj.segIdx + 1; i--) {
        pushUnique(routePoints, endEdge.samples[i]);
      }
    }
    pushUnique(routePoints, endProj.point);
  }

  if (Math.hypot(endX - endProj.point.x, endZ - endProj.point.z) > 4) {
    pushUnique(routePoints, { x: endX, z: endZ });
  }

  let totalDist = 0;
  for (let i = 1; i < routePoints.length; i++) {
    totalDist += Math.hypot(
      routePoints[i].x - routePoints[i - 1].x,
      routePoints[i].z - routePoints[i - 1].z,
    );
  }

  let turnHint = 'Pokračuj po ceste';
  if (totalDist < 28) {
    turnHint = 'Cieľ v dosahu';
  } else if (routePoints.length >= 4) {
    // Look ahead along road segments (~25m..75m ahead) for sharpest upcoming turn
    let accDist = 0;
    let lookIdx = 1;
    while (lookIdx < routePoints.length - 1 && accDist < 38) {
      accDist += Math.hypot(
        routePoints[lookIdx].x - routePoints[lookIdx - 1].x,
        routePoints[lookIdx].z - routePoints[lookIdx - 1].z,
      );
      lookIdx++;
    }
    const p0 = routePoints[0];
    const p1 = routePoints[Math.max(1, lookIdx - 1)];
    const p2 = routePoints[Math.min(routePoints.length - 1, lookIdx + 2)];
    const a1 = Math.atan2(p1.x - p0.x, p1.z - p0.z);
    const a2 = Math.atan2(p2.x - p1.x, p2.z - p1.z);
    let diff = a2 - a1;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const distRound = Math.max(10, Math.round(accDist / 5) * 5);
    if (diff > 0.48) turnHint = `Odboč vľavo o ${distRound} m`;
    else if (diff < -0.48) turnHint = `Odboč vpravo o ${distRound} m`;
    else turnHint = 'Pokračuj rovno po ceste';
  }

  return { points: routePoints, distance: Math.round(totalDist), turnHint };
}

