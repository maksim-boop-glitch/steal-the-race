import * as THREE from 'three';

const COLORS         = [0xff3333, 0x3388ff];
const COCKPIT_COLORS = [0xcc1111, 0x1155cc];

export class Car {
  constructor(playerIndex, label = null) {
    this.playerIndex = playerIndex;
    this._labelText  = label || `P${playerIndex + 1}`;
    this.velocity    = new THREE.Vector3();
    this.onGround    = false;

    // ── Physics ───────────────────────────────────────────────────────────
    // Max speed tuned to feel like Mario Kart 8 on these track sizes.
    this.maxSpeed    = 75;
    // Gradual acceleration — reaches top speed in ~3 seconds from standstill.
    this.accel       = 25;   // maxSpeed / 3
    this.brakeForce  = 55;
    // Turn rate is INDEPENDENT of car speed (separated).
    // Minimum horizonal speed required to steer (no tank-turning).
    this.turnSpeed   = 2.5;  // rad/s when moving
    this.minSteerSpd = 4;    // units/s — must be moving to steer

    this.speedMult   = 1;
    this.slowMult    = 1;
    this.respawnDelay = 2000;

    // ── State flags ───────────────────────────────────────────────────────
    this.dead         = false;
    this.shielded     = false;
    this.ghost        = false;
    this.frozen       = false;
    this.doublePickup = false;
    this.predator     = false;

    this.spawnPos  = new THREE.Vector3();
    this.spawnRot  = 0;
    this._lastCpPos = null;
    this._lastCpRot = 0;

    this.mesh = this._buildMesh();
  }

