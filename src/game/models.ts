import * as THREE from 'three';
import { createCharacterFaceTexture, createSkinTattooTexture } from './textures';
import {
  BeardStyleId,
  CharacterCustomization,
  CharacterProfile,
  HairStyleId,
  NeonColorId,
  TattooStyleId,
  VehicleSpec,
  WeaponId,
} from './types';

export interface VehicleRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  deformableMeshes: THREE.Mesh[];
  paintMat: THREE.MeshPhysicalMaterial;
  rimMat: THREE.MeshStandardMaterial;
  neonMat: THREE.MeshBasicMaterial;
  neonStrip: THREE.Mesh;
  wheelMeshes: THREE.Group[];
  frontPivots: THREE.Group[];
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  sirenRedMat?: THREE.MeshStandardMaterial;
  sirenBlueMat?: THREE.MeshStandardMaterial;
  mainRotor?: THREE.Group;
  tailRotor?: THREE.Group;
  propeller?: THREE.Group;
  waterTurret?: THREE.Group;
  fireGroup: THREE.Group;
  contactShadow: THREE.Mesh;
}

export interface CharacterRig {
  group: THREE.Group;
  torso: THREE.Mesh;
  shirtStripe: THREE.Mesh;
  jacketMat: THREE.MeshStandardMaterial;
  shirtMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  faceMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  shadesMat: THREE.MeshStandardMaterial;
  headGroup: THREE.Group;
  hairVariants: Record<HairStyleId, THREE.Object3D>;
  beardVariants: Record<Exclude<BeardStyleId, 'clean'>, THREE.Object3D>;
  leftArm: THREE.Group;
  leftElbow: THREE.Group;
  rightArm: THREE.Group;
  rightElbow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponPistol: THREE.Group;
  weaponSmg: THREE.Group;
  parachutePack: THREE.Mesh;
  parachuteCanopy: THREE.Group;
  contactShadow: THREE.Mesh;
}

const NEON_HEX: Record<NeonColorId, number> = {
  off: 0x000000,
  cyan: 0x06b6d4,
  pink: 0xec4899,
  lime: 0x22c55e,
  amber: 0xf59e0b,
};

