import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRoadNetwork, RoadNetwork } from './roadNetwork';
import { ProceduralTexturePack } from './textures';
import { SHOPS } from './types';

export interface OrientedCollider {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  minY: number;
  maxY: number;
  yaw: number;
  cos?: number;
  sin?: number;
}

export interface CircleCollider {
  cx: number;
  cz: number;
  r: number;
  minY: number;
  maxY: number;
}

export interface RoofDeck {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  y: number;
  yaw: number;
  cos?: number;
  sin?: number;
}

export interface RampSurface {
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  yaw: number;
}

export interface OverpassDeck {
  x: number;
  z: number;
  width: number;
  deckLength: number;
  rampLength: number;
  height: number;
  yaw: number;
}

export interface ElevatorSystem {
  id: string;
  name: string;
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  floors: number[];
  floorNames: string[];
  currentFloorIdx: number;
  targetFloorIdx: number;
  currentY: number;
  moving: boolean;
  cabGroup: THREE.Group;
}

export interface ShootingTarget {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  hitFlash: number;
}

export interface CustomsBayZone {
  shopId: string;
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  yaw: number;
}

export interface CloudPuffData {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

export interface WorldData {
  network: RoadNetwork;
  colliders: OrientedCollider[];
  circleColliders: CircleCollider[];
  roofDecks: RoofDeck[];
  ramps: RampSurface[];
  overpasses: OverpassDeck[];
  elevators: ElevatorSystem[];
  customsBays: CustomsBayZone[];
  shelterSpots: Array<{ x: number; z: number }>;
  rangeTargets: ShootingTarget[];
  radarDish: THREE.Group;
  buildingEmissiveMats: THREE.MeshStandardMaterial[];
  neonMats: THREE.MeshStandardMaterial[];
  streetLightBulbs: THREE.MeshStandardMaterial[];
  roadMat: THREE.MeshStandardMaterial;
  oceanMesh: THREE.Mesh;
  skyDomeMat: THREE.ShaderMaterial;
  cloudGroup: THREE.Group;
  cloudInst: THREE.InstancedMesh;
  cloudPuffs: CloudPuffData[];
  cloudMats: THREE.MeshStandardMaterial[];
  beaconMeshes: Record<string, THREE.Mesh>;
  missionBeacon: THREE.Mesh;
  gpsBeacon: THREE.Mesh;
  queryNearbyColliders: (x: number, z: number, out: OrientedCollider[]) => void;
  queryNearbyCircleColliders: (x: number, z: number, out: CircleCollider[]) => void;
  groundHeightAt: (x: number, z: number, actorY?: number) => number;
  isWaterAt: (x: number, z: number) => boolean;
  distanceToRoad: (x: number, z: number) => number;
}

function toMergeableNonIndexed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIdx = geo.index ? geo.toNonIndexed() : geo;
  if (!nonIdx.attributes.normal) nonIdx.computeVertexNormals();
  if (!nonIdx.attributes.uv) {
    const count = nonIdx.attributes.position.count;
    nonIdx.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  for (const name of Object.keys(nonIdx.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') {
      nonIdx.deleteAttribute(name);
    }
  }
  return nonIdx;
}

function scaleBoxUvs(
  geo: THREE.BoxGeometry,
  w: number,
  h: number,
  d: number,
  tileW = 20,
  tileH = 24,
) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    const faceIdx = Math.floor(i / 4);
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (faceIdx < 2) {
      uv.setXY(i, (u * d) / tileW, (v * h) / tileH);
    } else if (faceIdx < 4) {
      uv.setXY(i, (u * w) / tileW, (v * d) / tileW);
    } else {
      uv.setXY(i, (u * w) / tileW, (v * h) / tileH);
    }
  }
  uv.needsUpdate = true;
}

function buildRoadRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  segments: number,
  length: number,
  yOffset = 0.12,
  getElevation?: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const pts = curve.getSpacedPoints(segments);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfW = width * 0.5;
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const right = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(segments, i + 1)];
    tangent.set(next.x - prev.x, 0, next.z - prev.z);
    if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, 1);
    else tangent.normalize();
    right.crossVectors(tangent, up).normalize();

    const lx = p.x - right.x * halfW;
    const lz = p.z - right.z * halfW;
    const rx = p.x + right.x * halfW;
    const rz = p.z + right.z * halfW;

    const elev = getElevation
      ? Math.max(
          getElevation(p.x, p.z),
          getElevation(lx, lz),
          getElevation(rx, rz),
          getElevation((p.x + lx) * 0.5, (p.z + lz) * 0.5),
          getElevation((p.x + rx) * 0.5, (p.z + rz) * 0.5),
        )
      : 0;
    const y = elev + yOffset;

    positions.push(lx, y, lz, rx, y, rz);
    normals.push(0, 1, 0, 0, 1, 0);
    const vCoord = ((i / segments) * length) / 18;
    uvs.push(0, vCoord, 1, vCoord);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildPalmettoBayWorld(
  scene: THREE.Scene,
  textures: ProceduralTexturePack,
): WorldData {
  const network = createRoadNetwork();
  const colliders: OrientedCollider[] = [];
  const circleColliders: CircleCollider[] = [];
  const roofDecks: RoofDeck[] = [];
  const ramps: RampSurface[] = [];
  const overpasses: OverpassDeck[] = [];
  const elevators: ElevatorSystem[] = [];
  const customsBays: CustomsBayZone[] = [];
  const shelterSpots: Array<{ x: number; z: number }> = [];
  const occupiedFootprints: Array<{ cx: number; cz: number; hw: number; hd: number; yaw: number }> = [
    { cx: -358, cz: -358, hw: 16, hd: 16, yaw: 0 },
  ];
  const rangeTargets: ShootingTarget[] = [];
  const buildingEmissiveMats: THREE.MeshStandardMaterial[] = [];
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const streetLightBulbs: THREE.MeshStandardMaterial[] = [];
  const beaconMeshes: Record<string, THREE.Mesh> = {};

  const localToWorld = (
    cx: number,
    cz: number,
    yaw: number,
    lx: number,
    lz: number,
  ): [number, number] => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [cx + lx * c + lz * s, cz - lx * s + lz * c];
  };

  const addLocalCollider = (
    cx: number,
    cz: number,
    yaw: number,
    lx: number,
    lz: number,
    w: number,
    d: number,
    minY: number,
    maxY: number,
  ) => {
    const [wx, wz] = localToWorld(cx, cz, yaw, lx, lz);
    colliders.push({
      cx: wx,
      cz: wz,
      halfW: w * 0.5,
      halfD: d * 0.5,
      minY,
      maxY,
      yaw,
    });
  };

  const addLocalCircleCollider = (
    cx: number,
    cz: number,
    yaw: number,
    lx: number,
    lz: number,
    r: number,
    minY: number,
    maxY: number,
  ) => {
    const [wx, wz] = localToWorld(cx, cz, yaw, lx, lz);
    circleColliders.push({ cx: wx, cz: wz, r, minY, maxY });
  };

  const roadEdgeClearance = (x: number, z: number): number => {
    let minClear = Infinity;
    for (const edge of network.edges) {
      const hw = edge.width * 0.5;
      for (const s of edge.samples) {
        const d = Math.hypot(s.x - x, s.z - z) - hw;
        if (d < minClear) minClear = d;
      }
    }
    return minClear;
  };

  const isBoxClearOfRoads = (
    cx: number,
    cz: number,
    bw: number,
    bd: number,
    yaw = 0,
    minClear = 2.6,
  ): boolean => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (let ix = -1; ix <= 1; ix += 0.5) {
      for (let iz = -1; iz <= 1; iz += 0.5) {
        const lx = ix * bw * 0.5;
        const lz = iz * bd * 0.5;
        const wx = cx + lx * c + lz * s;
        const wz = cz - lx * s + lz * c;
        if (roadEdgeClearance(wx, wz) < minClear) return false;
      }
    }
    return true;
  };

  const isPointInsideOccupied = (x: number, z: number, margin = 2.5): boolean => {
    for (const f of occupiedFootprints) {
      const dx = x - f.cx;
      const dz = z - f.cz;
      if (dx * dx + dz * dz > (f.hw + f.hd + margin + 6) ** 2) continue;
      const c = Math.cos(f.yaw);
      const s = Math.sin(f.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      if (Math.abs(lx) <= f.hw + margin && Math.abs(lz) <= f.hd + margin) {
        return true;
      }
    }
    return false;
  };

  const distanceToRoad = (x: number, z: number): number => {
    let minD2 = Infinity;
    for (const edge of network.edges) {
      for (const s of edge.samples) {
        const dx = s.x - x;
        const dz = s.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < minD2) minD2 = d2;
      }
    }
    return Math.sqrt(minD2);
  };

  // Terrain elevation helper for western canyon hills & pine ridge (roads stay smoothly drivable!)
  const terrainElevation = (gx: number, gz: number): number => {
    if (gx >= -1040) return 0;
    const t = Math.min(1, (-1040 - gx) / 680);
    const raw = t * (16.0 + Math.sin(gz * 0.008) * 7.5 + Math.cos(gx * 0.01) * 5.0);
    const dRoad = distanceToRoad(gx, gz);
    // Keep Redrock Lake basin (-2080, 240) and airport approach flat
    const nearLake = Math.hypot(gx + 2080, gz - 240) < 170;
    const nearAirport = gx > -1600 && gx < -450 && gz > 1100 && gz < 2000;
    if (nearLake || nearAirport) return 0;
    const flatten = THREE.MathUtils.clamp((dRoad - 18) / 36, 0, 1);
    return Math.max(0, raw * flatten);
  };

  // 0. Atmospheric Gradient SkyDome + Stars Shader
  const skyDomeGeo = new THREE.SphereGeometry(4200, 32, 20);
  const skyDomeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenithColor: { value: new THREE.Color(0x1d4ed8) },
      uHorizonColor: { value: new THREE.Color(0x7dd3fc) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(0xfff4d2) },
      uNightFactor: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uNightFactor;
      varying vec3 vWorldDir;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uZenithColor, pow(h, 0.55));
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        col += uSunColor * pow(sunDot, 72.0) * (1.0 - uNightFactor * 0.8) * 0.35;
        col += uSunColor * pow(sunDot, 12.0) * (1.0 - uNightFactor * 0.7) * 0.08;
        if (uNightFactor > 0.15 && h > 0.08) {
          float star = step(0.9965, hash(floor(dir * 260.0)));
          col += vec3(0.85, 0.92, 1.0) * star * uNightFactor * 0.95;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
  scene.add(skyDome);

  // 1. Massive ~5600m Urban + Coastal + Canyon Terrain (Single Zero-Overlap Vertex-Colored Mesh!)
  const groundGeo = new THREE.PlaneGeometry(4200, 4800, 128, 128);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  const groundColors = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const gx = posAttr.getX(i) - 900;
    const gz = posAttr.getZ(i);
    let y = terrainElevation(gx, gz);

    // Depress terrain cleanly beneath coastal beach, Redrock Lake, and Airport Apron to eliminate ALL Z-fighting!
    if (gx > 715) {
      const beachDepth = Math.min(1, (gx - 715) / 35);
      y -= beachDepth * 0.45;
    }
    const distLake = Math.hypot(gx + 2080, gz - 240);
    if (distLake < 155) {
      y = -0.55;
    }
    if (gx >= -1320 && gx <= -380 && gz >= 1170 && gz <= 1870) {
      y = -0.3;
    }
    posAttr.setY(i, y);

    // Subtle biome tinting (urban lush grass vs deeper western pine moss)
    const forestBlend = THREE.MathUtils.clamp((-1020 - gx) / 260, 0, 1);
    groundColors[i * 3] = 1.0 - forestBlend * 0.24;
    groundColors[i * 3 + 1] = 1.0 - forestBlend * 0.18;
    groundColors[i * 3 + 2] = 1.0 - forestBlend * 0.24;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
  groundGeo.computeVertexNormals();

  const urbanGroundMat = new THREE.MeshStandardMaterial({
    map: textures.grass,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.0,
    envMapIntensity: 0.18,
  });
  const urbanGround = new THREE.Mesh(groundGeo, urbanGroundMat);
  urbanGround.position.set(-900, 0, 0);
  urbanGround.receiveShadow = true;
  scene.add(urbanGround);

  // Redrock Lake in Western Canyon (-2080, 240)
  const lakeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e7490,
    roughness: 0.3,
    roughnessMap: textures.waterRoughness,
    metalness: 0.1,
    clearcoat: 0.28,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.38,
  });
  const redrockLake = new THREE.Mesh(new THREE.CircleGeometry(148, 36), lakeMat);
  redrockLake.rotation.x = -Math.PI / 2;
  redrockLake.position.set(-2080, 0.04, 240);
  scene.add(redrockLake);

  // Coastal Sand Strip (Sunset Sands East Beachfront)
  const sandGeo = new THREE.PlaneGeometry(240, 4800);
  sandGeo.rotateX(-Math.PI / 2);
  const sandMesh = new THREE.Mesh(
    sandGeo,
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.96, envMapIntensity: 0.18 }),
  );
  sandMesh.position.set(840, 0.02, 0);
  sandMesh.receiveShadow = true;
  scene.add(sandMesh);

  // Coral Keys Ocean (x > 920)
  const oceanGeo = new THREE.PlaneGeometry(5200, 9200, 36, 36);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshPhysicalMaterial({
    color: 0x0369a1,
    roughness: 0.32,
    roughnessMap: textures.waterRoughness,
    metalness: 0.12,
    clearcoat: 0.28,
    clearcoatRoughness: 0.34,
    envMapIntensity: 0.4,
    transparent: true,
    opacity: 0.92,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.set(3520, -0.45, 0);
  oceanMesh.receiveShadow = true;
  scene.add(oceanMesh);

  // Coral Island (x=1240, z=-220) + Horizon Islands
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x1e4d3b,
    roughness: 0.95,
    envMapIntensity: 0.2,
  });
  const sandIsland = new THREE.Mesh(
    new THREE.CylinderGeometry(48, 56, 1.4, 24),
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.94, envMapIntensity: 0.2 }),
  );
  sandIsland.position.set(1240, 0.35, -220);
  scene.add(sandIsland);
  roofDecks.push({ cx: 1240, cz: -220, halfW: 48, halfD: 48, y: 1.05, yaw: 0 });

  [
    [1560, -880, 140, 32],
    [1680, 680, 175, 42],
    [1760, -90, 120, 26],
    [-2650, -1400, 260, 88],
    [-2720, 450, 290, 96],
    [-2550, 1780, 240, 74],
  ].forEach(([ix, iz, ir, ih]) => {
    const isl = new THREE.Mesh(new THREE.ConeGeometry(ir, ih, 12), islandMat);
    isl.position.set(ix, ih * 0.32 - 1, iz);
    scene.add(isl);
  });

  // 2. Curved Paved Roads, Limestone Sidewalk Curbs & Crisp Intersections (Zero Z-Fighting!)
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltRoad,
    roughness: 0.9,
    metalness: 0.02,
    envMapIntensity: 0.22,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const roadShoulderMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    roughness: 0.92,
    metalness: 0.01,
    envMapIntensity: 0.2,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const dirtMat = new THREE.MeshStandardMaterial({
    map: textures.dirtRoad,
    roughness: 0.97,
    metalness: 0.0,
    envMapIntensity: 0.14,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const plazaAsphaltMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltPlaza,
    roughness: 0.9,
    metalness: 0.02,
    envMapIntensity: 0.22,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const crosswalkStripeMat = new THREE.MeshStandardMaterial({
    color: 0xdbe3ee,
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });

  const nodeMaxWidth = new Map<number, number>();
  const nodeDegree = new Map<number, number>();
  const curbGeos: THREE.BufferGeometry[] = [];
  const pavedRoadGeos: THREE.BufferGeometry[] = [];
  const dirtRoadGeos: THREE.BufferGeometry[] = [];
  const plazaDiscGeos: THREE.BufferGeometry[] = [];
  const crosswalkGeos: THREE.BufferGeometry[] = [];

  network.edges.forEach((edge, eIdx) => {
    nodeMaxWidth.set(edge.from, Math.max(nodeMaxWidth.get(edge.from) ?? 16, edge.width));
    nodeMaxWidth.set(edge.to, Math.max(nodeMaxWidth.get(edge.to) ?? 16, edge.width));
    nodeDegree.set(edge.from, (nodeDegree.get(edge.from) ?? 0) + 1);
    nodeDegree.set(edge.to, (nodeDegree.get(edge.to) ?? 0) + 1);
    const segCount = Math.max(24, Math.ceil(edge.length / 3.2));

    if (!edge.isDirt) {
      // Raised coastal limestone sidewalk shoulder beneath urban/coastal paved roads
      const curbGeo = buildRoadRibbonGeometry(
        edge.curve,
        edge.width + 4.4,
        segCount,
        edge.length,
        0.065 + (eIdx % 5) * 0.002,
        terrainElevation,
      );
      curbGeos.push(toMergeableNonIndexed(curbGeo));
    }

    const yLayer = (edge.isDirt ? 0.18 : 0.125) + (eIdx % 11) * 0.005;
    const ribbonGeo = buildRoadRibbonGeometry(
      edge.curve,
      edge.width,
      segCount,
      edge.length,
      yLayer,
      terrainElevation,
    );
    if (edge.isDirt) {
      dirtRoadGeos.push(toMergeableNonIndexed(ribbonGeo));
    } else {
      pavedRoadGeos.push(toMergeableNonIndexed(ribbonGeo));
    }
  });

  network.nodes.forEach((n) => {
    const isTrail = n.x < -1020 && n.z < 1200;
    const maxW = nodeMaxWidth.get(n.id) ?? 18;
    const discRadius = maxW * 0.56;
    const baseH = terrainElevation(n.x, n.z);

    if (!isTrail) {
      const curbDiscGeo = new THREE.CircleGeometry(discRadius + 2.2, 24);
      curbDiscGeo.rotateX(-Math.PI / 2);
      curbDiscGeo.translate(n.x, baseH + 0.075, n.z);
      curbGeos.push(toMergeableNonIndexed(curbDiscGeo));
    }

    const discGeo = new THREE.CircleGeometry(discRadius, 24);
    discGeo.rotateX(-Math.PI / 2);
    discGeo.translate(n.x, baseH + (isTrail ? 0.24 : 0.195), n.z);
    if (isTrail) {
      dirtRoadGeos.push(toMergeableNonIndexed(discGeo));
    } else {
      plazaDiscGeos.push(toMergeableNonIndexed(discGeo));
    }

    // Subtle crisp crosswalk stripes on major urban intersections
    if (!isTrail && (nodeDegree.get(n.id) ?? 0) >= 3 && Math.hypot(n.x, n.z) > 45 && n.x > -800) {
      for (let side = 0; side < 4; side++) {
        const ang = (side * Math.PI) / 2;
        const dist = discRadius * 0.88;
        const cx = n.x + Math.sin(ang) * dist;
        const cz = n.z + Math.cos(ang) * dist;
        for (let s = -2; s <= 2; s++) {
          const barGeo = new THREE.PlaneGeometry(0.95, 2.7);
          barGeo.rotateX(-Math.PI / 2);
          barGeo.rotateY(ang);
          barGeo.translate(
            cx + Math.cos(ang) * (s * 1.9),
            baseH + 0.205,
            cz - Math.sin(ang) * (s * 1.9),
          );
          crosswalkGeos.push(toMergeableNonIndexed(barGeo));
        }
      }
    }
  });

  if (curbGeos.length > 0) {
    const mergedCurbs = mergeGeometries(curbGeos, false);
    if (mergedCurbs) {
      const m = new THREE.Mesh(mergedCurbs, roadShoulderMat);
      m.receiveShadow = true;
      scene.add(m);
    }
    curbGeos.forEach((g) => g.dispose());
  }
  if (pavedRoadGeos.length > 0) {
    const mergedRoads = mergeGeometries(pavedRoadGeos, false);
    if (mergedRoads) {
      const m = new THREE.Mesh(mergedRoads, roadMat);
      m.receiveShadow = true;
      scene.add(m);
    }
    pavedRoadGeos.forEach((g) => g.dispose());
  }
  if (dirtRoadGeos.length > 0) {
    const mergedDirt = mergeGeometries(dirtRoadGeos, false);
    if (mergedDirt) {
      const m = new THREE.Mesh(mergedDirt, dirtMat);
      m.receiveShadow = true;
      scene.add(m);
    }
    dirtRoadGeos.forEach((g) => g.dispose());
  }
  if (plazaDiscGeos.length > 0) {
    const mergedPlaza = mergeGeometries(plazaDiscGeos, false);
    if (mergedPlaza) {
      const m = new THREE.Mesh(mergedPlaza, plazaAsphaltMat);
      m.receiveShadow = true;
      scene.add(m);
    }
    plazaDiscGeos.forEach((g) => g.dispose());
  }
  if (crosswalkGeos.length > 0) {
    const mergedCross = mergeGeometries(crosswalkGeos, false);
    if (mergedCross) {
      scene.add(new THREE.Mesh(mergedCross, crosswalkStripeMat));
    }
    crosswalkGeos.forEach((g) => g.dispose());
  }

  // 3. Marked Parking Lots
  const parkingLotMat = new THREE.MeshStandardMaterial({
    map: textures.parkingLot,
    roughness: 0.92,
    envMapIntensity: 0.2,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const parkingLots: Array<[number, number, number, number, number]> = [
    [460, -160, 48, 40, 0],
    [-780, 120, 48, 40, Math.PI / 2],
    [296, 756, 44, 30, 0],
    [-116, -195, 34, 24, 0],
    [-640, 1345, 72, 46, 0],
  ];
  parkingLots.forEach(([px, pz, pw, pd, pyaw]) => {
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), parkingLotMat);
    lot.rotation.x = -Math.PI / 2;
    lot.rotation.z = pyaw;
    lot.position.set(px, 0.145, pz);
    lot.receiveShadow = true;
    scene.add(lot);
  });

  // 4. Downtown Central Roundabout Plaza (Sculpted Fountain Basin + Curved Coastal Spire)
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    roughness: 0.86,
    envMapIntensity: 0.35,
  });
  const rotaryIsland = new THREE.Mesh(new THREE.CylinderGeometry(36, 37.5, 0.38, 40), sidewalkMat);
  rotaryIsland.position.set(0, 0.19, 0);
  rotaryIsland.receiveShadow = true;
  scene.add(rotaryIsland);

  const basinMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.25 });
  const fountainRim = new THREE.Mesh(new THREE.TorusGeometry(11.5, 0.65, 12, 36), basinMat);
  fountainRim.rotation.x = Math.PI / 2;
  fountainRim.position.set(0, 0.72, 0);
  fountainRim.castShadow = true;
  fountainRim.receiveShadow = true;
  const fountainWater = new THREE.Mesh(
    new THREE.CircleGeometry(11.2, 36),
    new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.2,
      roughness: 0.28,
      metalness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.4,
    }),
  );
  fountainWater.rotation.x = -Math.PI / 2;
  fountainWater.position.set(0, 0.78, 0);

  const monumentMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    metalness: 0.56,
    roughness: 0.3,
    clearcoat: 0.35,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.44,
  });
  const spirePts = [
    new THREE.Vector2(3.6, 0),
    new THREE.Vector2(2.8, 1.4),
    new THREE.Vector2(1.5, 4.2),
    new THREE.Vector2(2.4, 7.2),
    new THREE.Vector2(1.1, 10.6),
    new THREE.Vector2(0.18, 13.6),
    new THREE.Vector2(0.0, 14.2),
  ];
  const monument = new THREE.Mesh(new THREE.LatheGeometry(spirePts, 28), monumentMat);
  monument.position.set(0, 1.2, 0);
  monument.castShadow = true;

  const haloRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.22, 12, 36),
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    }),
  );
  haloRing.position.set(0, 8.8, 0);
  haloRing.rotation.x = Math.PI * 0.36;
  neonMats.push(haloRing.material as THREE.MeshStandardMaterial);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 5.6, 1.6, 28),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.2 }),
  );
  plinth.position.set(0, 0.8, 0);
  scene.add(fountainRim, fountainWater, plinth, monument, haloRing);
  circleColliders.push({ cx: 0, cz: 0, r: 12.15, minY: 0, maxY: 1.6 });
  circleColliders.push({ cx: 0, cz: 0, r: 5.4, minY: 0, maxY: 16 });

  // 5. Bridges, Elevated Highway Overpasses & Underpasses (Strictly Clear of Driving Lanes!)
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x525d6e,
    roughness: 0.82,
    envMapIntensity: 0.35,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.5,
    envMapIntensity: 0.45,
  });

  const addOverpassOrBridge = (
    x: number,
    z: number,
    width: number,
    deckLength: number,
    rampLength: number,
    height: number,
    yaw: number,
    isOceanBridge: boolean,
  ) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;

    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.7, deckLength), concreteMat);
    deck.position.set(0, height - 0.35, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    g.add(deck);

    const topAsphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 1.2, deckLength),
      roadMat,
    );
    topAsphalt.rotation.x = -Math.PI / 2;
    topAsphalt.position.set(0, height + 0.02, 0);
    topAsphalt.receiveShadow = true;
    g.add(topAsphalt);

    [-width * 0.48, width * 0.48].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, deckLength), railMat);
      rail.position.set(rx, height + 0.45, 0);
      g.add(rail);
      addLocalCollider(x, z, yaw, rx, 0, 0.5, deckLength, height - 0.1, height + 1.8);
    });

    // Place pillars outside the spanned road width (at pz = ±14.2m for cross-overpasses, or spaced along ocean bridge)
    const pillarZOffsets = isOceanBridge
      ? [-deckLength * 0.42, -deckLength * 0.14, deckLength * 0.14, deckLength * 0.42]
      : [-deckLength * 0.42, deckLength * 0.42];
    const pillarMinY = isOceanBridge ? -2.0 : 0;
    const pillarH = isOceanBridge ? height + 2.0 : height;

    pillarZOffsets.forEach((pz) => {
      [-width * 0.44, width * 0.44].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.15, pillarH, 1.15), concreteMat);
        pillar.position.set(px, pillarMinY + pillarH * 0.5, pz);
        pillar.castShadow = true;
        g.add(pillar);
        addLocalCollider(x, z, yaw, px, pz, 1.2, 1.2, 0, height);
      });
    });

    const rampDiag = Math.hypot(rampLength, height);
    const pitchAngle = Math.atan2(height, rampLength);
    [-1, 1].forEach((dir) => {
      const rampMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width - 0.8, 0.5, rampDiag),
        roadMat,
      );
      rampMesh.position.set(0, height * 0.5 - 0.2, dir * (deckLength * 0.5 + rampLength * 0.5));
      rampMesh.rotation.x = dir * pitchAngle;
      rampMesh.receiveShadow = true;
      g.add(rampMesh);
    });

    scene.add(g);
    overpasses.push({ x, z, width, deckLength, rampLength, height, yaw });
  };

  // Cross-Highway Overpass A: North-South over Flamingo Connector (Edge 7 midpoint 447.5, 14.8; road passes cleanly between pillars!)
  addOverpassOrBridge(447.5, 14.8, 14, 34, 32, 5.4, 3.154, false);
  // Cross-Highway Overpass B: North-South over North Midtown Blvd (Edge 22 midpoint -84.3, -650.1)
  addOverpassOrBridge(-84.3, -650.1, 14, 34, 32, 5.4, -0.03, false);
  // Coral Island Ocean Causeway Bridge: Sunset Sands beach (898, -220) -> Coral Island (1192, -220)
  addOverpassOrBridge(1045, -220, 14, 210, 42, 4.4, Math.PI / 2, true);

  // 2 Aligned Highway Underpass Tunnels along clean straightaways (walls outside 18m asphalt!)
  [
    [-175.0, 439.7, 3.086],
    [-500.0, -645.0, 1.571],
  ].forEach(([ux, uz, uyaw]) => {
    const archGroup = new THREE.Group();
    archGroup.position.set(ux, 0, uz);
    archGroup.rotation.y = uyaw;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(26, 1.4, 32), concreteMat);
    roof.position.set(0, 6.4, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    const wL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.4, 32), concreteMat);
    wL.position.set(-12.2, 3.2, 0);
    wL.castShadow = true;
    wL.receiveShadow = true;
    const wR = wL.clone();
    wR.position.x = 12.2;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(26.4, 0.35, 32.4),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.2 }),
    );
    stripe.position.set(0, 7.1, 0);
    archGroup.add(roof, wL, wR, stripe);
    scene.add(archGroup);
    roofDecks.push({ cx: ux, cz: uz, halfW: 13, halfD: 16, y: 7.1, yaw: uyaw });
    addLocalCollider(ux, uz, uyaw, -12.2, 0, 1.65, 32, 0, 6.6);
    addLocalCollider(ux, uz, uyaw, 12.2, 0, 1.65, 32, 0, 6.6);
    shelterSpots.push({ x: ux, z: uz });
  });

  // Helper to create Working 3D Elevators!
  const elevatorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.32,
  });
  const elevatorFloorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.35,
    roughness: 0.4,
  });
  const elevatorSignMat = new THREE.MeshBasicMaterial({ map: textures.elevatorPanel });

  const createWorkingElevator = (
    id: string,
    name: string,
    wx: number,
    wz: number,
    yaw: number,
    floors: number[],
    floorNames: string[],
  ) => {
    const maxH = floors[floors.length - 1] + 4.2;
    const shaftGroup = new THREE.Group();
    shaftGroup.position.set(wx, 0, wz);
    shaftGroup.rotation.y = yaw;

    // 4 Corner Steel Shaft Columns
    [
      [-2.1, -2.1],
      [2.1, -2.1],
      [-2.1, 2.1],
      [2.1, 2.1],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, maxH, 0.28), elevatorFrameMat);
      col.position.set(cx, maxH * 0.5, cz);
      shaftGroup.add(col);
    });

    // Translucent glass shaft rear & side panels so you see the city skyline while riding up!
    const shaftGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.28,
    });
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(4.0, maxH, 0.1), shaftGlassMat);
    backGlass.position.set(0, maxH * 0.5, -2.05);
    shaftGroup.add(backGlass);

    // Signboards at ground floor & top stop
    const signG = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.15), elevatorSignMat);
    signG.position.set(0, 3.1, 2.05);
    shaftGroup.add(signG);
    scene.add(shaftGroup);

    // Moving Cab Group
    const cabGroup = new THREE.Group();
    cabGroup.position.set(wx, floors[0], wz);
    cabGroup.rotation.y = yaw;

    const cabFloor = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.28, 4.1), elevatorFloorMat);
    cabFloor.position.y = 0.02;
    cabFloor.receiveShadow = true;
    const cabCeiling = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.18, 4.1), elevatorFrameMat);
    cabCeiling.position.y = 3.2;
    const cabLight = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
    );
    cabLight.rotation.x = Math.PI / 2;
    cabLight.position.y = 3.08;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.85), elevatorSignMat);
    panel.position.set(0, 1.75, -1.94);

    // Safety glass railing on front/sides
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 3.8), elevatorFrameMat);
    railL.position.set(-1.98, 0.65, 0);
    const railR = railL.clone();
    railR.position.x = 1.98;
    cabGroup.add(cabFloor, cabCeiling, cabLight, panel, railL, railR);
    scene.add(cabGroup);

    elevators.push({
      id,
      name,
      cx: wx,
      cz: wz,
      halfW: 2.3,
      halfD: 2.3,
      floors,
      floorNames,
      currentFloorIdx: 0,
      targetFloorIdx: 0,
      currentY: floors[0],
      moving: false,
      cabGroup,
    });
  };

  // 6. PALMETTO INTERNATIONAL AIRPORT (South, Dual Giant Runways + Walk-In Terminal + ATC Tower + 3 Hangars!)
  const tarmacMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltPlaza,
    roughness: 0.88,
    envMapIntensity: 0.32,
  });
  const runwayMat = new THREE.MeshStandardMaterial({
    map: textures.runway,
    roughness: 0.88,
    envMapIntensity: 0.2,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  // Massive Concrete Airport Apron
  const airportApron = new THREE.Mesh(new THREE.PlaneGeometry(920, 680), tarmacMat);
  airportApron.rotation.x = -Math.PI / 2;
  airportApron.position.set(-850, 0.05, 1520);
  airportApron.receiveShadow = true;
  scene.add(airportApron);

  // Main Runway 09L (540m long!)
  const mainRunway = new THREE.Mesh(new THREE.PlaneGeometry(46, 540), runwayMat);
  mainRunway.rotation.x = -Math.PI / 2;
  mainRunway.rotation.z = Math.PI / 2;
  mainRunway.position.set(-820, 0.145, 1660);
  mainRunway.receiveShadow = true;
  scene.add(mainRunway);

  // Crosswind Runway 04R (380m long!)
  const crossRunway = new THREE.Mesh(new THREE.PlaneGeometry(36, 380), runwayMat);
  crossRunway.rotation.x = -Math.PI / 2;
  crossRunway.rotation.z = Math.PI / 2;
  crossRunway.position.set(-820, 0.145, 1150);
  crossRunway.receiveShadow = true;
  scene.add(crossRunway);

  // Runway Edge Navigation Lights (Instanced -> 1 draw call)
  const rwLightMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.0,
  });
  neonMats.push(rwLightMat);
  const rwLampPos: Array<[number, number]> = [];
  for (let rx = -1070; rx <= -570; rx += 45) {
    rwLampPos.push([rx, 1660 - 25], [rx, 1660 + 25]);
  }
  const rwLampInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), rwLightMat, rwLampPos.length);
  const _tmpDummy = new THREE.Object3D();
  rwLampPos.forEach(([rx, rz], i) => {
    _tmpDummy.position.set(rx, 0.25, rz);
    _tmpDummy.rotation.set(0, 0, 0);
    _tmpDummy.scale.set(1, 1, 1);
    _tmpDummy.updateMatrix();
    rwLampInst.setMatrixAt(i, _tmpDummy.matrix);
  });
  rwLampInst.instanceMatrix.needsUpdate = true;
  scene.add(rwLampInst);

  // Walk-In Airport Passenger Terminal (-720, 1420)
  const termWallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    bumpMap: textures.buildingBump,
    bumpScale: 0.15,
    roughness: 0.78,
    envMapIntensity: 0.24,
  });
  const termGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.26,
    metalness: 0.2,
    transparent: true,
    opacity: 0.62,
    envMapIntensity: 0.35,
  });
  const termGroup = new THREE.Group();
  termGroup.position.set(-720, 0, 1420);
  const tFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 32),
    new THREE.MeshStandardMaterial({ map: textures.marbleFloor, roughness: 0.45, envMapIntensity: 0.4 }),
  );
  tFloor.rotation.x = -Math.PI / 2;
  tFloor.position.y = 0.09;
  const tRoof = new THREE.Mesh(new THREE.BoxGeometry(62, 1.2, 36), termWallMat);
  tRoof.position.set(0, 11.5, 0);
  tRoof.castShadow = true;
  const tBack = new THREE.Mesh(new THREE.BoxGeometry(58, 11, 0.9), termGlassMat);
  tBack.position.set(0, 5.5, 16);
  const tSideL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 11, 32), termWallMat);
  tSideL.position.set(-29, 5.5, 0);
  const tSideR = tSideL.clone();
  tSideR.position.x = 29;
  // Front wings leaving huge 14m wide terminal concourse doors
  const tFrontL = new THREE.Mesh(new THREE.BoxGeometry(22, 11, 0.9), termGlassMat);
  tFrontL.position.set(-18, 5.5, -16);
  const tFrontR = tFrontL.clone();
  tFrontR.position.x = 18;
  const tSign = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 5.5),
    new THREE.MeshBasicMaterial({ map: textures.signTextures.airport }),
  );
  tSign.position.set(0, 8.8, -16.6);
  tSign.rotation.y = Math.PI;
  termGroup.add(tFloor, tRoof, tBack, tSideL, tSideR, tFrontL, tFrontR, tSign);

  // Check-in Desks, Baggage X-Ray Scanner & Boarding Lounge Seating inside Terminal
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const scannerMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4, metalness: 0.35 });
  [-14, 0, 14].forEach((dx, idx) => {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.15, 1.6), deskMat);
    desk.position.set(dx, 0.57, 8);
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.14), scannerMat);
    monitor.position.set(dx, 1.45, 7.8);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.65, 1.3), deskMat);
    bench.position.set(dx, 0.35, -3.5);
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.58, 0.52),
      new THREE.MeshStandardMaterial({ color: idx === 1 ? 0xd97706 : 0x334155, roughness: 0.7 }),
    );
    bag.position.set(dx + 2.2, 0.3, -1.8);
    termGroup.add(desk, monitor, bench, bag);
    addLocalCollider(-720, 1420, 0, dx, 8, 7.6, 1.7, 0, 1.8);
    addLocalCollider(-720, 1420, 0, dx, -3.5, 6.6, 1.4, 0, 1.2);
  });
  // Security X-Ray Arch + Conveyor Belt
  const xrayBelt = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 6.2), deskMat);
  xrayBelt.position.set(-22, 0.42, 1.5);
  const xrayTunnel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.45, 2.2), scannerMat);
  xrayTunnel.position.set(-22, 1.55, 1.5);
  termGroup.add(xrayBelt, xrayTunnel);
  addLocalCollider(-720, 1420, 0, -22, 1.5, 2.0, 6.3, 0, 2.6);

  // Flight Departure Info Screen on Side Wall
  const flightBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 3.2),
    new THREE.MeshBasicMaterial({ map: textures.signTextures.airport }),
  );
  flightBoard.position.set(0, 4.6, 15.4);
  flightBoard.rotation.y = Math.PI;
  termGroup.add(flightBoard);

  scene.add(termGroup);
  occupiedFootprints.push({ cx: -720, cz: 1420, hw: 30, hd: 17, yaw: 0 });
  shelterSpots.push({ x: -720, z: 1420 });
  roofDecks.push({ cx: -720, cz: 1420, halfW: 31, halfD: 18, y: 12.1, yaw: 0 });
  addLocalCollider(-720, 1420, 0, 0, 16, 58, 1.1, 0, 11);
  addLocalCollider(-720, 1420, 0, -29, 0, 1.1, 32, 0, 11);
  addLocalCollider(-720, 1420, 0, 29, 0, 1.1, 32, 0, 11);
  addLocalCollider(-720, 1420, 0, -18, -16, 22, 1.1, 0, 11);
  addLocalCollider(-720, 1420, 0, 18, -16, 22, 1.1, 0, 11);

  // ATC Control Tower with Working Elevator to 44m Observation Deck (-920, 1390)
  const atcShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 5.5, 42, 10),
    termWallMat,
  );
  atcShaft.position.set(-920, 21, 1390);
  atcShaft.castShadow = true;
  const atcCab = new THREE.Mesh(
    new THREE.CylinderGeometry(9.2, 6.2, 6.0, 12),
    termGlassMat,
  );
  atcCab.position.set(-920, 44.5, 1390);
  const atcRoof = new THREE.Mesh(new THREE.CylinderGeometry(10.0, 9.5, 1.2, 12), termWallMat);
  atcRoof.position.set(-920, 48.0, 1390);
  const atcDeck = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.5, 16), sidewalkMat);
  atcDeck.position.set(-920, 44.0, 1390);
  scene.add(atcShaft, atcCab, atcRoof, atcDeck);
  roofDecks.push({ cx: -920, cz: 1390, halfW: 9.5, halfD: 9.5, y: 44.25, yaw: 0 });
  roofDecks.push({ cx: -920, cz: 1390, halfW: 10, halfD: 10, y: 48.6, yaw: 0 });
  circleColliders.push({ cx: -920, cz: 1390, r: 5.3, minY: 0, maxY: 42 });

  const radarDish = new THREE.Group();
  radarDish.position.set(-920, 50.2, 1390);
  const rMast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.0, 8), elevatorFrameMat);
  const rBar = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.1, 0.45), rwLightMat);
  rBar.position.y = 1.4;
  radarDish.add(rMast, rBar);
  scene.add(radarDish);

  createWorkingElevator(
    'elev_atc',
    'Riadiaca veža ATC',
    -912,
    1390,
    -Math.PI / 2,
    [0.12, 44.3],
    ['Prízemie Letiska', 'Vyhliadka Veže ATC (44m)'],
  );

  // 3 Giant Open Fly-In Hangars at Airport
  const hangarMat = new THREE.MeshStandardMaterial({
    map: textures.container,
    color: 0x3b4758,
    roughness: 0.65,
    envMapIntensity: 0.4,
  });
  [
    [-1120, 1460],
    [-1120, 1545],
    [-1040, 1210],
  ].forEach(([hx, hz]) => {
    const hRoof = new THREE.Mesh(new THREE.BoxGeometry(42, 1.4, 34), hangarMat);
    hRoof.position.set(hx, 13.5, hz);
    const hWallL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 13, 34), hangarMat);
    hWallL.position.set(hx - 20.3, 6.5, hz);
    const hWallR = hWallL.clone();
    hWallR.position.x = hx + 20.3;
    const hBack = new THREE.Mesh(new THREE.BoxGeometry(42, 13, 1.4), hangarMat);
    hBack.position.set(hx, 6.5, hz - 16.3);
    scene.add(hRoof, hWallL, hWallR, hBack);
    roofDecks.push({ cx: hx, cz: hz, halfW: 21, halfD: 17, y: 14.2, yaw: 0 });
    colliders.push({ cx: hx - 20.3, cz: hz, halfW: 0.8, halfD: 17, minY: 0, maxY: 13.5, yaw: 0 });
    colliders.push({ cx: hx + 20.3, cz: hz, halfW: 0.8, halfD: 17, minY: 0, maxY: 13.5, yaw: 0 });
    colliders.push({ cx: hx, cz: hz - 16.3, halfW: 21, halfD: 0.8, minY: 0, maxY: 13.5, yaw: 0 });
  });

  // Northern Airstrip (520, -1120)
  const northRunway = new THREE.Mesh(new THREE.PlaneGeometry(32, 340), runwayMat);
  northRunway.rotation.x = -Math.PI / 2;
  northRunway.rotation.z = Math.PI / 2;
  northRunway.position.set(520, 0.09, -1120);
  northRunway.receiveShadow = true;
  scene.add(northRunway);

  // Coastal Heliport Pad (740, 520)
  const heliPad = new THREE.Mesh(new THREE.CylinderGeometry(18, 19, 0.4, 24), sidewalkMat);
  heliPad.position.set(740, 0.2, 520);
  const heliRing = new THREE.Mesh(
    new THREE.RingGeometry(11, 13, 24),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide }),
  );
  heliRing.rotation.x = -Math.PI / 2;
  heliRing.position.set(740, 0.42, 520);
  scene.add(heliPad, heliRing);

  // 7. Sunset Pier & Industrial Port
  const pierWoodMat = new THREE.MeshStandardMaterial({
    map: textures.woodDeck,
    roughness: 0.85,
    envMapIntensity: 0.25,
  });
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(190, 0.6, 18), pierWoodMat);
  pierDeck.position.set(945, 0.75, 0);
  pierDeck.castShadow = true;
  pierDeck.receiveShadow = true;
  scene.add(pierDeck);
  roofDecks.push({ cx: 945, cz: 0, halfW: 95, halfD: 9, y: 1.05, yaw: 0 });

  const postMat = new THREE.MeshStandardMaterial({ color: 0x452b18, roughness: 0.9 });
  const postPos: Array<[number, number]> = [];
  for (let px = 860; px <= 1030; px += 18) {
    postPos.push([px, -8], [px, 8]);
  }
  const postInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.45, 3.6, 8), postMat, postPos.length);
  postPos.forEach(([px, pz], i) => {
    _tmpDummy.position.set(px, -0.5, pz);
    _tmpDummy.rotation.set(0, 0, 0);
    _tmpDummy.scale.set(1, 1, 1);
    _tmpDummy.updateMatrix();
    postInst.setMatrixAt(i, _tmpDummy.matrix);
  });
  postInst.instanceMatrix.needsUpdate = true;
  scene.add(postInst);

  const portPadGeo = new THREE.BoxGeometry(460, 0.24, 160);
  scaleBoxUvs(portPadGeo, 460, 0.24, 160, 28, 28);
  const portPad = new THREE.Mesh(portPadGeo, sidewalkMat);
  portPad.position.set(120, 0.04, 1040);
  portPad.receiveShadow = true;
  scene.add(portPad);

  const containerColors = [0xb91c1c, 0x0369a1, 0xb45309, 0x15803d];
  [
    [-120, 1020, 0],
    [32, 1022, 0.08],
    [120, 1110, 0],
    [220, 1060, -0.08],
    [350, 995, 0.05],
  ].forEach(([cx, cz, cyaw], idx) => {
    const cMat = new THREE.MeshStandardMaterial({
      color: containerColors[idx % containerColors.length],
      map: textures.container,
      roughness: 0.68,
      metalness: 0.25,
      envMapIntensity: 0.45,
    });
    const cont = new THREE.Mesh(new THREE.BoxGeometry(14, 4.2, 4.6), cMat);
    cont.position.set(cx, 2.2, cz);
    cont.rotation.y = cyaw;
    cont.castShadow = true;
    cont.receiveShadow = true;
    scene.add(cont);
    colliders.push({
      cx,
      cz,
      halfW: 7,
      halfD: 2.5,
      minY: 0,
      maxY: 4.3,
      yaw: cyaw,
    });
    roofDecks.push({ cx, cz, halfW: 7, halfD: 2.5, y: 4.3, yaw: cyaw });
    occupiedFootprints.push({ cx, cz, hw: 7.5, hd: 3.0, yaw: cyaw });
  });

  const craneMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.4, roughness: 0.55 });
  const craneLeg1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 32, 2.2), craneMat);
  craneLeg1.position.set(110, 16, 1130);
  const craneLeg2 = craneLeg1.clone();
  craneLeg2.position.set(134, 16, 1130);
  const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(42, 2.2, 3.2), craneMat);
  craneBoom.position.set(122, 32, 1130);
  scene.add(craneLeg1, craneLeg2, craneBoom);
  colliders.push({ cx: 110, cz: 1130, halfW: 1.2, halfD: 1.2, minY: 0, maxY: 32, yaw: 0 });
  colliders.push({ cx: 134, cz: 1130, halfW: 1.2, halfD: 1.2, minY: 0, maxY: 32, yaw: 0 });

  // 8. Solid Rooftop Skyline Buildings Helper (Calibrated PBR + Shared Facade Materials!)
  const facadeMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
  const getSharedFacadeMat = (facadeIdx: number, tint = 0xd8dee9): THREE.MeshStandardMaterial => {
    const fIdx = facadeIdx % textures.buildingWindows.length;
    const key = `${fIdx}_${tint}`;
    let mat = facadeMaterialCache.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color: tint,
        map: textures.buildingWindows[fIdx],
        bumpMap: textures.buildingBump,
        bumpScale: 0.18,
        emissive: 0xffd27d,
        emissiveMap: textures.buildingEmissives[fIdx],
        emissiveIntensity: 0.02,
        roughness: 0.86,
        metalness: 0.06,
        envMapIntensity: 0.2,
      });
      facadeMaterialCache.set(key, mat);
      buildingEmissiveMats.push(mat);
    }
    return mat;
  };
  const sharedRoofTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.35,
    envMapIntensity: 0.4,
  });
  const sharedDomeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 });
  const sharedSpireMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.6 });

  const addBuilding = (
    cx: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    facadeIdx: number,
    tint = 0xd8dee9,
  ) => {
    const mat = getSharedFacadeMat(facadeIdx, tint);

    const bGeo = new THREE.BoxGeometry(w, h, d);
    scaleBoxUvs(bGeo, w, h, d, 22, 26);
    const mesh = new THREE.Mesh(bGeo, mat);
    mesh.position.set(cx, h * 0.5, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const roofTrim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.8, 0.8, d + 0.8),
      sharedRoofTrimMat,
    );
    roofTrim.position.set(cx, h + 0.4, cz);
    scene.add(roofTrim);

    if (h >= 36) {
      const domeCap = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.min(w, d) * 0.18, Math.min(w, d) * 0.22, 1.6, 12),
        sharedDomeMat,
      );
      domeCap.position.set(cx, h + 1.5, cz);
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.3, 6.5, 8),
        sharedSpireMat,
      );
      spire.position.set(cx, h + 5.0, cz);
      scene.add(domeCap, spire);
    }

    colliders.push({
      cx,
      cz,
      halfW: w * 0.5,
      halfD: d * 0.5,
      minY: 0,
      maxY: h + 0.8,
      yaw: 0,
    });
    roofDecks.push({
      cx,
      cz,
      halfW: w * 0.5 + 0.4,
      halfD: d * 0.5 + 0.4,
      y: h + 0.8,
      yaw: 0,
    });
  };

  // Hero Landmark: Apex Trust Skyscraper Shaft behind Walk-In Lobby (-348, -348)
  addBuilding(-358, -358, 30, 30, 82, 0, 0xcbd5e1);
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.2,
  });
  neonMats.push(crownMat);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 20), crownMat);
  crown.position.set(-358, 84, -358);
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.9, 20, 8),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 }),
  );
  spire.position.set(-358, 95, -358);
  const apexSign = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 6),
    new THREE.MeshBasicMaterial({ map: textures.signTextures.apexTrust }),
  );
  apexSign.position.set(-358, 22, -342.8);
  scene.add(crown, spire, apexSign);
  roofDecks.push({ cx: -358, cz: -358, halfW: 16, halfD: 16, y: 82.8, yaw: 0 });

  // 9. ALL 14 GRAND WALK-IN BUILDINGS (30m–46m Footprints, Rich Furniture, Clothes Aisles, Cars, Elevators!)
  const tileFloorMat = new THREE.MeshStandardMaterial({
    map: textures.interiorFloor,
    roughness: 0.58,
    envMapIntensity: 0.35,
  });
  const marbleFloorMat = new THREE.MeshStandardMaterial({
    map: textures.marbleFloor,
    roughness: 0.36,
    envMapIntensity: 0.45,
  });
  const workshopFloorMat = new THREE.MeshStandardMaterial({
    map: textures.workshopFloor,
    roughness: 0.72,
    envMapIntensity: 0.3,
  });
  const rackMetalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.25,
    envMapIntensity: 0.65,
  });
  const counterMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.52,
    metalness: 0.2,
    envMapIntensity: 0.4,
  });
  const woodFurnitureMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.72,
    envMapIntensity: 0.28,
  });
  const sharedCeilingLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.32,
    roughness: 0.85,
  });

  SHOPS.forEach((shop) => {
    const isArmory = shop.category === 'armory';
    const isCustoms = shop.category === 'customs';
    const isDealership = shop.category === 'dealership';
    const isBank = shop.category === 'bank';
    const isClothing = shop.category === 'clothing';
    const isSafehouse = shop.category === 'safehouse';
    const isCafe = shop.category === 'cafe';
    const isClub = shop.category === 'club';
    const isPrecinct = shop.category === 'precinct';
    const hasTwoFloors = isClothing || isSafehouse || isDealership || isClub;

    const bw = isArmory || isDealership || isCustoms || isBank || isPrecinct ? 36 : 30;
    const bd = isArmory ? 44 : isDealership || isBank || isCustoms || isPrecinct || isClub ? 34 : 30;
    const bh = hasTwoFloors ? 12.2 : isCustoms || isDealership || isPrecinct ? 10.5 : 9.4;

    const centerX = shop.x - Math.sin(shop.yaw) * (bd * 0.5 + 1.5);
    const centerZ = shop.z - Math.cos(shop.yaw) * (bd * 0.5 + 1.5);
    occupiedFootprints.push({ cx: centerX, cz: centerZ, hw: bw * 0.5 + 1.5, hd: bd * 0.5 + 1.5, yaw: shop.yaw });
    shelterSpots.push({ x: centerX, z: centerZ });

    const interiorWallMat = new THREE.MeshStandardMaterial({
      color: isClub ? 0x1e1b2e : isCafe ? 0xd6cfc2 : 0x94a3b8,
      roughness: 0.78,
      metalness: 0.05,
      envMapIntensity: 0.25,
    });
    const facadeIdx = isBank || isClub || isDealership ? 0 : 1;
    const extMat = getSharedFacadeMat(facadeIdx, 0xd1d5db);

    const roofSlateMat = sharedRoofTrimMat;

    const sGroup = new THREE.Group();
    sGroup.position.set(centerX, 0, centerZ);
    sGroup.rotation.y = shop.yaw;

    // Ground Floor Slab
    const chosenFloorMat =
      isBank || isSafehouse || isDealership
        ? marbleFloorMat
        : isCustoms
          ? workshopFloorMat
          : tileFloorMat;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.5, bd - 0.5), chosenFloorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.155;
    floor.receiveShadow = true;
    sGroup.add(floor);

    // Solid Rooftop Ceiling
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.7, bd + 0.4), roofSlateMat);
    roof.position.y = bh;
    roof.castShadow = true;
    roof.receiveShadow = true;
    sGroup.add(roof);

    // Soft Warm Ceiling Light Strips
    [-bw * 0.26, bw * 0.26].forEach((lx) => {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.12, bd * 0.7),
        sharedCeilingLightMat,
      );
      strip.position.set(lx, bh - 0.4, 0);
      sGroup.add(strip);
    });

    // Interior Columns along sides (with colliders)
    [-bw * 0.36, bw * 0.36].forEach((px) => {
      [-bd * 0.24, bd * 0.24].forEach((pz) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.9, bh, 0.9), counterMat);
        col.position.set(px, bh * 0.5, pz);
        sGroup.add(col);
        addLocalCollider(centerX, centerZ, shop.yaw, px, pz, 0.95, 0.95, 0, bh);
      });
    });

    // Walls & Open Entrance Doorway
    const wallT = 0.75;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, wallT), interiorWallMat);
    backWall.position.set(0, bh * 0.5, -bd * 0.5);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, bh, bd), interiorWallMat);
    leftWall.position.set(-bw * 0.5, bh * 0.5, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, bh, bd), interiorWallMat);
    rightWall.position.set(bw * 0.5, bh * 0.5, 0);

    const doorGap = isCustoms ? 13.0 : isDealership ? 10.0 : 7.4;
    const doorHeight = isCustoms ? 5.8 : 4.8;
    const frontWingW = (bw - doorGap) * 0.5;
    const fLGeo = new THREE.BoxGeometry(frontWingW, bh, wallT);
    scaleBoxUvs(fLGeo, frontWingW, bh, wallT, 14, 12);
    const frontL = new THREE.Mesh(fLGeo, extMat);
    frontL.position.set(-bw * 0.5 + frontWingW * 0.5, bh * 0.5, bd * 0.5);
    const frontR = new THREE.Mesh(fLGeo, extMat);
    frontR.position.set(bw * 0.5 - frontWingW * 0.5, bh * 0.5, bd * 0.5);
    const lintelGeo = new THREE.BoxGeometry(doorGap, bh - doorHeight, wallT);
    scaleBoxUvs(lintelGeo, doorGap, bh - doorHeight, wallT, 14, 12);
    const lintel = new THREE.Mesh(lintelGeo, extMat);
    lintel.position.set(0, doorHeight + (bh - doorHeight) * 0.5, bd * 0.5);
    sGroup.add(backWall, leftWall, rightWall, frontL, frontR, lintel);

    addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5, bw, wallT, 0, bh);
    addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5, 0, wallT, bd, 0, bh);
    addLocalCollider(centerX, centerZ, shop.yaw, bw * 0.5, 0, wallT, bd, 0, bh);
    addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + frontWingW * 0.5, bd * 0.5, frontWingW, wallT, 0, bh);
    addLocalCollider(centerX, centerZ, shop.yaw, bw * 0.5 - frontWingW * 0.5, bd * 0.5, frontWingW, wallT, 0, bh);

    // Neon Roof Accent + Signboard
    const neonBarMat = new THREE.MeshStandardMaterial({
      color: shop.accentHex,
      emissive: shop.accentHex,
      emissiveIntensity: 1.2,
    });
    neonMats.push(neonBarMat);
    const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.42, bd + 0.5), neonBarMat);
    neonTrim.position.y = bh + 0.45;
    sGroup.add(neonTrim);

    const signTex = textures.signTextures[shop.id];
    if (signTex) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(bw * 0.72, 3.2),
        new THREE.MeshBasicMaterial({ map: signTex }),
      );
      sign.position.set(0, bh - 2.0, bd * 0.5 + 0.46);
      sGroup.add(sign);
    }

    // --- Walk-In Rich Multi-Aisle Interiors & Elevators per Category ---
    if (isClothing) {
      // 8 Hanging Clothes Racks + Display Mannequins + Fitting Booths + Shoe Wall + Checkout + VIP 2nd Floor!
      const shirtPalette = [0x06b6d4, 0xf43f5e, 0xfacc15, 0x10b981, 0x8b5cf6, 0xe2e8f0, 0xf97316];
      const rackCols = [-8.5, -3.2, 3.2, 8.5];
      const rackRows = [-5.5, 3.0];
      rackCols.forEach((rx, ci) => {
        rackRows.forEach((rz, ri) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.08), rackMetalMat);
          bar.position.set(rx, 1.65, rz);
          const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.65, 0.55), rackMetalMat);
          legL.position.set(rx - 1.8, 0.82, rz);
          const legR = legL.clone();
          legR.position.x = rx + 1.8;
          sGroup.add(bar, legL, legR);
          for (let c = 0; c < 6; c++) {
            const item = new THREE.Mesh(
              new THREE.BoxGeometry(0.42, 0.92, 0.28),
              new THREE.MeshStandardMaterial({
                color: shirtPalette[(ci + ri + c) % shirtPalette.length],
                roughness: 0.72,
              }),
            );
            item.position.set(rx - 1.35 + c * 0.54, 1.18, rz);
            sGroup.add(item);
          }
          addLocalCollider(centerX, centerZ, shop.yaw, rx, rz, 3.7, 0.6, 0, 2.0);
        });
      });

      // 4 Fashion Display Mannequins on Pedestals near Front
      [-6.5, 6.5].forEach((mx, mIdx) => {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.35, 18), counterMat);
        ped.position.set(mx, 0.18, 9.2);
        const torso = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.24, 0.65, 6, 10),
          new THREE.MeshStandardMaterial({ color: mIdx === 0 ? 0xf472b6 : 0x38bdf8, roughness: 0.45 }),
        );
        torso.position.set(mx, 1.25, 9.2);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), rackMetalMat);
        head.position.set(mx, 1.86, 9.2);
        sGroup.add(ped, torso, head);
        addLocalCircleCollider(centerX, centerZ, shop.yaw, mx, 9.2, 0.85, 0, 2.2);
      });

      // Fitting Rooms along Left Wall
      [-8, -4.5, -1].forEach((fz) => {
        const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 0.18), woodFurnitureMat);
        booth.position.set(-bw * 0.5 + 1.4, 1.2, fz);
        sGroup.add(booth);
        addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + 1.4, fz, 2.6, 0.25, 0, 2.4);
      });

      // Shoe & Accessory Shelf on Right Wall + Checkout Desk + Cash Register
      const shoeShelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 9.0), woodFurnitureMat);
      shoeShelf.position.set(bw * 0.5 - 0.75, 1.2, 2.0);
      sGroup.add(shoeShelf);
      addLocalCollider(centerX, centerZ, shop.yaw, bw * 0.5 - 0.75, 2.0, 0.8, 9.0, 0, 2.5);

      const counter = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.15, 1.4), counterMat);
      counter.position.set(0, 0.57, -bd * 0.5 + 3.0);
      const reg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.55), rackMetalMat);
      reg.position.set(-1.5, 1.35, -bd * 0.5 + 3.0);
      sGroup.add(counter, reg);
      addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5 + 3.0, 8.6, 1.5, 0, 1.8);

      // 2nd Floor VIP Mezzanine with Sofa, Table, Mirror & Glass Railing
      const mezz = new THREE.Mesh(new THREE.BoxGeometry(bw - 1.2, 0.45, bd * 0.52), tileFloorMat);
      mezz.position.set(0, 6.2, -bd * 0.22);
      const vipSofa = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.65, 3.2, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
      );
      vipSofa.rotation.z = Math.PI / 2;
      vipSofa.position.set(-4.5, 6.9, -bd * 0.26);
      const vipTable = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 16), woodFurnitureMat);
      vipTable.position.set(-4.5, 6.68, -bd * 0.14);
      const mezzRail = new THREE.Mesh(new THREE.BoxGeometry(bw - 4.8, 1.0, 0.14), rackMetalMat);
      mezzRail.position.set(-1.8, 6.9, -bd * 0.22 + bd * 0.26 - 0.2);
      sGroup.add(mezz, vipSofa, vipTable, mezzRail);
      addLocalCollider(centerX, centerZ, shop.yaw, -1.8, -bd * 0.22 + bd * 0.26 - 0.2, bw - 4.8, 0.3, 6.2, 8.0);
      addLocalCollider(centerX, centerZ, shop.yaw, -4.5, -bd * 0.26, 4.2, 1.3, 6.2, 8.0);

      const [mwx, mwz] = localToWorld(centerX, centerZ, shop.yaw, 0, -bd * 0.22);
      roofDecks.push({ cx: mwx, cz: mwz, halfW: bw * 0.5 - 0.6, halfD: bd * 0.26, y: 6.45, yaw: shop.yaw });

      const [elx, elz] = localToWorld(centerX, centerZ, shop.yaw, bw * 0.5 - 3.2, -bd * 0.5 + 3.2);
      createWorkingElevator(
        `elev_${shop.id}`,
        `${shop.name} · Výťah`,
        elx,
        elz,
        shop.yaw,
        [0.12, 6.45, bh + 0.35],
        ['Prízemie · Regály', '2. Poschodie · VIP Móda', 'Strešná Terasa'],
      );
    } else if (isArmory) {
      // Glass Weapon Display Counters + Wall Gun Racks + Ammo Crates + 5-Lane Acoustic Shooting Range!
      const glassTopMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, roughness: 0.18 });
      const counter = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.1, 1.5), counterMat);
      counter.position.set(-7.5, 0.55, 8.5);
      const glassCase = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.38, 1.3), glassTopMat);
      glassCase.position.set(-7.5, 1.28, 8.5);
      // Prop weapons & armor inside display
      [-10.2, -7.5, -4.8].forEach((gx) => {
        const gunProp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.22), rackMetalMat);
        gunProp.position.set(gx, 1.2, 8.5);
        sGroup.add(gunProp);
      });
      sGroup.add(counter, glassCase);
      addLocalCollider(centerX, centerZ, shop.yaw, -7.5, 8.5, 10.1, 1.6, 0, 1.8);

      const wallRack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.4, 14), woodFurnitureMat);
      wallRack.position.set(-bw * 0.5 + 0.7, 1.9, 6.0);
      const ammoCrate = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.0, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.78 }),
      );
      ammoCrate.position.set(-bw * 0.5 + 2.2, 0.5, -4.0);
      sGroup.add(wallRack, ammoCrate);
      addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + 0.7, 6.0, 0.7, 14, 0, 3.5);
      addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + 2.2, -4.0, 2.3, 1.5, 0, 1.2);

      const laneDesk = new THREE.Mesh(new THREE.BoxGeometry(20.0, 1.08, 1.0), counterMat);
      laneDesk.position.set(3.5, 0.54, -2.5);
      sGroup.add(laneDesk);
      addLocalCollider(centerX, centerZ, shop.yaw, 3.5, -2.5, 20.0, 1.1, 0, 1.6);

      // 5 Shooting Range Lane Dividers
      [-7.5, -3.5, 0.5, 4.5, 8.5, 12.5].forEach((dx) => {
        const div = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 2.6), counterMat);
        div.position.set(dx, 1.3, -3.4);
        sGroup.add(div);
      });

      const targetMat = new THREE.MeshBasicMaterial({ map: textures.bullseyeTarget, side: THREE.DoubleSide });
      const cosY = Math.cos(shop.yaw);
      const sinY = Math.sin(shop.yaw);
      [-5.5, -1.5, 2.5, 6.5, 10.5].forEach((tx, idx) => {
        const localZ = -bd * 0.5 + 2.8;
        const targetMesh = new THREE.Mesh(new THREE.CircleGeometry(0.95, 18), targetMat.clone());
        targetMesh.position.set(tx, 2.05, localZ);
        sGroup.add(targetMesh);

        const wx = centerX + tx * cosY + localZ * sinY;
        const wz = centerZ - tx * sinY + localZ * cosY;
        rangeTargets.push({
          mesh: targetMesh,
          baseX: wx,
          baseY: 2.05,
          baseZ: wz,
          phase: idx * 1.25,
          hitFlash: 0,
        });
      });
    } else if (shop.category === 'convenience') {
      // Grand Supermarket: 4 Stocked Aisles + Glowing Beverage Coolers + Checkout Conveyor + Coffee Bar & ATM
      const itemCols = [0xef4444, 0x22d3ee, 0xfacc15, 0x22c55e, 0xf97316];
      [-8.5, -3.2, 3.2, 8.5].forEach((ax, aIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 12.0), counterMat);
        shelf.position.set(ax, 1.1, 0.8);
        sGroup.add(shelf);
        for (let b = 0; b < 5; b++) {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.42, 1.8),
            new THREE.MeshStandardMaterial({ color: itemCols[(aIdx + b) % itemCols.length], roughness: 0.6 }),
          );
          box.position.set(ax, 1.5, -4.0 + b * 2.3);
          const bottleRow = new THREE.Mesh(
            new THREE.BoxGeometry(1.52, 0.35, 1.4),
            new THREE.MeshStandardMaterial({ color: itemCols[(aIdx + b + 2) % itemCols.length], roughness: 0.5 }),
          );
          bottleRow.position.set(ax, 0.78, -4.0 + b * 2.3);
          sGroup.add(box, bottleRow);
        }
        addLocalCollider(centerX, centerZ, shop.yaw, ax, 0.8, 1.6, 12.2, 0, 2.5);
      });

      // Glowing Glass-Door Wall Beverage Coolers along Left Wall
      const coolerMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.55,
        roughness: 0.25,
      });
      [-5, 0, 5].forEach((cz) => {
        const cooler = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 4.2), coolerMat);
        cooler.position.set(-bw * 0.5 + 0.9, 1.4, cz);
        sGroup.add(cooler);
        addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + 0.9, cz, 1.3, 4.3, 0, 2.9);
      });

      // Checkout Counter + Register + Coffee Machine + ATM
      const desk = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.1, 1.5), counterMat);
      desk.position.set(0, 0.55, -bd * 0.5 + 3.2);
      const reg = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.55), rackMetalMat);
      reg.position.set(-2.5, 1.32, -bd * 0.5 + 3.2);
      const coffeeBar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 1.2), woodFurnitureMat);
      coffeeBar.position.set(bw * 0.5 - 2.4, 0.55, -bd * 0.5 + 3.2);
      sGroup.add(desk, reg, coffeeBar);
      addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5 + 3.2, 10.1, 1.6, 0, 1.8);
      addLocalCollider(centerX, centerZ, shop.yaw, bw * 0.5 - 2.4, -bd * 0.5 + 3.2, 3.3, 1.3, 0, 1.8);
    } else if (isCustoms) {
      // Drive-In Apex Customs Garage: Lift Posts (Colliders) + Tire Stacks + Engine Hoist + Oil Drums + Workbench!
      [-5.6, 5.6].forEach((px) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.65, 4.4, 0.65), railMat);
        post.position.set(px, 2.2, -1.5);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.26), rackMetalMat);
        arm.position.set(px > 0 ? px - 0.9 : px + 0.9, 0.25, -1.5);
        sGroup.add(post, arm);
        addLocalCollider(centerX, centerZ, shop.yaw, px, -1.5, 0.85, 0.85, 0, 4.4);
      });
      const bench = new THREE.Mesh(new THREE.BoxGeometry(18, 1.1, 1.6), counterMat);
      bench.position.set(0, 0.55, -bd * 0.5 + 2.2);
      const toolCabinet = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 2.2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 }),
      );
      toolCabinet.position.set(-12, 1.1, -bd * 0.5 + 2.2);
      const comp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 1.6, 12),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }),
      );
      comp.rotation.z = Math.PI / 2;
      comp.position.set(11.5, 0.65, -bd * 0.5 + 2.2);
      sGroup.add(bench, toolCabinet, comp);
      addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5 + 2.2, 18.2, 1.7, 0, 1.8);
      addLocalCollider(centerX, centerZ, shop.yaw, -12, -bd * 0.5 + 2.2, 4.3, 1.3, 0, 2.3);

      // Tire Stacks & Oil Drums along Left/Right Bays (keeping center lane wide open for driving!)
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
      const drumMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45, metalness: 0.35 });
      [-6, 1, 8].forEach((tz) => {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 16), tireMat);
        tire.position.set(-bw * 0.5 + 1.8, 0.55, tz);
        sGroup.add(tire);
        addLocalCircleCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + 1.8, tz, 0.65, 0, 1.2);
      });
      [-4, 3].forEach((dz) => {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.25, 14), drumMat);
        drum.position.set(bw * 0.5 - 1.8, 0.62, dz);
        sGroup.add(drum);
        addLocalCircleCollider(centerX, centerZ, shop.yaw, bw * 0.5 - 1.8, dz, 0.55, 0, 1.4);
      });

      customsBays.push({
        shopId: shop.id,
        cx: centerX,
        cz: centerZ,
        halfW: bw * 0.48,
        halfD: bd * 0.55,
        yaw: shop.yaw,
      });
    } else if (isDealership) {
      // Grand Dealership Showroom: 3 Display Cars on Turntables (with Colliders) + Sales Desks + Lounge + 2nd Floor VIP Balcony!
      [-8.5, 0, 8.5].forEach((px, idx) => {
        const podium = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 0.28, 32), counterMat);
        podium.position.set(px, 0.14, 1.5);
        const ring = new THREE.Mesh(new THREE.RingGeometry(3.7, 3.95, 32), neonBarMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(px, 0.29, 1.5);

        const displayGroup = new THREE.Group();
        displayGroup.position.set(px, 0.28, 1.5);
        const carPaintMat = new THREE.MeshPhysicalMaterial({
          color: idx === 0 ? 0xc81e4b : idx === 1 ? 0x0284c7 : 0xeab308,
          clearcoat: 0.4,
          clearcoatRoughness: 0.25,
          metalness: 0.38,
          roughness: 0.32,
          envMapIntensity: 0.45,
        });
        const carShell = new THREE.Mesh(new THREE.CapsuleGeometry(0.88, 2.5, 8, 16), carPaintMat);
        carShell.rotation.x = Math.PI / 2;
        carShell.scale.set(1.12, 1.0, 0.52);
        carShell.position.y = 0.56;
        const carCanopy = new THREE.Mesh(
          new THREE.SphereGeometry(0.86, 16, 12),
          new THREE.MeshPhysicalMaterial({
            color: 0x0f172a,
            roughness: 0.24,
            metalness: 0.16,
            clearcoat: 0.3,
            envMapIntensity: 0.4,
          }),
        );
        carCanopy.scale.set(0.95, 0.48, 1.38);
        carCanopy.position.set(0, 0.92, -0.1);
        const displayWheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18);
        displayWheelGeo.rotateZ(Math.PI / 2);
        const displayWheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.78 });
        [
          [-0.9, 0.34, 1.25],
          [0.9, 0.34, 1.25],
          [-0.9, 0.34, -1.25],
          [0.9, 0.34, -1.25],
        ].forEach(([wx, wy, wz]) => {
          const wMesh = new THREE.Mesh(displayWheelGeo, displayWheelMat);
          wMesh.position.set(wx, wy, wz);
          displayGroup.add(wMesh);
        });
        displayGroup.add(carShell, carCanopy);
        sGroup.add(podium, ring, displayGroup);
        addLocalCircleCollider(centerX, centerZ, shop.yaw, px, 1.5, 3.85, 0, 2.4);
      });

      const desk = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.1, 1.5), counterMat);
      desk.position.set(-3, 0.55, -bd * 0.5 + 3.4);
      const loungeSofa = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.6, 3.4, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
      );
      loungeSofa.rotation.z = Math.PI / 2;
      loungeSofa.position.set(-10.5, 0.55, -bd * 0.5 + 6.5);
      sGroup.add(desk, loungeSofa);
      addLocalCollider(centerX, centerZ, shop.yaw, -3, -bd * 0.5 + 3.4, 9.6, 1.6, 0, 1.8);
      addLocalCollider(centerX, centerZ, shop.yaw, -10.5, -bd * 0.5 + 6.5, 4.4, 1.3, 0, 1.4);

      // 2nd Floor VIP Balcony inside Dealership
      const vipMezz = new THREE.Mesh(new THREE.BoxGeometry(bw - 1.4, 0.45, bd * 0.42), marbleFloorMat);
      vipMezz.position.set(0, 6.2, -bd * 0.27);
      const vipRail = new THREE.Mesh(new THREE.BoxGeometry(bw - 5.2, 1.0, 0.14), rackMetalMat);
      vipRail.position.set(-2.0, 6.9, -bd * 0.27 + bd * 0.21 - 0.15);
      sGroup.add(vipMezz, vipRail);
      addLocalCollider(centerX, centerZ, shop.yaw, -2.0, -bd * 0.27 + bd * 0.21 - 0.15, bw - 5.2, 0.3, 6.2, 8.0);
      const [mwx, mwz] = localToWorld(centerX, centerZ, shop.yaw, 0, -bd * 0.27);
      roofDecks.push({ cx: mwx, cz: mwz, halfW: bw * 0.5 - 0.7, halfD: bd * 0.21, y: 6.45, yaw: shop.yaw });

      const [elx, elz] = localToWorld(centerX, centerZ, shop.yaw, bw * 0.5 - 3.4, -bd * 0.5 + 3.4);
      createWorkingElevator(
        `elev_${shop.id}`,
        'Sunstate Motors · Výťah na Heliport',
        elx,
        elz,
        shop.yaw,
        [0.12, 6.45, bh + 0.35],
        ['Autosalón Prízemie', 'VIP Galéria (2. posch.)', 'Strešný Heliport'],
      );
    } else if (isBank) {
      // Apex Trust Grand Marble Lobby: Teller Windows + Stanchions + Benches + Vault + Gold Alcove + Furnished 38m Exec Floor & 83m Skybridge!
      const desk = new THREE.Mesh(new THREE.BoxGeometry(14, 1.25, 1.6), counterMat);
      desk.position.set(-1.5, 0.62, -bd * 0.5 + 4.5);
      const glassShield = new THREE.Mesh(
        new THREE.BoxGeometry(13.6, 1.15, 0.12),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, roughness: 0.15 }),
      );
      glassShield.position.set(-1.5, 1.85, -bd * 0.5 + 4.2);
      const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.7, 20), rackMetalMat);
      vaultDoor.rotation.x = Math.PI / 2;
      vaultDoor.position.set(-10.5, 2.8, -bd * 0.5 + 0.7);
      const goldStack = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.85, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.22 }),
      );
      goldStack.position.set(-10.5, 0.45, -bd * 0.5 + 2.2);
      const waitBenchL = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.6, 1.1), woodFurnitureMat);
      waitBenchL.position.set(-10.5, 0.32, 6.5);
      const waitBenchR = waitBenchL.clone();
      waitBenchR.position.set(10.5, 0.32, 6.5);
      sGroup.add(desk, glassShield, vaultDoor, goldStack, waitBenchL, waitBenchR);
      addLocalCollider(centerX, centerZ, shop.yaw, -1.5, -bd * 0.5 + 4.5, 14.1, 1.7, 0, 2.6);
      addLocalCollider(centerX, centerZ, shop.yaw, -10.5, -bd * 0.5 + 2.2, 2.6, 1.6, 0, 1.6);
      addLocalCollider(centerX, centerZ, shop.yaw, -10.5, 6.5, 4.9, 1.2, 0, 1.2);
      addLocalCollider(centerX, centerZ, shop.yaw, 10.5, 6.5, 4.9, 1.2, 0, 1.2);

      const [elx, elz] = localToWorld(centerX, centerZ, shop.yaw, bw * 0.5 - 3.5, -bd * 0.5 + 3.5);
      createWorkingElevator(
        'elev_apex_trust',
        'Apex Trust Tower · Expresný Výťah',
        elx,
        elz,
        shop.yaw,
        [0.12, 38.0, 82.8],
        ['Mramorové Lobby', 'Manažérske Poschodie (38m)', 'Strecha Mrakodrapu (83m)'],
      );

      // Furnished 38m Management Executive Lounge Deck + Safety Glass Railings!
      const execGroup = new THREE.Group();
      execGroup.position.set(elx, 38.0, elz);
      const execDeckMesh = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 22), marbleFloorMat);
      execDeckMesh.position.y = -0.3;
      execDeckMesh.receiveShadow = true;
      execGroup.add(execDeckMesh);

      const railGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28, roughness: 0.15 });
      const execRailPositions: Array<[number, number, number, number]> = [
        [0, 10.9, 22, 0.22],
        [0, -10.9, 22, 0.22],
        [-10.9, 0, 0.22, 22],
        [10.9, 0, 0.22, 22],
      ];
      execRailPositions.forEach(([rx, rz, rw, rd]) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.15, rd), railGlassMat);
        rail.position.set(rx, 0.58, rz);
        execGroup.add(rail);
        colliders.push({ cx: elx + rx, cz: elz + rz, halfW: rw * 0.5, halfD: rd * 0.5, minY: 37.8, maxY: 39.5, yaw: 0 });
      });

      // Executive Conference Table + 6 Chairs + CEO Desk + Lounge Sofa
      const confTable = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.9, 2.4), woodFurnitureMat);
      confTable.position.set(-4.5, 0.45, -3.5);
      execGroup.add(confTable);
      colliders.push({ cx: elx - 4.5, cz: elz - 3.5, halfW: 3.5, halfD: 1.3, minY: 37.8, maxY: 39.5, yaw: 0 });
      [-6.5, -4.5, -2.5].forEach((cx) => {
        [-5.2, -1.8].forEach((cz) => {
          const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.35, 0.85, 12), counterMat);
          ch.position.set(cx, 0.42, cz);
          execGroup.add(ch);
        });
      });
      const ceoDesk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 1.6), counterMat);
      ceoDesk.position.set(-5.0, 0.45, 5.5);
      const ceoMon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.12), rackMetalMat);
      ceoMon.position.set(-5.0, 1.25, 5.3);
      const execSofa = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.6, 3.6, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 }),
      );
      execSofa.rotation.z = Math.PI / 2;
      execSofa.position.set(5.5, 0.5, 5.8);
      execGroup.add(ceoDesk, ceoMon, execSofa);
      colliders.push({ cx: elx - 5.0, cz: elz + 5.5, halfW: 2.2, halfD: 0.9, minY: 37.8, maxY: 39.5, yaw: 0 });
      colliders.push({ cx: elx + 5.5, cz: elz + 5.8, halfW: 2.4, halfD: 0.8, minY: 37.8, maxY: 39.5, yaw: 0 });
      scene.add(execGroup);
      roofDecks.push({ cx: elx, cz: elz, halfW: 11, halfD: 11, y: 38.0, yaw: 0 });

      // 82.8m Rooftop Skydeck at Elevator Top + Skybridge Connecting Directly to Apex Trust Tower Roof (-358, -358)!
      const topPad = new THREE.Mesh(new THREE.BoxGeometry(14, 0.7, 14), sidewalkMat);
      topPad.position.set(elx, 82.45, elz);
      scene.add(topPad);
      roofDecks.push({ cx: elx, cz: elz, halfW: 7, halfD: 7, y: 82.8, yaw: 0 });

      const sbDx = -358 - elx;
      const sbDz = -358 - elz;
      const sbLen = Math.hypot(sbDx, sbDz);
      const sbYaw = Math.atan2(sbDx, sbDz);
      const sbMesh = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.6, sbLen), sidewalkMat);
      sbMesh.position.set((elx - 358) * 0.5, 82.5, (elz - 358) * 0.5);
      sbMesh.rotation.y = sbYaw;
      scene.add(sbMesh);
      roofDecks.push({
        cx: (elx - 358) * 0.5,
        cz: (elz - 358) * 0.5,
        halfW: 3.4,
        halfD: sbLen * 0.5,
        y: 82.8,
        yaw: sbYaw,
      });
    } else if (isSafehouse) {
      // Furnished Multi-Room Safehouse Lounge: Sofa + Table + Flatscreen TV + Bed + Wardrobe + Bar + 2nd Floor Pool Table!
      const sofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
      const sofaBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 4.0, 6, 12), sofaMat);
      sofaBase.rotation.z = Math.PI / 2;
      sofaBase.scale.set(0.62, 1.0, 1.05);
      sofaBase.position.set(-5.5, 0.45, 1.5);
      const sofaBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 4.2, 6, 12), sofaMat);
      sofaBack.rotation.z = Math.PI / 2;
      sofaBack.position.set(-5.5, 0.92, 0.65);
      addLocalCollider(centerX, centerZ, shop.yaw, -5.5, 1.3, 5.2, 1.5, 0, 1.4);

      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 24), woodFurnitureMat);
      tableTop.position.set(-5.5, 0.52, 4.2);
      const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.45, 0.5, 16), rackMetalMat);
      tableLeg.position.set(-5.5, 0.25, 4.2);
      addLocalCircleCollider(centerX, centerZ, shop.yaw, -5.5, 4.2, 1.55, 0, 1.0);

      // Flatscreen TV Console facing Sofa
      const tvStand = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.75, 0.8), woodFurnitureMat);
      tvStand.position.set(-5.5, 0.38, 7.2);
      const tvScreen = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.7, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.35 }),
      );
      tvScreen.position.set(-5.5, 1.7, 7.2);
      addLocalCollider(centerX, centerZ, shop.yaw, -5.5, 7.2, 4.3, 0.9, 0, 2.5);

      const bed = new THREE.Mesh(
        new THREE.CapsuleGeometry(1.85, 1.4, 6, 14),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 }),
      );
      bed.rotation.x = Math.PI / 2;
      bed.scale.set(1.05, 1.0, 0.45);
      bed.position.set(6.5, 0.44, -5.5);
      addLocalCollider(centerX, centerZ, shop.yaw, 6.5, -5.5, 3.8, 2.8, 0, 1.2);

      const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 1.0), woodFurnitureMat);
      wardrobe.position.set(10.5, 1.4, 2.0);
      addLocalCollider(centerX, centerZ, shop.yaw, 10.5, 2.0, 3.7, 1.1, 0, 2.8);

      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 4.8, 6, 12), counterMat);
      bar.rotation.z = Math.PI / 2;
      bar.scale.set(0.9, 1.0, 0.9);
      bar.position.set(0, 0.58, -bd * 0.5 + 3.2);
      addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5 + 3.2, 6.0, 1.2, 0, 1.4);
      [-1.8, 0, 1.8].forEach((bx) => {
        const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.35, 0.14, 16), sofaMat);
        stoolSeat.position.set(bx, 0.82, -bd * 0.5 + 4.4);
        const stoolStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 0.78, 12), rackMetalMat);
        stoolStem.position.set(bx, 0.39, -bd * 0.5 + 4.4);
        sGroup.add(stoolSeat, stoolStem);
      });
      sGroup.add(sofaBase, sofaBack, tableTop, tableLeg, tvStand, tvScreen, bed, wardrobe, bar);

      // 2nd Floor Gallery with Pool/Billiard Table & Safety Railing!
      const mezz = new THREE.Mesh(new THREE.BoxGeometry(bw - 1.2, 0.45, bd * 0.48), marbleFloorMat);
      mezz.position.set(0, 6.2, -bd * 0.24);
      const poolBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.82, 2.2), woodFurnitureMat);
      poolBase.position.set(-4.0, 6.82, -bd * 0.24);
      const poolFelt = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.08, 1.85),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 }),
      );
      poolFelt.position.set(-4.0, 7.26, -bd * 0.24);
      const mezzRail = new THREE.Mesh(new THREE.BoxGeometry(bw - 4.8, 1.0, 0.14), rackMetalMat);
      mezzRail.position.set(-1.8, 6.9, -bd * 0.24 + bd * 0.24 - 0.2);
      sGroup.add(mezz, poolBase, poolFelt, mezzRail);
      addLocalCollider(centerX, centerZ, shop.yaw, -4.0, -bd * 0.24, 3.9, 2.3, 6.2, 8.0);
      addLocalCollider(centerX, centerZ, shop.yaw, -1.8, -bd * 0.24 + bd * 0.24 - 0.2, bw - 4.8, 0.3, 6.2, 8.0);
      const [mwx, mwz] = localToWorld(centerX, centerZ, shop.yaw, 0, -bd * 0.24);
      roofDecks.push({ cx: mwx, cz: mwz, halfW: bw * 0.5 - 0.6, halfD: bd * 0.24, y: 6.45, yaw: shop.yaw });

      const [elx, elz] = localToWorld(centerX, centerZ, shop.yaw, bw * 0.5 - 3.2, -bd * 0.5 + 3.2);
      createWorkingElevator(
        `elev_${shop.id}`,
        `${shop.name} · Výťah`,
        elx,
        elz,
        shop.yaw,
        [0.12, 6.45, bh + 0.35],
        ['Prízemie · Obývačka', '2. Poschodie · Galéria', 'Strešná Terasa'],
      );

      if (shop.id === 'pulse_studio_loft') {
        // Kairo's DJ & Hacker Equipment inside Pulse Studio Loft!
        const djDeck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.05, 1.3), counterMat);
        djDeck.position.set(2.5, 0.52, -bd * 0.5 + 7.2);
        const turntableL = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 16), rackMetalMat);
        turntableL.position.set(1.5, 1.09, -bd * 0.5 + 7.2);
        const turntableR = turntableL.clone();
        turntableR.position.x = 3.5;
        const mixerGlow = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.08, 0.65),
          new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 1.4 }),
        );
        mixerGlow.position.set(2.5, 1.09, -bd * 0.5 + 7.2);
        addLocalCollider(centerX, centerZ, shop.yaw, 2.5, -bd * 0.5 + 7.2, 4.4, 1.3, 0, 1.4);

        const hackerDesk = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.86, 1.4), counterMat);
        hackerDesk.position.set(-10.5, 0.43, -bd * 0.5 + 3.8);
        const monMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9 });
        [-11.4, -10.5, -9.6].forEach((mx) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.52, 0.08), monMat);
          m.position.set(mx, 1.2, -bd * 0.5 + 3.3);
          sGroup.add(m);
        });
        const serverRack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 1.1), counterMat);
        serverRack.position.set(-12.8, 1.3, -bd * 0.5 + 8.5);
        addLocalCollider(centerX, centerZ, shop.yaw, -10.5, -bd * 0.5 + 3.8, 3.8, 1.4, 0, 1.6);
        addLocalCollider(centerX, centerZ, shop.yaw, -12.8, -bd * 0.5 + 8.5, 1.1, 1.1, 0, 2.7);
        sGroup.add(djDeck, turntableL, turntableR, mixerGlow, hackerDesk, serverRack);
      }
    } else if (isCafe) {
      // Cozy Specialty Coffee Roastery & Bistro Interior: Espresso Bar, Pastry Vitrine & Café Tables!
      const bar = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.12, 1.6), woodFurnitureMat);
      bar.position.set(0, 0.56, -bd * 0.5 + 3.6);
      const espressoMach = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 0.9), rackMetalMat);
      espressoMach.position.set(-2.2, 1.44, -bd * 0.5 + 3.5);
      const pastryCase = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.68, 1.1),
        new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.4, roughness: 0.15 }),
      );
      pastryCase.position.set(2.5, 1.46, -bd * 0.5 + 3.7);
      sGroup.add(bar, espressoMach, pastryCase);
      addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5 + 3.6, 10.5, 1.6, 0, 1.9);

      const chairMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.68 });
      [
        [-8.0, 2.5],
        [8.0, 2.5],
        [-8.0, 8.5],
        [8.0, 8.5],
      ].forEach(([tx, tz]) => {
        const tTop = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.1, 20), woodFurnitureMat);
        tTop.position.set(tx, 0.82, tz);
        const tStem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 0.8, 14), counterMat);
        tStem.position.set(tx, 0.4, tz);
        const cL = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.55, 12), chairMat);
        cL.position.set(tx - 1.35, 0.28, tz);
        const cR = cL.clone();
        cR.position.x = tx + 1.35;
        sGroup.add(tTop, tStem, cL, cR);
        addLocalCircleCollider(centerX, centerZ, shop.yaw, tx, tz, 1.1, 0, 1.2);
      });
    } else if (isPrecinct) {
      // Palmetto Bay Police Department Precinct: Reception Counter, Holding Cell, Evidence Wall & Briefing Room!
      const desk = new THREE.Mesh(new THREE.BoxGeometry(12.0, 1.2, 1.6), counterMat);
      desk.position.set(-2.5, 0.6, 5.5);
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(11.6, 1.1, 0.12),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.15 }),
      );
      shield.position.set(-2.5, 1.75, 5.3);
      sGroup.add(desk, shield);
      addLocalCollider(centerX, centerZ, shop.yaw, -2.5, 5.5, 12.0, 1.6, 0, 2.4);

      const briefTable = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.9, 3.0), woodFurnitureMat);
      briefTable.position.set(-6.0, 0.45, -bd * 0.5 + 6.5);
      const evidenceRack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 9.5), rackMetalMat);
      evidenceRack.position.set(-bw * 0.5 + 1.2, 1.4, -3.5);
      sGroup.add(briefTable, evidenceRack);
      addLocalCollider(centerX, centerZ, shop.yaw, -6.0, -bd * 0.5 + 6.5, 8.5, 3.0, 0, 1.5);
      addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + 1.2, -3.5, 1.2, 9.5, 0, 2.9);

      // Holding cell corner with steel bars & bench
      const cellBench = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 1.0), rackMetalMat);
      cellBench.position.set(10.5, 0.28, -bd * 0.5 + 2.2);
      sGroup.add(cellBench);
      addLocalCollider(centerX, centerZ, shop.yaw, 10.5, -bd * 0.5 + 2.2, 4.2, 1.0, 0, 1.0);
      for (let b = 6; b <= 15; b += 1.1) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8), rackMetalMat);
        bar.position.set(b, 2.1, -bd * 0.5 + 7.5);
        sGroup.add(bar);
      }
      addLocalCollider(centerX, centerZ, shop.yaw, 10.5, -bd * 0.5 + 7.5, 9.2, 0.25, 0, 4.2);
    } else if (isClub) {
      // Neon Reef Nightclub: Glowing Dancefloor Stage, DJ Rig, Curved Bar & VIP Mezzanine Lounge!
      const danceFloor = new THREE.Mesh(
        new THREE.BoxGeometry(11.0, 0.16, 11.0),
        new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xa855f7, emissiveIntensity: 0.45, roughness: 0.2 }),
      );
      danceFloor.position.set(0, 0.18, 2.0);
      const stage = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.8, 3.4), counterMat);
      stage.position.set(0, 0.4, -bd * 0.5 + 3.4);
      const djRig = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 1.1, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.8 }),
      );
      djRig.position.set(0, 1.35, -bd * 0.5 + 3.6);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 10.5), counterMat);
      bar.position.set(-bw * 0.5 + 3.2, 0.58, 1.5);
      const vipSofa = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.65, 4.2, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.72 }),
      );
      vipSofa.rotation.x = Math.PI / 2;
      vipSofa.position.set(bw * 0.5 - 2.6, 0.55, 2.0);
      sGroup.add(danceFloor, stage, djRig, bar, vipSofa);
      addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5 + 3.4, 9.0, 3.4, 0, 2.2);
      addLocalCollider(centerX, centerZ, shop.yaw, -bw * 0.5 + 3.2, 1.5, 1.5, 10.5, 0, 1.8);
      addLocalCollider(centerX, centerZ, shop.yaw, bw * 0.5 - 2.6, 2.0, 1.3, 5.2, 0, 1.4);

      const mezz = new THREE.Mesh(new THREE.BoxGeometry(bw - 1.2, 0.45, bd * 0.42), marbleFloorMat);
      mezz.position.set(0, 6.2, -bd * 0.27);
      const mezzRail = new THREE.Mesh(new THREE.BoxGeometry(bw - 4.8, 1.0, 0.14), rackMetalMat);
      mezzRail.position.set(-1.8, 6.9, -bd * 0.27 + bd * 0.21 - 0.18);
      sGroup.add(mezz, mezzRail);
      addLocalCollider(centerX, centerZ, shop.yaw, -1.8, -bd * 0.27 + bd * 0.21 - 0.18, bw - 4.8, 0.25, 6.2, 8.0);
      const [mwx, mwz] = localToWorld(centerX, centerZ, shop.yaw, 0, -bd * 0.27);
      roofDecks.push({ cx: mwx, cz: mwz, halfW: bw * 0.5 - 0.6, halfD: bd * 0.21, y: 6.45, yaw: shop.yaw });
      const [elx, elz] = localToWorld(centerX, centerZ, shop.yaw, bw * 0.5 - 3.2, -bd * 0.5 + 3.2);
      createWorkingElevator(
        `elev_${shop.id}`,
        `${shop.name} · Výťah`,
        elx,
        elz,
        shop.yaw,
        [0.12, 6.45, bh + 0.35],
        ['Parket & Bar', 'VIP Galéria (2. posch.)', 'Strešná Terasa'],
      );
    } else {
      // Barber / Tattoo Furnished Studio with Hydraulic Chairs, Lit Mirrors, Flash Art Wall & Waiting Lounge
      const desk = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 5.6, 6, 12), counterMat);
      desk.rotation.z = Math.PI / 2;
      desk.scale.set(0.85, 1.0, 0.9);
      desk.position.set(0, 0.52, -bd * 0.5 + 3.2);
      addLocalCollider(centerX, centerZ, shop.yaw, 0, -bd * 0.5 + 3.2, 6.4, 1.2, 0, 1.4);

      [-6.5, 0, 6.5].forEach((sx) => {
        const chairMat = new THREE.MeshStandardMaterial({ color: shop.accentHex, roughness: 0.48 });
        const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.58, 0.36, 18), rackMetalMat);
        chairBase.position.set(sx, 0.18, 1.0);
        const chairSeat = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.3, 6, 12), chairMat);
        chairSeat.rotation.z = Math.PI / 2;
        chairSeat.scale.set(0.65, 1.0, 1.0);
        chairSeat.position.set(sx, 0.56, 1.0);
        const chairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.45, 6, 12), chairMat);
        chairBack.position.set(sx, 1.02, 0.58);
        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 24), rackMetalMat);
        mirror.rotation.x = Math.PI / 2;
        mirror.position.set(sx, 2.2, -2.5);
        const stationShelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.65), counterMat);
        stationShelf.position.set(sx, 0.42, -2.2);
        sGroup.add(chairBase, chairSeat, chairBack, mirror, stationShelf);
        addLocalCircleCollider(centerX, centerZ, shop.yaw, sx, 1.0, 0.62, 0, 1.5);
        addLocalCollider(centerX, centerZ, shop.yaw, sx, -2.2, 2.2, 0.65, 0, 1.5);
      });

      // Waiting Sofa + Magazine Table along Right Side
      const waitSofa = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.6, 3.6, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
      );
      waitSofa.rotation.x = Math.PI / 2;
      waitSofa.position.set(bw * 0.5 - 2.2, 0.55, 5.0);
      addLocalCollider(centerX, centerZ, shop.yaw, bw * 0.5 - 2.2, 5.0, 1.2, 4.4, 0, 1.4);
      sGroup.add(desk, waitSofa);
    }

    scene.add(sGroup);

    // Solid Oriented Rooftop Deck for every shop
    roofDecks.push({
      cx: centerX,
      cz: centerZ,
      halfW: bw * 0.5 + 0.2,
      halfD: bd * 0.5 + 0.2,
      y: bh + 0.35,
      yaw: shop.yaw,
    });

    // Entrance Beacon Ring right at doorway (shop.x, shop.z)
    const beaconMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(shop.color),
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.5, 20, 1, true), beaconMat);
    ring.position.set(shop.x, 0.78, shop.z);
    scene.add(ring);
    beaconMeshes[shop.id] = ring;
  });

  // 9B. Accessible Furnished Civic Stations: Palmetto General Hospital EMS & Fire Station!
  const buildCivicStation = (opts: {
    cx: number;
    cz: number;
    yaw: number;
    bw: number;
    bd: number;
    bh: number;
    doorGap: number;
    accentHex: number;
    signTex: THREE.CanvasTexture;
    kind: 'hospital' | 'fire';
  }) => {
    const { cx, cz, yaw, bw, bd, bh, doorGap, accentHex, signTex, kind } = opts;
    occupiedFootprints.push({ cx, cz, hw: bw * 0.5 + 1.5, hd: bd * 0.5 + 1.5, yaw });
    shelterSpots.push({ x: cx, z: cz });

    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = yaw;

    const wallMat = new THREE.MeshStandardMaterial({
      color: kind === 'hospital' ? 0xdbeafe : 0x991b1b,
      roughness: 0.76,
      envMapIntensity: 0.24,
    });
    const fl = new THREE.Mesh(
      new THREE.PlaneGeometry(bw - 0.5, bd - 0.5),
      kind === 'hospital' ? marbleFloorMat : workshopFloorMat,
    );
    fl.rotation.x = -Math.PI / 2;
    fl.position.y = 0.155;
    fl.receiveShadow = true;

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(bw + 0.4, 0.7, bd + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }),
    );
    roof.position.y = bh;
    roof.castShadow = true;
    roof.receiveShadow = true;

    const wallT = 0.75;
    const backW = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, wallT), wallMat);
    backW.position.set(0, bh * 0.5, -bd * 0.5);
    const leftW = new THREE.Mesh(new THREE.BoxGeometry(wallT, bh, bd), wallMat);
    leftW.position.set(-bw * 0.5, bh * 0.5, 0);
    const rightW = new THREE.Mesh(new THREE.BoxGeometry(wallT, bh, bd), wallMat);
    rightW.position.set(bw * 0.5, bh * 0.5, 0);

    const fWingW = (bw - doorGap) * 0.5;
    const doorH = kind === 'fire' ? 5.6 : 4.6;
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(fWingW, bh, wallT), wallMat);
    frontL.position.set(-bw * 0.5 + fWingW * 0.5, bh * 0.5, bd * 0.5);
    const frontR = frontL.clone();
    frontR.position.x = bw * 0.5 - fWingW * 0.5;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap, bh - doorH, wallT), wallMat);
    lintel.position.set(0, doorH + (bh - doorH) * 0.5, bd * 0.5);

    const trimMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 1.15,
    });
    neonMats.push(trimMat);
    const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.4, bd + 0.5), trimMat);
    neonTrim.position.y = bh + 0.42;

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(bw * 0.68, 3.4),
      new THREE.MeshBasicMaterial({ map: signTex }),
    );
    sign.position.set(0, bh - 2.1, bd * 0.5 + 0.48);

    g.add(fl, roof, backW, leftW, rightW, frontL, frontR, lintel, neonTrim, sign);

    addLocalCollider(cx, cz, yaw, 0, -bd * 0.5, bw, wallT, 0, bh);
    addLocalCollider(cx, cz, yaw, -bw * 0.5, 0, wallT, bd, 0, bh);
    addLocalCollider(cx, cz, yaw, bw * 0.5, 0, wallT, bd, 0, bh);
    addLocalCollider(cx, cz, yaw, -bw * 0.5 + fWingW * 0.5, bd * 0.5, fWingW, wallT, 0, bh);
    addLocalCollider(cx, cz, yaw, bw * 0.5 - fWingW * 0.5, bd * 0.5, fWingW, wallT, 0, bh);

    if (kind === 'hospital') {
      // Triage Reception Desk + 4 Patient Beds + Medicine Cabinets + Waiting Benches!
      const triageDesk = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.15, 1.5), counterMat);
      triageDesk.position.set(0, 0.57, -bd * 0.5 + 3.2);
      const medCab = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 2.6, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
      );
      medCab.position.set(-bw * 0.5 + 4.5, 1.3, -bd * 0.5 + 1.2);
      g.add(triageDesk, medCab);
      addLocalCollider(cx, cz, yaw, 0, -bd * 0.5 + 3.2, 9.6, 1.6, 0, 1.8);
      addLocalCollider(cx, cz, yaw, -bw * 0.5 + 4.5, -bd * 0.5 + 1.2, 5.6, 1.0, 0, 2.7);

      const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
      const blanketMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.78 });
      [-11.5, -5.5, 5.5, 11.5].forEach((bx) => {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 2.8), bedFrameMat);
        bed.position.set(bx, 0.38, 1.5);
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.16, 1.8), blanketMat);
        blanket.position.set(bx, 0.8, 1.1);
        g.add(bed, blanket);
        addLocalCollider(cx, cz, yaw, bx, 1.5, 1.6, 2.9, 0, 1.2);
      });
    } else {
      // Fire Station Interior: Briefing Table + Red Gear Lockers + Hose Rack + Tool Chest + Dispatch Console!
      const lockerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48 });
      const gearLockers = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 10.5), lockerMat);
      gearLockers.position.set(-bw * 0.5 + 1.2, 1.3, -1.5);
      const hoseRack = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.4, 8.5),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 }),
      );
      hoseRack.position.set(bw * 0.5 - 1.2, 1.2, -1.5);
      const briefingTable = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.9, 2.4), woodFurnitureMat);
      briefingTable.position.set(0, 0.45, -bd * 0.5 + 3.6);
      const dispatchConsole = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.15, 1.2), counterMat);
      dispatchConsole.position.set(-7.5, 0.57, -bd * 0.5 + 2.4);
      g.add(gearLockers, hoseRack, briefingTable, dispatchConsole);
      addLocalCollider(cx, cz, yaw, -bw * 0.5 + 1.2, -1.5, 1.2, 10.6, 0, 2.7);
      addLocalCollider(cx, cz, yaw, bw * 0.5 - 1.2, -1.5, 1.2, 8.6, 0, 2.5);
      addLocalCollider(cx, cz, yaw, 0, -bd * 0.5 + 3.6, 6.6, 2.5, 0, 1.5);
      addLocalCollider(cx, cz, yaw, -7.5, -bd * 0.5 + 2.4, 4.3, 1.3, 0, 1.8);
    }

    scene.add(g);
    roofDecks.push({ cx, cz, halfW: bw * 0.5 + 0.2, halfD: bd * 0.5 + 0.2, y: bh + 0.35, yaw });
  };

  // Palmetto General Hospital EMS (-388, -668) facing Road Node 14 (-360, -640)
  buildCivicStation({
    cx: -388,
    cz: -668,
    yaw: 0.785,
    bw: 38,
    bd: 28,
    bh: 11.5,
    doorGap: 8.2,
    accentHex: 0xf87171,
    signTex: textures.signTextures.hospital,
    kind: 'hospital',
  });

  // Palmetto Bay Fire Station (-469, 454) facing Road Node 30 (-480, 480)
  buildCivicStation({
    cx: -469,
    cz: 454,
    yaw: -0.4,
    bw: 30,
    bd: 24,
    bh: 10.2,
    doorGap: 10.5,
    accentHex: 0xf97316,
    signTex: textures.signTextures.fireStation,
    kind: 'fire',
  });

  // 9C. 5 Landscaped City & Canyon Parks (Walkways, Fountains, Benches, Flowerbeds & Pergolas)
  const parkSpots: Array<{ name: string; x: number; z: number; size: number }> = [
    { name: 'Midtown Central Park', x: 80, z: -490, size: 54 },
    { name: 'Bayview Promenade Park', x: 445, z: -100, size: 50 },
    { name: 'Coral Keys Palms Park', x: 660, z: 320, size: 46 },
    { name: 'Redrock Canyon Botanical Park', x: -1380, z: -320, size: 52 },
    { name: 'Southside Harbor Park', x: -520, z: 860, size: 56 },
  ];
  const flowerRedMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.8 });
  const flowerGoldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8 });
  parkSpots.forEach((pk) => {
    const baseY = terrainElevation(pk.x, pk.z);
    const half = pk.size * 0.5;
    occupiedFootprints.push({ cx: pk.x, cz: pk.z, hw: half + 2, hd: half + 2, yaw: 0 });
    shelterSpots.push({ x: pk.x + 12, z: pk.z - 12 });

    const pGroup = new THREE.Group();
    pGroup.position.set(pk.x, baseY, pk.z);

    // Flagstone cross walkways & central circular plaza
    const pathX = new THREE.Mesh(new THREE.BoxGeometry(pk.size, 0.14, 4.4), sidewalkMat);
    pathX.position.y = 0.08;
    pathX.receiveShadow = true;
    const pathZ = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, pk.size), sidewalkMat);
    pathZ.position.y = 0.085;
    pathZ.receiveShadow = true;
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.8, 0.16, 28), sidewalkMat);
    plaza.position.y = 0.09;
    plaza.receiveShadow = true;
    pGroup.add(pathX, pathZ, plaza);

    // Central park fountain with tight stone rim collider
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.38, 10, 28), basinMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.42;
    const fWater = new THREE.Mesh(new THREE.CircleGeometry(3.6, 28), lakeMat);
    fWater.rotation.x = -Math.PI / 2;
    fWater.position.y = 0.46;
    const centerSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 2.2, 14), concreteMat);
    centerSpire.position.y = 1.1;
    pGroup.add(rim, fWater, centerSpire);
    circleColliders.push({ cx: pk.x, cz: pk.z, r: 4.15, minY: baseY, maxY: baseY + 2.4 });

    // Wooden park benches along plaza
    [
      [-5.8, -5.8, Math.PI * 0.25],
      [5.8, -5.8, -Math.PI * 0.25],
      [-5.8, 5.8, Math.PI * 0.75],
      [5.8, 5.8, -Math.PI * 0.75],
    ].forEach(([bx, bz, byaw]) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.75), woodFurnitureMat);
      seat.position.set(bx, 0.48, bz);
      seat.rotation.y = byaw;
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.12), woodFurnitureMat);
      back.position.set(bx, 0.78, bz);
      back.rotation.y = byaw;
      pGroup.add(seat, back);
      addLocalCollider(pk.x, pk.z, byaw, bx, bz, 2.4, 0.8, baseY, baseY + 1.0);
    });

    // Shade Pergola in corner
    const pergRoof = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.24, 6.8), pierWoodMat);
    pergRoof.position.set(12, 3.6, -12);
    pergRoof.castShadow = true;
    pGroup.add(pergRoof);
    [
      [9.1, -14.9],
      [14.9, -14.9],
      [9.1, -9.1],
      [14.9, -9.1],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.6, 10), woodFurnitureMat);
      post.position.set(px, 1.8, pz);
      pGroup.add(post);
      circleColliders.push({ cx: pk.x + px, cz: pk.z + pz, r: 0.18, minY: baseY, maxY: baseY + 3.6 });
    });

    // Landscaped flowerbeds
    [
      [-12, -12],
      [-12, 12],
      [12, 12],
    ].forEach(([fx, fz], idx) => {
      const bed = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.8, 0.35, 16),
        idx % 2 === 0 ? flowerRedMat : flowerGoldMat,
      );
      bed.position.set(fx, 0.18, fz);
      pGroup.add(bed);
    });

    scene.add(pGroup);
  });

  // 10. Skyline & District Filler Buildings (Full Box-Edge Road Clearance & Zero Shop Overlap!)
  const cityBlocks: Array<[number, number, number, number, number, number]> = [
    [-95, -145, 28, 28, 52, 3],
    [116, -138, 22, 22, 62, 0],
    [-215, -125, 28, 28, 44, 2],
    [225, -115, 28, 28, 48, 1],
    [-150, 95, 24, 24, 38, 4],
    [140, 225, 28, 28, 42, 0],
    [-390, -185, 30, 30, 48, 3],
    [415, -345, 28, 28, 44, 1],
    [565, 45, 28, 30, 34, 1],
    [615, -445, 26, 30, 36, 1],
    [-425, 265, 30, 26, 28, 2],
    [-680, -378, 24, 24, 24, 4],
    [-195, -485, 30, 26, 40, 0],
    [355, -565, 28, 26, 32, 2],
    [340, -180, 26, 26, 56, 2],
    [40, -340, 30, 28, 68, 0],
    [-80, 340, 28, 28, 46, 3],
    [440, 120, 28, 28, 38, 1],
  ];

  cityBlocks.forEach(([bx, bz, bw, bd, bh, fIdx]) => {
    if (!isBoxClearOfRoads(bx, bz, bw, bd, 0, 2.5)) return;
    if (isPointInsideOccupied(bx, bz, Math.max(bw, bd) * 0.5 + 2)) return;
    addBuilding(bx, bz, bw, bd, bh, fIdx);
    occupiedFootprints.push({ cx: bx, cz: bz, hw: bw * 0.5 + 1, hd: bd * 0.5 + 1, yaw: 0 });
  });

  // Sunset Sands Pier Sign
  const sunsetSign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 5.5),
    new THREE.MeshBasicMaterial({ map: textures.signTextures.sunset, side: THREE.DoubleSide }),
  );
  sunsetSign.position.set(858, 6.2, -14);
  sunsetSign.rotation.y = -Math.PI / 2;
  scene.add(sunsetSign);

  // 11. Realistic Stunt Ramps
  const rampMat = new THREE.MeshStandardMaterial({
    map: textures.rampHazard,
    roughness: 0.62,
    metalness: 0.2,
    envMapIntensity: 0.35,
  });
  const addRamp = (x: number, z: number, width: number, length: number, height: number, yaw: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-length * 0.5, 0);
    shape.lineTo(length * 0.5, 0);
    shape.lineTo(length * 0.5, height);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geo.translate(0, 0, -width * 0.5);
    geo.rotateY(-Math.PI / 2);

    const mesh = new THREE.Mesh(geo, rampMat);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    ramps.push({ x, z, width, length, height, yaw });
  };
  addRamp(970, 0, 11, 16, 2.4, Math.PI / 2);
  addRamp(-240, 980, 10, 16, 2.2, 0);
  addRamp(-620, 1660, 14, 22, 3.0, Math.PI / 2);

  // 12. Instanced Palm Trees & Western Pine Forest (Strictly Off-Road & Outside Buildings + Solid Trunk Colliders!)
  const palmPositions: Array<[number, number]> = [];
  for (let z = -1550; z <= 1450; z += 55) {
    const px = 815 + Math.sin(z * 0.01) * 14;
    if (Math.abs(z) > 22 && roadEdgeClearance(px, z) > 4.5 && !isPointInsideOccupied(px, z, 3.0)) {
      palmPositions.push([px, z]);
    }
  }
  for (let i = 0; i < 200; i++) {
    const px = -1000 + ((i * 223) % 1760);
    const pz = -1650 + ((i * 293) % 3100);
    if (
      roadEdgeClearance(px, pz) > 5.0 &&
      !isPointInsideOccupied(px, pz, 3.5) &&
      !(px > -1350 && px < -400 && pz > 1100 && pz < 1850)
    ) {
      if (Math.hypot(px, pz) > 70) palmPositions.push([px, pz]);
    }
  }
  for (let a = 0; a < 6; a++) {
    const ang = (a * Math.PI) / 3;
    palmPositions.push([Math.cos(ang) * 22, Math.sin(ang) * 22]);
  }

  // Curved Natural Tropical Palm Trunk + Multi-Frond Arched Crown (Instanced!)
  const palmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.35, 2.8, 0.15),
    new THREE.Vector3(0.72, 5.6, 0.35),
    new THREE.Vector3(0.55, 8.2, 0.28),
  ]);
  const trunkGeo = new THREE.TubeGeometry(palmCurve, 10, 0.32, 9, false);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4730,
    roughness: 0.92,
    envMapIntensity: 0.22,
  });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPositions.length);

  const frondParts: THREE.BufferGeometry[] = [];
  const crownX = 0.55;
  const crownY = 8.15;
  const crownZ = 0.28;
  for (let f = 0; f < 7; f++) {
    const yaw = (f / 7) * Math.PI * 2;
    const innerLeaf = new THREE.SphereGeometry(0.95, 8, 6);
    innerLeaf.scale(0.34, 0.14, 1.9);
    innerLeaf.rotateX(-0.22);
    innerLeaf.translate(0, 0.18, 1.55);
    innerLeaf.rotateY(yaw);
    innerLeaf.translate(crownX, crownY, crownZ);
    frondParts.push(innerLeaf);

    const outerTip = new THREE.SphereGeometry(0.85, 8, 6);
    outerTip.scale(0.28, 0.12, 1.6);
    outerTip.rotateX(0.46);
    outerTip.translate(0, -0.45, 3.25);
    outerTip.rotateY(yaw);
    outerTip.translate(crownX, crownY, crownZ);
    frondParts.push(outerTip);
  }
  const crownCap = new THREE.SphereGeometry(0.68, 10, 8);
  crownCap.scale(1.15, 0.72, 1.15);
  crownCap.translate(crownX, crownY + 0.15, crownZ);
  frondParts.push(crownCap);

  const crownGeo = mergeGeometries(frondParts, false) ?? new THREE.ConeGeometry(3.2, 2.1, 10);
  const palmFrondMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.78,
    envMapIntensity: 0.28,
  });
  const crownInst = new THREE.InstancedMesh(crownGeo, palmFrondMat, palmPositions.length);

  const dummy = new THREE.Object3D();
  const palmColor = new THREE.Color();
  palmPositions.forEach(([px, pz], i) => {
    const scale = 0.85 + ((i * 31) % 35) / 100;
    const baseY = terrainElevation(px, pz);
    dummy.position.set(px, baseY, pz);
    dummy.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
    crownInst.setMatrixAt(i, dummy.matrix);
    palmColor.setHex(i % 2 === 0 ? 0x15803d : 0x16a34a);
    crownInst.setColorAt(i, palmColor);
    circleColliders.push({ cx: px, cz: pz, r: 0.34 * scale, minY: baseY, maxY: baseY + 8.5 * scale });
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  scene.add(trunkInst, crownInst);

  // Western Canyon & Pine Forest (x = -2350 .. -1020) with Layered 3-Tier Pine Crowns
  const pinePositions: Array<[number, number]> = [];
  for (let i = 0; i < 280; i++) {
    const px = -2340 + ((i * 139) % 1300);
    const pz = -1820 + ((i * 211) % 3000);
    if (
      roadEdgeClearance(px, pz) > 4.5 &&
      !isPointInsideOccupied(px, pz, 3.0) &&
      Math.hypot(px + 2080, pz - 240) > 160
    ) {
      pinePositions.push([px, pz]);
    }
  }
  const pineTrunkGeo = new THREE.CylinderGeometry(0.28, 0.48, 5.2, 10);
  pineTrunkGeo.translate(0, 2.6, 0);
  const pineTier1 = new THREE.ConeGeometry(3.6, 5.2, 10);
  pineTier1.translate(0, 6.2, 0);
  const pineTier2 = new THREE.ConeGeometry(2.85, 4.8, 10);
  pineTier2.translate(0, 9.0, 0);
  const pineTier3 = new THREE.ConeGeometry(1.9, 4.0, 10);
  pineTier3.translate(0, 11.6, 0);
  const pineFoliageGeo = mergeGeometries([pineTier1, pineTier2, pineTier3], false) ?? pineTier1;
  const pineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.88,
    envMapIntensity: 0.22,
  });
  const pineTrunkInst = new THREE.InstancedMesh(pineTrunkGeo, trunkMat, pinePositions.length);
  const pineFoliageInst = new THREE.InstancedMesh(pineFoliageGeo, pineFoliageMat, pinePositions.length);
  pinePositions.forEach(([px, pz], i) => {
    const sc = 0.85 + ((i * 19) % 45) / 100;
    const baseY = terrainElevation(px, pz);
    dummy.position.set(px, baseY, pz);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    pineTrunkInst.setMatrixAt(i, dummy.matrix);
    pineFoliageInst.setMatrixAt(i, dummy.matrix);
    circleColliders.push({ cx: px, cz: pz, r: 0.44 * sc, minY: baseY, maxY: baseY + 12 * sc });
  });
  pineTrunkInst.instanceMatrix.needsUpdate = true;
  pineFoliageInst.instanceMatrix.needsUpdate = true;
  pineTrunkInst.computeBoundingSphere();
  pineFoliageInst.computeBoundingSphere();
  scene.add(pineTrunkInst, pineFoliageInst);

  // 13. Curved Gooseneck Streetlights along Paved Roads (Instanced -> 3 draw calls total!)
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.68,
    roughness: 0.34,
    envMapIntensity: 0.48,
  });
  const sharedStreetBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde047,
    emissiveIntensity: 0.25,
  });
  streetLightBulbs.push(sharedStreetBulbMat);

  const poleGeo = new THREE.CylinderGeometry(0.11, 0.18, 6.6, 8);
  poleGeo.translate(0, 3.3, 0);
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 6.5, 0),
    new THREE.Vector3(0, 7.35, 0.38),
    new THREE.Vector3(0, 7.25, 1.35),
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 6, 0.085, 6, false);
  const lampCapGeo = new THREE.CapsuleGeometry(0.16, 0.48, 4, 8);
  lampCapGeo.rotateX(Math.PI / 2);
  lampCapGeo.translate(0, 7.12, 1.48);

  const lightPlacements: Array<{ lx: number; lz: number; yaw: number }> = [];
  network.edges.forEach((edge, eIdx) => {
    if (edge.isDirt || eIdx % 2 !== 0) return;
    const mid = edge.curve.getPointAt(0.5);
    const tang = edge.curve.getTangentAt(0.5).setY(0).normalize();
    const side = new THREE.Vector3(-tang.z, 0, tang.x);
    const lx = mid.x + side.x * (edge.width * 0.5 + 1.8);
    const lz = mid.z + side.z * (edge.width * 0.5 + 1.8);
    if (roadEdgeClearance(lx, lz) < 1.2 || isPointInsideOccupied(lx, lz, 1.5)) return;
    lightPlacements.push({ lx, lz, yaw: Math.atan2(-side.x, -side.z) });
    circleColliders.push({ cx: lx, cz: lz, r: 0.18, minY: 0, maxY: 7.2 });
  });

  if (lightPlacements.length > 0) {
    const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lightPlacements.length);
    const armInst = new THREE.InstancedMesh(armGeo, poleMat, lightPlacements.length);
    const bulbInst = new THREE.InstancedMesh(lampCapGeo, sharedStreetBulbMat, lightPlacements.length);
    const lDummy = new THREE.Object3D();
    lightPlacements.forEach((lp, i) => {
      lDummy.position.set(lp.lx, 0, lp.lz);
      lDummy.rotation.set(0, lp.yaw, 0);
      lDummy.scale.set(1, 1, 1);
      lDummy.updateMatrix();
      poleInst.setMatrixAt(i, lDummy.matrix);
      armInst.setMatrixAt(i, lDummy.matrix);
      bulbInst.setMatrixAt(i, lDummy.matrix);
    });
    poleInst.instanceMatrix.needsUpdate = true;
    armInst.instanceMatrix.needsUpdate = true;
    bulbInst.instanceMatrix.needsUpdate = true;
    poleInst.computeBoundingSphere();
    armInst.computeBoundingSphere();
    bulbInst.computeBoundingSphere();
    scene.add(poleInst, armInst, bulbInst);
  }

  // 14. Smooth Organic Volumetric Sky Clouds (Instanced -> 1 draw call!)
  const cloudGroup = new THREE.Group();
  const cloudMats: THREE.MeshStandardMaterial[] = [];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.98,
    metalness: 0.0,
    envMapIntensity: 0.18,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  cloudMats.push(cloudMat);

  const cloudPuffs: CloudPuffData[] = [];
  const puffOffsets: Array<[number, number, number, number]> = [
    [-34, -2, -6, 30],
    [0, 8, 4, 42],
    [34, 1, -8, 32],
    [12, 12, 14, 28],
  ];
  for (let c = 0; c < 46; c++) {
    const cx = -2300 + ((c * 373) % 4200);
    const cz = -2100 + ((c * 491) % 4200);
    const cy = 240 + (c % 5) * 32;
    puffOffsets.forEach(([ox, oy, oz, rad]) => {
      cloudPuffs.push({
        x: cx + ox,
        y: cy + oy,
        z: cz + oz,
        sx: rad * 1.85,
        sy: rad * 0.56,
        sz: rad * 1.35,
      });
    });
  }
  const cloudInst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), cloudMat, cloudPuffs.length);
  cloudInst.frustumCulled = false;
  const cloudDummy = new THREE.Object3D();
  cloudPuffs.forEach((p, i) => {
    cloudDummy.position.set(p.x, p.y, p.z);
    cloudDummy.rotation.set(0, 0, 0);
    cloudDummy.scale.set(p.sx, p.sy, p.sz);
    cloudDummy.updateMatrix();
    cloudInst.setMatrixAt(i, cloudDummy.matrix);
  });
  cloudInst.instanceMatrix.needsUpdate = true;
  cloudGroup.add(cloudInst);
  scene.add(cloudGroup);

  // 15. Mission & GPS Beacons
  const missionBeacon = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 34, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  missionBeacon.visible = false;
  scene.add(missionBeacon);

  const gpsBeacon = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 42, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  gpsBeacon.visible = false;
  scene.add(gpsBeacon);

  // 16. Precompute Trig & Spatial Hash Grids for O(1) Collisions & Ground Height!
  const GRID_CELL = 48;
  const gridKey = (cx: number, cz: number) => ((cx + 512) << 12) ^ (cz + 512);

  const colliderGrid = new Map<number, number[]>();
  colliders.forEach((b, idx) => {
    b.cos = Math.cos(b.yaw);
    b.sin = Math.sin(b.yaw);
    const maxExt = Math.hypot(b.halfW, b.halfD) + 2;
    const minCx = Math.floor((b.cx - maxExt) / GRID_CELL);
    const maxCx = Math.floor((b.cx + maxExt) / GRID_CELL);
    const minCz = Math.floor((b.cz - maxExt) / GRID_CELL);
    const maxCz = Math.floor((b.cz + maxExt) / GRID_CELL);
    for (let gx = minCx; gx <= maxCx; gx++) {
      for (let gz = minCz; gz <= maxCz; gz++) {
        const k = gridKey(gx, gz);
        let bucket = colliderGrid.get(k);
        if (!bucket) {
          bucket = [];
          colliderGrid.set(k, bucket);
        }
        bucket.push(idx);
      }
    }
  });

  const circleGrid = new Map<number, number[]>();
  circleColliders.forEach((c, idx) => {
    const ext = c.r + 2;
    const minCx = Math.floor((c.cx - ext) / GRID_CELL);
    const maxCx = Math.floor((c.cx + ext) / GRID_CELL);
    const minCz = Math.floor((c.cz - ext) / GRID_CELL);
    const maxCz = Math.floor((c.cz + ext) / GRID_CELL);
    for (let gx = minCx; gx <= maxCx; gx++) {
      for (let gz = minCz; gz <= maxCz; gz++) {
        const k = gridKey(gx, gz);
        let bucket = circleGrid.get(k);
        if (!bucket) {
          bucket = [];
          circleGrid.set(k, bucket);
        }
        bucket.push(idx);
      }
    }
  });

  const roofGrid = new Map<number, number[]>();
  roofDecks.forEach((rd, idx) => {
    rd.cos = Math.cos(-rd.yaw);
    rd.sin = Math.sin(-rd.yaw);
    const maxExt = Math.hypot(rd.halfW, rd.halfD) + 1;
    const minCx = Math.floor((rd.cx - maxExt) / GRID_CELL);
    const maxCx = Math.floor((rd.cx + maxExt) / GRID_CELL);
    const minCz = Math.floor((rd.cz - maxExt) / GRID_CELL);
    const maxCz = Math.floor((rd.cz + maxExt) / GRID_CELL);
    for (let gx = minCx; gx <= maxCx; gx++) {
      for (let gz = minCz; gz <= maxCz; gz++) {
        const k = gridKey(gx, gz);
        let bucket = roofGrid.get(k);
        if (!bucket) {
          bucket = [];
          roofGrid.set(k, bucket);
        }
        bucket.push(idx);
      }
    }
  });

  const colliderStamps = new Uint32Array(colliders.length + 1);
  const circleStamps = new Uint32Array(circleColliders.length + 1);
  let queryToken = 1;

  const queryNearbyColliders = (x: number, z: number, out: OrientedCollider[]) => {
    out.length = 0;
    const token = ++queryToken;
    if (token > 0xfffffffe) {
      colliderStamps.fill(0);
      queryToken = 1;
    }
    const cx = Math.floor(x / GRID_CELL);
    const cz = Math.floor(z / GRID_CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = colliderGrid.get(gridKey(cx + dx, cz + dz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const idx = bucket[i];
          if (colliderStamps[idx] !== token) {
            colliderStamps[idx] = token;
            out.push(colliders[idx]);
          }
        }
      }
    }
  };

  const queryNearbyCircleColliders = (x: number, z: number, out: CircleCollider[]) => {
    out.length = 0;
    const token = ++queryToken;
    if (token > 0xfffffffe) {
      circleStamps.fill(0);
      queryToken = 1;
    }
    const cx = Math.floor(x / GRID_CELL);
    const cz = Math.floor(z / GRID_CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = circleGrid.get(gridKey(cx + dx, cz + dz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const idx = bucket[i];
          if (circleStamps[idx] !== token) {
            circleStamps[idx] = token;
            out.push(circleColliders[idx]);
          }
        }
      }
    }
  };

  // 17. Ground Height Query Supporting Hills, Bridges, Spatial Rooftops, Elevators & Ramps
  const groundHeightAt = (x: number, z: number, actorY = 999): number => {
    let h = Math.max(0.08, terrainElevation(x, z));

    // Bridges & Overpasses
    for (let i = 0; i < overpasses.length; i++) {
      const ov = overpasses[i];
      const dx = x - ov.x;
      const dz = z - ov.z;
      const maxSpan = ov.deckLength * 0.5 + ov.rampLength + ov.width;
      if (Math.abs(dx) > maxSpan || Math.abs(dz) > maxSpan) continue;
      const cos = Math.cos(-ov.yaw);
      const sin = Math.sin(-ov.yaw);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;

      if (Math.abs(lx) <= ov.width * 0.52) {
        const halfDeck = ov.deckLength * 0.5;
        let deckH = -1;
        if (Math.abs(lz) <= halfDeck) {
          deckH = ov.height;
        } else if (Math.abs(lz) <= halfDeck + ov.rampLength) {
          const distFromEnd = Math.abs(lz) - halfDeck;
          deckH = ov.height * (1 - distFromEnd / ov.rampLength);
        }
        if (deckH > 0 && actorY >= deckH - 1.75) {
          h = Math.max(h, deckH);
        }
      }
    }

    // Working Elevator Cab Platforms!
    for (let i = 0; i < elevators.length; i++) {
      const el = elevators[i];
      if (Math.abs(x - el.cx) <= el.halfW && Math.abs(z - el.cz) <= el.halfD) {
        if (actorY >= el.currentY - 1.8) {
          h = Math.max(h, el.currentY + 0.16);
        }
      }
    }

    // Oriented Solid Rooftops & Multi-Floor Mezzanine Decks (via spatial grid!)
    const rBucket = roofGrid.get(gridKey(Math.floor(x / GRID_CELL), Math.floor(z / GRID_CELL)));
    if (rBucket) {
      for (let i = 0; i < rBucket.length; i++) {
        const rd = roofDecks[rBucket[i]];
        const dx = x - rd.cx;
        const dz = z - rd.cz;
        const cos = rd.cos ?? Math.cos(-rd.yaw);
        const sin = rd.sin ?? Math.sin(-rd.yaw);
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        if (Math.abs(lx) <= rd.halfW && Math.abs(lz) <= rd.halfD) {
          if (actorY >= rd.y - 1.75) {
            h = Math.max(h, rd.y);
          }
        }
      }
    }

    // Stunt Ramps
    for (let i = 0; i < ramps.length; i++) {
      const rm = ramps[i];
      const dx = x - rm.x;
      const dz = z - rm.z;
      if (Math.abs(dx) > rm.length + rm.width || Math.abs(dz) > rm.length + rm.width) continue;
      const cos = Math.cos(-rm.yaw);
      const sin = Math.sin(-rm.yaw);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= rm.width * 0.5 && Math.abs(lz) <= rm.length * 0.5) {
        const t = (lz + rm.length * 0.5) / rm.length;
        const rh = t * rm.height + (x >= 840 ? 1.05 : 0);
        if (rh > h) h = rh;
      }
    }

    return h;
  };

  const isWaterAt = (x: number, z: number): boolean => {
    if (Math.hypot(x + 2080, z - 240) < 142) return true; // Redrock Lake
    if (x > 920) {
      if (x >= 850 && x <= 1040 && Math.abs(z) <= 9.5) return false;
      if (Math.hypot(x - 1240, z + 220) < 52) return false;
      return true;
    }
    return false;
  };

  return {
    network,
    colliders,
    circleColliders,
    roofDecks,
    ramps,
    overpasses,
    elevators,
    customsBays,
    shelterSpots,
    rangeTargets,
    radarDish,
    buildingEmissiveMats,
    neonMats,
    streetLightBulbs,
    roadMat,
    oceanMesh,
    skyDomeMat,
    cloudGroup,
    cloudInst,
    cloudPuffs,
    cloudMats,
    beaconMeshes,
    missionBeacon,
    gpsBeacon,
    queryNearbyColliders,
    queryNearbyCircleColliders,
    groundHeightAt,
    isWaterAt,
    distanceToRoad,
  };
}
