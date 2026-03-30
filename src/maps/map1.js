import * as THREE from 'three';
import { Track } from '../track.js';

/**
 * MAP 1 — Skyway Circuit
 * Floating platforms high above clouds. Big jumps, wide turns.
 * Sky: pale blue. Fog: light.
 * Layout (bird's eye, roughly):
 *
 *   [S=CP0]──────────[CP1]
 *      |                |
 *   [CP3]  (GAP)     [elevated]
 *      |                |
 *   [CP2]────────────[ramp]
 */
export function createMap1(scene) {
  const track = new Track(scene);
  track.name = 'Skyway Circuit';
  track.sky  = 0xaaddff;
  track.deathY = -40;

  const ROAD = 0x778899;
  const CURB = 0x445566;
  const ELEV = 0x99aabb;
  const OBS  = 0xcc4422;

  // ── Straight 1 (Start/Finish — CP0 at start, going south -Z) ──
  track.addPlatform(0, 0, -25, 14, 1, 50, ROAD);    // start straight
  // Curb rails
  track.addWall(-7.5, 1.2, -25, 1, 1.5, 50, CURB);
  track.addWall( 7.5, 1.2, -25, 1, 1.5, 50, CURB);

  // ── Corner 1 (right, going east) ──
  track.addPlatform(11, 0, -53, 18, 1, 18, ROAD);

  // ── Straight 2 (east, +X) ──
  track.addPlatform(38, 0, -62, 40, 1, 14, ROAD);
  track.addWall(38, 1.2, -69, 40, 1.5, 1, CURB);
  track.addWall(38, 1.2, -55, 40, 1.5, 1, CURB);

  // Obstacles on straight 2
  track.addObstacle(28, 0.8, -62, 2, 1.5, 2, OBS);
  track.addObstacle(44, 0.8, -62, 2, 1.5, 2, OBS);

  // ── Corner 2 (right, going south +Z) ──
  track.addPlatform(63, 0, -53, 18, 1, 18, ROAD);

  // ── Ramp section (elevation gain) ──
  track.addPlatform(69, 0,  -35, 12, 1, 20, ROAD);
  track.addPlatform(69, 2,  -15, 12, 1, 20, ELEV);  // +2 height
  track.addPlatform(69, 4,    4, 12, 1, 18, ELEV);  // +4 height
  // Side rails for ramp
  track.addWall(62.5, 3, -15, 1, 2.5, 20, CURB);
  track.addWall(75.5, 3, -15, 1, 2.5, 20, CURB);
  track.addWall(62.5, 5,    4, 1, 2.5, 18, CURB);
  track.addWall(75.5, 5,    4, 1, 2.5, 18, CURB);

  // ── Elevated straight (west, -X) ──
  track.addPlatform(44, 4, 13, 40, 1, 14, ELEV);
  track.addWall(44, 5.2, 6.5, 40, 1.5, 1, CURB);
  track.addWall(44, 5.2, 19.5, 40, 1.5, 1, CURB);

  // Obstacle on elevated straight
  track.addObstacle(44, 4.8, 13, 2, 1.8, 2, OBS);
  track.addObstacle(32, 4.8, 13, 2, 1.8, 2, OBS);

  // ── Gap (jump section) — 8 unit gap then landing ──
  // Ramp down from elevated
  track.addPlatform(18, 4,  13, 12, 1, 14, ELEV);
  // GAP of ~8 units
  track.addPlatform(4,  0,  13, 12, 1, 14, ROAD);   // landing pad (lower)

  // ── Corner 3 (right, going north -Z) ──
  track.addPlatform(-4, 0,  4, 14, 1, 14, ROAD);

  // ── Straight 4 (north, -Z back to start) ──
  track.addPlatform(-7, 0, -20, 14, 1, 40, ROAD);
  track.addWall(-14, 1.2, -20, 1, 1.5, 40, CURB);
  track.addWall(  0, 1.2, -20, 1, 1.5, 40, CURB);

  // ── Corner 4 back to start ──
  track.addPlatform(-3, 0, -48, 12, 1, 12, ROAD);

  // ── Checkpoints (index order around track) ──
  // CP0 = start/finish line
  track.addCheckpoint(0, 2, -2, 16, 6, 1, 0);
  track.checkpoints[0].rot = 0;
  // CP1 = after turn 1 into east straight
  track.addCheckpoint(38, 2, -62, 1, 6, 16, 1);
  // CP2 = elevated straight mid
  track.addCheckpoint(44, 6, 13, 1, 6, 16, 2);
  // CP3 = final straight south
  track.addCheckpoint(-7, 2, -20, 16, 6, 1, 3);

  // ── Ability boxes ──
  track.addAbilityBox(0,   1.5, -40);
  track.addAbilityBox(25,  1.5, -62);
  track.addAbilityBox(60,  1.5, -62);
  track.addAbilityBox(55,  5.5,  13);
  track.addAbilityBox(30,  5.5,  13);
  track.addAbilityBox(4,   1.5,  13);
  track.addAbilityBox(-7,  1.5, -10);

  // ── Spawn points ──
  track.spawnPoints = [
    { pos: new THREE.Vector3(-2, 1, -4), rot: Math.PI },
    { pos: new THREE.Vector3( 2, 1, -4), rot: Math.PI },
  ];

  // ── Decorative pillars ──
  for (let i = 0; i < 5; i++) {
    track.addWall(0, -10 + i * 2, -25 - i * 3, 1.5, 20, 1.5, 0x334455);
  }

  return track;
}
