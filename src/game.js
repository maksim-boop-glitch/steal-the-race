import * as THREE from 'three';
import { Player } from './player.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { SP_REWARDS } from './skills.js';
import { getRandomAbility } from './abilities.js';
import { createMap1 } from './maps/map1.js';
import { createMap2 } from './maps/map2.js';
import { createMap3 } from './maps/map3.js';

const MAP_CREATORS = [createMap1, createMap2, createMap3];

const STATE = {
  MAIN_MENU:    'MAIN_MENU',
  MAP_SELECT:   'MAP_SELECT',
  SKILL_SELECT: 'SKILL_SELECT',
  KEYBINDS:     'KEYBINDS',
  COUNTDOWN:    'COUNTDOWN',
  RACING:       'RACING',
  POST_RACE:    'POST_RACE',
};

export class Game {
  constructor(renderer) {
    this.renderer  = renderer;
    this.scene     = new THREE.Scene();
    this.input     = new Input();
    this.ui        = new UI(this);

    this.players   = [new Player(1), new Player(2)];
    this.cars      = [];
    this.track     = null;
    this.cameras   = [];

    this.playerCount   = 1;
    this.selectedMapIdx = 0;
    this.state         = null;
    this.raceStarted   = false;
    this.raceTime      = 0;
    this.finishOrder   = [];

    // Gravity / effects
    this.gravityFlipped = false;

    this._setupLights();
    this._setState(STATE.MAIN_MENU);
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(30, 60, 20);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far  = 300;
    dir.shadow.camera.left = dir.shadow.camera.bottom = -100;
    dir.shadow.camera.right = dir.shadow.camera.top = 100;
    this.scene.add(dir);
    this.sunLight = dir;
  }

  _makeCamera() {
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
    cam.position.set(0, 8, 15);
    return cam;
  }

  _setState(s) {
    this.state = s;
    switch (s) {
      case STATE.MAIN_MENU:   this.ui.showMainMenu(); break;
      case STATE.MAP_SELECT:  this.ui.showMapSelect(); break;
      case STATE.SKILL_SELECT: this._startSkillSelect(); break;
      case STATE.KEYBINDS:    this._showKeybinds(); break;
      case STATE.COUNTDOWN:   this._startCountdown(); break;
      case STATE.RACING:      /* driven by update */ break;
      case STATE.POST_RACE:   this._showPostRace(); break;
    }
  }

  // ── Public actions called by UI ──────────────────────────────────────────

  setPlayerCount(n) {
    this.playerCount = n;
    this._setState(STATE.MAP_SELECT);
  }

  selectMap(idx) {
    this.selectedMapIdx = idx;
    this._setState(STATE.SKILL_SELECT);
  }

  // ── Skill selection ───────────────────────────────────────────────────────

  _startSkillSelect() {
    this._skillSelectIndex = 0;
    this._doSkillSelectFor(0);
  }

  _doSkillSelectFor(pi) {
    if (pi >= this.playerCount) {
      this._setState(STATE.KEYBINDS);
      return;
    }
    this.ui.showSkillSelect(pi, skill => {
      this.players[pi].selectedSkill = skill;
      this._doSkillSelectFor(pi + 1);
    });
  }

  // ── Keybind display ───────────────────────────────────────────────────────

  _showKeybinds() {
    const mapNames = ['Skyway Circuit', 'Canyon Rush', 'Neon Megacity'];
    this.ui.showKeybinds(this.playerCount, mapNames[this.selectedMapIdx], () => {
      this._buildRace();
      this._setState(STATE.COUNTDOWN);
    });
  }

  // ── Race build ────────────────────────────────────────────────────────────

  _buildRace() {
    // Dispose old track
    if (this.track) { this.track.dispose(); this.track = null; }
    // Remove old cars
    this.cars.forEach(c => this.scene.remove(c.mesh));
    this.cars = [];
    this.cameras = [];
    this.finishOrder = [];

    // Reset players
    for (let i = 0; i < this.playerCount; i++) {
      this.players[i].resetForRace();
    }

    // Build track
    this.track = MAP_CREATORS[this.selectedMapIdx](this.scene);

    // Sky / fog
    this.scene.background = new THREE.Color(this.track.sky);
    if (this.track.sky === 0x0a0a2a) {
      this.scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);
    } else if (this.track.sky === 0xdd8844) {
      this.scene.fog = new THREE.Fog(0xdd8844, 60, 200);
    } else {
      this.scene.fog = new THREE.Fog(this.track.sky, 80, 250);
    }

    // Create cars
    for (let i = 0; i < this.playerCount; i++) {
      const car = new Car(i);
      const sp  = this.track.spawnPoints[i] || this.track.spawnPoints[0];
      car.setSpawn(sp.pos, sp.rot);

      // Apply skill
      const skill = this.players[i].selectedSkill;
      if (skill) skill.apply(car);

      this.scene.add(car.mesh);
      this.cars.push(car);
      this.cameras.push(this._makeCamera());
    }

