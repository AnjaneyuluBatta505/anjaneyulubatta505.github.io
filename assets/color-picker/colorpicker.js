class ColorPicker {
  constructor(target, options = {}) {
    this.target =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!this.target) throw new Error("Target element not found");

    this.initialHex = options.initial || "#4281f5";

    // HSV internal representation (h:0-360, s:0-100, v:0-100)
    const hsv = this._hexToHsv(this.initialHex);
    this.h = hsv.h;
    this.s = hsv.s;
    this.v = hsv.v;

    // DOM refs
    this._build();
    this._attachListeners();
    this._renderAll();
  }

  // ---------- build DOM ----------
  _build() {
    // root
    this.root = document.createElement("div");
    this.root.className = "cp-wrap";

    // header
    this.header = document.createElement("div");
    this.header.className = "cp-header";

    // main - left preview + right SV
    this.main = document.createElement("div");
    this.main.className = "cp-main";

    // preview
    this.preview = document.createElement("div");
    this.preview.className = "cp-preview";
    this.main.appendChild(this.preview);

    // sv wrap and canvas
    this.svWrap = document.createElement("div");
    this.svWrap.className = "cp-sv-wrap";
    this.svWrap.style.position = "relative";
    this.svWrap.style.display = "block";

    this.svWrap.classList.add("cp-sv-wrap"); // for CSS
    // actually apply the class defined earlier
    this.svWrap.className = "cp-sv-wrap cp-sv-wrap"; // ensure style

    // add specific wrapper class used in CSS
    this.svWrap.classList.add("cp-sv-wrap"); // ok

    this.svContainer = document.createElement("div");
    this.svContainer.className = "cp-sv-wrap cp-sv-wrap"; // ensure styles
    // We'll attach a canvas inside to render SV panel
    this.svCanvas = document.createElement("canvas");
    this.svCanvas.className = "cp-sv-canvas";
    this.svCanvas.width = 460; // pixel width that matches layout
    this.svCanvas.height = 260;

    // cursor (circle)
    this.svCursor = document.createElement("div");
    this.svCursor.className = "cp-cursor";
    this.svCursor.style.width = "20px";
    this.svCursor.style.height = "20px";

    // Combine sv wrapper
    this.svWrap = document.createElement("div");
    this.svWrap.className = "cp-sv-wrap";
    this.svWrap.style.position = "relative";
    this.svWrap.appendChild(this.svCanvas);
    this.svWrap.appendChild(this.svCursor);

    this.main.appendChild(this.svWrap);

    // hue row (full width below)
    this.hueRow = document.createElement("div");
    this.hueRow.className = "cp-hue-row";

    this.hueCanvas = document.createElement("canvas");
    this.hueCanvas.className = "cp-hue-canvas";
    this.hueCanvas.width = 700;
    this.hueCanvas.height = 14;
    this.hueCursor = document.createElement("div");
    this.hueCursor.className = "cp-cursor";
    this.hueCursor.style.width = "26px";
    this.hueCursor.style.height = "26px";
    this.hueCursor.style.border = "4px solid #fff";
    this.hueCursor.style.top = "-6px"; // center vertically relative to hueCanvas
    this.hueCursor.style.left = "0px";
    this.hueCursor.style.pointerEvents = "none";

    // hex row
    this.hexRow = document.createElement("div");
    this.hexRow.className = "cp-hex-row";
    this.hexBox = document.createElement("div");
    this.hexBox.className = "cp-hex-box";
    this.hexBox.innerHTML = `
      <div style="flex:1; text-align:center;">
        <div class="cp-hex-label">HEX</div>
        <div class="cp-hex-value" id="cp-hex-value"></div>
      </div>
    `;
    this.copyBtn = document.createElement("div");
    this.copyBtn.className = "cp-copy-btn";
    this.copyBtn.title = "Copy hex";
    this.copyBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="9" y="9" width="11" height="11" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>`;
    this.hexBox.appendChild(this.copyBtn);
    this.hexRow.appendChild(this.hexBox);

    // bottom info row
    this.infoRow = document.createElement("div");
    this.infoRow.className = "cp-info-row";
    this.infoBoxes = {
      rgb: this._createInfoBox("RGB", "r, g, b"),
      cmyk: this._createInfoBox("CMYK", "c, m, y, k"),
      hsv: this._createInfoBox("HSV", "h°, s%, v%"),
      hsl: this._createInfoBox("HSL", "h°, s%, l%"),
    };
    for (let k of ["rgb", "cmyk", "hsv", "hsl"]) {
      this.infoRow.appendChild(this.infoBoxes[k]);
    }

    // assemble overall
    this.root.appendChild(this.header);
    this.root.appendChild(this.main);
    this.root.appendChild(this.hueRow);
    this.root.appendChild(this.hexRow);
    this.root.appendChild(this.infoRow);

    // append canvases into proper places now that structure built
    // left preview: show a large color block (we'll set background css)
    // right SV: replace previous placeholders
    // main: left is preview already; replace right element
    this.main.replaceChild(this.preview, this.main.children[0]); // keep preview
    this.main.replaceChild(this.svWrap, this.main.children[1]);

    // append hueCanvas into hueRow
    this.hueRow.appendChild(this.hueCanvas);
    this.hueRow.appendChild(this.hueCursor);

    // save some refs
    this.hexValueEl = this.hexBox.querySelector("#cp-hex-value");
    // finally mount into target
    this.target.appendChild(this.root);

    // normalise canvas sizes to CSS layout width
    // set canvas width/height based on computed style to make crisp rendering
    this._resizeCanvases();
    window.addEventListener("resize", () => this._resizeCanvases());
  }

  _createInfoBox(label, sample) {
    const d = document.createElement("div");
    d.className = "cp-info";
    d.innerHTML = `<div class="label">${label}</div><div class="value" data-for="${label.toLowerCase()}">${sample}</div>`;
    return d;
  }

  _resizeCanvases() {
    // make SV canvas fill remaining width in layout
    const svRect = this.svWrap.getBoundingClientRect();
    const previewRect = this.preview.getBoundingClientRect();
    // compute desired width = root width - preview width - paddings/gaps
    const rootRect = this.root.getBoundingClientRect();
    // Use CSS grid columns width: preview 260px + 1fr. So canvas width = root width - preview - padding
    const computed = getComputedStyle(this.root);
    // approximate padding: left + right (from CSS cp-main padding)
    const mainPaddingLeft = 18;
    const mainPaddingRight = 18;
    const gap = 0;
    const targetCanvasW = Math.max(
      300,
      rootRect.width - 260 - (mainPaddingLeft + mainPaddingRight) - 40
    );
    const targetCanvasH = 260;

    this.svCanvas.width = Math.round(targetCanvasW * devicePixelRatio);
    this.svCanvas.height = Math.round(targetCanvasH * devicePixelRatio);
    this.svCanvas.style.width = `${targetCanvasW}px`;
    this.svCanvas.style.height = `${targetCanvasH}px`;

    // style for preview box height match
    this.preview.style.height = `${targetCanvasH}px`;

    // hue canvas width set to root width minus paddings
    const hueW = Math.max(360, rootRect.width - 36);
    this.hueCanvas.width = Math.round(hueW * devicePixelRatio);
    this.hueCanvas.height = Math.round(14 * devicePixelRatio);
    this.hueCanvas.style.width = `${hueW}px`;
    this.hueCanvas.style.height = `14px`;

    // adjust cursor container positions initially
    this._drawHue();
    this._drawSV();
    this._placeCursors();
  }

  // ---------- event listeners ----------
  _attachListeners() {
    // SV interaction
    this._svPointerDown = (e) => {
      e.preventDefault();
      const move = (ev) => {
        this._updateSVFromEvent(ev);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      this._updateSVFromEvent(e);
    };
    this.svCanvas.addEventListener("pointerdown", this._svPointerDown);

    // Hue interaction
    this._huePointerDown = (e) => {
      e.preventDefault();
      const move = (ev) => {
        this._updateHueFromEvent(ev);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      this._updateHueFromEvent(e);
    };
    this.hueCanvas.addEventListener("pointerdown", this._huePointerDown);

    // copy hex
    this.copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.hexValueEl.textContent);
        this.copyBtn.style.background = "#f1f6ff";
        setTimeout(() => (this.copyBtn.style.background = "#fff"), 500);
      } catch (err) {
        console.warn("copy failed", err);
      }
    });

    // share icon placeholder
    this.header.querySelector(".cp-share").addEventListener("click", () => {
      // simple share: dispatch event with color
      this.target.dispatchEvent(
        new CustomEvent("colorShare", { detail: this._currentColorObject() })
      );
    });
  }

  // ---------- drawing ----------
  _drawHue() {
    const ctx = this.hueCanvas.getContext("2d");
    const w = this.hueCanvas.width;
    const h = this.hueCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // gradient across hue
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 360; i += 1) {
      const stop = i / 360;
      grad.addColorStop(stop, `hsl(${i},100%,50%)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawSV() {
    const ctx = this.svCanvas.getContext("2d");
    const w = this.svCanvas.width;
    const h = this.svCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // scale back for crispness
    ctx.save();
    // Because we set canvas width to devicePixelRatio scaled, scale context down so 1 unit = 1 CSS px
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const cssW = parseFloat(this.svCanvas.style.width);
    const cssH = parseFloat(this.svCanvas.style.height);

    // Fill with current hue
    ctx.fillStyle = `hsl(${this.h}, 100%, 50%)`;
    ctx.fillRect(0, 0, cssW, cssH);

    // white gradient left->right
    const whiteGrad = ctx.createLinearGradient(0, 0, cssW, 0);
    whiteGrad.addColorStop(0, "rgba(255,255,255,1)");
    whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, cssW, cssH);

    // black gradient top->bottom
    const blackGrad = ctx.createLinearGradient(0, 0, 0, cssH);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.restore();
  }

  _placeCursors() {
    // SV cursor
    const svWidth = parseFloat(this.svCanvas.style.width);
    const svHeight = parseFloat(this.svCanvas.style.height);
    const x = (this.s / 100) * svWidth;
    const y = (1 - this.v / 100) * svHeight;
    this.svCursor.style.left = `${x}px`;
    this.svCursor.style.top = `${y}px`;

    // Hue cursor - compute left relative to hue canvas width
    const hueCssW = parseFloat(this.hueCanvas.style.width);
    const hueX = (this.h / 360) * hueCssW;
    // place hueCursor absolutely within hueRow
    this.hueCursor.style.position = "relative";
    this.hueCursor.style.left = `${hueX}px`;
  }

  // ---------- UI updates ----------
  _renderAll() {
    this._drawHue();
    this._drawSV();
    this._placeCursors();
    this._updatePreviewAndValues();
  }

  _updatePreviewAndValues() {
    const { r, g, b } = this._hsvToRgb(this.h, this.s, this.v);
    const hex = this._rgbToHex(r, g, b);
    // preview left
    this.preview.style.background = hex;

    // hex center
    this.hexValueEl.textContent = hex.toUpperCase();

    // info boxes
    this.infoBoxes.rgb.querySelector(".value").textContent = `${r}, ${g}, ${b}`;
    const cmyk = this._rgbToCmyk(r, g, b);
    this.infoBoxes.cmyk.querySelector(
      ".value"
    ).textContent = `${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`;
    this.infoBoxes.hsv.querySelector(".value").textContent = `${Math.round(
      this.h
    )}°, ${Math.round(this.s)}%, ${Math.round(this.v)}%`;
    const hsl = this._rgbToHsl(r, g, b);
    this.infoBoxes.hsl.querySelector(".value").textContent = `${Math.round(
      hsl.h
    )}°, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`;

    // dispatch event
    this.target.dispatchEvent(
      new CustomEvent("colorSelected", { detail: this._currentColorObject() })
    );
  }

  _currentColorObject() {
    const { r, g, b } = this._hsvToRgb(this.h, this.s, this.v);
    const hex = this._rgbToHex(r, g, b);
    return {
      hex: hex.toUpperCase(),
      rgb: { r, g, b },
      cmyk: this._rgbToCmyk(r, g, b),
      hsv: { h: this.h, s: this.s, v: this.v },
      hsl: this._rgbToHsl(r, g, b),
    };
  }

  // ---------- input handlers ----------
  _updateSVFromEvent(ev) {
    const rect = this.svCanvas.getBoundingClientRect();
    const x = Math.min(Math.max(0, ev.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, ev.clientY - rect.top), rect.height);
    this.s = (x / rect.width) * 100;
    this.v = 100 - (y / rect.height) * 100;
    this._placeCursors();
    this._updatePreviewAndValues();
  }

  _updateHueFromEvent(ev) {
    const rect = this.hueCanvas.getBoundingClientRect();
    const x = Math.min(Math.max(0, ev.clientX - rect.left), rect.width);
    this.h = (x / rect.width) * 360;
    this._drawSV(); // redraw SV base color when hue changes
    this._placeCursors();
    this._updatePreviewAndValues();
  }

  // ---------- color conversions ----------
  _hsvToRgb(h, s, v) {
    // s and v are 0-100
    s /= 100;
    v /= 100;
    const c = v * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r1 = 0,
      g1 = 0,
      b1 = 0;
    if (hh >= 0 && hh < 1) {
      r1 = c;
      g1 = x;
      b1 = 0;
    } else if (hh < 2) {
      r1 = x;
      g1 = c;
      b1 = 0;
    } else if (hh < 3) {
      r1 = 0;
      g1 = c;
      b1 = x;
    } else if (hh < 4) {
      r1 = 0;
      g1 = x;
      b1 = c;
    } else if (hh < 5) {
      r1 = x;
      g1 = 0;
      b1 = c;
    } else {
      r1 = c;
      g1 = 0;
      b1 = x;
    }
    const m = v - c;
    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);
    return { r, g, b };
  }

  _rgbToHex(r, g, b) {
    const toHex = (x) => x.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  _hexToRgb(hex) {
    const h = hex.replace("#", "").trim();
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b };
    } else {
      const v = parseInt(h, 16);
      return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    }
  }

  _hexToHsv(hex) {
    const { r, g, b } = this._hexToRgb(hex);
    return this._rgbToHsv(r, g, b);
  }

  _rgbToHsv(r, g, b) {
    // r,g,b 0-255
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d === 0) h = 0;
    else if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;
    return { h: h, s: s, v: v };
  }

  _rgbToHsl(r, g, b) {
    // returns h in degrees, s and l in %
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let s = 0,
      h = 0;
    if (max !== min) {
      const d = max - min;
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = h * 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  _rgbToCmyk(r, g, b) {
    // returns percentages for c,m,y,k
    // convert 0..255 to 0..1
    const rn = r / 255,
      gn = g / 255,
      bn = b / 255;
    const k = 1 - Math.max(rn, gn, bn);
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }
    const c = (1 - rn - k) / (1 - k);
    const m = (1 - gn - k) / (1 - k);
    const y = (1 - bn - k) / (1 - k);
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  }

  // ---------- external API helpers ----------
  setColor(hex) {
    // set color programmatically
    const hsv = this._hexToHsv(hex);
    if (!isNaN(hsv.h)) {
      this.h = hsv.h;
      this.s = hsv.s;
      this.v = hsv.v;
      this._renderAll();
    }
  }

  getColor() {
    return this._currentColorObject();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ColorPicker("#color-picker", { initial: "#4281f5" });
});
