import { SKILLS } from './skills.js';
import { RARITY_COLOR } from './abilities.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('ui');
    this.splitLine = document.getElementById('split-line');
    this._current = null;
    this._hudEl = null;
  }

  _clear() {
    this.el.innerHTML = '';
    this._hudEl = null;
    this.el.classList.remove('interactive');
    this.splitLine.style.display = 'none';
  }

  // ── Main Menu ─────────────────────────────────────────────────────────────

  showMainMenu() {
    this._clear();
    this.el.classList.add('interactive');
    this.el.innerHTML = `
      <div class="screen">
        <h1 class="title">STEAL THE RACE</h1>
        <p class="subtitle">TURBO · CHAOS · GLORY</p>
        <h2>Choose Mode</h2>
        <div class="btn-row">
          <button id="btn-1p">1 Player</button>
          <button id="btn-2p">2 Players</button>
        </div>
      </div>`;
    document.getElementById('btn-1p').onclick = () => this.game.setPlayerCount(1);
    document.getElementById('btn-2p').onclick = () => this.game.setPlayerCount(2);
  }

  // ── Map Select ────────────────────────────────────────────────────────────

  showMapSelect() {
    this._clear();
    this.el.classList.add('interactive');
    const maps = [
      { name: 'Skyway Circuit', desc: 'Floating platforms & big jumps', idx: 0 },
      { name: 'Canyon Rush',    desc: 'Tight turns through rocky canyons', idx: 1 },
      { name: 'Neon Megacity',  desc: 'Rooftop racing at night', idx: 2 },
    ];
    this.el.innerHTML = `
      <div class="screen">
        <h2>Select Map</h2>
        <div class="map-grid">
          ${maps.map(m => `
            <div class="map-card" data-idx="${m.idx}">
              <h3>${m.name}</h3>
              <p>${m.desc}</p>
            </div>`).join('')}
        </div>
        <br>
        <button id="btn-random-map">Random Map</button>
      </div>`;
    document.querySelectorAll('.map-card').forEach(card => {
      card.onclick = () => this.game.selectMap(parseInt(card.dataset.idx));
    });
    document.getElementById('btn-random-map').onclick = () =>
      this.game.selectMap(Math.floor(Math.random() * 3));
  }

  // ── Skill Select ──────────────────────────────────────────────────────────

  showSkillSelect(playerIndex, onConfirm) {
    this._clear();
    this.el.classList.add('interactive');
    const pName = `Player ${playerIndex + 1}`;
    const pColor = playerIndex === 0 ? '#ff6666' : '#6699ff';
    let selected = null;

    this.el.innerHTML = `
      <div class="screen">
        <h2 style="color:${pColor}">${pName} — Choose Your Skill</h2>
        <p class="desc">Skills provide a passive boost for the entire race. Choose wisely!</p>
        <div class="skill-grid" id="skill-grid"></div>
        <br>
        <button id="btn-confirm-skill" disabled>Confirm Skill</button>
        <p style="color:#555;margin-top:8px;font-size:0.8rem">Skill Points: ${this.game.players[playerIndex].skillPoints} SP</p>
      </div>`;

    const grid = document.getElementById('skill-grid');
    SKILLS.forEach(skill => {
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.innerHTML = `<h3>${skill.name}</h3><p>${skill.desc}</p>`;
      card.onclick = () => {
        document.querySelectorAll('.skill-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selected = skill;
        document.getElementById('btn-confirm-skill').disabled = false;
      };
      grid.appendChild(card);
    });

    document.getElementById('btn-confirm-skill').onclick = () => {
      if (selected) onConfirm(selected);
    };
  }

  // ── Keybind Display ───────────────────────────────────────────────────────

  showKeybinds(playerCount, mapName, onReady) {
    this._clear();
    this.el.classList.add('interactive');
    const p2block = playerCount === 2 ? `
      <div class="keybind-section p2-binds">
        <h3>Player 2</h3>
        <table class="keybind-table">
          <tr><td>↑↓←→</td><td>Move</td></tr>
          <tr><td>Right Shift</td><td>Jump</td></tr>
          <tr><td>6 7 8 9 0</td><td>Abilities 1–5</td></tr>
        </table>
      </div>` : '';

    this.el.innerHTML = `
      <div class="screen">
        <h2>Map: ${mapName}</h2>
        <p class="desc">3 Laps — Collect ability boxes — Steal from opponents!</p>
        <div class="keybind-row">
          <div class="keybind-section">
            <h3>Player 1</h3>
            <table class="keybind-table">
              <tr><td>W A S D</td><td>Move</td></tr>
              <tr><td>Left Shift</td><td>Jump</td></tr>
              <tr><td>1 2 3 4 5</td><td>Abilities 1–5</td></tr>
            </table>
          </div>
          ${p2block}
        </div>
        <br>
        <p class="desc" style="font-size:0.8rem;color:#777">
          Skills are passive · Abilities activate instantly · No cooldown<br>
          Kill an enemy → steal their abilities · Respawn after 2s
        </p>
        <br>
        <button id="btn-go">START RACE</button>
      </div>`;
    document.getElementById('btn-go').onclick = onReady;
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  showCountdown(num) {
    let el = document.getElementById('countdown-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'countdown-overlay';
      el.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        font-size:10rem;font-weight:bold;color:#ff2222;text-shadow:0 0 40px #ff0000;
        pointer-events:none;z-index:100;`;
      this.el.appendChild(el);
    }
    el.textContent = num === 0 ? 'GO!' : num;
    el.style.color = num === 0 ? '#00ff44' : '#ff2222';
    el.style.textShadow = num === 0 ? '0 0 40px #00ff00' : '0 0 40px #ff0000';
  }

  hideCountdown() {
    const el = document.getElementById('countdown-overlay');
    if (el) el.remove();
  }

  // ── Racing HUD ────────────────────────────────────────────────────────────

  showHUD(playerCount) {
    this._clear();
    this.splitLine.style.display = playerCount === 2 ? 'block' : 'none';
    this.playerCount = playerCount;

    const panels = [];
    for (let i = 0; i < playerCount; i++) {
      const keys = i === 0 ? 'WASD · Shift=Jump · 1-5' : '↑↓←→ · Shift=Jump · 6-0';
      panels.push(`
        <div class="player-panel p${i + 1}" id="panel-p${i + 1}">
          <div class="player-name">P${i + 1} — ${keys}</div>
          <div class="lap-sp" id="lapsp-p${i + 1}">Lap 1/3 · 0 SP</div>
          <div class="ability-bar" id="abilitybar-p${i + 1}"></div>
        </div>`);
    }

    // AI status panel in 1P mode
    const aiPanel = playerCount === 1 ? `
      <div class="player-panel p2" id="panel-ai" style="right:8px;border-color:#6644aa;">
        <div class="player-name" style="color:#bb88ff">AI Opponent</div>
        <div class="lap-sp" id="ai-status">Lap 1/3</div>
      </div>` : '';

    const centerDiv = `<div id="center-info"></div>`;
    this.el.innerHTML = panels.join('') + aiPanel + centerDiv;
  }

  updateHUD(playerIndex, player, car) {
    const lapspEl = document.getElementById(`lapsp-p${playerIndex + 1}`);
    if (lapspEl) {
      const status = player.finished ? 'FINISHED' : `Lap ${Math.min(player.lap, 3)}/3`;
      lapspEl.textContent = `${status} · ${player.skillPoints} SP · ${car.onGround ? '' : '✈'}`;
    }

    const barEl = document.getElementById(`abilitybar-p${playerIndex + 1}`);
    if (!barEl) return;
    barEl.innerHTML = '';
    const keys = playerIndex === 0
      ? ['1','2','3','4','5']
      : ['6','7','8','9','0'];

    for (let i = 0; i < 5; i++) {
      const ab = player.abilities[i];
      const slot = document.createElement('div');
      slot.className = `ability-slot ${ab ? ab.rarity : 'empty'}`;
      slot.innerHTML = `<span class="slot-key">${keys[i]}</span>${ab ? `<span class="slot-name">${ab.name}</span>` : ''}`;
      if (ab) slot.style.borderColor = RARITY_COLOR[ab.rarity];
      barEl.appendChild(slot);
    }
  }

  flashCenter(text, color = '#ffffff', duration = 1800) {
    const el = document.getElementById('center-info');
    if (!el) return;
    el.innerHTML = `<div style="font-size:2rem;color:${color};text-shadow:0 0 15px ${color};
      animation:none;">${text}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ''; }, duration);
  }

  // ── Podium overlay ────────────────────────────────────────────────────────

  showPodiumOverlay(finishOrder, playerCount, timing) {
    this._clear();
    const medals = ['🥇','🥈','🥉'];
    const places = ['1ST','2ND','3RD'];
    const names  = (pi, pc) => pi >= pc ? 'AI' : `Player ${pi + 1}`;
    const fmt    = s => { const m = Math.floor(s/60); const ss = (s%60).toFixed(2).padStart(5,'0'); return m > 0 ? `${m}:${ss}` : `${ss}s`; };

    const podiumCards = finishOrder.slice(0, 3).map((pi, i) => {
      const laps = (timing[pi]?.lapTimes || []).map((t, li) => `<span>Lap ${li+1}: ${fmt(t)}</span>`).join(' · ');
      const total = timing[pi]?.lapTimes.reduce((a,b)=>a+b,0) || 0;
      const color = pi === 0 ? '#ff6666' : '#6699ff';
      return `<div style="text-align:center;margin:0 16px;">
        <div style="font-size:2.5rem">${medals[i]}</div>
        <div style="font-size:1.4rem;font-weight:bold;color:${color};margin:4px 0">${names(pi, playerCount)}</div>
        <div style="font-size:1rem;color:#ffdd00">${places[i]}</div>
        <div style="font-size:0.75rem;color:#aaa;margin-top:6px">${laps || '—'}</div>
        <div style="font-size:0.85rem;color:#fff;margin-top:4px">Total: ${fmt(total)}</div>
      </div>`;
    }).join('');

    this.el.innerHTML = `
      <div style="position:absolute;top:0;left:0;width:100%;padding-top:30px;
        text-align:center;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,0.75) 0%,transparent 100%);">
        <h1 style="font-size:3rem;color:#ffd700;text-shadow:0 0 30px #ffd700,0 0 60px #ffd700;margin:0;letter-spacing:4px">
          🏆 RACE COMPLETE 🏆
        </h1>
        <p style="color:#888;font-size:0.85rem;margin:6px 0 20px">Results in a moment…</p>
        <div style="display:flex;justify-content:center;align-items:flex-end;gap:0">
          ${podiumCards}
        </div>
      </div>`;
  }

  // ── Post Race ─────────────────────────────────────────────────────────────

  showPostRace(results, onContinue) {
    this._clear();
    this.el.classList.add('interactive');
    const fmt  = s => { const m = Math.floor(s/60); const ss = (s%60).toFixed(2).padStart(5,'0'); return m > 0 ? `${m}:${ss}` : `${ss}s`; };
    const rows = results.map((r, i) => {
      const medal = ['🥇','🥈','🥉',''][i] || '';
      const name  = r.isAI ? 'AI' : `Player ${r.playerIndex + 1}`;
      const color = r.playerIndex === 0 ? '#ff6666' : '#6699ff';
      const laps  = (r.lapTimes || []).map((t,li)=>`<small>L${li+1}:${fmt(t)}</small>`).join(' ');
      return `<tr>
        <td>${medal} ${['1st','2nd','3rd','4th'][i]||''}</td>
        <td style="color:${color}">${name}</td>
        <td>${fmt(r.raceTime || 0)}</td>
        <td>${laps || '—'}</td>
        <td>${r.isAI ? '—' : `+${r.spEarned} SP (${r.totalSP} total)`}</td>
      </tr>`;
    }).join('');

    this.el.innerHTML = `
      <div class="screen">
        <h2>Race Results</h2>
        <table class="results-table">
          <thead><tr><th>Place</th><th>Driver</th><th>Time</th><th>Laps</th><th>Skill Points</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <br>
        <div class="btn-row">
          <button id="btn-play-again">Play Again</button>
          <button id="btn-main-menu">Main Menu</button>
        </div>
      </div>`;
    document.getElementById('btn-play-again').onclick = () => onContinue('again');
    document.getElementById('btn-main-menu').onclick  = () => onContinue('menu');
  }
}
