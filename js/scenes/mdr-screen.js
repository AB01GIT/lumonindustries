/**
 * MDR SCREEN
 * The refinement console, drawn with Canvas 2-D.
 *
 * Performance note: a full field is ~900 glyphs and every one of them wobbles,
 * scales and changes brightness each frame. `fillText` 900 times per frame is
 * not viable, so the ten digits are pre-rendered once into two sprite atlases
 * — a dim one and a hot one, the hot one baked *with* its glow — and the frame
 * loop only issues `drawImage` calls. That is the difference between 25 fps and
 * a locked 60.
 *
 * The interaction mirrors the show: drifting numbers, a cluster that "feels
 * wrong" and trembles when you approach it, and a hold gesture that files it
 * into one of five bins.
 */

import { clamp, rand, randInt, smoothstep } from "../core/utils.js";

const DIM = "rgba(126, 196, 222, 0.62)";
const HOT = "#e6f7ff";
const GLOW = "rgba(87, 199, 232, 0.95)";

export class MdrScreen {
  constructor(canvas, { onRefine, onTremble } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.onRefine = onRefine || (() => {});
    this.onTremble = onTremble || (() => {});

    this.cells = [];
    this.groups = [];
    this.time = 0;
    this.pointer = { x: -9999, y: -9999, active: false };
    this.hold = 0;
    this.activeGroup = null;
    this.refinedCount = 0;
    this.visible = false;
    this.dpr = 1;

    this.resize();
  }

  /* ---------------------------------------------------------- atlases ----- */
  /** Pre-render 0–9 twice: dim, and hot-with-glow. */
  #buildAtlas() {
    const s = Math.ceil(this.cell * 2.4 * this.dpr);
    this.atlasSize = s;

    const make = (color, glow) => {
      const cv = document.createElement("canvas");
      cv.width = s * 10;
      cv.height = s;
      const c = cv.getContext("2d");
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = `500 ${Math.floor(this.cell * 1.15 * this.dpr)}px "IBM Plex Mono", ui-monospace, monospace`;
      c.fillStyle = color;
      if (glow) {
        c.shadowColor = GLOW;
        c.shadowBlur = this.cell * 0.55 * this.dpr;
      }
      for (let d = 0; d < 10; d++) {
        // Two passes on the hot sprite deepens the bloom.
        c.fillText(String(d), s * d + s / 2, s / 2);
        if (glow) c.fillText(String(d), s * d + s / 2, s / 2);
      }
      return cv;
    };

