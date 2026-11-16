// Keyboard, mouse and touch gathered into one small state object the world
// can poll. Movement keys (WASD and arrows), a pointer position for menus,
// pointer presses for buttons and cards, and a drag joystick on touch
// screens: press anywhere and drag, and the firefly flies toward the drag.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointer = { x: 0, y: 0, down: false, clicked: false };
    this.stick = { active: false, dx: 0, dy: 0, baseX: 0, baseY: 0 };
    this.presses = new Set(); // one-shot key taps, drained by the game each frame

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.presses.add(key);
      this.keys.add(key);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());

    const toGame = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      };
    };

    canvas.addEventListener('pointermove', (event) => {
      const p = toGame(event);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      if (this.stick.active) {
        const dx = p.x - this.stick.baseX;
        const dy = p.y - this.stick.baseY;
        const len = Math.hypot(dx, dy) || 1;
        const mag = Math.min(1, len / 60);
        this.stick.dx = (dx / len) * mag;
        this.stick.dy = (dy / len) * mag;
      }
    });
    canvas.addEventListener('pointerdown', (event) => {
      const p = toGame(event);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.down = true;
      this.pointer.clicked = true;
      this.stick.active = true;
      this.stick.baseX = p.x;
      this.stick.baseY = p.y;
      this.stick.dx = 0;
      this.stick.dy = 0;
    });
    const release = () => {
      this.pointer.down = false;
      this.stick.active = false;
      this.stick.dx = 0;
      this.stick.dy = 0;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', release);
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x === 0 && y === 0 && this.stick.active) {
      return { x: this.stick.dx, y: this.stick.dy };
    }
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  pressed(key) {
    return this.presses.has(key);
  }

  endFrame() {
    this.presses.clear();
    this.pointer.clicked = false;
  }
}