function makeDeformableRoundedBox(
  w: number,
  h: number,
  d: number,
  r: number,
  mat: THREE.Material,
): THREE.Mesh {
  const hw = w * 0.5 - r;
  const hh = h * 0.5 - r;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh - r);
  shape.lineTo(hw, -hh - r);
  shape.quadraticCurveTo(hw + r, -hh - r, hw + r, -hh);
  shape.lineTo(hw + r, hh);
  shape.quadraticCurveTo(hw + r, hh + r, hw, hh + r);
  shape.lineTo(-hw, hh + r);
  shape.quadraticCurveTo(-hw - r, hh + r, -hw - r, hh);
  shape.lineTo(-hw - r, -hh);
  shape.quadraticCurveTo(-hw - r, -hh - r, -hw, -hh - r);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, d - r * 2),
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r * 0.85,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geo.center();
  geo.computeVertexNormals();
  geo.userData.origPositions = new Float32Array(geo.attributes.position.array);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSmoothProfileBody(
  points: Array<[number, number]>,
  width: number,
  mat: THREE.Material,
  bevelSize = 0.09,
  bevelThickness = 0.11,
  useSpline = true,
): THREE.Mesh {
  // Side profile in X=Z_car, Y=Y_car extruded along vehicle width and rotated so +Z is forward!
  const shape = new THREE.Shape();
  if (useSpline && points.length >= 4) {
    shape.moveTo(points[0][0], points[0][1]);
    // Bottom edge straight for crisp ground clearance, upper silhouette smoothly curved!
    shape.lineTo(points[1][0], points[1][1]);
    const upperPts = points.slice(2).map(([x, y]) => new THREE.Vector2(x, y));
    upperPts.push(new THREE.Vector2(points[0][0], points[0][1]));
    shape.splineThru(upperPts);
  } else {
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    shape.closePath();
  }

  const innerW = Math.max(0.2, width - bevelThickness * 1.9);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerW,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -innerW * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  geo.userData.origPositions = new Float32Array(geo.attributes.position.array);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function deformVehicleMesh(
  rig: VehicleRig,
  localDirX: number,
  localDirZ: number,
  severity: number,
) {
  const s = Math.min(0.65, Math.max(0.08, severity));
  const impactNormLen = Math.hypot(localDirX, localDirZ) || 1;
  const nx = localDirX / impactNormLen;
  const nz = localDirZ / impactNormLen;

  rig.deformableMeshes.forEach((mesh) => {
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const orig = mesh.geometry.userData.origPositions as Float32Array | undefined;
    if (!orig) return;

    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    const halfX = Math.max(0.5, (bb.max.x - bb.min.x) * 0.5);
    const halfZ = Math.max(0.5, (bb.max.z - bb.min.z) * 0.5);

    for (let i = 0; i < pos.count; i++) {
      const cx = pos.getX(i);
      const cy = pos.getY(i);
      const cz = pos.getZ(i);

      const dot = (cx / halfX) * nx + (cz / halfZ) * nz;
      if (dot > 0.28) {
        const weight = (dot - 0.28) * s * 0.48;
        pos.setXYZ(
          i,
          cx - nx * weight * 0.85,
          cy + weight * 0.18 * (Math.sin(i * 1.7) * 0.5 + 0.5),
          cz - nz * weight * 1.05,
        );
      }
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });
}

export function resetVehicleDeformation(rig: VehicleRig) {
  rig.deformableMeshes.forEach((mesh) => {
    const orig = mesh.geometry.userData.origPositions as Float32Array | undefined;
    if (!orig) return;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    pos.array.set(orig);
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });
}

export function createVehicleMesh(
  spec: VehicleSpec,
  contactShadowTex: THREE.Texture,
  customColor?: number,
  extraTex?: { taxiSign?: THREE.Texture; emsCross?: THREE.Texture },
): VehicleRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);
  const deformableMeshes: THREE.Mesh[] = [];

  const color = customColor ?? spec.colors[0];
  const paintMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.34,
    roughness: 0.34,
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    envMapIntensity: 0.44,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x131720,
    metalness: 0.28,
    roughness: 0.58,
    envMapIntensity: 0.32,
  });

  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x1b202b,
    roughness: 0.88,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.72,
    roughness: 0.32,
    envMapIntensity: 0.52,
  });

  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.42,
    metalness: 0.3,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.16,
    roughness: 0.24,
    clearcoat: 0.32,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.42,
    transparent: true,
    opacity: 0.78,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    emissive: 0xfef08a,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });

  const neonMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.88,
  });
  const neonStrip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.03, spec.length * 0.65, 4, 8),
    neonMat,
  );
  neonStrip.rotation.x = Math.PI / 2;
  neonStrip.scale.set(spec.width * 7, 1, 1);
  neonStrip.position.set(0, 0.14, 0);
  neonStrip.visible = false;
  bodyGroup.add(neonStrip);

  const wheelMeshes: THREE.Group[] = [];
  const frontPivots: THREE.Group[] = [];
  let sirenRedMat: THREE.MeshStandardMaterial | undefined;
  let sirenBlueMat: THREE.MeshStandardMaterial | undefined;
  let mainRotor: THREE.Group | undefined;
  let tailRotor: THREE.Group | undefined;
  let propeller: THREE.Group | undefined;
  let waterTurret: THREE.Group | undefined;

  const fireGroup = new THREE.Group();
  const flameMat1 = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.88 });
  const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.92 });
  for (let f = 0; f < 5; f++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.45 + (f % 2) * 0.15, 1.3 + (f % 3) * 0.35, 10),
      f % 2 === 0 ? flameMat1 : flameMat2,
    );
    cone.position.set((f - 2) * 0.38, spec.height * 0.72 + 0.5, spec.length * 0.22);
    fireGroup.add(cone);
  }
  fireGroup.visible = false;
  bodyGroup.add(fireGroup);

  if (spec.kind === 'helicopter') {
    // Sleek Rounded Teardrop Helicopter Fuselage + Bubble Canopy + Tapered Cylindrical Tail Boom
    const pod = makeSmoothProfileBody(
      [
        [-1.4, 0.72],
        [1.1, 0.72],
        [2.25, 1.05],
        [1.95, 1.82],
        [0.6, 2.12],
        [-1.35, 1.98],
      ],
      1.78,
      paintMat,
      0.18,
      0.22,
      true,
    );
    bodyGroup.add(pod);
    deformableMeshes.push(pod);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.92, 24, 18), glassMat);
    canopy.scale.set(0.9, 0.72, 1.32);
    canopy.position.set(0, 1.44, 1.28);
    bodyGroup.add(canopy);

    // Lower chin glass observation windows + pilot instrument console + dual seats
    const chinGlass = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 12), glassMat);
    chinGlass.scale.set(0.95, 0.48, 0.9);
    chinGlass.position.set(0, 0.96, 1.68);
    const heliDash = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.32, 0.42), trimMat);
    heliDash.position.set(0, 1.18, 1.45);
    const pilotSeatL = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 4, 8), interiorMat);
    pilotSeatL.position.set(-0.28, 1.18, 0.85);
    const pilotSeatR = pilotSeatL.clone();
    pilotSeatR.position.x = 0.28;
    bodyGroup.add(chinGlass, heliDash, pilotSeatL, pilotSeatR);

    const engineCowl = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 1.35, 8, 16),
      trimMat,
    );
    engineCowl.rotation.x = Math.PI / 2;
    engineCowl.position.set(0, 2.08, -0.35);
    // Dual turbine exhausts
    [-0.24, 0.24].forEach((ex) => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.48, 12), rimMat);
      exhaust.rotation.x = Math.PI / 2 + 0.12;
      exhaust.position.set(ex, 2.04, -1.16);
      bodyGroup.add(exhaust);
    });
    bodyGroup.add(engineCowl);

    const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 3.85, 16), paintMat);
    tailBoom.rotation.x = Math.PI / 2;
    tailBoom.position.set(0, 1.54, -2.72);
    const finShape = new THREE.Shape();
    finShape.moveTo(-0.35, 0);
    finShape.lineTo(0.45, 0);
    finShape.lineTo(0.05, 1.35);
    finShape.lineTo(-0.35, 1.22);
    finShape.closePath();
    const tailFin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(finShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelSize: 0.03,
        bevelThickness: 0.03,
        bevelSegments: 2,
      }),
      paintMat,
    );
    tailFin.rotation.y = Math.PI / 2;
    tailFin.position.set(-0.05, 1.48, -4.15);
    const hStab = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.55, 4, 10), paintMat);
    hStab.rotation.z = Math.PI / 2;
    hStab.scale.set(1, 1, 2.4);
    hStab.position.set(0, 1.56, -3.5);
    // Red/green navigation position lights on horizontal stabilizer tips
    const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), taillightMat);
    navRed.position.set(-0.85, 1.56, -3.5);
    const navGreen = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x22c55e }),
    );
    navGreen.position.set(0.85, 1.56, -3.5);
    bodyGroup.add(tailBoom, tailFin, hStab, navRed, navGreen);

    [-0.95, 0.95].forEach((sx) => {
      const skid = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 3.8, 6, 12), rimMat);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, 0.08, 0.2);
      const strut1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.82, 10), rimMat);
      strut1.rotation.z = sx > 0 ? 0.14 : -0.14;
      strut1.position.set(sx * 0.92, 0.44, 1.0);
      const strut2 = strut1.clone();
      strut2.position.z = -0.7;
      bodyGroup.add(skid, strut1, strut2);
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.34, 12), rimMat);
    mast.position.set(0, 2.34, 0.2);
    bodyGroup.add(mast);

    mainRotor = new THREE.Group();
    mainRotor.position.set(0, 2.52, 0.2);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), trimMat);
    hub.scale.set(1, 0.65, 1);
    const swash = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), rimMat);
    swash.position.y = -0.1;
    const bladeA = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 7.6, 4, 8), trimMat);
    bladeA.rotation.z = Math.PI / 2;
    bladeA.scale.set(0.28, 1, 2.4);
    const bladeB = bladeA.clone();
    bladeB.rotation.y = Math.PI / 2;
    mainRotor.add(hub, swash, bladeA, bladeB);
    bodyGroup.add(mainRotor);

    tailRotor = new THREE.Group();
    tailRotor.position.set(0.2, 2.15, -4.25);
    const tBlade1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 1.25, 4, 8), trimMat);
    const tBlade2 = tBlade1.clone();
    tBlade2.rotation.x = Math.PI / 2;
    tailRotor.add(tBlade1, tBlade2);
    bodyGroup.add(tailRotor);
  } else if (spec.kind === 'plane') {
    const isJet = spec.id === 'jet';
    // Aerodynamic Sculpted Cylindrical/Blended Fuselage + Bubble Canopy + Tapered Swept Wings
    const fuselage = makeSmoothProfileBody(
      isJet
        ? [
            [-3.95, 0.85],
            [2.4, 0.82],
            [4.25, 1.14],
            [2.4, 1.66],
            [-0.4, 1.72],
            [-3.95, 1.54],
          ]
        : [
            [-3.1, 0.86],
            [2.7, 0.84],
            [3.25, 1.24],
            [1.8, 1.76],
            [-0.8, 1.76],
            [-3.1, 1.38],
          ],
      isJet ? 1.42 : 1.32,
      paintMat,
      0.16,
      0.22,
      true,
    );
    bodyGroup.add(fuselage);
    deformableMeshes.push(fuselage);

    // Sleek Bubble Teardrop Cockpit Canopy
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.58, 22, 16), glassMat);
    cockpit.scale.set(0.86, 0.72, isJet ? 2.15 : 1.65);
    cockpit.position.set(0, 1.72, isJet ? 1.05 : 0.45);
    bodyGroup.add(cockpit);

    if (isJet) {
      // Swept Tapered Airfoil Delta Wings (Extruded Trapezoids, not plain boxes!)
      const makeSweptWing = (side: number) => {
        const wShape = new THREE.Shape();
        wShape.moveTo(0, -1.65);
        wShape.lineTo(0, 1.25);
        wShape.lineTo(side * 3.55, -0.75);
        wShape.lineTo(side * 3.55, -1.55);
        wShape.closePath();
        const wGeo = new THREE.ExtrudeGeometry(wShape, {
          depth: 0.09,
          bevelEnabled: true,
          bevelSize: 0.04,
          bevelThickness: 0.03,
          bevelSegments: 2,
        });
        wGeo.rotateX(Math.PI / 2);
        const wing = new THREE.Mesh(wGeo, paintMat);
        wing.position.set(side * 0.55, 1.2, -0.2);
        wing.castShadow = true;
        return wing;
      };
      bodyGroup.add(makeSweptWing(-1), makeSweptWing(1));

      // Twin Canted Vertical Stabilizers
      const finShape = new THREE.Shape();
      finShape.moveTo(-0.7, 0);
      finShape.lineTo(0.6, 0);
      finShape.lineTo(-0.15, 1.38);
      finShape.lineTo(-0.75, 1.32);
      finShape.closePath();
      const finGeo = new THREE.ExtrudeGeometry(finShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelSize: 0.02,
        bevelThickness: 0.02,
        bevelSegments: 2,
      });
      finGeo.rotateY(Math.PI / 2);
      const finL = new THREE.Mesh(finGeo, paintMat);
      finL.position.set(-0.56, 1.48, -2.9);
      finL.rotation.z = 0.25;
      const finR = finL.clone();
      finR.position.x = 0.48;
      finR.rotation.z = -0.25;

      const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.45, 18), trimMat);
      noseCone.rotation.x = Math.PI / 2;
      noseCone.position.set(0, 1.18, 4.45);

      const burnerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      [-0.36, 0.36].forEach((bx) => {
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.65, 16), trimMat);
        nozzle.rotation.x = Math.PI / 2;
        nozzle.position.set(bx, 1.18, -spec.length * 0.47);
        const glow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.78, 14), burnerMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(bx, 1.18, -spec.length * 0.54);
        bodyGroup.add(nozzle, glow);
      });

      [-3.15, 3.15].forEach((mx) => {
        const msl = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 1.35, 6, 10), caliperMat);
        msl.rotation.x = Math.PI / 2;
        msl.position.set(mx, 1.05, -0.75);
        bodyGroup.add(msl);
      });
      bodyGroup.add(finL, finR, noseCone);
    } else {
      // Tapered Swept Propeller Aircraft Airfoil Wings, Side Windows & Wingtip Nav Lights
      const makePropWing = (side: number) => {
        const wShape = new THREE.Shape();
        wShape.moveTo(0, -0.85);
        wShape.lineTo(0, 0.92);
        wShape.lineTo(side * (spec.width * 0.46), 0.35);
        wShape.lineTo(side * (spec.width * 0.46), -0.65);
        wShape.closePath();
        const wGeo = new THREE.ExtrudeGeometry(wShape, {
          depth: 0.11,
          bevelEnabled: true,
          bevelSize: 0.04,
          bevelThickness: 0.03,
          bevelSegments: 2,
        });
        wGeo.rotateX(Math.PI / 2);
        const wing = new THREE.Mesh(wGeo, paintMat);
        wing.position.set(side * 0.48, 1.56, 0.42);
        wing.castShadow = true;
        return wing;
      };
      const wingL = makePropWing(-1);
      const wingR = makePropWing(1);
      const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), taillightMat);
      navRed.position.set(-spec.width * 0.48, 1.54, 0.25);
      const navGreen = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x22c55e }),
      );
      navGreen.position.set(spec.width * 0.48, 1.54, 0.25);
      const tailWing = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 2.9, 4, 10), paintMat);
      tailWing.rotation.z = Math.PI / 2;
      tailWing.scale.set(1, 1, 5.2);
      tailWing.position.set(0, 1.32, -spec.length * 0.39);
      const tailFin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 1.2, 4, 10), paintMat);
      tailFin.scale.set(0.8, 1, 5.0);
      tailFin.position.set(0, 1.9, -spec.length * 0.39);
      // Side fuselage cabin windows
      [-0.68, 0.68].forEach((wx) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.45), glassMat);
        win.position.set(wx, 1.38, -0.35);
        bodyGroup.add(win);
      });
      bodyGroup.add(wingL, wingR, navRed, navGreen, tailWing, tailFin);

      propeller = new THREE.Group();
      propeller.position.set(0, 1.22, spec.length * 0.47);
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 16), rimMat);
      spinner.rotation.x = Math.PI / 2;
      const p1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 2.45, 4, 8), trimMat);
      p1.rotation.z = Math.PI / 2;
      const p2 = p1.clone();
      p2.rotation.z = 0;
      propeller.add(spinner, p1, p2);
      bodyGroup.add(propeller);
    }

    const gearPositions: Array<[number, number]> = [
      [0, spec.length * 0.3],
      [-1.12, -0.4],
      [1.12, -0.4],
    ];
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    gearPositions.forEach(([gx, gz]) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.65, 10), rimMat);
      strut.position.set(gx, 0.45, gz);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 20), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(gx, 0.25, gz);
      bodyGroup.add(strut, tire);
    });
  } else {
    // --- SMOOTH SCULPTED AUTOMOTIVE VEHICLES (Spline Curves + Rounded Fenders + Alloy Rims!) ---
    const w = spec.width;
    const l = spec.length;
    const h = spec.height;
    const wheelRadius =
      spec.id === 'firetruck' ? 0.5 : spec.id === 'terramax' || spec.id === 'ambulance' ? 0.42 : 0.35;
    const chassisBottom = wheelRadius * 0.62;

    if (spec.id === 'firetruck') {
      const lowerH = h * 0.54;
      const lowerMesh = makeDeformableRoundedBox(w, lowerH, l, 0.12, paintMat);
      lowerMesh.position.y = chassisBottom + lowerH * 0.5;
      bodyGroup.add(lowerMesh);
      deformableMeshes.push(lowerMesh);

      const cab = makeSmoothProfileBody(
        [
          [l * 0.14, chassisBottom + lowerH * 0.9],
          [l * 0.49, chassisBottom + lowerH * 0.9],
          [l * 0.49, chassisBottom + lowerH + h * 0.2],
          [l * 0.42, chassisBottom + lowerH + h * 0.45],
          [l * 0.15, chassisBottom + lowerH + h * 0.46],
        ],
        w * 0.96,
        paintMat,
        0.1,
        0.12,
        true,
      );
      bodyGroup.add(cab);
      deformableMeshes.push(cab);

      const windshield = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, w * 0.72, 4, 10),
        glassMat,
      );
      windshield.rotation.z = Math.PI / 2;
      windshield.scale.set(3.2, 1, 1.4);
      windshield.position.set(0, chassisBottom + lowerH + h * 0.26, l * 0.47);
      bodyGroup.add(windshield);

      const shutterMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.78, roughness: 0.25 });
      [-w * 0.506, w * 0.506].forEach((sx) => {
        const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.05, lowerH * 0.72, l * 0.52), shutterMat);
        shutter.position.set(sx, chassisBottom + lowerH * 0.52, -l * 0.16);
        bodyGroup.add(shutter);
      });

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.04, 0.2, l * 0.95),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45 }),
      );
      stripe.position.set(0, chassisBottom + lowerH * 0.72, 0);
      bodyGroup.add(stripe);

      const ladder = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, l * 0.58, 4, 8), rimMat);
      ladder.rotation.x = Math.PI / 2;
      ladder.scale.set(4.5, 1, 1.2);
      ladder.position.set(-0.35, chassisBottom + lowerH + 0.14, -l * 0.16);
      bodyGroup.add(ladder);

      waterTurret = new THREE.Group();
      waterTurret.position.set(0.45, chassisBottom + lowerH + 0.18, l * 0.05);
      const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.3, 14), rimMat);
      const tBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.15, 14), rimMat);
      tBarrel.rotation.x = Math.PI / 2 - 0.18;
      tBarrel.position.set(0, 0.22, 0.45);
      waterTurret.add(tBase, tBarrel);
      bodyGroup.add(waterTurret);
    } else if (spec.id === 'ambulance') {
      const lowerH = h * 0.56;
      const lowerMesh = makeDeformableRoundedBox(w, lowerH, l, 0.12, paintMat);
      lowerMesh.position.y = chassisBottom + lowerH * 0.5;
      bodyGroup.add(lowerMesh);
      deformableMeshes.push(lowerMesh);

      const box = makeDeformableRoundedBox(w * 0.98, h * 0.52, l * 0.66, 0.12, paintMat);
      box.position.set(0, chassisBottom + lowerH + h * 0.22, -l * 0.16);
      bodyGroup.add(box);
      deformableMeshes.push(box);

      const cab = new THREE.Mesh(new THREE.SphereGeometry(w * 0.48, 16, 12), glassMat);
      cab.scale.set(0.92, 0.48, 0.82);
      cab.position.set(0, chassisBottom + lowerH + h * 0.14, l * 0.26);
      bodyGroup.add(cab);

      const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.22, l * 0.95), redStripeMat);
      stripe.position.set(0, chassisBottom + lowerH * 0.65, 0);
      bodyGroup.add(stripe);

      if (extraTex?.emsCross) {
        const crossMat = new THREE.MeshBasicMaterial({ map: extraTex.emsCross });
        [-w * 0.5 - 0.025, w * 0.5 + 0.025].forEach((cx, idx) => {
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), crossMat);
          sign.position.set(cx, chassisBottom + lowerH + h * 0.22, -l * 0.16);
          sign.rotation.y = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
          bodyGroup.add(sign);
        });
      }
    } else {
      // Sleek Smooth-Curved Automotive Chassis + Curved Greenhouse + Wheel Arch Flares!
      const isSuv = spec.id === 'terramax';
      const isSuper = spec.id === 'solstice';
      const hl = l * 0.5;
      const beltY = chassisBottom + h * (isSuv ? 0.55 : 0.58);
      const roofY = chassisBottom + h * (isSuv ? 0.98 : 0.96);

      const lowerProfile: Array<[number, number]> = isSuper
        ? [
            [-hl + 0.06, chassisBottom + 0.06],
            [hl - 0.08, chassisBottom + 0.03],
            [hl, chassisBottom + 0.24],
            [hl - 0.45, beltY - 0.08],
            [hl - 1.2, beltY + 0.02],
            [-hl + 0.95, beltY + 0.04],
            [-hl + 0.08, beltY + 0.07],
            [-hl, chassisBottom + 0.34],
          ]
        : [
            [-hl + 0.06, chassisBottom + 0.06],
            [hl - 0.06, chassisBottom + 0.06],
            [hl, chassisBottom + 0.32],
            [hl - 0.42, beltY - 0.02],
            [hl - 1.15, beltY + 0.03],
            [-hl + 0.25, beltY + 0.04],
            [-hl, chassisBottom + 0.38],
          ];

      const bodyShell = makeSmoothProfileBody(lowerProfile, w, paintMat, 0.1, 0.13, true);
      bodyGroup.add(bodyShell);
      deformableMeshes.push(bodyShell);

      // Sculpted Interior Cockpit (Dashboard + Steering Wheel + Bucket Seats)
      const cabinFrontZ = isSuper ? hl * 0.36 : hl * 0.3;
      const cabinBackZ = isSuv ? -hl * 0.86 : -hl * 0.64;
      const roofFrontZ = isSuper ? hl * 0.02 : 0;
      const roofBackZ = isSuv ? -hl * 0.76 : -hl * 0.38;

      const dash = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.12, w * 0.62, 4, 8),
        interiorMat,
      );
      dash.rotation.z = Math.PI / 2;
      dash.position.set(0, beltY + 0.06, cabinFrontZ - 0.22);
      const seatL = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.34, 4, 8), interiorMat);
      seatL.position.set(-w * 0.2, beltY + 0.16, -0.2);
      seatL.rotation.x = -0.22;
      const seatR = seatL.clone();
      seatR.position.x = w * 0.2;
      bodyGroup.add(dash, seatL, seatR);

      // Smooth Curved Fastback Glass Greenhouse!
      const glassProfile: Array<[number, number]> = [
        [cabinBackZ, beltY + 0.01],
        [cabinFrontZ, beltY + 0.01],
        [roofFrontZ + 0.12, roofY - 0.07],
        [roofBackZ - 0.08, roofY - 0.07],
      ];
      const glassMesh = makeSmoothProfileBody(glassProfile, w * 0.84, glassMat, 0.06, 0.08, true);
      bodyGroup.add(glassMesh);

      // Smooth Rounded Painted Roof Cap (Police uses crisp white roof!)
      const roofMat = spec.isPolice
        ? new THREE.MeshPhysicalMaterial({
            color: 0xcbd5e1,
            metalness: 0.16,
            roughness: 0.38,
            clearcoat: 0.32,
            clearcoatRoughness: 0.28,
            envMapIntensity: 0.38,
          })
        : paintMat;
      const roofLen = Math.max(0.95, roofFrontZ - roofBackZ + 0.16);
      const roofCap = makeDeformableRoundedBox(w * 0.78, 0.09, roofLen, 0.04, roofMat);
      roofCap.position.set(0, roofY, (roofFrontZ + roofBackZ) * 0.5);
      bodyGroup.add(roofCap);

      // Rounded Wheel Arch Flares + Side Skirts + Sleek Mirrors
      [-w * 0.48, w * 0.48].forEach((sx) => {
        const skirt = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.05, l * 0.45, 4, 8),
          trimMat,
        );
        skirt.rotation.x = Math.PI / 2;
        skirt.position.set(sx, chassisBottom + 0.08, 0);

        const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), paintMat);
        mirror.scale.set(1.25, 0.7, 0.9);
        mirror.position.set(sx * 1.12, beltY + 0.1, cabinFrontZ - 0.18);
        bodyGroup.add(skirt, mirror);

        // Rounded fender arch eyebrows over front & rear wheels
        [l * 0.31, -l * 0.31].forEach((wz) => {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(wheelRadius + 0.07, 0.055, 8, 16, Math.PI),
            trimMat,
          );
          arch.rotation.y = Math.PI / 2;
          arch.position.set(sx * 0.98, wheelRadius, wz);
          bodyGroup.add(arch);
        });
      });

      // Front Grille + Rear Diffuser + Chrome Dual Exhausts
      const grille = new THREE.Mesh(
        new THREE.CapsuleGeometry(h * 0.08, w * 0.46, 4, 10),
        trimMat,
      );
      grille.rotation.z = Math.PI / 2;
      grille.position.set(0, chassisBottom + h * 0.22, hl + 0.03);
      const diffuser = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.06, w * 0.62, 4, 8),
        trimMat,
      );
      diffuser.rotation.z = Math.PI / 2;
      diffuser.position.set(0, chassisBottom + 0.1, -hl - 0.02);
      bodyGroup.add(grille, diffuser);

      [-w * 0.28, w * 0.28].forEach((ex) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 12), rimMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(ex, chassisBottom + 0.12, -hl - 0.06);
        bodyGroup.add(pipe);
      });

      if (spec.isPolice) {
        [-w * 0.505, w * 0.505].forEach((dx) => {
          const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, h * 0.34, l * 0.36), roofMat);
          doorPanel.position.set(dx, chassisBottom + h * 0.34, 0.02);
          bodyGroup.add(doorPanel);
        });
      }

      if (spec.isTaxi) {
        [-w * 0.505, w * 0.505].forEach((dx) => {
          const checkerBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, l * 0.72), trimMat);
          checkerBand.position.set(dx, beltY - 0.08, 0);
          bodyGroup.add(checkerBand);
        });
        const taxiSignMat = extraTex?.taxiSign
          ? new THREE.MeshStandardMaterial({
              map: extraTex.taxiSign,
              emissive: 0xfacc15,
              emissiveIntensity: 0.65,
            })
          : headlightMat;
        const roofSign = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.3), taxiSignMat);
        roofSign.position.set(0, roofY + 0.15, (roofFrontZ + roofBackZ) * 0.5);
        bodyGroup.add(roofSign);
      }

      if (spec.id === 'veloce' || spec.id === 'solstice' || spec.id === 'brawler') {
        const wing = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.035, w * 0.84, 4, 8),
          trimMat,
        );
        wing.rotation.z = Math.PI / 2;
        wing.scale.set(1, 1, 3.2);
        wing.position.set(0, beltY + 0.2, -hl + 0.16);
        const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.18, 8), trimMat);
        strutL.position.set(-w * 0.28, beltY + 0.1, -hl + 0.16);
        const strutR = strutL.clone();
        strutR.position.x = w * 0.28;
        bodyGroup.add(wing, strutL, strutR);
      }
    }

    // Rounded Capsule Bumpers & Halo LED Headlights / Sculpted Taillights
    const frontBumper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08, w * 0.86, 4, 10),
      trimMat,
    );
    frontBumper.rotation.z = Math.PI / 2;
    frontBumper.position.set(0, chassisBottom + 0.1, l * 0.5 + 0.03);
    const rearBumper = frontBumper.clone();
    rearBumper.position.set(0, chassisBottom + 0.12, -l * 0.5 - 0.03);
    bodyGroup.add(frontBumper, rearBumper);

    const lightY = chassisBottom + h * (spec.id === 'firetruck' || spec.id === 'ambulance' ? 0.3 : 0.41);
    [-w * 0.34, w * 0.34].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 10), headlightMat);
      hl.rotation.z = Math.PI / 2;
      hl.position.set(lx, lightY, l * 0.5 + 0.03);
      const tl = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.28, 4, 10), taillightMat);
      tl.rotation.z = Math.PI / 2;
      tl.position.set(lx, lightY + 0.04, -l * 0.5 - 0.03);
      bodyGroup.add(hl, tl);
    });

    if (spec.isEmergency) {
      const barY =
        spec.id === 'firetruck' || spec.id === 'ambulance'
          ? chassisBottom + h * 1.02
          : chassisBottom + h * 0.99 + 0.09;
      const barZ = spec.id === 'firetruck' ? l * 0.32 : spec.id === 'ambulance' ? l * 0.28 : -0.05;

      const barBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, w * 0.56, 4, 8), trimMat);
      barBase.rotation.z = Math.PI / 2;
      barBase.position.set(0, barY, barZ);
      bodyGroup.add(barBase);

      sirenRedMat = new THREE.MeshStandardMaterial({
        color: 0xff2244,
        emissive: 0xff0033,
        emissiveIntensity: 1.8,
      });
      sirenBlueMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.8,
      });

      const redPod = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, w * 0.18, 4, 8), sirenRedMat);
      redPod.rotation.z = Math.PI / 2;
      redPod.position.set(-w * 0.18, barY + 0.05, barZ);
      const bluePod = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, w * 0.18, 4, 8), sirenBlueMat);
      bluePod.rotation.z = Math.PI / 2;
      bluePod.position.set(w * 0.18, barY + 0.05, barZ);
      bodyGroup.add(redPod, bluePod);
    }

    // High-Segment Rounded Wheels with 5-Spoke Alloy Rims & Brake Calipers
    const wheelPositions: Array<[number, number, boolean]> = [
      [-w * 0.48, l * 0.31, true],
      [w * 0.48, l * 0.31, true],
      [-w * 0.48, -l * 0.31, false],
      [w * 0.48, -l * 0.31, false],
    ];
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.66, wheelRadius * 0.66, 0.295, 22);
    rimGeo.rotateZ(Math.PI / 2);
    const hubCapGeo = new THREE.CylinderGeometry(wheelRadius * 0.2, wheelRadius * 0.2, 0.31, 14);
    hubCapGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(0.305, wheelRadius * 1.18, 0.06);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.1 });

    wheelPositions.forEach(([wx, wz, isFront]) => {
      const pivot = new THREE.Group();
      pivot.position.set(wx, wheelRadius, wz);
      group.add(pivot);

      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      const hubCap = new THREE.Mesh(hubCapGeo, trimMat);
      wheelGroup.add(tire, rim, hubCap);
      for (let sp = 0; sp < 5; sp++) {
        const spoke = new THREE.Mesh(spokeGeo, trimMat);
        spoke.rotation.x = (sp * Math.PI) / 5;
        wheelGroup.add(spoke);
      }
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.11), caliperMat);
      caliper.position.set(0, 0.06, -0.06);
      wheelGroup.add(caliper);
      pivot.add(wheelGroup);

      wheelMeshes.push(wheelGroup);
      if (isFront) frontPivots.push(pivot);
    });
  }

  const shadowGeo = new THREE.PlaneGeometry(spec.width * 1.45, spec.length * 1.25);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.03;
  group.add(contactShadow);

  return {
    group,
    bodyGroup,
    deformableMeshes,
    paintMat,
    rimMat,
    neonMat,
    neonStrip,
    wheelMeshes,
    frontPivots,
    headlightMat,
    taillightMat,
    sirenRedMat,
    sirenBlueMat,
    mainRotor,
    tailRotor,
    propeller,
    waterTurret,
    fireGroup,
    contactShadow,
  };
}

