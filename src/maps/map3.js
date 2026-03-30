import * as THREE from 'three';
import { Track } from '../track.js';

/**
 * MAP 3 — Neon Megacity
 * Rooftop racing at night. Multiple height levels, big gaps, neon lights.
 * Sky: dark midnight blue.
 */
export function createMap3(scene) {
  const track = new Track(scene);
  track.name = 'Neon Megacity';
  track.sky  = 0x0a0a2a;
  track.deathY = -50;

  const CONC  = 0x333344;   // concrete
  const NEON1 = 0x220088;   // dark purple
  const NEON2 = 0x002244;   // dark blue
  const WALL  = 0x111122;
  const OBS   = 0xff2266;

  // ── Starting rooftop (tall building) ──
  track.addPlatform(0, 10, -20, 14, 2, 40, CONC);
  track.addWall(-7.5, 13.5, -20, 1, 4, 40, WALL);
  track.addWall( 7.5, 13.5, -20, 1, 4, 40, WALL);

  // Neon edge strips
  track.addWall(0, 11.2, -40.5, 16, 0.3, 1, OBS);
  track.addWall(0, 11.2,   0.5, 16, 0.3, 1, OBS);

  // ── Bridge gap to second building (east) ──
  track.addPlatform(20, 10, -40, 12, 1, 10, NEON1);   // bridge (narrow)
  // 8 unit gap after bridge
  track.addPlatform(42, 8,  -40, 14, 2, 20, CONC);    // lower building

  // ── East building straight ──
  track.addPlatform(42, 8, -18, 14, 2, 30, CONC);
  track.addWall(35.5, 10, -18, 1, 4, 30, WALL);
  track.addWall(48.5, 10, -18, 1, 4, 30, WALL);
  track.addObstacle(42, 9.5, -12, 2.5, 1.5, 2.5, OBS);
  track.addObstacle(42, 9.5, -22, 2.5, 1.5, 2.5, OBS);

  // ── Ramp up to tall skyscraper ──
  track.addPlatform(42, 8, -2,  12, 2, 8,  CONC);
  track.addPlatform(42, 12, 10, 12, 2, 14, NEON2);   // top of skyscraper
  track.addWall(35.5, 15, 10, 1, 5, 14, WALL);
  track.addWall(48.5, 15, 10, 1, 5, 14, WALL);

  // ── Long elevated bridge heading west (high) ──
  track.addPlatform(18, 12, 17, 52, 1.5, 12, NEON2);  // long high bridge
  track.addWall(18, 14, 11.5, 52, 3, 1, WALL);
  track.addWall(18, 14, 22.5, 52, 3, 1, WALL);
  track.addObstacle(25,  13, 17, 2, 2, 2, OBS);
  track.addObstacle(10,  13, 17, 2, 2, 2, OBS);
  track.addObstacle(-2,  13, 17, 2, 2, 2, OBS);

  // ── Gap then landing pad west ──
  track.addPlatform(-18, 8, 17, 14, 2, 14, CONC);
  // 8 unit gap between bridge end and this

  // ── West rooftop, heading south ──
  track.addPlatform(-18, 8, 4,  14, 2, 18, CONC);
  track.addWall(-25, 10, 4, 1, 4, 18, WALL);
  track.addWall(-11, 10, 4, 1, 4, 18, WALL);

  // ── Ramp back down to start level ──
  track.addPlatform(-18, 8,  -8, 12, 2, 10, CONC);
  track.addPlatform(-18, 10, -18, 12, 2, 10, NEON1);  // step up
  // step drops back
  track.addPlatform(-10, 10, -28, 10, 1, 10, NEON1);
  track.addPlatform(  0, 10, -36, 10, 1, 10, CONC);

  // ── Checkpoints ──
  track.addCheckpoint(0, 12, -2, 16, 6, 1, 0);         // start/finish
  track.addCheckpoint(42, 10, -18, 1, 6, 16, 1);       // east building
  track.addCheckpoint(18,  14, 17, 1, 6, 14, 2);       // high bridge
  track.addCheckpoint(-18, 10, 4,  16, 6, 1, 3);       // west rooftop

  // ── Ability boxes ──
  track.addAbilityBox( 0,  12,  -30);
  track.addAbilityBox(42,  10,  -30);
  track.addAbilityBox(42,  14,   10);
  track.addAbilityBox(20,  14,   17);
  track.addAbilityBox(  0, 14,   17);
  track.addAbilityBox(-18, 10,    4);

  // ── Spawn points ──
  track.spawnPoints = [
    { pos: new THREE.Vector3(-2, 11.5, -4), rot: Math.PI },
    { pos: new THREE.Vector3( 2, 11.5, -4), rot: Math.PI },
  ];

  // ── Neon building pillars (decoration) ──
  const buildingData = [
    [30, 4, 30, 8, 10, 8, 0x110033],
    [-30, 3, 30, 6, 7, 6, 0x001133],
    [60,  5, -30, 10, 12, 10, 0x220011],
    [-40, 4, -50, 7, 9, 7, 0x003311],
  ];
  buildingData.forEach(([x, y, z, w, h, d, col]) => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: col })
    );
    b.position.set(x, y, z);
    track.group.add(b);
  });

  // ── Neon point lights ──
  const neonColors = [0xff00ff, 0x00ffff, 0xff8800, 0x00ff44];
  neonColors.forEach((c, i) => {
    const light = new THREE.PointLight(c, 2, 30);
    light.position.set(-20 + i * 20, 15, 10 + i * 5);
    scene.add(light);
  });

  return track;
}