    this.atlasDim = make(DIM, false);
    this.atlasHot = make(HOT, true);
  }

  /* ------------------------------------------------------------ layout ---- */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);

    // Keep clear of the console chrome at the top and the bins at the bottom.
    const padX = this.w * 0.045;
    const padTop = this.h * 0.14;
    const padBottom = this.h * 0.22;
    const gridW = this.w - padX * 2;
    const gridH = this.h - padTop - padBottom;

    // A dense field is the whole point: the numbers should feel like a volume
    // of data, not a table of them.
    this.cell = clamp(gridW / 36, 15, 34);
    this.cols = Math.max(6, Math.floor(gridW / this.cell));
    this.rows = Math.max(4, Math.floor(gridH / this.cell));

    // Centre the field inside the available area.
    this.originX = padX + (gridW - this.cols * this.cell) / 2 + this.cell / 2;
    this.originY = padTop + (gridH - this.rows * this.cell) / 2 + this.cell / 2;

    this.#buildAtlas();
    this.#buildField();
    this.radius = Math.min(this.w, this.h) * 0.2;
  }

  /* ------------------------------------------------------------- field ---- */
  #buildField() {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells.push({
          col: c,
          row: r,
          x: this.originX + c * this.cell,
          y: this.originY + r * this.cell,
          digit: randInt(0, 9),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.5, 1.5),
          drift: rand(0.4, 1.2),
          heat: 0,
          scale: 1,
          alpha: 1,
          group: -1,
          flying: false,
          fx: 0,
          fy: 0,
        });
      }
    }
    this.groups = [];
    for (let i = 0; i < 6; i++) this.#seedGroup(i);
  }

  /** Grow a contiguous blob of cells — the numbers that feel wrong. */
  #seedGroup(index) {
    const size = randInt(9, 16);
    const startCol = randInt(1, this.cols - 2);
    const startRow = randInt(1, this.rows - 2);
    const taken = new Set();
    const cells = [];

    let col = startCol;
    let row = startRow;
    for (let i = 0; i < size * 3 && cells.length < size; i++) {
      const key = `${col},${row}`;
      const cell = this.cells[row * this.cols + col];
      if (cell && cell.group === -1 && !taken.has(key)) {
        taken.add(key);
        cell.group = index;
        cells.push(cell);
      }
      // Random walk with a bias toward horizontal runs, like the show's blobs.
      if (Math.random() < 0.62) col += Math.random() < 0.5 ? 1 : -1;
      else row += Math.random() < 0.5 ? 1 : -1;
      col = clamp(col, 0, this.cols - 1);
      row = clamp(row, 0, this.rows - 1);
    }

    if (!cells.length) return;

    const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;
    const cy = cells.reduce((s, c) => s + c.y, 0) / cells.length;

    this.groups[index] = {
      index,
      cells,
      cx,
      cy,
      tremble: 0,
      revealed: false,
      refined: false,
      bin: index % 5,
    };
  }

  /* ----------------------------------------------------------- pointer ---- */
  setPointer(x, y) {
    if (x == null) {
      this.pointer.active = false;
      this.pointer.x = this.pointer.y = -9999;
      return;
    }
    this.pointer.active = true;
    this.pointer.x = x;
    this.pointer.y = y;
  }

  /* ------------------------------------------------------------ refine ---- */
  /**
   * File a group into its bin. Cells fly to the bin, fade, then respawn with
   * fresh digits somewhere else in the field.
   */
  refine(groupIndex, binRect) {
    const group = this.groups[groupIndex];
    if (!group || group.refined) return false;

    group.refined = true;
    group.tremble = 0;
    this.refinedCount++;

    const bx = binRect ? binRect.x : this.w / 2;
    const by = binRect ? binRect.y : this.h;

    group.cells.forEach((cell, i) => {
      cell.flying = true;
      cell.fx = cell.x;
      cell.fy = cell.y;
      gsap.to(cell, {
        fx: bx + rand(-10, 10),
        fy: by,
        alpha: 0,
        scale: 0.35,
        duration: rand(0.55, 0.95),
        delay: i * 0.018,
        ease: "power2.in",
        onComplete: () => {
          cell.flying = false;
          cell.group = -1;
          cell.digit = randInt(0, 9);
          cell.alpha = 1;
          cell.scale = 1;
          cell.heat = 0;
        },
      });
    });

    this.onRefine(groupIndex, this.refinedCount);

    // Replace the group so the field never runs dry.
    gsap.delayedCall(1.4, () => {
      const free = this.groups[groupIndex];
      if (free) this.#seedGroup(groupIndex);
    });

    return true;
  }

  /** Reveal a group without pointer input — used by the scroll timeline. */
  revealGroup(index) {
    const g = this.groups[index];
    if (g && !g.refined) g.revealed = true;
  }

  /* -------------------------------------------------------------- frame --- */
  update(dt) {
    if (!this.visible) return;
    this.time += dt;
    const t = this.time;
    const { x: px, y: py } = this.pointer;
    const r = this.radius;

    /* --- group proximity: which cluster is the visitor investigating? --- */
    let nearest = null;
    let nearestDist = Infinity;

    this.groups.forEach((g) => {
      if (!g || g.refined) return;
      const d = Math.hypot(px - g.cx, py - g.cy);
      const near = this.pointer.active && d < r * 1.15;
      g.tremble += ((near ? 1 : 0) - g.tremble) * Math.min(1, dt * 6);
      if (near && d < nearestDist) {
        nearestDist = d;
        nearest = g;
      }
    });

    // Holding still over a cluster refines it — the "feeling" made mechanical.
    if (nearest) {
      this.activeGroup = nearest;
      this.hold += dt;
      this.onTremble(true, clamp(this.hold / 1.1));
      if (this.hold > 1.1) {
        this.hold = 0;
        this.requestRefine?.(nearest.index);
      }
    } else {
      if (this.activeGroup) this.onTremble(false, 0);
      this.activeGroup = null;
      this.hold = 0;
    }

    /* --- per-cell simulation ------------------------------------------- */
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.flying) continue;

      const group = cell.group >= 0 ? this.groups[cell.group] : null;
      const trembling = group ? group.tremble : 0;

      // Pointer magnification.
      const d = Math.hypot(px - cell.x, py - cell.y);
      const prox = this.pointer.active ? 1 - smoothstep(0, r, d) : 0;

      const targetHeat = clamp(prox * 0.9 + trembling * 0.75, 0, 1);
      cell.heat += (targetHeat - cell.heat) * Math.min(1, dt * 8);
      cell.scale = 1 + cell.heat * 0.85;

      // Idle drift, amplified into a shiver for cells inside a live cluster.
      const shiver = 0.9 + trembling * 5.5;
      cell.ox = Math.sin(t * (1.6 * cell.speed) + cell.phase) * cell.drift * shiver;
      cell.oy = Math.cos(t * (1.9 * cell.speed) + cell.phase * 1.7) * cell.drift * shiver;

      // Numbers occasionally reroll, so the field never looks like a texture.
      if (Math.random() < 0.0009 + trembling * 0.02) cell.digit = randInt(0, 9);
    }
  }

  draw() {
    if (!this.visible) return;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const s = this.atlasSize;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(dpr, dpr);

    /* --- selection lassos ---------------------------------------------- */
    this.groups.forEach((g) => {
      if (!g || g.refined || g.tremble < 0.05) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      g.cells.forEach((c) => {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x);
        maxY = Math.max(maxY, c.y);
      });
      const pad = this.cell * 0.75;
      ctx.save();
      ctx.globalAlpha = g.tremble * 0.75;
      ctx.strokeStyle = GLOW;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.lineDashOffset = -this.time * 22;
      ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
      ctx.restore();
    });

    /* --- glyphs --------------------------------------------------------- */
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const x = (cell.flying ? cell.fx : cell.x + (cell.ox || 0));
      const y = (cell.flying ? cell.fy : cell.y + (cell.oy || 0));
      const size = (s / dpr) * cell.scale;
      const dx = x - size / 2;
      const dy = y - size / 2;
      const src = s * cell.digit;

      // Dim layer always; hot layer cross-faded on top by heat.
      if (cell.alpha > 0.01) {
        ctx.globalAlpha = cell.alpha * (1 - cell.heat * 0.85);
        ctx.drawImage(this.atlasDim, src, 0, s, s, dx, dy, size, size);

        if (cell.heat > 0.02) {
          ctx.globalAlpha = cell.alpha * cell.heat;
          ctx.drawImage(this.atlasHot, src, 0, s, s, dx, dy, size, size);
        }
      }
    }

    ctx.globalAlpha = 1;
  }
}
