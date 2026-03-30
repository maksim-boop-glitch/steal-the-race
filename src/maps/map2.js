import * as THREE from 'three';
import { Track } from '../track.js';

/**
 * MAP 2 — Canyon Rush
 * Tight winding track carved through canyon walls.
 * Sky: deep orange. More obstacles, narrower.
 */
export function createMap2(scene) {
  const track = new Track(scene);
  track.name = 'Canyon Rush';
  track.sky  = 0xdd8844;
  track.deathY = -30;

  const SAND  = 0xcc9955;
  const ROCK  = 0x885533;
  const WALL  = 0x664422;
  const OBS   = 0x8b0000;

  // ── Start straight (going north -Z) ──
  track.addPlatform(0, 0, -20, 12, 1, 40, SAND);
  // Canyon walls
  track.addWall(-7.5, 2, -20, 2, 5, 40, WALL);
  track.addWall( 7.5, 2, -20, 2, 5, 40, WALL);

  // ── Hairpin turn (tight left) ──
  track.addPlatform(-8, 0, -45, 10, 1, 10, SAND);
  track.addPlatform(-18, 0, -48, 10, 1, 10, SAND);

  // ── West straight ──
  track.addPlatform(-35, 0, -52, 20, 1, 11, SAND);
  track.addWall(-35, 2, -57.5, 20, 5, 2, WALL);
  track.addWall(-35, 2, -46.5, 20, 5, 2, WALL);

  // Obstacles on west straight
  track.addObstacle(-28, 0.8, -52, 2.5, 1.8, 2.5, OBS);
  track.addObstacle(-40, 0.8, -52, 2.5, 1.8, 2.5, OBS);

  // ── Turn south (right) ──
  track.addPlatform(-48, 0, -45, 10, 1, 10, SAND);
  track.addPlatform(-54, 0, -35, 10, 1, 10, SAND);

  // ── South straight with multiple obstacles ──
  track.addPlatform(-56, 0, -12, 11, 1, 40, SAND);
  track.addWall(-51.5, 2, -12, 2, 5, 40, WALL);
  track.addWall(-61.5, 2, -12, 2, 5, 40, WALL);
  track.addObstacle(-56, 0.8, -5,  2.5, 1.8, 2.5, OBS);
  track.addObstacle(-56, 0.8, -15, 2.5, 1.8, 2.5, OBS);
  track.addObstacle(-56, 0.8, -25, 2.5, 1.8, 2.5, OBS);

  // ── Gap jump heading east ──
  track.addPlatform(-56, 0, 15, 11, 1, 12, SAND);   // launch pad
  // 10 unit gap
  track.addPlatform(-56, 0, 32, 11, 1, 12, SAND);   // landing

  // ── Turn right (east) ──
  track.addPlatform(-46, 0, 39, 10, 1, 10, SAND);
  track.addPlatform(-35, 0, 43, 10, 1, 10, SAND);

  // ── East straight (back) ──
  track.addPlatform(-15, 0, 45, 40, 1, 11, SAND);
  track.addWall(-15, 2, 39.5, 40, 5, 2, WALL);
  track.addWall(-15, 2, 50.5, 40, 5, 2, WALL);
  track.addObstacle(-10, 0.8, 45, 2.5, 1.8, 2.5, OBS);

  // ── Turn north back to start ──
  track.addPlatform(10, 0, 38, 10, 1, 10, SAND);
  track.addPlatform(12, 0, 27, 10, 1, 10, SAND);
  track.addPlatform(9, 0, 15, 11, 1, 20, SAND);
  track.addPlatform(6, 0,  2, 12, 1, 20, SAND);

  // ── Checkpoints ──
  track.addCheckpoint(0, 2, -2, 14, 6, 1, 0);      // start/finish
  track.addCheckpoint(-35, 2, -52, 1, 6, 13, 1);   // west straight
  track.addCheckpoint(-56, 2, 32,  13, 6, 1, 2);   // after jump
  track.addCheckpoint(-15, 2, 45,  1, 6, 13, 3);   // east straight

  // ── Ability boxes ──
  track.addAbilityBox(0,   1.5, -30);
  track.addAbilityBox(-35, 1.5, -52);
  track.addAbilityBox(-56, 1.5, -20);
  track.addAbilityBox(-56, 1.5,  15);
  track.addAbilityBox(-20, 1.5,  45);
  track.addAbilityBox(  6, 1.5,   5);

  // ── Spawn points ──
  track.spawnPoints = [
    { pos: new THREE.Vector3(-2, 1, -4), rot: Math.PI },
    { pos: new THREE.Vector3( 2, 1, -4), rot: Math.PI },
  ];

  // ── Rock formations (decoration) ──
  const rockPositions = [
    [20, 3, -20], [-20, 4, 10], [15, 2, 30], [-70, 5, -30]
  ];
  rockPositions.forEach(([x, y, z]) => {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(4 + Math.random() * 3),
      new THREE.MeshLambertMaterial({ color: ROCK })
    );
    rock.position.set(x, y, z);
    track.group.add(rock);
  });

  return track;
}