export function setVehicleNeon(rig: VehicleRig, neonColor: NeonColorId) {
  if (neonColor === 'off') {
    rig.neonStrip.visible = false;
    return;
  }
  rig.neonStrip.visible = true;
  rig.neonMat.color.setHex(NEON_HEX[neonColor]);
}

export function createCharacterMesh(
  profile: CharacterProfile,
  contactShadowTex: THREE.Texture,
  custom?: CharacterCustomization,
): CharacterRig {
  const cfg = custom ?? profile.defaults;
  const isFemale = profile.id === 'elena';
  const group = new THREE.Group();

  const jacketMat = new THREE.MeshStandardMaterial({ color: cfg.jacketColor, roughness: 0.55 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirtColor, roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pantsColor, roughness: 0.78 });
  const skinMat = new THREE.MeshStandardMaterial({
    map: createSkinTattooTexture(profile.skinColor, cfg.tattooStyle),
    roughness: 0.56,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: createCharacterFaceTexture(profile.skinColor, cfg.beardStyle, isFemale),
    roughness: 0.5,
  });
  const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hairColor, roughness: 0.82 });
  const shadesMat = new THREE.MeshStandardMaterial({
    color: cfg.shadesColor,
    metalness: 0.85,
    roughness: 0.12,
    transparent: true,
    opacity: 0.65,
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.22 });

  // Sculpted Athletic Anatomical Torso (Broad Chest -> Tapered Waist, Pelvis, Belt & Lapels)
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.21 : 0.245, isFemale ? 0.165 : 0.19, 0.46, 18),
    jacketMat,
  );
  torso.scale.set(1.22, 1, 0.72);
  torso.position.y = 1.16;
  torso.castShadow = true;
  group.add(torso);

  const shouldersCap = new THREE.Mesh(
    new THREE.SphereGeometry(isFemale ? 0.195 : 0.225, 16, 10),
    jacketMat,
  );
  shouldersCap.scale.set(1.26, 0.56, 0.74);
  shouldersCap.position.y = 1.36;
  shouldersCap.castShadow = true;
  group.add(shouldersCap);

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(isFemale ? 0.185 : 0.195, 16, 12), pantsMat);
  pelvis.scale.set(1.12, 0.76, 0.76);
  pelvis.position.y = 0.88;
  group.add(pelvis);

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.172 : 0.196, isFemale ? 0.174 : 0.198, 0.055, 18),
    shoeMat,
  );
  belt.scale.set(1.18, 1, 0.74);
  belt.position.y = 0.94;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.025), metalMat);
  buckle.position.set(0, 0.94, 0.145);
  group.add(belt, buckle);

  const shirtStripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.058, 0.36, 14),
    shirtMat,
  );
  shirtStripe.scale.set(1.05, 1, 0.62);
  shirtStripe.position.set(0, 0.04, 0.125);
  torso.add(shirtStripe);

  if (profile.id === 'kairo') {
    // Signature DJ Studio Neck Headphones around collar
    const hpBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.018, 8, 18, Math.PI * 1.25),
      metalMat,
    );
    hpBand.rotation.x = Math.PI * 0.42;
    hpBand.rotation.z = -Math.PI * 0.12;
    hpBand.position.set(0, 1.44, 0.03);
    const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 12), shadesMat);
    cupL.rotation.z = Math.PI / 2;
    cupL.position.set(-0.14, 1.38, 0.12);
    const cupR = cupL.clone();
    cupR.position.x = 0.14;
    group.add(hpBand, cupL, cupR);
  }

  const parachutePack = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.26, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 }),
  );
  parachutePack.scale.set(1.15, 1, 0.52);
  parachutePack.position.set(0, 1.18, -0.18);
  parachutePack.visible = false;
  group.add(parachutePack);

  const parachuteCanopy = new THREE.Group();
  parachuteCanopy.position.set(0, 2.8, 0);
  const canopyDome = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.46),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, roughness: 0.6 }),
  );
  parachuteCanopy.add(canopyDome);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe2e8f0 });
  [
    [-1.7, 0.3, 0.8],
    [1.7, 0.3, 0.8],
    [-1.7, 0.3, -0.8],
    [1.7, 0.3, -0.8],
  ].forEach(([lx, ly, lz]) => {
    const lGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.5, 0),
      new THREE.Vector3(lx, ly, lz),
    ]);
    parachuteCanopy.add(new THREE.Line(lGeo, lineMat));
  });
  parachuteCanopy.visible = false;
  group.add(parachuteCanopy);

  // Smooth High-Detail Head & Curved Wrap-Around Shades
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.63, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.15, 14), skinMat);
  neck.position.y = -0.14;
  headGroup.add(neck);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.174, 24, 20), skinMat);
  cranium.scale.set(0.92, 1.08, 0.98);
  cranium.castShadow = true;

  const faceMaskGeo = new THREE.SphereGeometry(
    0.176,
    24,
    20,
    -Math.PI * 0.38,
    Math.PI * 0.76,
    Math.PI * 0.14,
    Math.PI * 0.74,
  );
  faceMaskGeo.rotateY(Math.PI / 2);
  const faceMask = new THREE.Mesh(faceMaskGeo, faceMat);
  faceMask.scale.set(0.92, 1.08, 0.98);

  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.045, 4, 8), skinMat);
  nose.rotation.x = -0.32;
  nose.position.set(0, -0.015, 0.168);

  const earGeo = new THREE.SphereGeometry(0.036, 12, 10);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.scale.set(0.55, 1.15, 0.75);
  earL.position.set(-0.162, 0, 0);
  const earR = earL.clone();
  earR.position.x = 0.162;

  const shadesGroup = new THREE.Group();
  const lensGeo = new THREE.SphereGeometry(0.046, 12, 10);
  const lensL = new THREE.Mesh(lensGeo, shadesMat);
  lensL.scale.set(1.25, 0.72, 0.35);
  lensL.position.set(-0.062, 0.032, 0.162);
  const lensR = lensL.clone();
  lensR.position.x = 0.062;
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.04, 4, 6), metalMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.036, 0.17);
  shadesGroup.add(lensL, lensR, bridge);

  headGroup.add(cranium, faceMask, nose, earL, earR, shadesGroup);

  const fadeHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.183, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hairMat,
  );
  fadeHair.scale.set(0.94, 1.04, 1.02);
  fadeHair.position.y = 0.02;

  const slickHair = new THREE.Group();
  const slickTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.187, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat,
  );
  slickTop.scale.set(0.95, 1.1, 1.12);
  slickTop.position.set(0, 0.03, -0.02);
  slickHair.add(slickTop);

  const wavesHair = new THREE.Group();
  const waveTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.189, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat,
  );
  waveTop.position.set(0, 0.02, -0.01);
  const waveBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.18, 6, 14), hairMat);
  waveBack.position.set(0, -0.09, -0.07);
  wavesHair.add(waveTop, waveBack);

  const buzzHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.179, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    hairMat,
  );
  buzzHair.position.y = 0.02;

  const hairVariants: Record<HairStyleId, THREE.Object3D> = {
    fade: fadeHair,
    slick: slickHair,
    waves: wavesHair,
    buzz: buzzHair,
  };
  Object.values(hairVariants).forEach((h) => headGroup.add(h));

  // Smooth Curved Beard Variants (zero blocky jaw cubes!)
  const stubbleBeard = new THREE.Mesh(
    new THREE.SphereGeometry(0.166, 16, 12, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.58, Math.PI * 0.38),
    hairMat,
  );
  stubbleBeard.rotation.y = Math.PI / 2;
  stubbleBeard.position.set(0, -0.01, 0.01);

  const goateeBeard = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hairMat);
  goateeBeard.scale.set(0.95, 1.15, 0.72);
  goateeBeard.position.set(0, -0.125, 0.13);

  const fullBeard = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 18, 14, 0, Math.PI * 2, Math.PI * 0.54, Math.PI * 0.46),
    hairMat,
  );
  fullBeard.position.set(0, -0.03, 0.025);

  const beardVariants: Record<Exclude<BeardStyleId, 'clean'>, THREE.Object3D> = {
    stubble: stubbleBeard,
    goatee: goateeBeard,
    full: fullBeard,
  };
  Object.values(beardVariants).forEach((b) => headGroup.add(b));
  group.add(headGroup);

  // Anatomical Tapered Thigh + Knee + Calf Legs & Detailed Sneakers
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const makeLeg = (x: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(x, 0.86, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.076, 0.38, 14), pantsMat);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.056, 0.38, 14), pantsMat);
    calf.position.y = -0.57;
    calf.castShadow = true;
    const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.12, 6, 12), shoeMat);
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.scale.set(1.08, 1, 0.66);
    shoeUpper.position.set(0, -0.78, 0.045);
    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.032, 0.26), soleMat);
    shoeSole.position.set(0, -0.825, 0.045);
    legPivot.add(thigh, calf, shoeUpper, shoeSole);
    group.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.115);
  const rightLeg = makeLeg(0.115);

  // Smooth Rounded Articulated 2-Segment Arms (Shoulder Ball + Capsule Sleeve + Forearm + Hand)
  const makeArm = (x: number): { shoulder: THREE.Group; elbow: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(x, 1.38, 0);
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 10), jacketMat);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 6, 12), jacketMat);
    sleeve.position.y = -0.14;
    sleeve.castShadow = true;
    shoulder.add(shoulderCap, sleeve);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.18, 6, 12), skinMat);
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), skinMat);
    hand.position.y = -0.28;
    elbow.add(forearm, hand);

    shoulder.add(elbow);
    group.add(shoulder);
    return { shoulder, elbow };
  };
  const { shoulder: leftArm, elbow: leftElbow } = makeArm(-0.32);
  const { shoulder: rightArm, elbow: rightElbow } = makeArm(0.32);

  // Rounded Detailed Weapons
  const weaponPistol = new THREE.Group();
  weaponPistol.position.set(0, -0.29, 0.04);
  weaponPistol.rotation.x = Math.PI / 2;
  const pGrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.09, 4, 8), shoeMat);
  pGrip.position.set(0, -0.02, 0);
  const pSlide = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.2, 4, 10), metalMat);
  pSlide.rotation.x = Math.PI / 2;
  pSlide.position.set(0, 0.045, 0.08);
  weaponPistol.add(pGrip, pSlide);
  weaponPistol.visible = false;
  rightElbow.add(weaponPistol);

  const weaponSmg = new THREE.Group();
  weaponSmg.position.set(0, -0.29, 0.06);
  weaponSmg.rotation.x = Math.PI / 2;
  const sBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.34, 4, 10), metalMat);
  sBody.rotation.x = Math.PI / 2;
  sBody.position.set(0, 0.04, 0.14);
  const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.18, 10), metalMat);
  sBarrel.rotation.x = Math.PI / 2;
  sBarrel.position.set(0, 0.05, 0.4);
  const sMag = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.15, 4, 8), shoeMat);
  sMag.position.set(0, -0.08, 0.18);
  const sStock = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.14, 4, 8), shoeMat);
  sStock.rotation.x = Math.PI / 2;
  sStock.position.set(0, 0.03, -0.12);
  weaponSmg.add(sBody, sBarrel, sMag, sStock);
  weaponSmg.visible = false;
  rightElbow.add(weaponSmg);

  const shadowGeo = new THREE.PlaneGeometry(1.1, 1.1);
  shadowGeo.rotateX(-Math.PI / 2);
  const contactShadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  contactShadow.position.y = 0.025;
  group.add(contactShadow);

  const rig: CharacterRig = {
    group,
    torso,
    shirtStripe,
    jacketMat,
    shirtMat,
    pantsMat,
    skinMat,
    faceMat,
    hairMat,
    shadesMat,
    headGroup,
    hairVariants,
    beardVariants,
    leftArm,
    leftElbow,
    rightArm,
    rightElbow,
    leftLeg,
    rightLeg,
    weaponPistol,
    weaponSmg,
    parachutePack,
    parachuteCanopy,
    contactShadow,
  };

  applyCharacterCustomization(rig, profile.skinColor, cfg, false, isFemale);
  return rig;
}

