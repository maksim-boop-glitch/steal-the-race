import * as THREE from 'three';
import { Track } from '../track.js';

/**
 * MAP 1 — Skyway Circuit
 * Clean oval-ish loop floating above clouds.
 * Track width: 20 units.  Corner platforms: 90×30+.
 * All platforms overlap by ≥4 units to guarantee no gaps.
 *
 * Path (counterclockwise viewed top-down):
 *   Spawn → +Z (left straight) → corner N (+X)
 *   → right straight (-Z) → corner S (-X) → back to spawn
 *
 * Checkpoints enforce order:
 *   CP0 start/finish → CP1 top corner → CP2 right straight → CP3 bottom corner
 */
export function createMap1(scene) {
  const track = new Track(scene);
  track.name = 'Skyway Circuit';
  track.sky  = 0xaaddff;
  track.deathY = -40;

  const ROAD = 0x667788;
  const CURB = 0x334455;
  const OBS  = 0xcc4422;
  const W    = 20; // track width
  const H    = 1;  // platform height (top surface at y = 0.5)

  // ── LEFT STRAIGHT (spawn side) ─── x: -10..10, z: -20..80 ───────────────
  track.addPlatform(0, 0, 30, W, H, 100, ROAD);   // z: -20 → 80

  // outer wall
  track.addWall(-11, 1.5, 30, 1, 3, 104, CURB);
  track.addWall( 11, 1.5, 30, 1, 3, 104, CURB);

  // Obstacles on left straight
  track.addObstacle( 4, 0.8,  10, 3, 1.5, 3, OBS);
  track.addObstacle(-4, 0.8,  45, 3, 1.5, 3, OBS);

  // ── TOP CORNER ─── x: -12..92, z: 72..104 ───────────────────────────────
  // Overlaps left straight top (z=72..80) and right straight top (z=72..80)
  track.addPlatform(40, 0, 88, 104, H, 32, ROAD);  // x: -12..92, z: 72..104

  track.addWall(40, 1.5, 106, 106, 3, 1, CURB);   // outer (north)
  track.addWall(-13, 1.5, 88, 1, 3, 34, CURB);    // left
  track.addWall( 93, 1.5, 88, 1, 3, 34, CURB);    // right

  track.addObstacle(20, 0.8, 88, 3, 1.5, 3, OBS);
  track.addObstacle(60, 0.8, 88, 3, 1.5, 3, OBS);

  // ── RIGHT STRAIGHT ─── x: 70..90, z: -20..80 ───────────────────────────
  track.addPlatform(80, 0, 30, W, H, 100, ROAD);  // z: -20 → 80

  track.addWall(69, 1.5, 30, 1, 3, 104, CURB);
  track.addWall(91, 1.5, 30, 1, 3, 104, CURB);

  track.addObstacle(76, 0.8,  15, 3, 1.5, 3, OBS);
  track.addObstacle(84, 0.8,  48, 3, 1.5, 3, OBS);
  track.addObstacle(78, 0.8, -10, 3, 1.5, 3, OBS);

  // ── BOTTOM CORNER ─── x: -12..92, z: -40..-8 ───────────────────────────
  // Overlaps both straights at z=-20..-8
  track.addPlatform(40, 0, -24, 104, H, 32, ROAD); // x: -12..92, z: -40..-8

  track.addWall(40, 1.5, -42, 106, 3, 1, CURB);   // outer (south)
  track.addWall(-13, 1.5, -24, 1, 3, 34, CURB);
  track.addWall( 93, 1.5, -24, 1, 3, 34, CURB);

  track.addObstacle(40, 0.8, -24, 3, 1.5, 3, OBS);

  // ── CHECKPOINTS ──────────────────────────────────────────────────────────
  // CP0 — start/finish gate across left straight at z = -4
  track.addCheckpoint(0,  2, -4,  22, 6, 1, 0);
  // CP1 — gate across top corner at z = 90 (car going +X passes through)
  track.addCheckpoint(40, 2, 90, 106, 6, 1, 1);
  // CP2 — gate across right straight at z = 30 (car going -Z)
  track.addCheckpoint(80, 2, 30,  22, 6, 1, 2);
  // CP3 — gate across bottom corner at z = -26 (car going -X)
  track.addCheckpoint(40, 2, -26, 106, 6, 1, 3);

  // ── ABILITY BOXES ────────────────────────────────────────────────────────
  track.addAbilityBox( 0,  1.5,  20);
  track.addAbilityBox( 0,  1.5,  60);
  track.addAbilityBox(40,  1.5,  88);
  track.addAbilityBox(80,  1.5,  55);
  track.addAbilityBox(80,  1.5,  10);
  track.addAbilityBox(40,  1.5, -24);

  // ── SPAWN POINTS ─────────────────────────────────────────────────────────
  // Cars face +Z (rot = PI → forward = +Z)
  track.spawnPoints = [
    { pos: new THREE.Vector3(-3, 1, -12), rot: Math.PI },
    { pos: new THREE.Vector3( 3, 1, -12), rot: Math.PI },
  ];

  // ── DECORATIVE PILLARS (floating supports) ────────────────────────────────
  const pillarMat = 0x445566;
  [[-5, -30], [5, -30], [-5, 95], [5, 95], [75, -30], [85, -30], [75, 95], [85, 95]].forEach(([x, z]) => {
    track.addWall(x, -15, z, 2, 30, 2, pillarMat);
  });

  return track;
}
