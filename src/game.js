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
  PODIUM:       'PODIUM',
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
    this.ai       = null;

    this.playerCount     = 1;
    this.selectedMapIdx  = 0;
    this.state           = null;
    this.raceStarted     = false;
    this.raceTime        = 0;
    this.finishOrder     = [];
    this._effects        = [];

    // Per-player lap/sector timing  [{ lapStart, sectorStart, lapTimes[] }]
    this._timing = [
      { lapStart: 0, sectorStart: 0, lapTimes: [] },
      { lapStart: 0, sectorStart: 0, lapTimes: [] },
    ];

    this._podiumCam   = null;
    this._podiumAngle = 0;
    this._podiumObjects = []; // extra meshes/lights added for podium scene

    this._setupLights();
    this._setState(STATE.MAIN_MENU);
  }

  _setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(30, 60, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far  = 400;
    [-130, 130].forEach(v => {
      this.sunLight.shadow.camera.left = this.sunLight.shadow.camera.bottom = v < 0 ? v : undefined;
      this.sunLight.shadow.camera.right = this.sunLight.shadow.camera.top   = v > 0 ? v : undefined;
    });
    this.sunLight.shadow.camera.left   = -130;
    this.sunLight.shadow.camera.right  =  130;
    this.sunLight.shadow.camera.bottom = -130;
    this.sunLight.shadow.camera.top    =  130;
    this.scene.add(this.sunLight);
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
      case STATE.RACING:       break;
      case STATE.PODIUM:       this._buildPodium(); break;
      case STATE.POST_RACE:    this._showPostRace(); break;
    }
  }

  // ── Public actions ────────────────────────────────────────────────────────

  setPlayerCount(n) { this.playerCount = n; this._setState(STATE.MAP_SELECT); }
  selectMap(idx)    { this.selectedMapIdx = idx; this._setState(STATE.SKILL_SELECT); }

  // ── Skill selection ───────────────────────────────────────────────────────

  _startSkillSelect() { this._doSkillSelectFor(0); }

  _doSkillSelectFor(pi) {
    if (pi >= this.playerCount) { this._setState(STATE.KEYBINDS); return; }
    this.ui.showSkillSelect(pi, skill => {
      this.players[pi].selectedSkill = skill;
      this._doSkillSelectFor(pi + 1);
    });
  }

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
    this._clearPodiumObjects();
    this.cars        = [];
    this.cameras     = [];
    this.finishOrder = [];
    this.ai          = null;
    this._timing     = [
      { lapStart: 0, sectorStart: 0, lapTimes: [] },
      { lapStart: 0, sectorStart: 0, lapTimes: [] },
    ];

    for (let i = 0; i < 2; i++) this.players[i].resetForRace();

    this.track = MAP_CREATORS[this.selectedMapIdx](this.scene);
    this.scene.background = new THREE.Color(this.track.sky);
    this.scene.fog = this.track.sky === 0x0a0a2a
      ? new THREE.FogExp2(0x0a0a2a, 0.008)
      : new THREE.Fog(this.track.sky, 120, 350);

    // Always build 2 cars (AI for 1P second slot)
    for (let i = 0; i < 2; i++) {
      const isAICar = this.playerCount === 1 && i === 1;
      const label   = isAICar ? 'AI' : `P${i + 1}`;
      const car     = new Car(i, label);
      const sp      = this.track.spawnPoints[i] || this.track.spawnPoints[0];
      car.setSpawn(sp.pos, sp.rot);

      if (!isAICar && this.players[i].selectedSkill) {
        this.players[i].selectedSkill.apply(car);
      } else if (isAICar) {
        SKILLS[Math.floor(Math.random() * SKILLS.length)].apply(car);
      }

      this.scene.add(car.mesh);
      this.cars.push(car);
      this.cameras.push(this._makeCamera());
    }

    if (this.playerCount === 1) this.ai = new AIController(0.78);

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
      if (count > 0) { this.ui.showCountdown(count); setTimeout(tick, 1000); }
      else {
        this.ui.showCountdown(0);
        setTimeout(() => {
          this.ui.hideCountdown();
          this.raceStarted = true;
          // Start timing
          this._timing[0].lapStart = this._timing[0].sectorStart = 0;
          this._timing[1].lapStart = this._timing[1].sectorStart = 0;
          this._setState(STATE.RACING);
        }, 800);
      }
    };
    setTimeout(tick, 1000);
  }

  // ── Main update ───────────────────────────────────────────────────────────

  update(dt) {
    if (this.state === STATE.PODIUM) return; // podium is purely visual

    if (this.state !== STATE.RACING && this.state !== STATE.COUNTDOWN) return;

    this.track.update(dt);
    this._updateEffects();

    for (let i = 0; i < 2; i++) {
      const car    = this.cars[i];
      const player = this.players[i];
      const isAI   = this.playerCount === 1 && i === 1;

      if (!this.raceStarted) {
        if (!isAI) this._updateHUDFor(i);
        continue;
      }

      let movement, jump;
      if (isAI) {
        movement = this.ai.getMovement(car, player, this.track, dt);
        jump     = movement.jump;
        this.ai.maybeUseAbility(player, car, this, dt);
      } else {
        movement = this.input.getMovement(i);
        jump     = this.input.getJump(i);
        const slot = this.input.getAbilityPressed(i);
        if (slot >= 0) { const ab = player.useAbility(slot); if (ab) ab.activate(car, this); }
      }

      car.update(dt, movement, jump, this.track);
      this.track.checkWallCollision(car);

      // Fall off
      if (!car.dead && car.mesh.position.y < this.track.deathY) {
        car.respawnAtCheckpoint();
        if (!isAI) this.ui.flashCenter('FELL OFF — Respawning…', '#ff8800', 1000);
      }

      if (!car.dead) {
        this.track.checkAbilityBoxes(car, player, this);
        this.track.checkHazards(car, player, this);
        this.track.checkMissiles(car, player, this);
        this._carCarCollision(i);
      }

      // ── Checkpoint / lap with timing ──────────────────────────────────
      if (!player.finished && !car.dead) {
        const result = this.track.checkCheckpoint(car, player);
        const t = this._timing[i];

        if (result === 'checkpoint') {
          const sector = this.raceTime - t.sectorStart;
          t.sectorStart = this.raceTime;
          if (!isAI) {
            const cpNum  = player.checkpointIndex; // already incremented
            const total  = this.raceTime - t.lapStart;
            this.ui.flashCenter(
              `CP ${cpNum}/${this.track.checkpoints.length}  +${sector.toFixed(2)}s  (${_fmt(total)})`,
              '#00ff88', 1800
            );
          }
        } else if (result === 'lap') {
          const lapTime = this.raceTime - t.lapStart;
          t.lapTimes.push(lapTime);
          t.lapStart    = this.raceTime;
          t.sectorStart = this.raceTime;
          if (!isAI) {
            const lap = Math.min(player.lap, 3);
            this.ui.flashCenter(
              `LAP ${lap} / 3   ${_fmt(lapTime)}`, '#ffdd00', 2200
            );
          }
        } else if (result === 'finish') {
          const lapTime   = this.raceTime - t.lapStart;
          const totalTime = this.raceTime;
          t.lapTimes.push(lapTime);
          player.finished = true;
          player.raceTime = totalTime;
          this.finishOrder.push(i);
          const place = this.finishOrder.length;
          if (!isAI) {
            this.ui.flashCenter(
              place === 1
                ? `🏆 YOU WIN!  Total: ${_fmt(totalTime)}`
                : `FINISHED P${place}  ${_fmt(totalTime)}`,
              place === 1 ? '#ffd700' : '#ffffff', 3000
            );
          }
        }
      }

      if (!isAI) this._updateHUDFor(i);
      else       this._updateAIStatus(car, player);

      car.billboardLabel(this.cameras[0]);
    }

    if (this.raceStarted && this._isRaceOver()) {
      this._setState(STATE.PODIUM);
    }

    if (this.raceStarted) this.raceTime += dt;
  }

  _updateHUDFor(i) { this.ui.updateHUD(i, this.players[i], this.cars[i]); }

  _updateAIStatus(car, player) {
    const el = document.getElementById('ai-status');
    if (el) el.textContent = `Lap ${Math.min(player.lap, 3)}/3${car.dead ? ' · Respawning' : ''}`;
  }

  _carCarCollision(idx) {
    const car = this.cars[idx]; const player = this.players[idx];
    if (car.dead) return;
    for (let j = 0; j < this.cars.length; j++) {
      if (j === idx) continue;
      const other = this.cars[j]; if (other.dead) return;
      const dist = car.mesh.position.distanceTo(other.mesh.position);
      if (dist < 3.4) {
        const push = car.mesh.position.clone().sub(other.mesh.position).setY(0);
        if (push.length() < 0.001) push.set(1, 0, 0);
        push.normalize();
        car.mesh.position.addScaledVector(push, 0.2);
        const relVel = car.velocity.clone().sub(other.velocity);
        if (relVel.dot(push) < 0) car.velocity.addScaledVector(push, -relVel.dot(push) * 0.55);
        if (relVel.length() > 12 && !car.ghost) {
          const killed = other.kill(car);
          if (killed) {
            player.stealAbilitiesFrom(this.players[j]);
            if (idx < this.playerCount) this.ui.flashCenter(`💀 P${j+1} ELIMINATED!`, '#ff4444', 1500);
            if (j   < this.playerCount) this.ui.flashCenter('💀 YOU WERE HIT!', '#ff2222', 1200);
          }
        }
      }
    }
  }

  _isRaceOver() {
    if (this.raceTime > 480) return true;
    return this.players[0].finished && this.players[1].finished;
  }

  // ── Podium ────────────────────────────────────────────────────────────────

  _buildPodium() {
    // Ensure both cars accounted for in finish order
    for (let i = 0; i < 2; i++) {
      if (!this.finishOrder.includes(i)) this.finishOrder.push(i);
    }

    // Remove race objects
    if (this.track) { this.track.dispose(); this.track = null; }
    this.scene.fog = null;
    this.scene.background = new THREE.Color(0x0a0818);

    // Dim race lights, add podium atmosphere
    this.ambientLight.intensity = 0.3;
    this.sunLight.intensity     = 0;

    // Podium structure
    const positions = [
      { x: 0,   h: 4.0, color: 0xffd700, label: '1ST' },
      { x: -9,  h: 2.5, color: 0xbbbbbb, label: '2ND' },
      { x:  9,  h: 1.5, color: 0xcd7f32, label: '3RD' },
    ];

    // Wide base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x1a1a2e })
    );
    base.position.set(0, 0.2, 0);
    this.scene.add(base);
    this._podiumObjects.push(base);

    positions.slice(0, this.finishOrder.length).forEach((pd, place) => {
      const pi  = this.finishOrder[place];
      const car = this.cars[pi];

      // Pedestal
      const ped = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, pd.h, 6),
        new THREE.MeshLambertMaterial({ color: pd.color })
      );
      ped.position.set(pd.x, pd.h / 2 + 0.4, 0);
      this.scene.add(ped);
      this._podiumObjects.push(ped);

      // Place label (1ST/2ND/3RD) face on pedestal front
      const lc = document.createElement('canvas');
      lc.width = 256; lc.height = 128;
      const lctx = lc.getContext('2d');
      lctx.fillStyle = '#000';
      lctx.font = 'bold 72px Arial';
      lctx.textAlign = 'center'; lctx.textBaseline = 'middle';
      lctx.fillText(pd.label, 128, 64);
      const pedLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 2),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lc), transparent: true })
      );
      pedLabel.position.set(pd.x, pd.h / 2 + 0.4, 3.1);
      this.scene.add(pedLabel);
      this._podiumObjects.push(pedLabel);

      // Place car on top, facing camera
      car.mesh.visible = true;
      car.mesh.position.set(pd.x, pd.h + 0.4 + 0.35, 0);
      car.mesh.rotation.set(0, 0, 0); // face camera (camera looks from +Z)
    });

    // Spotlights
    const addSpot = (x, y, z, color, intensity) => {
      const s = new THREE.SpotLight(color, intensity, 35, Math.PI / 7, 0.3);
      s.position.set(x, y, z);
      s.target.position.set(x * 0.3, 3, 0);
      this.scene.add(s); this.scene.add(s.target);
      this._podiumObjects.push(s, s.target);
    };
    addSpot(  0, 18, 6,  0xffffff, 4);
    addSpot( -9, 16, 6,  0xddddff, 2.5);
    addSpot(  9, 16, 6,  0xddddff, 2.5);
    addSpot(  0, 14, -4, 0xffd700, 2);

    // Orbiting camera
    this._podiumCam   = this._makeCamera();
    this._podiumAngle = 0.2;

    // Show podium overlay in UI
    this.ui.showPodiumOverlay(this.finishOrder, this.playerCount, this._timing);

    // Auto-advance to post-race results after 7 seconds
    this._podiumTimer = setTimeout(() => this._setState(STATE.POST_RACE), 7000);
  }

  _clearPodiumObjects() {
    this._podiumObjects.forEach(o => this.scene.remove(o));
    this._podiumObjects = [];
    if (this._podiumTimer) clearTimeout(this._podiumTimer);
    // Restore race lights
    this.ambientLight.intensity = 0.55;
    this.sunLight.intensity     = 1.2;
  }

  // ── Post race ─────────────────────────────────────────────────────────────

  _showPostRace() {
    this._clearPodiumObjects();
    // Restore normal lighting
    this.ambientLight.intensity = 0.55;
    this.sunLight.intensity     = 1.2;

    const results = this.finishOrder.map((pi, place) => {
      const spEarned = pi < this.playerCount ? (SP_REWARDS[place] || 0) : 0;
      if (pi < this.playerCount) this.players[pi].addSkillPoints(spEarned);
      const laps = this._timing[pi].lapTimes;
      return {
        playerIndex: pi,
        isAI: pi >= this.playerCount,
        spEarned,
        totalSP:  this.players[pi].skillPoints,
        raceTime: this.players[pi].raceTime || 0,
        lapTimes: laps,
      };
    });

    this.ui.showPostRace(results, action => {
      if (action === 'again') this._setState(STATE.SKILL_SELECT);
      else                    this._setState(STATE.MAIN_MENU);
    });
  }

  // ── Visual effects ────────────────────────────────────────────────────────

  _addEffect(mesh, duration, updateFn) {
    this.scene.add(mesh);
    this._effects.push({ mesh, created: performance.now(), duration, update: updateFn });
  }

  _updateEffects() {
    const now = performance.now();
    for (let i = this._effects.length - 1; i >= 0; i--) {
      const e = this._effects[i];
      const t = (now - e.created) / e.duration;
      if (t >= 1) { this.scene.remove(e.mesh); this._effects.splice(i, 1); }
      else         e.update(t, e.mesh);
    }
  }

  _clearEffects() {
    this._effects.forEach(e => this.scene.remove(e.mesh));
    this._effects = [];
  }

  _showBoostEffect(car, duration) {
    car.mesh.traverse(m => {
      if (m.isMesh && m.material && m.material.emissive && m !== car.shieldMesh) {
        if (m._boostOrig === undefined) m._boostOrig = m.material.emissive.getHex();
        m.material.emissive.set(0x884400);
      }
    });
    setTimeout(() => car.mesh.traverse(m => {
      if (m.isMesh && m.material && m.material.emissive && m._boostOrig !== undefined) {
        m.material.emissive.set(m._boostOrig); delete m._boostOrig;
      }
    }), duration);
    const pi = this.cars.indexOf(car);
    if (pi < this.playerCount) this.ui.flashCenter('🚀 SPEED BOOST!', '#ff8800', 900);
  }

  // ── Ability effects ───────────────────────────────────────────────────────

  onAbilityPickup(playerIndex) {
    if (playerIndex < this.playerCount) this.ui.flashCenter('🎁 ABILITY COLLECTED!', '#ffee00', 700);
  }

  empPulse(originCar, radius, duration) {
    const mkRing = (dur, scl) => {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 1.2, 48),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      r.rotation.x = -Math.PI / 2;
      r.position.copy(originCar.mesh.position).add(new THREE.Vector3(0, 0.3, 0));
      this._addEffect(r, dur, (t, m) => { m.scale.setScalar(radius * scl * t); m.material.opacity = 0.7 * (1 - t); });
    };
    mkRing(900, 1.0); mkRing(1100, 0.75);

    const pi = this.cars.indexOf(originCar);
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (c === originCar || c.dead) continue;
      if (c.mesh.position.distanceTo(originCar.mesh.position) < radius) {
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
              m.material.emissive.set(m._empOrig); delete m._empOrig;
            }
          });
        }, duration);
        if (i < this.playerCount) this.ui.flashCenter('⚡ EMP HIT — SLOWED! ⚡', '#00ffff', duration * 0.8);
      }
    }
    if (pi < this.playerCount) this.ui.flashCenter('⚡ EMP FIRED!', '#00ffff', 700);
  }

  timeWarp(originCar, duration) {
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i]; if (c === originCar || c.dead) continue;
      c.slowMult = 0.2;
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
            m.material.emissive.set(m._warpOrig); delete m._warpOrig;
          }
        });
      }, duration);
      if (i < this.playerCount) this.ui.flashCenter('🕒 TIME WARP!', '#aa44ff', duration * 0.6);
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
      nearest.frozen = true; nearest.iceMesh.material.opacity = 0.55;
      nearest.mesh.traverse(m => {
        if (m.isMesh && m.material && m.material.emissive && m !== nearest.shieldMesh) {
          if (m._fzOrig === undefined) m._fzOrig = m.material.emissive.getHex();
          m.material.emissive.set(0x002244);
        }
      });
      setTimeout(() => {
        nearest.frozen = false; nearest.iceMesh.material.opacity = 0;
        nearest.mesh.traverse(m => {
          if (m.isMesh && m.material && m.material.emissive && m._fzOrig !== undefined) {
            m.material.emissive.set(m._fzOrig); delete m._fzOrig;
          }
        });
      }, duration);
      const i = this.cars.indexOf(nearest);
      if (i < this.playerCount) this.ui.flashCenter('❄ FROZEN! ❄', '#88ccff', duration * 0.6);
      const pi = this.cars.indexOf(originCar);
      if (pi < this.playerCount) this.ui.flashCenter('❄ FREEZE RAY!', '#88ccff', 800);
    }
  }

  deathZone(originCar, radius) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, wireframe: true })
    );
    sphere.position.copy(originCar.mesh.position);
    this._addEffect(sphere, 700, (t, m) => { m.scale.setScalar(radius * t); m.material.opacity = 0.5 * (1 - t); });
    const pi = this.cars.indexOf(originCar);
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i]; if (c === originCar || c.dead) continue;
      if (c.mesh.position.distanceTo(originCar.mesh.position) < radius) {
        const killed = c.kill(originCar);
        if (killed && pi >= 0) this.players[pi].stealAbilitiesFrom(this.players[i]);
      }
    }
  }

  rewindOthers(originCar) {
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i]; if (c === originCar) continue;
      c.rewindToCheckpoint();
      if (i < this.playerCount) this.ui.flashCenter('⏪ REWOUND TO CHECKPOINT!', '#ff88ff', 1200);
    }
  }

  fireMissile(originCar) {
    const pi = this.cars.indexOf(originCar);
    this.track.fireMissile(originCar, pi >= 0 ? this.players[pi] : null, this.cars.filter(c => c !== originCar));
  }

  teleportForward(car) {
    const pi     = this.cars.indexOf(car);
    const player = this.players[pi >= 0 ? pi : 0];
    const nextCP = this.track.checkpoints.find(c => c.index === player.checkpointIndex);
    if (nextCP) {
      car.mesh.position.copy(nextCP.pos);
      car.mesh.position.y = nextCP.pos.y + 2;
      car.velocity.multiplyScalar(0.4);
    }
  }

  magnetPull(originCar, radius) {
    const pi = this.cars.indexOf(originCar);
    for (const ab of this.track.abilityBoxes) {
      if (!ab.active) continue;
      if (ab.mesh.position.distanceTo(originCar.mesh.position) < radius) {
        if (pi >= 0 && this.players[pi].addAbility(ab.ability, originCar.doublePickup)) {
          ab.active = false; ab.mesh.visible = false;
          const _ab = ab;
          setTimeout(() => { _ab.active = true; _ab.mesh.visible = true; _ab.ability = getRandomAbility(); }, 10000);
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

    // ── Podium scene ──────────────────────────────────────────────────────
    if (this.state === STATE.PODIUM && this._podiumCam) {
      this._podiumAngle += 0.004;
      const r = 22;
      this._podiumCam.position.x = Math.sin(this._podiumAngle) * r;
      this._podiumCam.position.z = Math.cos(this._podiumAngle) * r;
      this._podiumCam.position.y = 9;
      this._podiumCam.lookAt(0, 3, 0);
      this._podiumCam.aspect = W / H;
      this._podiumCam.updateProjectionMatrix();
      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.render(this.scene, this._podiumCam);
      return;
    }

    // ── Race scene ────────────────────────────────────────────────────────
    if (this.cars.length === 0) {
      renderer.setViewport(0, 0, W, H);
      renderer.setScissor(0, 0, W, H);
      renderer.render(this.scene, this._makeCamera());
      return;
    }

    if (this.playerCount === 2) {
      const hw = Math.floor(W / 2);
      for (let i = 0; i < 2; i++) {
        const cam = this.cameras[i];
        this._followCamera(cam, this.cars[i]);
        cam.aspect = hw / H; cam.updateProjectionMatrix();
        renderer.setViewport(i * hw, 0, hw, H);
        renderer.setScissor(i * hw, 0, hw, H);
        renderer.render(this.scene, cam);
      }
    } else {
      const cam = this.cameras[0];
      this._followCamera(cam, this.cars[0]);
      cam.aspect = W / H; cam.updateProjectionMatrix();
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
    camera.position.lerp(target.clone().add(offset), 0.1);
    camera.lookAt(target.clone().add(new THREE.Vector3(0, 1.5, 0)));
  }
}

// Format seconds → M:SS.mm
function _fmt(s) {
  const m  = Math.floor(s / 60);
  const ss = (s % 60).toFixed(2).padStart(5, '0');
  return m > 0 ? `${m}:${ss}` : `${ss}s`;
}