export function applyCharacterCustomization(
  rig: CharacterRig,
  skinColor: number,
  cfg: CharacterCustomization,
  updateSkinTex = false,
  isFemale = false,
) {
  rig.jacketMat.color.setHex(cfg.jacketColor);
  rig.shirtMat.color.setHex(cfg.shirtColor);
  rig.pantsMat.color.setHex(cfg.pantsColor);
  rig.hairMat.color.setHex(cfg.hairColor);
  rig.shadesMat.color.setHex(cfg.shadesColor);

  (Object.keys(rig.hairVariants) as HairStyleId[]).forEach((style) => {
    rig.hairVariants[style].visible = style === cfg.hairStyle;
  });

  (Object.keys(rig.beardVariants) as Array<Exclude<BeardStyleId, 'clean'>>).forEach((b) => {
    rig.beardVariants[b].visible = b === cfg.beardStyle;
  });

  if (updateSkinTex) {
    rig.skinMat.map?.dispose();
    rig.skinMat.map = createSkinTattooTexture(skinColor, cfg.tattooStyle as TattooStyleId);
    rig.skinMat.needsUpdate = true;
    rig.faceMat.map?.dispose();
    rig.faceMat.map = createCharacterFaceTexture(skinColor, cfg.beardStyle, isFemale);
    rig.faceMat.needsUpdate = true;
  }
}

