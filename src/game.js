import * as THREE from 'three';
import { Player } from './player.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { AIController } from './ai.js';
import { SP_REWARDS, SKILLS } from './skills.js';
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
    this.renderer = renderer;
    this.scene    = new THREE.Scene();
    this.input    = new Input();
    this.ui       = new UI(this);

    this.players  = [new Player(1), new Player(2)];
    this.cars     = [];
    this.track    = null;
    this.cameras  = [];
    this.ai       = null;   // AIController, active in 1P mode

    this.playerCount    = 1;
    this.selectedMapIdx = 0;
    this.state          = null;
    this.raceStarted    = false;
    this.raceTime       = 0;
    this.finishOrder    = [];

    // Visual effects pool
    this._effects = [];

    this._setupLights();
    this._setState(STATE.MAIN_MENU);
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(30, 60, 20);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far  = 300;
    dir.shadow.camera.left = dir.shadow.camera.bottom = -120;
    dir.shadow.camera.right = dir.shadow.camera.top   =  120;
    this.scene.add(dir);
  }

  _makeCamera() {
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
    cam.position.set(0, 8, 15);
    return cam;
  }

  _setState(s) {
    this.state = s;
    switch (s) {
      case STATE.MAIN_MENU:    this.ui.showMainMenu(); break;
      case STATE.MAP_SELECT:   this.ui.showMapSelect(); break;
      case STATE.SKILL_SELECT: this._startSkillSelect(); break;
      case STATE.KEYBINDS:     this._showKeybinds(); break;
      case STATE.COUNTDOWN:    this._startCountdown(); break;
      case STATE.RACING:       /* driven by update */ break;
      case STATE.POST_RACE:    this._showPostRace(); break;
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
    if (this.track) { this.track.dispose(); this.track = null; }
    this.cars.forEach(c => this.scene.remove(c.mesh));
    this._clearEffects();
    this.cars        = [];
    this.cameras     = [];
    this.finishOrder = [];
    this.ai          = null;

    for (let i = 0; i < 2; i++) this.players[i].resetForRace();

    this.track = MAP_CREATORS[this.selectedMapIdx](this.scene);

    // Sky / fog
    this.scene.background = new THREE.Color(this.track.sky);
    if (this.track.sky === 0x0a0a2a) {
      this.scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);
    } else if (this.track.sky === 0xdd8844) {
      this.scene.fog = new THREE.Fog(0xdd8844, 80, 260);
    } else {
      this.scene.fog = new THREE.Fog(this.track.sky, 100, 300);
    }

    // Always create 2 cars (one might be AI)
    for (let i = 0; i < 2; i++) {
      const car = new Car(i);
      const sp  = this.track.spawnPoints[i] || this.track.spawnPoints[0];
      car.setSpawn(sp.pos, sp.rot);

      // Apply skill for human players
      if (i < this.playerCount) {
        const skill = this.players[i].selectedSkill;
        if (skill) skill.apply(car);
      } else {
        // AI gets a random skill
        const aiSkill = SKILLS[Math.floor(Math.random() * SKILLS.length)];
        aiSkill.apply(car);
      }

      this.scene.add(car.mesh);
      this.cars.push(car);
      this.cameras.push(this._makeCamera());
    }

    // Set up AI for 1P mode
    if (this.playerCount === 1) {
      this.ai = new AIController(0.78);
      // Relabel AI car
      // (Label 'AI' is already set in car.js for playerIndex 1)
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
      } else {
        this.ui.showCountdown(0); // GO!
        setTimeout(() => {
          this.ui.hideCountdown();
          this.raceStarted = true;
          this._setState(STATE.RACING);
        }, 800);
      }
    };
    setTimeout(tick, 1000);
  }

  // ── Main update ───────────────────────────────────────────────────────────

  update(dt) {
    if (this.state !== STATE.RACING && this.state !== STATE.COUNTDOWN) return;

    this.track.update(dt);
    this._updateEffects();

    // Iterate both cars always (second may be AI)
    for (let i = 0; i < 2; i++) {
      const car    = this.cars[i];
      const player = this.players[i];
      const isAI   = (this.playerCount === 1 && i === 1);

      if (!this.raceStarted) {
        if (i < this.playerCount) this._updateHUDFor(i);
        continue;
      }

      let movement, jump;

      if (isAI) {
        // AI navigation
        movement = this.ai.getMovement(car, player, this.track, dt);
        jump     = movement.jump;
        this.ai.maybeUseAbility(player, car, this, dt);
      } else {
        movement = this.input.getMovement(i);
        jump     = this.input.getJump(i);

        // Ability activation
        const slot = this.input.getAbilityPressed(i);
        if (slot >= 0) {
          const ab = player.useAbility(slot);
          if (ab) ab.activate(car, this);
        }
      }

      // Physics
      car.update(dt, movement, jump, this.track);
      this.track.checkWallCollision(car);

      // Fall off map → respawn at last checkpoint after 1s
      if (!car.dead && car.mesh.position.y < this.track.deathY) {
        car.respawnAtCheckpoint();
        if (!isAI) this.ui.flashCenter('FELL OFF — Respawning…', '#ff8800', 1000);
      }

      // Pickups & hazards
      if (!car.dead) {
        this.track.checkAbilityBoxes(car, player, this);
        this.track.checkHazards(car, player, this);
        this.track.checkMissiles(car, player, this);
        this._carCarCollision(i);
      }

      // Checkpoint / lap
      if (!player.finished && !car.dead) {
        const result = this.track.checkCheckpoint(car, player);
        if (result === 'lap') {
          if (!isAI) this.ui.flashCenter(`LAP ${Math.min(player.lap, 3)} / 3 !`, '#ffdd00', 1500);
        } else if (result === 'finish') {
          player.finished = true;
          this.finishOrder.push(i);
          const pos = this.finishOrder.length;
          if (!isAI) this.ui.flashCenter(pos === 1 ? '🏆 YOU WIN!' : `FINISHED — P${pos}`, pos === 1 ? '#ffd700' : '#ffffff', 2500);
        }
      }

      // HUD update (human players only)
      if (!isAI) this._updateHUDFor(i);
      else       this._updateAIStatus(car, player);
    }

    // Car billboard labels
    for (let i = 0; i < 2; i++) {
      const camIdx = Math.min(i, this.cameras.length - 1);
      this.cars[i].billboardLabel(this.cameras[0]);
    }

    if (this.raceStarted && this._isRaceOver()) {
      this._setState(STATE.POST_RACE);
    }
    this.raceTime += dt;
  }

  _updateHUDFor(i) {
    this.ui.updateHUD(i, this.players[i], this.cars[i]);
  }

  _updateAIStatus(car, player) {
    // Update a small AI indicator if it exists
    const el = document.getElementById('ai-status');
    if (el) {
      el.textContent = `AI — Lap ${Math.min(player.lap, 3)}/3 · ${car.dead ? 'Respawning…' : ''}`;
    }
  }

  _carCarCollision(idx) {
    const car    = this.cars[idx];
    const player = this.players[idx];
    if (car.dead) return;

    for (let j = 0; j < this.cars.length; j++) {
      if (j === idx) continue;
      const other = this.cars[j];
      if (other.dead) return;

      const dist = car.mesh.position.distanceTo(other.mesh.position);
      if (dist < 3.4) {
        const push = car.mesh.position.clone().sub(other.mesh.position).setY(0);
        if (push.length() < 0.001) push.set(1, 0, 0);
        push.normalize();

        car.mesh.position.addScaledVector(push, 0.2);

        const relVel = car.velocity.clone().sub(other.velocity);
        if (relVel.dot(push) < 0) {
          car.velocity.addScaledVector(push, -relVel.dot(push) * 0.55);
        }

        // High-speed ramming kills
        const impact = relVel.length();
        if (impact > 15 && !car.ghost) {
          const killed = other.kill(car);
          if (killed) {
            player.stealAbilitiesFrom(this.players[j]);
            const isHumanKiller = idx < this.playerCount;
            if (isHumanKiller) {
              this.ui.flashCenter(`💀 P${j + 1} ELIMINATED — Abilities Stolen!`, '#ff4444', 1500);
            }
            const isHumanVictim = j < this.playerCount;
            if (isHumanVictim) {
              this.ui.flashCenter('💀 YOU WERE HIT! Respawning…', '#ff2222', 1200);
            }
          }
        }
      }
    }
  }

  _isRaceOver() {
    if (this.raceTime > 480) return true; // 8 min safety cap
    for (let i = 0; i < 2; i++) {
      if (!this.players[i].finished) return false;
    }
    return true;
  }

  // ── Post race ─────────────────────────────────────────────────────────────

  _showPostRace() {
    for (let i = 0; i < 2; i++) {
      if (!this.finishOrder.includes(i)) this.finishOrder.push(i);
    }

    const results = this.finishOrder.map((pi, place) => {
      const spEarned = SP_REWARDS[place] || 0;
      // Only award SP to human players
      if (pi < this.playerCount) this.players[pi].addSkillPoints(spEarned);
      return { playerIndex: pi, isAI: pi >= this.playerCount, spEarned, totalSP: this.players[pi].skillPoints };
    });

    this.ui.showPostRace(results, action => {
      if (action === 'again') this._setState(STATE.SKILL_SELECT);
      else                    this._setState(STATE.MAIN_MENU);
    });
  }

  // ── Visual effects system ─────────────────────────────────────────────────

  _addEffect(mesh, duration, updateFn) {
    this.scene.add(mesh);
    this._effects.push({ mesh, created: performance.now(), duration, update: updateFn });
  }

  _updateEffects() {
    const now = performance.now();
    for (let i = this._effects.length - 1; i >= 0; i--) {
      const e = this._effects[i];
      const t = (now - e.created) / e.duration;
      if (t >= 1) {
        this.scene.remove(e.mesh);
        this._effects.splice(i, 1);
      } else {
        e.update(t, e.mesh);
      }
    }
  }

  _clearEffects() {
    for (const e of this._effects) this.scene.remove(e.mesh);
    this._effects = [];
  }

  // Speed boost orange glow
  _showBoostEffect(car, duration) {
    car.mesh.traverse(m => {
      if (m.isMesh && m.material && m.material.emissive && m !== car.shieldMesh) {
        if (m._boostOrig === undefined) m._boostOrig = m.material.emissive.getHex();
        m.material.emissive.set(0x884400);
      }
    });
    setTimeout(() => {
      car.mesh.traverse(m => {
        if (m.isMesh && m.material && m.material.emissive && m._boostOrig !== undefined) {
          m.material.emissive.set(m._boostOrig);
          delete m._boostOrig;
        }
      });
    }, duration);
    const pi = this.cars.indexOf(car);
    const isHuman = pi < this.playerCount;
    if (isHuman) this.ui.flashCenter('🚀 SPEED BOOST!', '#ff8800', 900);
  }

  // ── Ability effect implementations ───────────────────────────────────────

  onAbilityPickup(playerIndex) {
    if (playerIndex < this.playerCount) {
      this.ui.flashCenter('🎁 ABILITY COLLECTED!', '#ffee00', 700);
    }
  }

  empPulse(originCar, radius, duration) {
    // Expanding cyan ring visual
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 1.2, 48), ringMat.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(originCar.mesh.position).add(new THREE.Vector3(0, 0.3, 0));
    this._addEffect(ring, 900, (t, mesh) => {
      mesh.scale.setScalar(radius * t);
      mesh.material.opacity = 0.7 * (1 - t);
    });

    // Second slower ring
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.3, 1.0, 40), ringMat.clone());
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.copy(originCar.mesh.position).add(new THREE.Vector3(0, 0.6, 0));
    this._addEffect(ring2, 1100, (t, mesh) => {
      mesh.scale.setScalar(radius * 0.75 * t);
      mesh.material.opacity = 0.5 * (1 - t);
    });

    // Affect cars within radius
    const originPI = this.cars.indexOf(originCar);
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (c === originCar || c.dead) continue;
      if (c.mesh.position.distanceTo(originCar.mesh.position) < radius) {
        // Cyan glow on affected car
        c.empRing.material.opacity = 1;
        c.mesh.traverse(m => {
          if (m.isMesh && m.material && m.material.emissive && m !== c.shieldMesh) {
            if (m._empOrig === undefined) m._empOrig = m.material.emissive.getHex();
            m.material.emissive.set(0x006666);
          }
        });
        c.slowMult = 0.3;
        setTimeout(() => {
          c.slowMult = 1;
          c.mesh.traverse(m => {
            if (m.isMesh && m.material && m.material.emissive && m._empOrig !== undefined) {
              m.material.emissive.set(m._empOrig);
              delete m._empOrig;
            }
          });
        }, duration);

        // HUD notification for affected human player
        if (i < this.playerCount) {
          this.ui.flashCenter('⚡ EMP HIT — YOU ARE SLOWED! ⚡', '#00ffff', duration * 0.8);
        }
      }
    }
    // Feedback for EMP user
    if (originPI < this.playerCount) {
      this.ui.flashCenter('⚡ EMP FIRED!', '#00ffff', 700);
    }
  }

  timeWarp(originCar, duration) {
    for (const c of this.cars) {
      if (c === originCar || c.dead) continue;
      c.slowMult = 0.2;
      // Purple tint on warped cars
      c.mesh.traverse(m => {
        if (m.isMesh && m.material && m.material.emissive && m !== c.shieldMesh) {
          if (m._warpOrig === undefined) m._warpOrig = m.material.emissive.getHex();
          m.material.emissive.set(0x220044);
        }
      });
      setTimeout(() => {
        c.slowMult = 1;
        c.mesh.traverse(m => {
          if (m.isMesh && m.material && m.material.emissive && m._warpOrig !== undefined) {
            m.material.emissive.set(m._warpOrig);
            delete m._warpOrig;
          }
        });
      }, duration);

      const i = this.cars.indexOf(c);
      if (i < this.playerCount) {
        this.ui.flashCenter('🕒 TIME WARP — EVERYTHING IS SLOW!', '#aa44ff', duration * 0.6);
      }
    }
    const pi = this.cars.indexOf(originCar);
    if (pi < this.playerCount) this.ui.flashCenter('🕒 TIME WARP ACTIVATED!', '#aa44ff', 900);
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
      nearest.iceMesh.material.opacity = 0.55;
      // Blue flash
      nearest.mesh.traverse(m => {
        if (m.isMesh && m.material && m.material.emissive && m !== nearest.shieldMesh) {
          if (m._freezeOrig === undefined) m._freezeOrig = m.material.emissive.getHex();
          m.material.emissive.set(0x002244);
        }
      });
      setTimeout(() => {
        nearest.frozen = false;
        nearest.iceMesh.material.opacity = 0;
        nearest.mesh.traverse(m => {
          if (m.isMesh && m.material && m.material.emissive && m._freezeOrig !== undefined) {
            m.material.emissive.set(m._freezeOrig);
            delete m._freezeOrig;
          }
        });
      }, duration);

      const i = this.cars.indexOf(nearest);
      if (i < this.playerCount) {
        this.ui.flashCenter('❄ FROZEN! ❄', '#88ccff', duration * 0.6);
      }
      const pi = this.cars.indexOf(originCar);
      if (pi < this.playerCount) this.ui.flashCenter('❄ FREEZE RAY!', '#88ccff', 800);
    }
  }

  deathZone(originCar, radius) {
    const originPI = this.cars.indexOf(originCar);
    // Red expanding sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, wireframe: true })
    );
    sphere.position.copy(originCar.mesh.position);
    this._addEffect(sphere, 700, (t, mesh) => {
      mesh.scale.setScalar(radius * t);
      mesh.material.opacity = 0.5 * (1 - t);
    });

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
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (c === originCar) continue;
      c.rewindToCheckpoint();
      if (i < this.playerCount) {
        this.ui.flashCenter('⏪ REWOUND TO CHECKPOINT!', '#ff88ff', 1200);
      }
    }
  }

  fireMissile(originCar) {
    const pi      = this.cars.indexOf(originCar);
    const targets = this.cars.filter(c => c !== originCar);
    this.track.fireMissile(originCar, pi >= 0 ? this.players[pi] : null, targets);
  }

  teleportForward(car) {
    const pi     = this.cars.indexOf(car);
    const player = this.players[pi >= 0 ? pi : 0];
    // Teleport to the middle of the next (proceeding) checkpoint
    const nextCP = this.track.checkpoints.find(c => c.index === player.checkpointIndex);
    if (nextCP) {
      car.mesh.position.copy(nextCP.pos);
      car.mesh.position.y = nextCP.pos.y + 2;
      // Keep forward momentum direction, reduce speed slightly
      car.velocity.multiplyScalar(0.4);
    }
  }

  magnetPull(originCar, radius) {
    const pi = this.cars.indexOf(originCar);
    for (const ab of this.track.abilityBoxes) {
      if (!ab.active) continue;
      if (ab.mesh.position.distanceTo(originCar.mesh.position) < radius) {
        if (pi >= 0) {
          const added = this.players[pi].addAbility(ab.ability, originCar.doublePickup);
          if (added) {
            ab.active = false;
            ab.mesh.visible = false;
            const _ab = ab;
            setTimeout(() => {
              _ab.active = true;
              _ab.mesh.visible = true;
              _ab.ability = getRandomAbility();
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
    renderer.setScissorTest(true);

    if (this.cars.length === 0) {
      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.render(this.scene, this._makeCamera());
      return;
    }

    if (this.playerCount === 2) {
      const halfW = Math.floor(W / 2);
      for (let i = 0; i < 2; i++) {
        const cam = this.cameras[i];
        this._followCamera(cam, this.cars[i]);
        cam.aspect = halfW / H;
        cam.updateProjectionMatrix();
        const vpX = i === 0 ? 0 : halfW;
        renderer.setViewport(vpX, 0, halfW, H);
        renderer.setScissor(vpX, 0, halfW, H);
        renderer.render(this.scene, cam);
      }
    } else {
      // 1P — single viewport, camera follows P1
      const cam = this.cameras[0];
      this._followCamera(cam, this.cars[0]);
      cam.aspect = W / H;
      cam.updateProjectionMatrix();
      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.render(this.scene, cam);
    }
  }

  _followCamera(camera, car) {
    if (car.dead) return;
    const target = car.mesh.position.clone();
    const back   = new THREE.Vector3(0, 0, 1).applyEuler(car.mesh.rotation);
    const offset = back.multiplyScalar(14).add(new THREE.Vector3(0, 8, 0));
    const desired = target.clone().add(offset);
    camera.position.lerp(desired, 0.1);
    camera.lookAt(target.clone().add(new THREE.Vector3(0, 1.5, 0)));
  }
}
