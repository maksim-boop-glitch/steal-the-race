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
  SPEED_BOOST: {
    id: 'SPEED_BOOST', name: 'Speed Boost', rarity: 'common',
    desc: '+60% speed 3s',
    activate(car) {
      if (car.frozen) return;
      car.speedMult *= 1.6;
      setTimeout(() => { car.speedMult /= 1.6; }, 3000);
    }
  },
  SHIELD: {
    id: 'SHIELD', name: 'Shield', rarity: 'common',
    desc: 'Block next hit',
    activate(car) {
      car.shielded = true;
      if (car.shieldMesh) car.shieldMesh.visible = true;
    }
  },
  OIL_SLICK: {
    id: 'OIL_SLICK', name: 'Oil Slick', rarity: 'common',
    desc: 'Drop oil behind',
    activate(car, game) {
      game.spawnHazard('oil', car.mesh.position.clone(), car);
    }
  },
  EMP: {
    id: 'EMP', name: 'EMP Pulse', rarity: 'common',
    desc: 'Slow nearby 2s',
    activate(car, game) {
      game.empPulse(car, 22, 2000);
    }
  },
  TURBO_LAUNCH: {
    id: 'TURBO_LAUNCH', name: 'Turbo Launch', rarity: 'common',
    desc: 'Instant burst fwd',
    activate(car) {
      if (car.frozen) return;
      const fwd = new THREE.Vector3(0, 0, -1).applyEuler(car.mesh.rotation);
      car.velocity.addScaledVector(fwd, 28);
    }
  },
  MISSILE: {
    id: 'MISSILE', name: 'Missile', rarity: 'uncommon',
    desc: 'Fire homing missile',
    activate(car, game) {
      game.fireMissile(car);
    }
  },
  TELEPORT: {
    id: 'TELEPORT', name: 'Teleport', rarity: 'uncommon',
    desc: 'Jump forward on track',
    activate(car, game) {
      game.teleportForward(car);
    }
  },
  FREEZE: {
    id: 'FREEZE', name: 'Freeze Ray', rarity: 'uncommon',
    desc: 'Freeze nearest 3s',
    activate(car, game) {
      game.freezeNearest(car, 3000);
    }
  },
  MINES: {
    id: 'MINES', name: 'Mine Layer', rarity: 'uncommon',
    desc: 'Drop 3 mines',
    activate(car, game) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const pos = car.mesh.position.clone();
          pos.x += (Math.random() - 0.5) * 2;
          pos.z += (Math.random() - 0.5) * 2;
          game.spawnHazard('mine', pos, car);
        }, i * 250);
      }
    }
  },
  TIME_WARP: {
    id: 'TIME_WARP', name: 'Time Warp', rarity: 'rare',
    desc: 'Slow all others 4s',
    activate(car, game) {
      game.timeWarp(car, 4000);
    }
  },
  GHOST: {
    id: 'GHOST', name: 'Ghost Mode', rarity: 'rare',
    desc: 'Invincible 5s',
    activate(car) {
      car.ghost = true;
      car.mesh.traverse(m => {
        if (m.isMesh && m !== car.shieldMesh) {
          if (!m._origMat) m._origMat = m.material;
          const g = m.material.clone();
          g.transparent = true; g.opacity = 0.35;
          m.material = g;
        }
      });
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
    desc: 'Pull all ability boxes',
    activate(car, game) {
      game.magnetPull(car, 40);
    }
  },
  DEATH_ZONE: {
    id: 'DEATH_ZONE', name: 'Death Zone', rarity: 'legendary',
    desc: 'Kill all within 30u',
    activate(car, game) {
      game.deathZone(car, 30);
    }
  },
  REWIND: {
    id: 'REWIND', name: 'Race Rewind', rarity: 'legendary',
    desc: 'Rewind others to checkpoint',
    activate(car, game) {
      game.rewindOthers(car);
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