    this.raceTime    = 0;
    this.raceStarted = false;
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  _startCountdown() {
    let count = 3;
    this.ui.showHUD(this.playerCount);
    this.ui.showCountdown(count);
    const tick = () => {
      count--;
      if (count > 0) {
        this.ui.showCountdown(count);
        setTimeout(tick, 1000);
      } else if (count === 0) {
        this.ui.showCountdown(0);
        setTimeout(() => {
          this.ui.hideCountdown();
          this.raceStarted = true;
          this._setState(STATE.RACING);
        }, 800);
      }
    };
    setTimeout(tick, 1000);
  }

  // ── Update (called every frame) ───────────────────────────────────────────

  update(dt) {
    if (this.state !== STATE.RACING && this.state !== STATE.COUNTDOWN) return;

    this.track.update(dt);

    for (let i = 0; i < this.playerCount; i++) {
      const car    = this.cars[i];
      const player = this.players[i];

      if (!this.raceStarted) {
        this._updateHUDFor(i);
        continue;
      }

      // Input
      const movement = this.input.getMovement(i);
      const abilitySlot = this.input.getAbilityPressed(i);

      // Use ability
      if (abilitySlot >= 0) {
        const ab = player.useAbility(abilitySlot);
        if (ab) ab.activate(car, this);
      }

      // Car physics
      car.update(dt, movement, this.track);

      // Wall collision
      this.track.checkWallCollision(car);

      // Ability box pickup
      this.track.checkAbilityBoxes(car, player, this);

      // Hazard collision
      this.track.checkHazards(car, player, this);

      // Missile collision
      this.track.checkMissiles(car, player, this);

      // Car vs Car collision
      this._carCarCollision(i);

      // Checkpoint
      if (!player.finished) {
        const cpResult = this.track.checkCheckpoint(car, player);
        if (cpResult === 'lap') {
          this.ui.flashCenter(`P${i+1} — Lap ${Math.min(player.lap, 3)}/3!`, '#ffdd00');
        } else if (cpResult === 'finish') {
          player.finished = true;
          this.finishOrder.push(i);
          this.ui.flashCenter(`P${i+1} FINISHED! ${this.finishOrder.length === 1 ? '🏆' : ''}`, '#ffffff');
        }
      }

      // Update HUD
      this._updateHUDFor(i);

      // Billboard labels
      car.billboardLabel(this.cameras[i]);
    }

    // Check if race is over
    if (this.raceStarted && this._isRaceOver()) {
      this._setState(STATE.POST_RACE);
    }

    this.raceTime += dt;
  }

  _updateHUDFor(i) {
    this.ui.updateHUD(i, this.players[i], this.cars[i]);
  }

  _carCarCollision(idx) {
    const car = this.cars[idx];
    if (car.dead) return;
    for (let j = 0; j < this.cars.length; j++) {
      if (j === idx) continue;
      const other = this.cars[j];
      if (other.dead) return;
      const dist = car.mesh.position.distanceTo(other.mesh.position);
      if (dist < 3.2) {
        // Push apart
        const push = car.mesh.position.clone().sub(other.mesh.position).setY(0).normalize();
        car.mesh.position.addScaledVector(push, 0.15);
        // Transfer velocity
        const relVel = car.velocity.clone().sub(other.velocity);
        if (relVel.dot(push) < 0) {
          car.velocity.addScaledVector(push, -relVel.dot(push) * 0.6);
          // Ramming at speed can kill
          if (relVel.length() > 12) {
            const killed = other.kill(car);
            if (killed) {
              this.players[idx].stealAbilitiesFrom(this.players[j]);
              this.ui.flashCenter(`P${idx+1} eliminated P${j+1}!`, '#ff4444');
            }
          }
        }
      }
    }
  }

  _isRaceOver() {
    // Race ends when all players have finished, or after 8 minutes (safety)
    if (this.raceTime > 480) return true;
    for (let i = 0; i < this.playerCount; i++) {
      if (!this.players[i].finished) return false;
    }
    return true;
  }

  // ── Post race ─────────────────────────────────────────────────────────────

  _showPostRace() {
    // Build finish order (add anyone who hasn't finished yet)
    for (let i = 0; i < this.playerCount; i++) {
      if (!this.finishOrder.includes(i)) this.finishOrder.push(i);
    }

    const results = this.finishOrder.map((pi, place) => {
      const spEarned = SP_REWARDS[place] || 0;
      this.players[pi].addSkillPoints(spEarned);
      return { playerIndex: pi, spEarned, totalSP: this.players[pi].skillPoints };
    });

    this.ui.showPostRace(results, action => {
      if (action === 'again') {
        this._setState(STATE.SKILL_SELECT);
      } else {
        this._setState(STATE.MAIN_MENU);
      }
    });
  }

  // ── Ability effects (called by ABILITIES) ─────────────────────────────────

