export class Input {
  constructor() {
    this.keys = {};
    this._justPressed = {};
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this._justPressed[e.code] = true;
      this.keys[e.code] = true;
      // Prevent scrolling with arrow/space keys
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  isDown(code) { return !!this.keys[code]; }

  wasPressed(code) {
    if (this._justPressed[code]) {
      delete this._justPressed[code];
      return true;
    }
    return false;
  }

  flushPressed() { this._justPressed = {}; }

  getMovement(playerIndex) {
    if (playerIndex === 0) {
      return {
        forward: this.isDown('KeyW'),
        back:    this.isDown('KeyS'),
        left:    this.isDown('KeyA'),
        right:   this.isDown('KeyD'),
      };
    } else {
      return {
        forward: this.isDown('ArrowUp'),
        back:    this.isDown('ArrowDown'),
        left:    this.isDown('ArrowLeft'),
        right:   this.isDown('ArrowRight'),
      };
    }
  }

  getAbilityPressed(playerIndex) {
    if (playerIndex === 0) {
      const map = ['Digit1','Digit2','Digit3','Digit4','Digit5'];
      for (let i = 0; i < map.length; i++) {
        if (this.wasPressed(map[i])) return i;
      }
    } else {
      const map = ['Digit6','Digit7','Digit8','Digit9','Digit0'];
      for (let i = 0; i < map.length; i++) {
        if (this.wasPressed(map[i])) return i;
      }
    }
    return -1;
  }
}
