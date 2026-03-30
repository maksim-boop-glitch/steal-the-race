import * as THREE from 'three';

const COLORS         = [0xff3333, 0x3388ff];
const COCKPIT_COLORS = [0xcc1111, 0x1155cc];

export class Car {
  constructor(playerIndex) {
    this.playerIndex = playerIndex;
    this.velocity    = new THREE.Vector3();
    this.angularVel  = 0;
    this.onGround    = false;

    // ── Tuning (4× speed) ──────────────────────────────────────────────────
    this.maxSpeed    = 88;
    this.accel       = 72;
    this.brakeForce  = 88;
    this.turnSpeed   = 2.6;
    this.speedMult   = 1;
    this.slowMult    = 1;
    this.respawnDelay = 2000;

    // ── State flags ────────────────────────────────────────────────────────
    this.dead         = false;
    this.shielded     = false;
    this.ghost        = false;
    this.frozen       = false;
    this.doublePickup = false;
    this.predator     = false;

    this.spawnPos = new THREE.Vector3();
    this.spawnRot = 0;
    this._lastCpPos = null;
    this._lastCpRot = 0;

    this.mesh = this._buildMesh();
  }

  _buildMesh() {
    const group        = new THREE.Group();
    const bodyColor    = COLORS[this.playerIndex];
    const cockpitColor = COCKPIT_COLORS[this.playerIndex];

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 3.2),
      new THREE.MeshLambertMaterial({ color: bodyColor })
    );
    body.position.y = 0.28;
    body.castShadow = true;
    group.add(body);
    this._bodyMesh = body;

    // Cockpit
    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.4, 1.6),
      new THREE.MeshLambertMaterial({ color: cockpitColor })
    );
    cockpit.position.set(0, 0.73, -0.2);
    group.add(cockpit);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
    const wMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    [[-1,0,1.1],[1,0,1.1],[-1,0,-1.1],[1,0,-1.1]].forEach(([x,y,z]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      group.add(w);
    });

    // Exhaust glow (speed boost indicator — hidden by default)
    const exhaustGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const exhaustMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0 });
    this.exhaustMesh = new THREE.Mesh(exhaustGeo, exhaustMat);
    this.exhaustMesh.position.set(0, 0, 1.8);
    group.add(this.exhaustMesh);

    // EMP indicator ring (hidden by default)
    const empRingGeo = new THREE.TorusGeometry(2, 0.2, 8, 32);
    const empRingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
    this.empRing = new THREE.Mesh(empRingGeo, empRingMat);
    this.empRing.rotation.x = Math.PI / 2;
    this.empRing.position.y = 0.5;
    group.add(this.empRing);

    // Shield sphere
    const shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 14, 14),
      new THREE.MeshLambertMaterial({ color: 0x00eeff, transparent: true, opacity: 0.28 })
    );
    shieldMesh.visible = false;
    group.add(shieldMesh);
    this.shieldMesh = shieldMesh;

    // Freeze ice overlay (hidden by default)
    const iceMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0 })
    );
    this.iceMesh = iceMesh;
    group.add(iceMesh);

    // Player label
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.playerIndex === 0 ? '#ff5555' : '#5588ff';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.playerIndex === 1 && true ? 'AI' : `P${this.playerIndex + 1}`, 128, 64);
    const labelTex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.8),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthTest: false })
    );
    label.position.y = 1.8;
    label.renderOrder = 999;
    group.add(label);
    this._label = label;

    return group;
  }

  setSpawn(pos, rot) {
    this.spawnPos.copy(pos);
    this.spawnRot = rot;
    this._lastCpPos = pos.clone();
    this._lastCpRot = rot;
    this._doRespawn();
  }

  // Called when player hits a checkpoint — update respawn location
  saveCheckpoint(pos, rot) {
    this._lastCpPos = pos.clone();
    this._lastCpRot = rot;
    this.spawnPos.copy(pos);
    this.spawnRot = rot;
  }

  // Fell off map — respawn at last checkpoint after 1 second
  respawnAtCheckpoint() {
    if (this.dead) return;
    this.dead = true;
    this.frozen = false;
    this.velocity.set(0, 0, 0);
    this.angularVel = 0;
    this.mesh.visible = false;
    setTimeout(() => this._doRespawn(), 1000);
  }

  // Killed by another car — 2 second respawn
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
    this.angularVel = 0;
    const respawnPos = this._lastCpPos || this.spawnPos;
    this.mesh.position.copy(respawnPos);
    this.mesh.position.y += 1; // spawn slightly above checkpoint surface
    this.mesh.rotation.set(0, this._lastCpRot || this.spawnRot, 0);
    this.mesh.visible = true;
    this.iceMesh.material.opacity = 0;
    this.frozen = false;
    this.slowMult = 1;
  }

  rewindToCheckpoint() {
    this.velocity.set(0, 0, 0);
    this.angularVel = 0;
    if (this._lastCpPos) {
      this.mesh.position.copy(this._lastCpPos);
      this.mesh.position.y += 1;
      this.mesh.rotation.y = this._lastCpRot || 0;
    }
  }

  // ── Main update ──────────────────────────────────────────────────────────

  update(dt, movement, jump, track) {
    if (this.dead) return;
    if (this.frozen) {
      this.iceMesh.material.opacity = 0.45;
      return;
    }
    this.iceMesh.material.opacity = 0;

    const effective = this.speedMult * this.slowMult;

    // Steer
    if (this.onGround) {
      if (movement.left)  this.angularVel += this.turnSpeed * dt;
      if (movement.right) this.angularVel -= this.turnSpeed * dt;
    }
    this.angularVel *= Math.pow(0.78, dt * 60);
    this.mesh.rotation.y += this.angularVel * dt;

    // Jump
    if (jump && this.onGround) {
      this.velocity.y = 22;
      this.onGround = false;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.mesh.rotation);
    const maxSpd  = this.maxSpeed * effective;

    if (movement.forward) this.velocity.addScaledVector(forward, this.accel * effective * dt);
    if (movement.back)    this.velocity.addScaledVector(forward, -this.brakeForce * effective * dt);

    // Clamp XZ speed
    const speed2d = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (speed2d > maxSpd) {
      const scale = maxSpd / speed2d;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    // Gravity
    this.velocity.y -= 55 * dt;

    // Friction on ground
    if (this.onGround) {
      const friction = Math.pow(0.84, dt * 60);
      this.velocity.x *= friction;
      this.velocity.z *= friction;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    this.mesh.position.addScaledVector(this.velocity, dt);

    // Ground check
    const ground = track.getGroundAt(this.mesh.position);
    if (ground.hit && this.mesh.position.y <= ground.y + 0.32) {
      this.mesh.position.y = ground.y + 0.32;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Exhaust glow when boosting
    if (this._bodyMesh) {
      this.exhaustMesh.material.opacity = this.speedMult > 1.5 ? 0.9 : 0;
    }

    // EMP ring spin
    if (this.empRing.material.opacity > 0) {
      this.empRing.rotation.y += dt * 4;
      this.empRing.material.opacity = Math.max(0, this.empRing.material.opacity - dt * 0.5);
    }
  }

  billboardLabel(camera) {
    if (this._label) this._label.quaternion.copy(camera.quaternion);
  }
}
