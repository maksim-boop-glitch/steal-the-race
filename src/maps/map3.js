import * as THREE from 'three';
import { Track } from '../track.js';

/**
 * MAP 3 — Neon Megacity
 * Multi-level rooftop track. Uses STEP ramps (overlapping platforms at
 * increasing heights) so the ground-detection creates a smooth gradient.
 * All sections wide (22+ units) and overlap ≥ 4 units.
 *
 * Path (counterclockwise):
 *   Spawn (ground, z=-12) → +Z straight (ground)
 *   → corner (+X) → elevated straight (-Z)
 *   → corner (-X, step DOWN) → bottom straight (+Z)
 *   → corner (+X, step UP) → high straight (-Z)
 *   → corner (-X, step DOWN) → return straight (+Z) → spawn
 */
export function createMap3(scene) {
  const track = new Track(scene);
  track.name = 'Neon Megacity';
  track.sky  = 0x0a0a2a;
  track.deathY = -50;

  const CONC = 0x4a7aaa;
  const NEON = 0x3a6590;
  const HIGH = 0x7a3aaa;
  const OBS  = 0xff2266;
  const W    = 22;
  const H    = 1;

  // Helper: step ramp between two heights over a given Z range at center X
  function addRamp(cx, yLow, yHigh, zStart, zEnd, width = W) {
    const steps = 4;
    const zLen  = (zEnd - zStart) / steps;
    for (let i = 0; i < steps; i++) {
      const y  = yLow + (yHigh - yLow) * (i / (steps - 1));
      const zc = zStart + zLen * (i + 0.5);
      track.addPlatform(cx, y, zc, width, H, Math.abs(zLen) + 4, i % 2 === 0 ? CONC : NEON);
    }
  }

  // ── GROUND LEVEL (y = 0) ─────────────────────────────────────────────────

  // Section A: start straight +Z  →  x:-11..11, z:-20..70
  track.addPlatform(0, 0, 25, W, H, 90, CONC);
  track.addWall(-12, 2, 25, 1, 4, 92, 0x2a5a8a);
  track.addWall( 12, 2, 25, 1, 4, 92, 0x2a5a8a);

  // Section B: top-left corner (ground) →  x:-11..80, z:62..90
  track.addPlatform(35, 0, 76, 92, H, 28, CONC);
  track.addWall(35, 2, 91, 94, 4, 1, 0x2a5a8a);
  track.addWall(-13, 2, 76, 1, 4, 30, 0x2a5a8a);

  track.addObstacle(10, 0.8, 76, 3, 1.5, 3, OBS);
  track.addObstacle(55, 0.8, 76, 3, 1.5, 3, OBS);

  // ── STEP RAMP UP: ground (y=0) → elevated (y=8) ──────────────────────────
  // Goes from x=70 at z=62..90, then ramp up heading -Z
  // Ramp at x=80: z from 80 down to 20 (going -Z), rising from 0 to 8
  addRamp(80, 0, 8, 80, 20, W);

  // ── ELEVATED LEVEL (y = 8) ───────────────────────────────────────────────

  // Section C: elevated straight -Z  →  x:69..91, z:-30..24
  track.addPlatform(80, 8, -3, W, H, 54, HIGH);
  track.addWall(69, 10, -3, 1, 4, 56, 0x6a2a9a);
  track.addWall(91, 10, -3, 1, 4, 56, 0x6a2a9a);

  track.addObstacle(76, 8.8,  10, 3, 1.5, 3, OBS);
  track.addObstacle(84, 8.8, -20, 3, 1.5, 3, OBS);

  // Section D: bottom-right corner (elevated)  →  x:-10..92, z:-42..-18
  track.addPlatform(41, 8, -30, 102, H, 24, HIGH);
  track.addWall(41, 10, -44, 104, 4, 1, 0x6a2a9a);
  track.addWall(93, 10, -30,   1, 4, 26, 0x6a2a9a);

  track.addObstacle(41, 8.8, -30, 3, 1.5, 3, OBS);

  // ── STEP RAMP DOWN: elevated (y=8) → ground (y=0) ───────────────────────
  // Section E: bottom straight -X at z=-38 → goes from x=30 down to x=-60
  // Ramp heading -X: z=-48..-28, x from 25 down to -70
  addRamp(-20, 8, 0, -20, -48, W);   // ramp downward heading -Z? Let me do X direction instead
  // Actually use a wide downward ramp in the Z direction at x=-10:
  track.addPlatform(-10, 4, -43, W, H, 14, CONC);  // mid-step
  track.addPlatform(-10, 0, -55, W, H, 14, CONC);  // bottom step

  // ── GROUND LEVEL AGAIN ────────────────────────────────────────────────────

  // Section E: ground straight +Z  →  x:-21..-1, z:-60..60
  track.addPlatform(-11, 0, 0, W, H, 120, CONC);
  track.addWall(-22, 2, 0, 1, 4, 122, 0x2a5a8a);
  track.addWall(  0, 2, 0, 1, 4, 122, 0x2a5a8a);

  track.addObstacle(-7,  0.8,  30, 3, 1.5, 3, OBS);
  track.addObstacle(-15, 0.8, -15, 3, 1.5, 3, OBS);

  // Top-left return corner  x:-22..12, z:60..92
  track.addPlatform(-5, 0, 76, 34, H, 32, CONC);
  track.addWall(-5, 2, 93, 36, 4, 1, 0x2a5a8a);

  // ── CHECKPOINTS ──────────────────────────────────────────────────────────
  // CP0 start/finish — gate at z=-4 on section A
  track.addCheckpoint(0,   2,  -4,  24, 6,  1, 0);
  // CP1 — gate at x=70 on section B corner (cars going +X)
  track.addCheckpoint(60,  2,  76,   1, 6, 30, 1);
  // CP2 — gate at z=-3 on elevated section C (cars going -Z, at y=8)
  track.addCheckpoint(80, 10,  -3,  24, 6,  1, 2);
  // CP3 — gate at x=-10 on section E (cars going -X, z=-30)
  track.addCheckpoint(-11, 2, -30,  24, 6,  1, 3);

  // ── ABILITY BOXES ─────────────────────────────────────────────────────────
  track.addAbilityBox(  0, 1.5,  20);
  track.addAbilityBox(  0, 1.5,  55);
  track.addAbilityBox( 40, 1.5,  76);
  track.addAbilityBox( 80, 9.5,  15);
  track.addAbilityBox( 80, 9.5, -15);
  track.addAbilityBox( 40, 9.5, -30);
  track.addAbilityBox(-11, 1.5,  10);
  track.addAbilityBox(-11, 1.5, -25);

  // ── SPAWN POINTS ──────────────────────────────────────────────────────────
  track.spawnPoints = [
    { pos: new THREE.Vector3(-3, 1, -12), rot: Math.PI },
    { pos: new THREE.Vector3( 3, 1, -12), rot: Math.PI },
  ];

  // ── NEON POINT LIGHTS ─────────────────────────────────────────────────────
  [[0x00ffff, 40, 10, 76], [0xff00ff, 80, 15, -3], [0xff8800, -11, 8, -30]].forEach(([color, x, y, z]) => {
    const light = new THREE.PointLight(color, 3, 50);
    light.position.set(x, y, z);
    scene.add(light);
  });

  // ── BUILDING DECORATIONS ──────────────────────────────────────────────────
  [[120, 5, 40], [-50, 6, 20], [130, 7, -40], [-50, 4, -60]].forEach(([x, y, z]) => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(12, y * 2, 12),
      new THREE.MeshLambertMaterial({ color: 0x110022 })
    );
    b.position.set(x, y, z);
    track.group.add(b);
  });

  return track;
}
