import * as THREE from 'three';
import { Game } from './game.js';

// ── Renderer setup ────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}
resize();
window.addEventListener('resize', resize);

// ── Game ──────────────────────────────────────────────────────────────────

const game = new Game(renderer);

let last = performance.now();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - last) / 1000, 0.05); // cap at 50ms
  last = now;

  game.update(dt);
  game.render();
}

loop();
