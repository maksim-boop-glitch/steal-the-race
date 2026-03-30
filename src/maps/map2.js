import * as THREE from 'three';
import { Track } from '../track.js';

/**
 * MAP 2 — Canyon Rush
 * Longer snake-shaped track through canyon walls.
 * Track width: 20 units. All sections overlap ≥ 4 units.
 *
 * Path: Spawn → +Z → right (+X) → -Z → left (-X) → +Z → right (+X) → return
 * Forms a stretched S/Z shape.
 */
export function createMap2(scene) {
  const track = new Track(scene);
  track.name = 'Canyon Rush';
  track.sky  = 0xdd8844;
  track.deathY = -30;

  const SAND = 0xcc9966;
  const WALL = 0x886644;
  const OBS  = 0x8b0000;
  const W    = 20;
  const H    = 1;

  // ── SECTION 1: Start straight going +Z ───────────────────────────────────
  // x: -10..10,  z: -20..80
  track.addPlatform(0, 0, 30, W, H, 100, SAND);
  track.addWall(-11, 1.5, 30, 1, 4, 102, WALL);
  track.addWall( 11, 1.5, 30, 1, 4, 102, WALL);

  track.addObstacle(-4, 0.8,  5, 3, 1.5, 3, OBS);
  track.addObstacle( 4, 0.8, 55, 3, 1.5, 3, OBS);

  // ── CORNER 1: wide right turn to +X ──────────────────────────────────────
  // Connects section1 top (z=72..80) to section2 left (x=10..18)
  // x: -12..100,  z: 68..100
  track.addPlatform(44, 0, 84, 112, H, 32, SAND);
  track.addWall(44, 1.5, 102, 114, 4, 1, WALL);
  track.addWall(-13, 1.5, 84, 1, 4, 34, WALL);
  track.addWall(101, 1.5, 84, 1, 4, 34, WALL);

  track.addObstacle(44, 0.8, 84, 3, 1.5, 3, OBS);

  // ── SECTION 2: going +X ──────────────────────────────────────────────────
  // x: 10..160,  z: 68..88  (center z=78)
  track.addPlatform(85, 0, 78, 150, H, 20, SAND);
  track.addWall(85, 1.5, 67, 152, 4, 1, WALL);
  track.addWall(85, 1.5, 89, 152, 4, 1, WALL);

  track.addObstacle( 50, 0.8, 78, 3, 1.5, 3, OBS);
  track.addObstacle(100, 0.8, 74, 3, 1.5, 3, OBS);
  track.addObstacle(140, 0.8, 82, 3, 1.5, 3, OBS);

  // ── CORNER 2: right turn going -Z ────────────────────────────────────────
  // x: 150..190,  z: 64..100
  track.addPlatform(170, 0, 82, 40, H, 36, SAND);
  track.addWall(170, 1.5, 102, 42, 4, 1, WALL);
  track.addWall(192, 1.5, 82,  1, 4, 38, WALL);

  // ── SECTION 3: going -Z ──────────────────────────────────────────────────
  // x: 160..180,  z: -60..80
  track.addPlatform(170, 0, 10, W, H, 140, SAND);
  track.addWall(159, 1.5, 10, 1, 4, 142, WALL);
  track.addWall(181, 1.5, 10, 1, 4, 142, WALL);

  track.addObstacle(174, 0.8,  50, 3, 1.5, 3, OBS);
  track.addObstacle(166, 0.8,  10, 3, 1.5, 3, OBS);
  track.addObstacle(172, 0.8, -30, 3, 1.5, 3, OBS);

  // ── CORNER 3: left turn going -X ─────────────────────────────────────────
  // x: 50..190,  z: -74..-48
  track.addPlatform(120, 0, -61, 140, H, 26, SAND);
  track.addWall(120, 1.5, -75, 142, 4, 1, WALL);
  track.addWall( 49, 1.5, -61,   1, 4, 28, WALL);
  track.addWall(191, 1.5, -61,   1, 4, 28, WALL);

  track.addObstacle(120, 0.8, -61, 3, 1.5, 3, OBS);

  // ── SECTION 4: going -X ──────────────────────────────────────────────────
  // x: -10..100,  z: -74..-54  (center z=-64)
  track.addPlatform(45, 0, -64, 110, H, 20, SAND);
  track.addWall(45, 1.5, -53, 112, 4, 1, WALL);
  track.addWall(45, 1.5, -75, 112, 4, 1, WALL);

  track.addObstacle( 80, 0.8, -68, 3, 1.5, 3, OBS);
  track.addObstacle( 30, 0.8, -60, 3, 1.5, 3, OBS);

  // ── CORNER 4: right turn going +Z back to spawn ───────────────────────────
  // x: -12..16,  z: -74..-8  (connects section4 end to section1 start)
  track.addPlatform(2, 0, -41, 28, H, 66, SAND);
  track.addWall(-14, 1.5, -41, 1, 4, 68, WALL);
  track.addWall( 14, 1.5, -41, 1, 4, 68, WALL);
  track.addWall( 2,  1.5, -76, 28, 4,  1, WALL);

  // ── CHECKPOINTS (in lap order) ────────────────────────────────────────────
  // CP0: start/finish — gate across section1 at z = -4
  track.addCheckpoint(0,   2, -4,  22, 6,  1, 0);
  // CP1: gate across section2 midpoint (car going +X at z=78, x=90)
  track.addCheckpoint(90,  2, 78,   1, 6, 22, 1);
  // CP2: gate across section3 at z=10 (car going -Z)
  track.addCheckpoint(170, 2, 10,  22, 6,  1, 2);
  // CP3: gate across section4 at x=40 (car going -X, z=-64)
  track.addCheckpoint(40,  2, -64,  1, 6, 22, 3);

  // ── ABILITY BOXES ─────────────────────────────────────────────────────────
  track.addAbilityBox(  0, 1.5,  25);
  track.addAbilityBox(  0, 1.5,  65);
  track.addAbilityBox( 80, 1.5,  78);
  track.addAbilityBox(140, 1.5,  78);
  track.addAbilityBox(170, 1.5,  35);
  track.addAbilityBox(170, 1.5, -25);
  track.addAbilityBox( 60, 1.5, -64);
  track.addAbilityBox(  2, 1.5, -40);

  // ── SPAWN POINTS ──────────────────────────────────────────────────────────
  track.spawnPoints = [
    { pos: new THREE.Vector3(-3, 1, -12), rot: Math.PI },
    { pos: new THREE.Vector3( 3, 1, -12), rot: Math.PI },
  ];

  // ── ROCK DECORATIONS ──────────────────────────────────────────────────────
  [[200, 5, 0], [-30, 6, 40], [200, 8, -80], [-30, 4, 80]].forEach(([x, y, z]) => {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(5 + Math.random() * 4),
      new THREE.MeshLambertMaterial({ color: 0x885533 })
    );
    rock.position.set(x, y, z);
    track.group.add(rock);
  });

  return track;
}