  _buildMesh() {
    const group        = new THREE.Group();
    const bodyColor    = COLORS[this.playerIndex];
    const cockpitColor = COCKPIT_COLORS[this.playerIndex];

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 3.2),
      new THREE.MeshLambertMaterial({ color: bodyColor })
    );
    body.position.y = 0.28;
    body.castShadow = true;
    group.add(body);

    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.4, 1.6),
      new THREE.MeshLambertMaterial({ color: cockpitColor })
    );
    cockpit.position.set(0, 0.73, -0.2);
    group.add(cockpit);

    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
    const wMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    [[-1,0,1.1],[1,0,1.1],[-1,0,-1.1],[1,0,-1.1]].forEach(([x,y,z]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      group.add(w);
    });

    // Exhaust glow (speed boost)
    this.exhaustMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0 })
    );
    this.exhaustMesh.position.set(0, 0, 1.8);
    group.add(this.exhaustMesh);

    // EMP ring
    this.empRing = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.2, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 })
    );
    this.empRing.rotation.x = Math.PI / 2;
    this.empRing.position.y = 0.5;
    group.add(this.empRing);

    // Shield
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 14, 14),
      new THREE.MeshLambertMaterial({ color: 0x00eeff, transparent: true, opacity: 0.28 })
    );
    this.shieldMesh.visible = false;
    group.add(this.shieldMesh);

    // Ice overlay
    this.iceMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0 })
    );
    group.add(this.iceMesh);

    // Floating label
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.playerIndex === 0 ? '#ff5555' : '#5588ff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._labelText, 128, 64);
    this._label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.9),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false })
    );
    this._label.position.y = 1.9;
    this._label.renderOrder = 999;
    group.add(this._label);

    return group;
  }

  setSpawn(pos, rot) {
    this.spawnPos.copy(pos);
    this.spawnRot = rot;
    this._lastCpPos = pos.clone();
    this._lastCpRot = rot;
    this._doRespawn();
  }

  saveCheckpoint(pos, rot) {
    this._lastCpPos = pos.clone();
    this._lastCpRot = rot;
    this.spawnPos.copy(pos);
    this.spawnRot = rot;
  }

  respawnAtCheckpoint() {
    if (this.dead) return;
    this.dead = true;
    this.frozen = false;
    this.velocity.set(0, 0, 0);
    this.mesh.visible = false;
    setTimeout(() => this._doRespawn(), 1000);
  }

  kill(killerCar) {
    if (this.ghost) return false;
    if (this.shielded) {
      this.shielded = false;
      this.shieldMesh.visible = false;
      return false;
    }
    if (this.dead) return false;
    this.dead = true;
    this.frozen = false;
    this.velocity.set(0, 0, 0);
    this.mesh.visible = false;
    setTimeout(() => this._doRespawn(), this.respawnDelay);
    return true;
  }

  _doRespawn() {
    this.dead = false;
    this.velocity.set(0, 0, 0);
    const pos = this._lastCpPos || this.spawnPos;
    this.mesh.position.copy(pos);
    this.mesh.position.y += 1.5;
    this.mesh.rotation.set(0, this._lastCpRot || this.spawnRot, 0);
    this.mesh.visible = true;
    this.iceMesh.material.opacity = 0;
    this.frozen = false;
    this.slowMult = 1;
  }

  rewindToCheckpoint() {
    this.velocity.set(0, 0, 0);
    if (this._lastCpPos) {
      this.mesh.position.copy(this._lastCpPos);
      this.mesh.position.y += 1.5;
      this.mesh.rotation.y = this._lastCpRot || 0;
    }
  }

  update(dt, movement, jump, track) {
    if (this.dead) return;
    if (this.frozen) { this.iceMesh.material.opacity = 0.45; return; }
    this.iceMesh.material.opacity = 0;

    const effective   = this.speedMult * this.slowMult;
    const horizSpeed  = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    const isMoving    = horizSpeed > this.minSteerSpd;
    const isTurning   = isMoving && (movement.left || movement.right);

    // ── Front-wheel steering — rate independent of speed ──────────────────
    // Car CANNOT rotate from standstill (no tank turning).
    if (isMoving) {
      if (movement.left)  this.mesh.rotation.y += this.turnSpeed * dt;
      if (movement.right) this.mesh.rotation.y -= this.turnSpeed * dt;
    }

    // ── Jump ──────────────────────────────────────────────────────────────
    if (jump && this.onGround) {
      this.velocity.y = 15;
      this.onGround   = false;
    }

    // ── Horizontal acceleration (same in air as on ground) ────────────────
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.mesh.rotation);
    // When turning: max speed is 0.8× straight-line max
    const maxSpd = this.maxSpeed * effective * (isTurning ? 0.8 : 1.0);

    if (movement.forward) this.velocity.addScaledVector(forward, this.accel * effective * dt);
    if (movement.back)    this.velocity.addScaledVector(forward, -this.brakeForce * effective * dt);

    // Clamp horizontal speed
    const spd2d = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (spd2d > maxSpd) {
      const s = maxSpd / spd2d;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }

    // ── Gravity ───────────────────────────────────────────────────────────
    this.velocity.y -= 40 * dt;

    // ── Ground friction (only when on ground, not pressing gas) ───────────
    if (this.onGround) {
      if (!movement.forward && !movement.back) {
        const friction = Math.pow(0.90, dt * 60);
        this.velocity.x *= friction;
        this.velocity.z *= friction;
      }
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    this.mesh.position.addScaledVector(this.velocity, dt);

    // ── Ground collision ──────────────────────────────────────────────────
    const ground = track.getGroundAt(this.mesh.position);
    if (ground.hit && this.mesh.position.y <= ground.y + 0.35) {
      this.mesh.position.y = ground.y + 0.35;
      this.velocity.y = 0;
      this.onGround   = true;
    } else {
      this.onGround = false;
    }

    // Exhaust glow while boosting
    this.exhaustMesh.material.opacity = this.speedMult > 1.5 ? 0.9 : 0;

    // EMP ring decay
    if (this.empRing.material.opacity > 0) {
      this.empRing.rotation.y += dt * 4;
      this.empRing.material.opacity = Math.max(0, this.empRing.material.opacity - dt * 0.6);
    }
  }

  billboardLabel(camera) {
    if (this._label) this._label.quaternion.copy(camera.quaternion);
  }
}
