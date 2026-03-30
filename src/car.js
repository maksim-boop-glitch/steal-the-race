import * as THREE from 'three';

const COLORS = [0xff3333, 0x3388ff];
const COCKPIT_COLORS = [0xcc1111, 0x1155cc];

export class Car {
  constructor(playerIndex) {
    this.playerIndex = playerIndex;
    this.velocity   = new THREE.Vector3();
    this.angularVel = 0;
    this.onGround   = false;

    // Tunables
    this.maxSpeed    = 22;
    this.accel       = 18;
    this.brakeForce  = 22;
    this.turnSpeed   = 2.4;
    this.speedMult   = 1;
    this.respawnDelay = 2000;

    // State flags
    this.dead      = false;
    this.shielded  = false;
    this.ghost     = false;
    this.frozen    = false;
    this.slowMult  = 1; // from time-warp
    this.doublePickup = false;
    this.predator     = false;

    this.spawnPos = new THREE.Vector3();
    this.spawnRot = 0;

    this.mesh = this._buildMesh();
  }

  _buildMesh() {
    const group = new THREE.Group();
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

    // Shield sphere (hidden by default)
    const shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 14, 14),
      new THREE.MeshLambertMaterial({ color: 0x00eeff, transparent: true, opacity: 0.28 })
    );
    shieldMesh.visible = false;
    group.add(shieldMesh);
    this.shieldMesh = shieldMesh;

    // Player label floating above
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.playerIndex === 0 ? '#ff5555' : '#5588ff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`P${this.playerIndex + 1}`, 64, 32);
    const labelTex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.8),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthTest: false })
    );
    label.position.y = 1.8;
    label.renderOrder = 999;
    group.add(label);

    // Make label always face camera (billboard) — done in update
    this._label = label;

    return group;
  }

  setSpawn(pos, rot) {
    this.spawnPos.copy(pos);
    this.spawnRot = rot;
    this._doRespawn();
  }

  kill(killerPlayer) {
    if (this.ghost) return false;
    if (this.shielded) {
      this.shielded = false;
      this.shieldMesh.visible = false;
      return false; // absorbed by shield
    }
    this.dead = true;
    this.mesh.visible = false;
    setTimeout(() => this._doRespawn(), this.respawnDelay);
    return true; // actually died
  }

  _doRespawn() {
    this.dead = false;
    this.velocity.set(0, 0, 0);
    this.angularVel = 0;
    this.mesh.position.copy(this.spawnPos);
    this.mesh.rotation.set(0, this.spawnRot, 0);
    this.mesh.visible = true;
  }

  rewindToCheckpoint() {
    // Called by game when 'rewind' ability is used by opponent
    this.velocity.set(0, 0, 0);
    this.angularVel = 0;
    if (this._lastCpPos) {
      this.mesh.position.copy(this._lastCpPos);
      this.mesh.rotation.y = this._lastCpRot || 0;
    }
  }

  saveCheckpoint(pos, rot) {
    this._lastCpPos = pos.clone();
    this._lastCpRot = rot;
    this.spawnPos.copy(pos);
    this.spawnRot = rot;
  }

  update(dt, movement, track) {
    if (this.dead) return;
    if (this.frozen) return;

    const effective = this.speedMult * this.slowMult;

    // Steer (only when on ground)
    if (this.onGround) {
      if (movement.left)  this.angularVel += this.turnSpeed * dt;
      if (movement.right) this.angularVel -= this.turnSpeed * dt;
    }
    this.angularVel *= Math.pow(0.80, dt * 60);
    this.mesh.rotation.y += this.angularVel * dt;

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.mesh.rotation);
    const maxSpd  = this.maxSpeed * effective;

    if (movement.forward) this.velocity.addScaledVector(forward, this.accel * effective * dt);
    if (movement.back)    this.velocity.addScaledVector(forward, -this.brakeForce * effective * dt);

    // Clamp XZ speed
    const horiz = new THREE.Vector2(this.velocity.x, this.velocity.z);
    if (horiz.length() > maxSpd) {
      horiz.setLength(maxSpd);
      this.velocity.x = horiz.x;
      this.velocity.z = horiz.y;
    }

    // Gravity
    this.velocity.y -= 28 * dt;

    // Friction on ground
    if (this.onGround) {
      this.velocity.x *= Math.pow(0.86, dt * 60);
      this.velocity.z *= Math.pow(0.86, dt * 60);
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    this.mesh.position.addScaledVector(this.velocity, dt);

    // Ground collision
    const ground = track.getGroundAt(this.mesh.position);
    if (ground.hit && this.mesh.position.y <= ground.y + 0.31) {
      this.mesh.position.y = ground.y + 0.31;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  billboardLabel(camera) {
    if (this._label) {
      this._label.quaternion.copy(camera.quaternion);
    }
  }
}
