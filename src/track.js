import * as THREE from 'three';
import { getRandomAbility } from './abilities.js';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.platforms  = []; // { box: Box3 } — driveable surfaces
    this.walls      = []; // { box: Box3 } — solid blockers
    this.checkpoints = []; // { box: Box3, index }
    this.abilityBoxes = [];
    this.hazards    = [];
    this.missiles   = [];

    this.deathY     = -20;
    this.totalLaps  = 3;
    this.spawnPoints = []; // [{ pos: Vector3, rot: number }, ...]

    this.name = 'Track';
    this.sky  = 0x87ceeb;
    this.fog  = null;
  }

  // ── Builders ──────────────────────────────────────────────────────────────

  _addBox(x, y, z, w, h, d, color, isPlatform = false, isWall = false, receiveShadow = true) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    mesh.position.set(x, y, z);
    mesh.receiveShadow = receiveShadow;
    mesh.castShadow = true;
    this.group.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    if (isPlatform) this.platforms.push({ box, mesh });
    if (isWall)     this.walls.push({ box, mesh });
    return mesh;
  }

  addPlatform(x, y, z, w, h, d, color = 0x556677) {
    return this._addBox(x, y, z, w, h, d, color, true, false);
  }

  addWall(x, y, z, w, h, d, color = 0x334455) {
    return this._addBox(x, y, z, w, h, d, color, false, true);
  }

  addObstacle(x, y, z, w, h, d, color = 0x993322) {
    // Obstacles are walls (blocking) but smaller / on-track
    return this._addBox(x, y, z, w, h, d, color, false, true);
  }

  addCheckpoint(x, y, z, w, h, d, index) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: index === 0 ? 0xffff00 : 0x00ff88, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    this.checkpoints.push({ box, mesh, index, pos: new THREE.Vector3(x, y, z), rot: 0 });
  }

  addCheckpointWithRot(x, y, z, w, h, d, index, rot = 0) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: index === 0 ? 0xffff00 : 0x00ff88, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rot;
    this.group.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    this.checkpoints.push({ box, mesh, index, pos: new THREE.Vector3(x, y, z), rot });
  }

  addAbilityBox(x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshLambertMaterial({ color: 0xffee00, emissive: 0x886600 })
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.group.add(mesh);
    this.abilityBoxes.push({
      mesh,
      ability: getRandomAbility(),
      active: true,
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getGroundAt(pos) {
    let highestY = null;
    for (const p of this.platforms) {
      const b = p.box;
      if (pos.x >= b.min.x - 0.1 && pos.x <= b.max.x + 0.1 &&
          pos.z >= b.min.z - 0.1 && pos.z <= b.max.z + 0.1) {
        const top = b.max.y;
        if (pos.y >= top - 2.5 && (highestY === null || top > highestY)) {
          highestY = top;
        }
      }
    }
    return highestY !== null ? { hit: true, y: highestY } : { hit: false, y: 0 };
  }

  checkWallCollision(car) {
    if (car.ghost) return;
    const carBox = new THREE.Box3().setFromCenterAndSize(
      car.mesh.position, new THREE.Vector3(1.9, 1.2, 3.4)
    );
    for (const w of this.walls) {
      if (carBox.intersectsBox(w.box)) {
        // Push car away from wall center
        const wCenter = new THREE.Vector3();
        w.box.getCenter(wCenter);
        const push = car.mesh.position.clone().sub(wCenter).setY(0).normalize();
        car.mesh.position.addScaledVector(push, 0.3);
        car.velocity.reflect(push);
        car.velocity.multiplyScalar(0.4);
      }
    }
  }

  checkAbilityBoxes(car, player, game) {
    for (const ab of this.abilityBoxes) {
      if (!ab.active) continue;
      if (car.mesh.position.distanceTo(ab.mesh.position) < 2) {
        const double = car.doublePickup;
        const added = player.addAbility(ab.ability, double);
        if (added) {
          ab.active = false;
          ab.mesh.visible = false;
          // Respawn after 10s with new ability
          setTimeout(() => {
            ab.active = true;
            ab.mesh.visible = true;
            ab.ability = getRandomAbility();
          }, 10000);
          if (game.onAbilityPickup) game.onAbilityPickup(player.id - 1);
        }
      }
    }
  }

  checkHazards(car, player, game) {
    if (car.ghost) return;
    const pos = car.mesh.position;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.ownerCar === car) continue; // don't hit own hazard
      if (!h.active) continue;
      if (pos.distanceTo(h.mesh.position) < h.radius) {
        if (h.type === 'oil') {
          // Spin out
          car.angularVel += (Math.random() - 0.5) * 8;
        } else if (h.type === 'mine') {
          const killed = car.kill(h.ownerPlayer);
          if (killed && h.ownerPlayer) h.ownerPlayer.stealAbilitiesFrom(player);
          h.active = false;
          this.group.remove(h.mesh);
          this.hazards.splice(i, 1);
        }
      }
    }
  }

  checkMissiles(car, player, game) {
    if (car.ghost) return;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      if (m.ownerCar === car) continue;
      if (car.mesh.position.distanceTo(m.mesh.position) < 2.5) {
        const killed = car.kill(m.ownerCar);
        if (killed && m.ownerPlayer) m.ownerPlayer.stealAbilitiesFrom(player);
        this.group.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }
  }

  checkCheckpoint(car, player) {
    const numCp = this.checkpoints.length;
    if (numCp === 0) return null;
    const expected = this.checkpoints.find(c => c.index === player.checkpointIndex);
    if (!expected) return null;
    if (expected.box.containsPoint(car.mesh.position)) {
      player.lastCheckpointPos = expected.pos.clone();
      player.lastCheckpointRot = expected.rot;
      car.saveCheckpoint(expected.pos, expected.rot);

      const nextIndex = (player.checkpointIndex + 1) % numCp;
      player.checkpointIndex = nextIndex;

      if (nextIndex === 0) {
        // Completed a lap
        player.lap++;
        if (player.lap > this.totalLaps) {
          return 'finish';
        }
        return 'lap';
      }
      return 'checkpoint';
    }
    return null;
  }

  // ── Hazard spawning ───────────────────────────────────────────────────────

  spawnHazard(type, position, ownerCar, ownerPlayer = null) {
    let color, radius, life;
    if (type === 'oil')  { color = 0x1a1a1a; radius = 2.5; life = 12; }
    if (type === 'mine') { color = 0xff6600; radius = 1.6; life = 20; }

    const mesh = new THREE.Mesh(
      type === 'oil' ? new THREE.CylinderGeometry(radius, radius, 0.12, 16)
                     : new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshLambertMaterial({ color, transparent: type === 'oil', opacity: type === 'oil' ? 0.7 : 1 })
    );
    mesh.position.copy(position);
    if (type === 'oil') mesh.position.y -= 0.4;
    this.group.add(mesh);
    this.hazards.push({ mesh, type, radius, ownerCar, ownerPlayer, active: true, life });
  }

  fireMissile(ownerCar, ownerPlayer, targets) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: 0xff4400, emissive: 0x882200 })
    );
    mesh.position.copy(ownerCar.mesh.position);
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(ownerCar.mesh.rotation);
    mesh.position.addScaledVector(fwd, 3);
    this.group.add(mesh);

    // Find nearest target
    let target = null;
    let minDist = Infinity;
    for (const t of targets) {
      if (t === ownerCar || t.dead) continue;
      const d = t.mesh.position.distanceTo(ownerCar.mesh.position);
      if (d < minDist) { minDist = d; target = t; }
    }

    this.missiles.push({ mesh, ownerCar, ownerPlayer, target, speed: 35, life: 8 });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    // Rotate/bob ability boxes
    const t = performance.now() / 1000;
    for (const ab of this.abilityBoxes) {
      if (ab.active) {
        ab.mesh.rotation.y += dt * 2;
        ab.mesh.position.y = ab.mesh.position.y + Math.sin(t * 3 + ab.mesh.position.x) * 0.003;
      }
    }

    // Update hazard lifetimes
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      this.hazards[i].life -= dt;
      if (this.hazards[i].life <= 0) {
        this.group.remove(this.hazards[i].mesh);
        this.hazards.splice(i, 1);
      }
    }

    // Update missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      if (m.life <= 0) { this.group.remove(m.mesh); this.missiles.splice(i, 1); continue; }

      // Homing
      let dir;
      if (m.target && !m.target.dead) {
        dir = m.target.mesh.position.clone().sub(m.mesh.position).normalize();
      } else {
        dir = new THREE.Vector3(0, 0, -1).applyEuler(m.mesh.rotation);
      }
      m.mesh.position.addScaledVector(dir, m.speed * dt);
      m.mesh.lookAt(m.mesh.position.clone().add(dir));
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