export function setCharacterWeaponMesh(rig: CharacterRig, weapon: WeaponId) {
  rig.weaponPistol.visible = weapon === 'pistol';
  rig.weaponSmg.visible = weapon === 'smg';
}

export function setCharacterWeaponPose(
  rig: CharacterRig,
  weapon: WeaponId,
  isMoving: boolean,
  walkCycle: number,
  recoil = 0,
) {
  if (weapon === 'pistol') {
    rig.rightArm.rotation.set(-1.38 - recoil * 0.28, -0.08, 0);
    rig.rightElbow.rotation.set(-0.18 + recoil * 0.14, 0, 0);
    rig.leftArm.rotation.set(-1.12 - recoil * 0.15, 0.42, 0.12);
    rig.leftElbow.rotation.set(-0.48, 0, -0.25);
  } else if (weapon === 'smg') {
    rig.rightArm.rotation.set(-0.98 - recoil * 0.22, 0.22, -0.05);
    rig.rightElbow.rotation.set(-0.56 + recoil * 0.12, 0, 0.12);
    rig.leftArm.rotation.set(-1.05 - recoil * 0.12, 0.56, 0.18);
    rig.leftElbow.rotation.set(-0.52, -0.15, -0.22);
  } else {
    const swing = isMoving ? Math.sin(walkCycle) * 0.6 : 0;
    rig.leftArm.rotation.set(-swing * 0.7, 0, 0);
    rig.leftElbow.rotation.set(-0.15, 0, 0);
    rig.rightArm.rotation.set(swing * 0.7 - recoil * 0.85, 0, 0);
    rig.rightElbow.rotation.set(-0.15 - recoil * 0.4, 0, 0);
  }
}