  onAbilityPickup(playerIndex) {
    // Visual feedback
    this.ui.flashCenter(`P${playerIndex+1} got ability!`, '#ffee00', 900);
  }

  empPulse(originCar, radius, duration) {
    for (const c of this.cars) {
      if (c === originCar || c.dead) continue;
      if (c.mesh.position.distanceTo(originCar.mesh.position) < radius) {
        c.slowMult = 0.35;
        setTimeout(() => { c.slowMult = 1; }, duration);
      }
    }
  }

  timeWarp(originCar, duration) {
    for (const c of this.cars) {
      if (c === originCar || c.dead) continue;
      c.slowMult = 0.2;
      setTimeout(() => { c.slowMult = 1; }, duration);
    }
  }

  freezeNearest(originCar, duration) {
    let nearest = null, minDist = Infinity;
    for (const c of this.cars) {
      if (c === originCar || c.dead) continue;
      const d = c.mesh.position.distanceTo(originCar.mesh.position);
      if (d < minDist) { minDist = d; nearest = c; }
    }
    if (nearest) {
      nearest.frozen = true;
      setTimeout(() => { nearest.frozen = false; }, duration);
    }
  }

  deathZone(originCar, radius) {
    const originPI = this.cars.indexOf(originCar);
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (c === originCar || c.dead) continue;
      if (c.mesh.position.distanceTo(originCar.mesh.position) < radius) {
        const killed = c.kill(originCar);
        if (killed && originPI >= 0) {
          this.players[originPI].stealAbilitiesFrom(this.players[i]);
        }
      }
    }
  }

  rewindOthers(originCar) {
    const originPI = this.cars.indexOf(originCar);
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (c === originCar) continue;
      if (this.players[i].lastCheckpointPos) {
        c.rewindToCheckpoint();
      }
    }
  }

  fireMissile(originCar) {
    const pi = this.cars.indexOf(originCar);
    const otherCars = this.cars.filter(c => c !== originCar);
    this.track.fireMissile(originCar, this.players[pi], otherCars);
  }

  teleportForward(car) {
    // Move forward 20 units along car's facing direction
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(car.mesh.rotation);
    const newPos = car.mesh.position.clone().addScaledVector(fwd, 22);
    const ground = this.track.getGroundAt(newPos);
    if (ground.hit) {
      car.mesh.position.copy(newPos);
      car.mesh.position.y = ground.y + 0.4;
      car.velocity.set(0, 0, 0);
    }
  }

  magnetPull(originCar, radius) {
    for (const ab of this.track.abilityBoxes) {
      if (!ab.active) continue;
      const d = ab.mesh.position.distanceTo(originCar.mesh.position);
      if (d < radius) {
        // Instantly collect
        const pi = this.cars.indexOf(originCar);
        if (pi >= 0) {
          const added = this.players[pi].addAbility(ab.ability, originCar.doublePickup);
          if (added) {
            ab.active = false;
            ab.mesh.visible = false;
            setTimeout(() => {
              ab.active = true;
              ab.mesh.visible = true;
              ab.ability = getRandomAbility();
            }, 10000);
          }
        }
      }
    }
  }

  spawnHazard(type, position, ownerCar) {
    const pi = this.cars.indexOf(ownerCar);
    this.track.spawnHazard(type, position, ownerCar, pi >= 0 ? this.players[pi] : null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const renderer = this.renderer;
    const W = renderer.domElement.clientWidth;
    const H = renderer.domElement.clientHeight;

    if (this.cars.length === 0) {
      // No scene yet — blank render
      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.setScissorTest(true);
      renderer.render(this.scene, this._makeCamera());
      return;
    }

    renderer.setScissorTest(true);

    if (this.playerCount === 1) {
      const cam = this.cameras[0];
      this._followCamera(cam, this.cars[0]);
      cam.aspect = W / H;
      cam.updateProjectionMatrix();
      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.render(this.scene, cam);
    } else {
      // Split screen
      const halfW = Math.floor(W / 2);

      for (let i = 0; i < Math.min(2, this.cars.length); i++) {
        const cam = this.cameras[i];
        this._followCamera(cam, this.cars[i]);
        cam.aspect = halfW / H;
        cam.updateProjectionMatrix();

        const vpX = i === 0 ? 0 : halfW;
        renderer.setViewport(vpX, 0, halfW, H);
        renderer.setScissor(vpX, 0, halfW, H);
        renderer.render(this.scene, cam);
      }
    }
  }

  _followCamera(camera, car) {
    if (car.dead) return;
    const target = car.mesh.position.clone();
    // Camera offset behind and above car
    const back = new THREE.Vector3(0, 0, 1).applyEuler(car.mesh.rotation);
    const offset = back.multiplyScalar(12).add(new THREE.Vector3(0, 7, 0));
    const desired = target.clone().add(offset);
    camera.position.lerp(desired, 0.08);
    camera.lookAt(target.clone().add(new THREE.Vector3(0, 1, 0)));
  }
}
