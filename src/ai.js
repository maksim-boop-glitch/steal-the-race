import * as THREE from 'three';

/**
 * AI controller — drives the second car in single-player mode.
 * Navigates using track checkpoints as waypoints.
 */
export class AIController {
  constructor(difficulty = 0.82) {
    this.difficulty      = difficulty;  // 0–1
    this._abilityTimer   = 1.5 + Math.random() * 3;
    this._jumpCooldown   = 0;
    this._recoverTimer   = 0;
    this._stuckTimer     = 0;
    this._lastPos        = null;
    this._reversing      = false;
    this._reverseTimer   = 0;
  }

  /**
   * Returns movement object (same shape as Input.getMovement) + jump bool.
   */
  getMovement(car, player, track, dt) {
    if (car.dead) {
      return { forward: false, back: false, left: false, right: false, jump: false };
    }

    // ── Stuck detection ───────────────────────────────────────────────────
    if (this._lastPos) {
      const moved = car.mesh.position.distanceTo(this._lastPos);
      if (moved < 0.5 * dt * 60 && car.onGround) {
        this._stuckTimer += dt;
      } else {
        this._stuckTimer = Math.max(0, this._stuckTimer - dt);
      }
    }
    this._lastPos = car.mesh.position.clone();

    if (this._stuckTimer > 1.5) {
      this._reversing    = true;
      this._reverseTimer = 1.0 + Math.random() * 0.5;
      this._stuckTimer   = 0;
    }
    if (this._reversing) {
      this._reverseTimer -= dt;
      if (this._reverseTimer <= 0) this._reversing = false;
      return { forward: false, back: true, left: true, right: false, jump: false };
    }

    // ── Target: next checkpoint ───────────────────────────────────────────
    const cpIndex = player.checkpointIndex;
    const nextCP  = track.checkpoints.find(c => c.index === cpIndex);
    if (!nextCP) {
      return { forward: true, back: false, left: false, right: false, jump: false };
    }

    const target = nextCP.pos.clone();
    const carPos = car.mesh.position.clone();
    const toTarget = target.clone().sub(carPos);
    const dist2D   = Math.sqrt(toTarget.x ** 2 + toTarget.z ** 2);
    const toTargetN = toTarget.clone().setY(0).normalize();

    const forward3 = new THREE.Vector3(0, 0, -1).applyEuler(car.mesh.rotation);
    const right3   = new THREE.Vector3(1, 0, 0).applyEuler(car.mesh.rotation);

    const dotF = forward3.dot(toTargetN);
    const dotR = right3.dot(toTargetN);

    // Add noise proportional to difficulty (harder AI is more precise)
    const noise = (Math.random() - 0.5) * (1 - this.difficulty) * 0.8;
    const steerR = dotR + noise;

    const goLeft  = steerR < -0.1;
    const goRight = steerR >  0.1;

    // Slow down for very sharp turns
    const sharpTurn = Math.abs(steerR) > 0.75 && dist2D > 6;
    const goForward = dotF > -0.25 && !sharpTurn;
    const goBack    = dotF < -0.6;

    // ── Jump logic ────────────────────────────────────────────────────────
    this._jumpCooldown -= dt;
    const heightDiff   = target.y - carPos.y;
    const shouldJump   = car.onGround && this._jumpCooldown <= 0 &&
                         (heightDiff > 3 || dist2D > 25);
    if (shouldJump) this._jumpCooldown = 2.0 + Math.random() * 1.5;

    return { forward: goForward, back: goBack, left: goLeft, right: goRight, jump: shouldJump };
  }

  /**
   * Randomly activates an ability. Called every frame with dt.
   */
  maybeUseAbility(player, car, game, dt) {
    this._abilityTimer -= dt;
    if (this._abilityTimer > 0) return;

    for (let i = 0; i < 5; i++) {
      if (player.abilities[i]) {
        const ab = player.useAbility(i);
        if (ab) ab.activate(car, game);
        break;
      }
    }
    this._abilityTimer = 2.0 + Math.random() * 5.5;
  }
}
