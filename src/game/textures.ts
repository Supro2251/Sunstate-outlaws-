import * as THREE from 'three';
import { BeardStyleId, SHOPS, TattooStyleId } from './types';

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTexturePack {
  asphaltRoad: THREE.CanvasTexture;
  asphaltPlaza: THREE.CanvasTexture;
  dirtRoad: THREE.CanvasTexture;
  parkingLot: THREE.CanvasTexture;
  runway: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
  forestGround: THREE.CanvasTexture;
  woodDeck: THREE.CanvasTexture;
  container: THREE.CanvasTexture;
  rampHazard: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  waterRoughness: THREE.CanvasTexture;
  interiorFloor: THREE.CanvasTexture;
  marbleFloor: THREE.CanvasTexture;
  workshopFloor: THREE.CanvasTexture;
  buildingBump: THREE.CanvasTexture;
  bullseyeTarget: THREE.CanvasTexture;
  taxiSign: THREE.CanvasTexture;
  emsCross: THREE.CanvasTexture;
  elevatorPanel: THREE.CanvasTexture;
  buildingWindows: THREE.CanvasTexture[];
  buildingEmissives: THREE.CanvasTexture[];
  signTextures: Record<string, THREE.CanvasTexture>;
  dispose: () => void;
}

export function createCharacterFaceTexture(
  skinHex: number,
  beardStyle: BeardStyleId,
  isFemale: boolean,
): THREE.CanvasTexture {
  const [c, ctx] = createCanvas(256, 256);
  const base = new THREE.Color(skinHex);
  const dark = base.clone().multiplyScalar(0.74);
  const light = base.clone().lerp(new THREE.Color(0xffffff), 0.14);

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, `#${light.getHexString()}`);
  grad.addColorStop(0.55, `#${base.getHexString()}`);
  grad.addColorStop(1, `#${dark.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = isFemale ? 'rgba(218, 105, 118, 0.22)' : 'rgba(180, 95, 78, 0.15)';
  ctx.beginPath();
  ctx.ellipse(66, 152, 28, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(190, 152, 28, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  if (beardStyle !== 'clean') {
    ctx.fillStyle =
      beardStyle === 'full' ? 'rgba(24, 20, 18, 0.65)' : 'rgba(28, 24, 22, 0.34)';
    if (beardStyle === 'goatee') {
      ctx.beginPath();
      ctx.ellipse(128, 212, 34, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(18, 172, 220, 84);
    }
  }

  ctx.strokeStyle = '#1f1612';
  ctx.lineWidth = isFemale ? 6 : 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(46, 94);
  ctx.quadraticCurveTo(76, 80, 104, 92);
  ctx.moveTo(152, 92);
  ctx.quadraticCurveTo(180, 80, 210, 94);
  ctx.stroke();

  const drawEye = (cx: number, cy: number) => {
    ctx.fillStyle = 'rgba(40, 24, 18, 0.26)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 19, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isFemale ? '#3f6212' : '#452b18';
    ctx.beginPath();
    ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 2.5, cy - 2.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = isFemale ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.quadraticCurveTo(cx, cy - 12, cx + 20, cy);
    ctx.stroke();
  };

  drawEye(78, 114);
  drawEye(178, 114);

  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath();
  ctx.moveTo(123, 110);
  ctx.lineTo(133, 110);
  ctx.lineTo(140, 156);
  ctx.lineTo(116, 156);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(45,20,15,0.45)';
  ctx.beginPath();
  ctx.ellipse(119, 158, 4.5, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(137, 158, 4.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isFemale ? '#be4b5e' : '#a85a52';
  ctx.beginPath();
  ctx.ellipse(128, 190, 26, isFemale ? 9 : 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5c2824';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(101, 190);
  ctx.quadraticCurveTo(128, 194, 155, 190);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSkinTattooTexture(
  skinHex: number,
  tattoo: TattooStyleId,
): THREE.CanvasTexture {
  const [c, ctx] = createCanvas(128, 128);
  const col = new THREE.Color(skinHex);
  ctx.fillStyle = `#${col.getHexString()}`;
  ctx.fillRect(0, 0, 128, 128);

  if (tattoo !== 'none') {
    ctx.strokeStyle =
      tattoo === 'serpent' ? '#06b6d4' : tattoo === 'compass' ? '#0f172a' : '#f43f5e';
    ctx.lineWidth = 4;
    if (tattoo === 'serpent') {
      ctx.beginPath();
      for (let y = 12; y <= 116; y += 8) {
        const x = 64 + Math.sin(y * 0.14) * 26;
        if (y === 12) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(48, 28, 32, 8);
      ctx.fillRect(42, 76, 44, 6);
    } else if (tattoo === 'compass') {
      ctx.beginPath();
      ctx.arc(64, 64, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(64, 22);
      ctx.lineTo(64, 106);
      ctx.moveTo(22, 64);
      ctx.lineTo(106, 64);
      ctx.stroke();
    } else if (tattoo === 'sunstate') {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(64, 54, 22, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(26, 72);
      ctx.lineTo(102, 72);
      ctx.moveTo(34, 86);
      ctx.lineTo(94, 86);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const allTextures: THREE.Texture[] = [];
  const track = <T extends THREE.Texture>(t: T): T => {
    allTextures.push(t);
    return t;
  };

  // 1. Rich Realistic Asphalt Road (dark tarmac aggregate, subtle wear lanes, crisp markings)
  const [roadC, roadCtx] = createCanvas(512, 512);
  roadCtx.fillStyle = '#1b1f27';
  roadCtx.fillRect(0, 0, 512, 512);
  roadCtx.fillStyle = 'rgba(10, 12, 17, 0.48)';
  roadCtx.fillRect(88, 0, 72, 512);
  roadCtx.fillRect(352, 0, 72, 512);
  for (let i = 0; i < 6500; i++) {
    const v = 20 + Math.floor(Math.random() * 26);
    roadCtx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    roadCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  roadCtx.fillStyle = '#cbd5e1';
  roadCtx.fillRect(14, 0, 10, 512);
  roadCtx.fillRect(488, 0, 10, 512);
  roadCtx.fillStyle = '#ca8a04';
  roadCtx.fillRect(249, 24, 14, 180);
  roadCtx.fillRect(249, 280, 14, 180);
  const asphaltRoad = track(finalizeColorTexture(roadC, maxAnisotropy, 1, 1));
  asphaltRoad.wrapS = THREE.ClampToEdgeWrapping;

  // 2. Plaza Asphalt
  const [apC, apCtx] = createCanvas(256, 256);
  apCtx.fillStyle = '#20252e';
  apCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const v = 26 + Math.floor(Math.random() * 22);
    apCtx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    apCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const asphaltPlaza = track(finalizeColorTexture(apC, maxAnisotropy, 6, 6));

  // 3. Dirt & Gravel Trail
  const [dirtC, dirtCtx] = createCanvas(256, 256);
  dirtCtx.fillStyle = '#6b4d33';
  dirtCtx.fillRect(0, 0, 256, 256);
  dirtCtx.fillStyle = 'rgba(72, 50, 31, 0.5)';
  dirtCtx.fillRect(48, 0, 44, 256);
  dirtCtx.fillRect(164, 0, 44, 256);
  for (let i = 0; i < 2400; i++) {
    dirtCtx.fillStyle = Math.random() > 0.5 ? '#7c5a3c' : '#533923';
    dirtCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const dirtRoad = track(finalizeColorTexture(dirtC, maxAnisotropy, 1, 1));

  // 4. Marked Parking Lot
  const [pkC, pkCtx] = createCanvas(512, 512);
  pkCtx.fillStyle = '#1e242e';
  pkCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3200; i++) {
    const v = 24 + Math.floor(Math.random() * 20);
    pkCtx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    pkCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  pkCtx.strokeStyle = '#cbd5e1';
  pkCtx.lineWidth = 6;
  pkCtx.strokeRect(12, 12, 488, 488);
  for (let x = 44; x <= 468; x += 68) {
    pkCtx.beginPath();
    pkCtx.moveTo(x, 18);
    pkCtx.lineTo(x, 150);
    pkCtx.moveTo(x, 362);
    pkCtx.lineTo(x, 494);
    pkCtx.stroke();
  }
  pkCtx.fillStyle = '#eab308';
  pkCtx.font = 'bold 46px "Chakra Petch", sans-serif';
  pkCtx.textAlign = 'center';
  pkCtx.fillText('P  PARKOVISKO', 256, 272);
  const parkingLot = track(finalizeColorTexture(pkC, maxAnisotropy, 1, 1));

  // 5. Realistic International Airport Runway Tarmac (with 09L marking & rubber tire streaks!)
  const [rwC, rwCtx] = createCanvas(512, 1024);
  rwCtx.fillStyle = '#191d24';
  rwCtx.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 6000; i++) {
    const v = 20 + Math.floor(Math.random() * 20);
    rwCtx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    rwCtx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
  }
  // Tire touchdown rubber marks
  rwCtx.fillStyle = 'rgba(8, 10, 14, 0.55)';
  rwCtx.fillRect(180, 180, 42, 420);
  rwCtx.fillRect(290, 180, 42, 420);
  // Edge lines
  rwCtx.fillStyle = '#e2e8f0';
  rwCtx.fillRect(16, 0, 10, 1024);
  rwCtx.fillRect(486, 0, 10, 1024);
  // Centerline dashes
  for (let y = 36; y < 800; y += 110) {
    rwCtx.fillRect(246, y, 20, 62);
  }
  // Piano key threshold
  for (let x = 44; x < 468; x += 48) {
    rwCtx.fillRect(x, 910, 26, 86);
  }
  rwCtx.fillStyle = '#e2e8f0';
  rwCtx.font = 'bold 68px "Chakra Petch", sans-serif';
  rwCtx.textAlign = 'center';
  rwCtx.fillText('09L', 256, 875);
  const runway = track(finalizeColorTexture(rwC, maxAnisotropy, 1, 1));
  runway.wrapS = THREE.ClampToEdgeWrapping;
  runway.wrapT = THREE.ClampToEdgeWrapping;

  // 6. Concrete Sidewalk Pavers
  const [swC, swCtx] = createCanvas(256, 256);
  swCtx.fillStyle = '#7b828e';
  swCtx.fillRect(0, 0, 256, 256);
  swCtx.strokeStyle = '#585f6b';
  swCtx.lineWidth = 3;
  for (let x = 0; x <= 256; x += 64) {
    swCtx.beginPath();
    swCtx.moveTo(x, 0);
    swCtx.lineTo(x, 256);
    swCtx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    swCtx.beginPath();
    swCtx.moveTo(0, y);
    swCtx.lineTo(256, y);
    swCtx.stroke();
  }
  const sidewalk = track(finalizeColorTexture(swC, maxAnisotropy, 16, 16));

  // 7. Coastal Sand
  const [sandC, sandCtx] = createCanvas(256, 256);
  sandCtx.fillStyle = '#ccb488';
  sandCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    sandCtx.fillStyle = 'rgba(176, 148, 102, 0.22)';
    sandCtx.fillRect(0, y, 256, 5);
  }
  for (let i = 0; i < 2000; i++) {
    sandCtx.fillStyle = Math.random() > 0.5 ? 'rgba(235,220,185,0.18)' : 'rgba(145,115,72,0.16)';
    sandCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const sand = track(finalizeColorTexture(sandC, maxAnisotropy, 56, 56));

  // 8. Lush Grass
  const [grC, grCtx] = createCanvas(256, 256);
  grCtx.fillStyle = '#2d5733';
  grCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    grCtx.fillStyle = Math.random() > 0.5 ? '#36693d' : '#234427';
    grCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const grass = track(finalizeColorTexture(grC, maxAnisotropy, 90, 90));

  // 9. Forest & Meadow Moss Ground
  const [fgC, fgCtx] = createCanvas(256, 256);
  fgCtx.fillStyle = '#234227';
  fgCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    fgCtx.fillStyle = Math.random() > 0.45 ? '#2d5432' : '#19311c';
    fgCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const forestGround = track(finalizeColorTexture(fgC, maxAnisotropy, 60, 60));

  // 10. Pier Wood Deck
  const [wdC, wdCtx] = createCanvas(256, 256);
  wdCtx.fillStyle = '#734e32';
  wdCtx.fillRect(0, 0, 256, 256);
  wdCtx.strokeStyle = '#4a301c';
  wdCtx.lineWidth = 3;
  for (let y = 0; y < 256; y += 32) {
    wdCtx.fillStyle = y % 64 === 0 ? '#7d5638' : '#68462c';
    wdCtx.fillRect(0, y, 256, 30);
    wdCtx.beginPath();
    wdCtx.moveTo(0, y);
    wdCtx.lineTo(256, y);
    wdCtx.stroke();
  }
  const woodDeck = track(finalizeColorTexture(wdC, maxAnisotropy, 2, 14));

  // 11. Corrugated Container
  const [ctC, ctCtx] = createCanvas(256, 256);
  ctCtx.fillStyle = '#94a3b8';
  ctCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    ctCtx.fillStyle = x % 32 === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)';
    ctCtx.fillRect(x, 0, 8, 256);
  }
  const container = track(finalizeColorTexture(ctC, maxAnisotropy, 2, 1));

  // 12. Water Ripple Roughness Map
  const [wrC, wrCtx] = createCanvas(256, 256);
  wrCtx.fillStyle = '#222222';
  wrCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 280; i++) {
    wrCtx.fillStyle = 'rgba(135, 135, 135, 0.38)';
    wrCtx.fillRect(Math.random() * 256, Math.random() * 256, 30, 5);
  }
  const waterRoughness = track(finalizeDataTexture(wrC, maxAnisotropy, 44, 60));

  // 13. Ramp Hazard Stripes
  const [rmpC, rmpCtx] = createCanvas(256, 256);
  rmpCtx.fillStyle = '#1e293b';
  rmpCtx.fillRect(0, 0, 256, 256);
  rmpCtx.fillStyle = '#eab308';
  for (let i = -256; i < 512; i += 48) {
    rmpCtx.beginPath();
    rmpCtx.moveTo(i, 0);
    rmpCtx.lineTo(i + 24, 0);
    rmpCtx.lineTo(i + 152, 256);
    rmpCtx.lineTo(i + 128, 256);
    rmpCtx.closePath();
    rmpCtx.fill();
  }
  const rampHazard = track(finalizeColorTexture(rmpC, maxAnisotropy, 1, 1));

  // 14. Soft Radial Contact Shadow
  const [shC, shCtx] = createCanvas(128, 128);
  const grad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.78)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.36)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = track(new THREE.CanvasTexture(shC));
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  // 15. Shop Interior Boutique Checker Tile Floor (natural stone, non-glaring)
  const [flC, flCtx] = createCanvas(256, 256);
  flCtx.fillStyle = '#94a3b8';
  flCtx.fillRect(0, 0, 256, 256);
  flCtx.fillStyle = '#788496';
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      if ((x / 64 + y / 64) % 2 === 0) flCtx.fillRect(x, y, 64, 64);
    }
  }
  const interiorFloor = track(finalizeColorTexture(flC, maxAnisotropy, 6, 6));

  // 16. Luxury Marble Lobby Floor (Apex Trust & Marina Loft)
  const [mbC, mbCtx] = createCanvas(256, 256);
  mbCtx.fillStyle = '#525b68';
  mbCtx.fillRect(0, 0, 256, 256);
  mbCtx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
  mbCtx.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    mbCtx.beginPath();
    mbCtx.moveTo(Math.random() * 256, Math.random() * 256);
    mbCtx.bezierCurveTo(100, 50, 160, 200, Math.random() * 256, Math.random() * 256);
    mbCtx.stroke();
  }
  const marbleFloor = track(finalizeColorTexture(mbC, maxAnisotropy, 6, 6));

  // 17. Industrial Garage Floor (Apex Customs Drive-In Bay)
  const [wkC, wkCtx] = createCanvas(512, 512);
  wkCtx.fillStyle = '#29303b';
  wkCtx.fillRect(0, 0, 512, 512);
  wkCtx.strokeStyle = '#eab308';
  wkCtx.lineWidth = 10;
  wkCtx.strokeRect(48, 48, 416, 416);
  wkCtx.fillStyle = 'rgba(234, 179, 8, 0.16)';
  wkCtx.fillRect(150, 120, 212, 272);
  const workshopFloor = track(finalizeColorTexture(wkC, maxAnisotropy, 1, 1));

  // 18. Shooting Range Target
  const [tgC, tgCtx] = createCanvas(128, 128);
  tgCtx.fillStyle = '#f8fafc';
  tgCtx.fillRect(0, 0, 128, 128);
  [
    { r: 54, col: '#0f172a' },
    { r: 40, col: '#0284c7' },
    { r: 26, col: '#dc2626' },
    { r: 11, col: '#facc15' },
  ].forEach((rg) => {
    tgCtx.fillStyle = rg.col;
    tgCtx.beginPath();
    tgCtx.arc(64, 64, rg.r, 0, Math.PI * 2);
    tgCtx.fill();
  });
  const bullseyeTarget = track(finalizeColorTexture(tgC, maxAnisotropy, 1, 1));

  // 19. Taxi Sign, EMS Cross & Elevator Panel
  const [txC, txCtx] = createCanvas(256, 96);
  txCtx.fillStyle = '#eab308';
  txCtx.fillRect(0, 0, 256, 96);
  txCtx.strokeStyle = '#09090b';
  txCtx.lineWidth = 8;
  txCtx.strokeRect(4, 4, 248, 88);
  txCtx.fillStyle = '#09090b';
  txCtx.font = 'bold 58px "Chakra Petch", sans-serif';
  txCtx.textAlign = 'center';
  txCtx.textBaseline = 'middle';
  txCtx.fillText('TAXI', 128, 50);
  const taxiSign = track(finalizeColorTexture(txC, maxAnisotropy, 1, 1));

  const [emC, emCtx] = createCanvas(128, 128);
  emCtx.fillStyle = '#f1f5f9';
  emCtx.fillRect(0, 0, 128, 128);
  emCtx.fillStyle = '#dc2626';
  emCtx.fillRect(46, 18, 36, 92);
  emCtx.fillRect(18, 46, 92, 36);
  const emsCross = track(finalizeColorTexture(emC, maxAnisotropy, 1, 1));

  const [elC, elCtx] = createCanvas(256, 128);
  elCtx.fillStyle = '#0f172a';
  elCtx.fillRect(0, 0, 256, 128);
  elCtx.strokeStyle = '#38bdf8';
  elCtx.lineWidth = 6;
  elCtx.strokeRect(6, 6, 244, 116);
  elCtx.fillStyle = '#38bdf8';
  elCtx.font = 'bold 34px "Chakra Petch", sans-serif';
  elCtx.textAlign = 'center';
  elCtx.fillText('VÝŤAH / LIFT', 128, 52);
  elCtx.fillStyle = '#e2e8f0';
  elCtx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  elCtx.fillText('STLAČ E PRE JAZDU', 128, 94);
  const elevatorPanel = track(finalizeColorTexture(elC, maxAnisotropy, 1, 1));

  // 20. Realistic Calibrated Building Facades + Bump Map (ZERO over-bright whitewash!)
  const palettePairs: Array<[string, string, string, string]> = [
    // Deep Blue Curtain-Wall Skyscraper Glass
    ['#1c2a3a', '#0f172a', '#243b53', '#fde68a'],
    // Warm Sandstone / Limestone Architectural Facade
    ['#7a7164', '#4a433b', '#1e293b', '#fef08a'],
    // Dark Smoked Bronze Glass Tower
    ['#292421', '#171412', '#3d342f', '#fed7aa'],
    // Modern Brushed Concrete & Steel Grid
    ['#4b5563', '#272f3b', '#1e293b', '#bae6fd'],
    // Miami Terracotta Brick & Masonry
    ['#783d2c', '#4a2318', '#1f2937', '#fde047'],
  ];

  const [bpC, bpCtx] = createCanvas(256, 256);
  bpCtx.fillStyle = '#ffffff';
  bpCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 6; c++) {
      const wx = c * (256 / 6) + 5;
      const wy = r * (256 / 8) + 4;
      bpCtx.fillStyle = '#404040';
      bpCtx.fillRect(wx, wy, 256 / 6 - 10, 256 / 8 - 8);
    }
  }
  const buildingBump = track(finalizeDataTexture(bpC, maxAnisotropy, 1, 1));

  const buildingWindows: THREE.CanvasTexture[] = [];
  const buildingEmissives: THREE.CanvasTexture[] = [];

  palettePairs.forEach(([wall, mullion, glassTint, lit]) => {
    const [bC, bCtx] = createCanvas(256, 256);
    const [eC, eCtx] = createCanvas(256, 256);
    bCtx.fillStyle = wall;
    bCtx.fillRect(0, 0, 256, 256);
    // Subtle concrete/stone micro-grain so facades look tactile up close
    for (let i = 0; i < 900; i++) {
      bCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
      bCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
    }

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 256, 256);

    const cols = 6;
    const rows = 8;
    const padX = 9;
    const padY = 8;
    const cellW = 256 / cols;
    const cellH = 256 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + padX * 0.5;
        const wy = r * cellH + padY * 0.5;
        const ww = cellW - padX;
        const wh = cellH - padY;

        bCtx.fillStyle = glassTint;
        bCtx.fillRect(wx, wy, ww, wh);
        // Subtle window tint gradient without bright glare
        bCtx.fillStyle = 'rgba(148, 197, 233, 0.06)';
        bCtx.fillRect(wx + 2, wy + 2, ww * 0.42, wh - 4);
        bCtx.strokeStyle = mullion;
        bCtx.lineWidth = 2;
        bCtx.strokeRect(wx, wy, ww, wh);

        if (Math.random() > 0.45) {
          eCtx.fillStyle = lit;
          eCtx.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
        }
      }
    }

    buildingWindows.push(track(finalizeColorTexture(bC, maxAnisotropy, 1, 1)));
    buildingEmissives.push(track(finalizeColorTexture(eC, maxAnisotropy, 1, 1)));
  });

  // 21. Signboards
  const makeSign = (title: string, subtitle: string, bg: string, accent: string) => {
    const [c, ctx] = createCanvas(512, 160);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = accent;
    ctx.font = 'bold 40px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 64);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, 256, 118);
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  };

  const signTextures: Record<string, THREE.CanvasTexture> = {
    apexTrust: makeSign('APEX TRUST TOWER', 'FINANCIAL HEADQUARTERS', '#091529', '#38bdf8'),
    sunset: makeSign('SUNSET SANDS', 'FLAMINGO BLVD PIER', '#260a1e', '#fb7185'),
    airport: makeSign('PALMETTO INTL', 'MEDZINÁRODNÉ LETISKO · TERMINÁL', '#0a192f', '#38bdf8'),
    hospital: makeSign('PALMETTO EMS', 'NEMOCNICA & TRAUMA CENTRUM', '#1e1b2e', '#f87171'),
    fireStation: makeSign('PALMETTO HASIČI', 'HASIČSKÁ STANICA & VÝJAZD', '#290f12', '#f97316'),
  };

  SHOPS.forEach((shop) => {
    signTextures[shop.id] = makeSign(
      shop.name.toUpperCase(),
      `${shop.shortLabel} · OTVORENÉ`,
      '#0b101d',
      shop.color,
    );
  });

  return {
    asphaltRoad,
    asphaltPlaza,
    dirtRoad,
    parkingLot,
    runway,
    sidewalk,
    sand,
    grass,
    forestGround,
    woodDeck,
    container,
    rampHazard,
    contactShadow,
    waterRoughness,
    interiorFloor,
    marbleFloor,
    workshopFloor,
    buildingBump,
    bullseyeTarget,
    taxiSign,
    emsCross,
    elevatorPanel,
    buildingWindows,
    buildingEmissives,
    signTextures,
    dispose: () => {
      allTextures.forEach((t) => t.dispose());
    },
  };
}
