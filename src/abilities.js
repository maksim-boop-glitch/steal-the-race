import * as THREE from 'three';

export const RARITY = { COMMON: 'common', UNCOMMON: 'uncommon', RARE: 'rare', LEGENDARY: 'legendary' };

const RARITY_WEIGHTS = { common: 50, uncommon: 30, rare: 15, legendary: 5 };

export const RARITY_COLOR = {
  common: '#aaaaaa',
  uncommon: '#44ff44',
  rare: '#6688ff',
  legendary: '#ff8800',
};

export const ABILITIES = {

  // ── COMMON ───────────────────────────────────────────────────────────────

  SPEED_BOOST: {
    id: 'SPEED_BOOST', name: 'Speed Boost', rarity: 'common',
    desc: '3× speed for 3s',
    activate(car, game) {
      if (car.frozen) return;
      car.speedMult *= 3.0;
      // Orange exhaust glow is handled by car.update via speedMult check
      if (game) game._showBoostEffect(car, 3000);
      setTimeout(() => {
        car.speedMult /= 3.0;
      }, 3000);
    }
  },

  SHIELD: {
    id: 'SHIELD', name: 'Shield', rarity: 'common',
    desc: 'Block next hit',
    activate(car, game) {
      car.shielded = true;
      if (car.shieldMesh) car.shieldMesh.visible = true;
      if (game) game.ui.flashCenter('🛡 SHIELD UP', '#00eeff', 900);
    }
  },

  OIL_SLICK: {
    id: 'OIL_SLICK', name: 'Oil Slick', rarity: 'common',
    desc: 'Drop oil that spins enemies',
    activate(car, game) {
      if (game) game.spawnHazard('oil', car.mesh.position.clone(), car);
    }
  },

  EMP: {
    id: 'EMP', name: 'EMP Pulse', rarity: 'common',
    desc: 'Slow all nearby cars',
    activate(car, game) {
      if (game) game.empPulse(car, 22, 2000);
    }
  },

  TURBO_LAUNCH: {
    id: 'TURBO_LAUNCH', name: 'Turbo Launch', rarity: 'common',
    desc: 'Instant forward burst',
    activate(car, game) {
      if (car.frozen) return;
      const fwd = new THREE.Vector3(0, 0, -1).applyEuler(car.mesh.rotation);
      car.velocity.addScaledVector(fwd, 90);
      if (game) {
        game._showBoostEffect(car, 600);
        game.ui.flashCenter('💥 TURBO!', '#ff8800', 700);
      }
    }
  },

  // ── UNCOMMON ─────────────────────────────────────────────────────────────

  MISSILE: {
    id: 'MISSILE', name: 'Missile', rarity: 'uncommon',
    desc: 'Fire homing missile',
    activate(car, game) {
      if (game) {
        game.fireMissile(car);
        game.ui.flashCenter('🚀 MISSILE FIRED', '#ff6600', 900);
      }
    }
  },

  TELEPORT: {
    id: 'TELEPORT', name: 'Teleport', rarity: 'uncommon',
    desc: 'Jump forward on track',
    activate(car, game) {
      if (game) {
        game.teleportForward(car);
        game.ui.flashCenter('✨ TELEPORT', '#aa88ff', 800);
      }
    }
  },

  FREEZE: {
    id: 'FREEZE', name: 'Freeze Ray', rarity: 'uncommon',
    desc: 'Freeze nearest enemy 3s',
    activate(car, game) {
      if (game) game.freezeNearest(car, 3000);
    }
  },

  MINES: {
    id: 'MINES', name: 'Mine Layer', rarity: 'uncommon',
    desc: 'Drop 3 mines behind you',
    activate(car, game) {
      if (!game) return;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const pos = car.mesh.position.clone();
          const back = new THREE.Vector3(0, 0, 1).applyEuler(car.mesh.rotation);
          pos.addScaledVector(back, 3 + i * 2);
          pos.x += (Math.random() - 0.5) * 2;
          game.spawnHazard('mine', pos, car);
        }, i * 280);
      }
      game.ui.flashCenter('💣 MINES DROPPED', '#ff6600', 900);
    }
  },

  // ── RARE ─────────────────────────────────────────────────────────────────

  TIME_WARP: {
    id: 'TIME_WARP', name: 'Time Warp', rarity: 'rare',
    desc: 'Slow ALL others to 20% for 4s',
    activate(car, game) {
      if (game) game.timeWarp(car, 4000);
    }
  },

  GHOST: {
    id: 'GHOST', name: 'Ghost Mode', rarity: 'rare',
    desc: 'Invincible & pass obstacles 5s',
    activate(car, game) {
      car.ghost = true;
      car.mesh.traverse(m => {
        if (m.isMesh && m !== car.shieldMesh && m !== car.iceMesh) {
          if (!m._origMat) m._origMat = m.material;
          const g = m.material.clone();
          g.transparent = true; g.opacity = 0.3;
          m.material = g;
        }
      });
      if (game) game.ui.flashCenter('👻 GHOST MODE', '#aaaaff', 1000);
      setTimeout(() => {
        car.ghost = false;
        car.mesh.traverse(m => {
          if (m.isMesh && m._origMat) { m.material = m._origMat; delete m._origMat; }
        });
      }, 5000);
    }
  },

  MAGNET: {
    id: 'MAGNET', name: 'Magnet', rarity: 'rare',
    desc: 'Pull all nearby ability boxes',
    activate(car, game) {
      if (game) {
        game.magnetPull(car, 40);
        game.ui.flashCenter('🧲 MAGNET!', '#ffaa00', 900);
      }
    }
  },

  // ── LEGENDARY ────────────────────────────────────────────────────────────

  DEATH_ZONE: {
    id: 'DEATH_ZONE', name: 'Death Zone', rarity: 'legendary',
    desc: 'Kill ALL within 30 units',
    activate(car, game) {
      if (game) {
        game.deathZone(car, 30);
        game.ui.flashCenter('💀 DEATH ZONE 💀', '#ff0000', 1200);
      }
    }
  },

  REWIND: {
    id: 'REWIND', name: 'Race Rewind', rarity: 'legendary',
    desc: 'Rewind all others to last checkpoint',
    activate(car, game) {
      if (game) {
        game.rewindOthers(car);
        game.ui.flashCenter('⏪ RACE REWIND!', '#ff88ff', 1200);
      }
    }
  },
};

const ABILITY_LIST = Object.values(ABILITIES);

export function getRandomAbility() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  let targetRarity = 'common';
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (rand < cumulative) { targetRarity = rarity; break; }
  }
  const pool = ABILITY_LIST.filter(a => a.rarity === targetRarity);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : ABILITY_LIST[0];
}
