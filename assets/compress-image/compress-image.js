function imageCompressorTemplate(uid) {
  return `
  <div class="image-compressor" data-uid="${uid}">
    <div class="upload-row">
      <input type="file" class="upload-input" accept="image/*" />
      <button class="compress-now btn-primary" disabled>Compress Now</button>
    </div>

    <div class="controls-row">
      <div class="item">
        <div class="label">Max size (KB):</div>
        <input type="number" class="max-size" value="200" min="10" />
      </div>
      <div class="item">
        <div class="label">Download as:</div>
        <select class="download-format">
          <option value="original">Original Format</option>
          <option value="image/jpeg">JPG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
        </select>
      </div>
      <div class="item">
        <button class="download-btn" disabled>Download Image</button>
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-box original">
        <h3>Original</h3>
        <img class="original-preview" alt="Original preview" />
        <div class="info original-info"></div>
      </div>

      <div class="preview-box compressed">
        <h3>Compressed</h3>
        <canvas class="compressed-canvas"></canvas>
        <div class="info compressed-info"></div>
      </div>
    </div>

    <div class="notice"></div>
  </div>`;
}

// component.js

/**
 * ImageCompressor - compress images in-browser, re-compress when user changes
 * max size or output format, preview original vs compressed, allow download.
 */
class ImageCompressor {
  constructor(target, opts = {}) {
    const self = this;
    if (!target) throw new Error("Target is required");
    self.target =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!self.target) throw new Error("Target element not found in DOM");

    self.uid =
      opts.uid || `ic-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    self.originalFile = null; // File object
    self.originalDataUrl = null; // data URL
    self.originalImage = null; // Image instance
    self.compressedBlob = null; // last compressed Blob
    self.compressedObjectUrl = null;
    self.compressedCanvas = null;
    self.debounceTimer = null;

    // render and bind
    self._render();
    self._bindElements();
    self._bindEvents();
  }

  // ---------------------------
  // Render template
  // ---------------------------
  _render() {
    const self = this;
    self.target.innerHTML = imageCompressorTemplate(self.uid);
  }

  // ---------------------------
  // Query elements for this instance
  // ---------------------------
  _bindElements() {
    const self = this;
    const root = self.target.querySelector(`[data-uid="${self.uid}"]`);
    self.$root = root;
    self.$upload = root.querySelector(".upload-input");
    self.$compressNow = root.querySelector(".compress-now");
    self.$maxSize = root.querySelector(".max-size");
    self.$format = root.querySelector(".download-format");
    self.$download = root.querySelector(".download-btn");
    self.$originalPreview = root.querySelector(".original-preview");
    self.$originalInfo = root.querySelector(".original-info");
    self.$compressedCanvas = root.querySelector(".compressed-canvas");
    self.$compressedInfo = root.querySelector(".compressed-info");
    self.$notice = root.querySelector(".notice");
  }

  // ---------------------------
  // Events
  // ---------------------------
  _bindEvents() {
    const self = this;

    self.$upload.addEventListener("change", (e) => self._onFileSelected(e));
    self.$compressNow.addEventListener("click", () => self._triggerCompress());
    self.$download.addEventListener("click", () => self._download());

    // re-compress when user changes max size or selected format (debounced)
    self.$maxSize.addEventListener("input", () =>
      self._debounce(() => self._onSettingChanged())
    );
    self.$format.addEventListener("change", () =>
      self._debounce(() => self._onSettingChanged())
    );
  }

  // ---------------------------
  // File selected
  // ---------------------------
  _onFileSelected(evt) {
    const self = this;
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;

    // Reset previous state
    self._revokeCompressedURL();
    self.compressedBlob = null;
    self.compressedObjectUrl = null;
    self.compressedCanvas = null;
    self.$compressedInfo.textContent = "";
    self.$download.disabled = true;
    self.$compressNow.disabled = true;
    self.$notice.textContent = "";

    // Basic browser-safe limit (10 MB) - adjust if needed
    const MAX_UPLOAD_MB = 10;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      self.$notice.textContent = `File too large. Max ${MAX_UPLOAD_MB} MB allowed by browser.`;
      return;
    }

    self.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      self.originalDataUrl = e.target.result;
      self.$originalPreview.src = self.originalDataUrl;
      self.$originalInfo.textContent = `Format: ${
        file.type || "unknown"
      } • Size: ${(file.size / 1024).toFixed(2)} KB • ${file.width || ""}`;
      // create Image
      const img = new Image();
      img.onload = async () => {
        self.originalImage = img;
        // enable compress button and auto compress
        self.$compressNow.disabled = false;
        // auto trigger compression (small delay to allow UI)
        self._debounce(() => self._triggerCompress(), 300);
      };
      img.onerror = () => {
        self.$notice.textContent = "Failed to load image.";
      };
      img.src = self.originalDataUrl;
    };
    reader.onerror = () => {
      self.$notice.textContent = "Failed to read file.";
    };
    reader.readAsDataURL(file);
  }

  // ---------------------------
  // When user changes a setting (max size / format)
  // ---------------------------
  _onSettingChanged() {
    const self = this;
    if (!self.originalImage) return;
    // re-run compression automatically
    self._triggerCompress();
  }

  // ---------------------------
  // Debounce helper
  // ---------------------------
  _debounce(fn, wait = 250) {
    const self = this;
    clearTimeout(self.debounceTimer);
    self.debounceTimer = setTimeout(fn, wait);
  }

  // ---------------------------
  // Trigger compress (called by button or auto)
  // ---------------------------
  async _triggerCompress() {
    const self = this;
    if (!self.originalImage || !self.originalFile) return;

    const targetKB = parseInt(self.$maxSize.value, 10);
    if (!targetKB || targetKB <= 0) {
      self.$notice.textContent = "Enter a valid max size (KB)";
      return;
    }
    self.$notice.textContent = "Compressing…";
    self.$compressNow.disabled = true;

    // determine output mime
    const formatValue = self.$format.value;
    let outputMime =
      formatValue === "original"
        ? self.originalFile.type || "image/jpeg"
        : formatValue;

    // try compressing
    try {
      const blob = await self._compressImageToTarget(
        self.originalImage,
        targetKB,
        outputMime
      );
      if (!blob) {
        self.$notice.textContent = "Compression failed.";
        self.$compressNow.disabled = false;
        return;
      }

      // set compressed blob and preview on canvas
      self.compressedBlob = blob;
      self._revokeCompressedURL();
      self.compressedObjectUrl = URL.createObjectURL(blob);

      // Draw blob to canvas for consistent preview
      await self._drawBlobToCanvas(blob);

      self.$compressedInfo.textContent = `Format: ${blob.type} • Size: ${(
        blob.size / 1024
      ).toFixed(2)} KB`;
      self.$download.disabled = false;
      self.$notice.textContent = "";
    } catch (err) {
      console.error(err);
      self.$notice.textContent = "Compression error: " + (err.message || err);
    } finally {
      self.$compressNow.disabled = false;
    }
  }

  // ---------------------------
  // Compress algorithm:
  // - tries quality reductions for lossy formats (jpeg/webp)
  // - falls back to downscaling dimensions if needed
  // - loops until below targetKB or minimal size reached
  // ---------------------------
  async _compressImageToTarget(img, targetKB, requestedMime) {
    const self = this;
    const canvas = self.$compressedCanvas;
    const ctx = canvas.getContext("2d");

    // initial params
    let mime = requestedMime;
    let quality = 0.92;
    let curWidth = img.naturalWidth || img.width;
    let curHeight = img.naturalHeight || img.height;

    // Limit iterations to prevent infinite loop
    const MAX_ITERS = 40;
    let iter = 0;
    let lastBlob = null;

    // Ensure canvas doesn't exceed device limits - cap to 4096 (adjust if necessary)
    const MAX_DIM = 4096;
    const scaleCap = Math.min(1, MAX_DIM / Math.max(curWidth, curHeight));
    if (scaleCap < 1) {
      curWidth = Math.round(curWidth * scaleCap);
      curHeight = Math.round(curHeight * scaleCap);
    }

    while (iter < MAX_ITERS) {
      canvas.width = Math.round(curWidth);
      canvas.height = Math.round(curHeight);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => {
        // toBlob may throw for unsupported mime (e.g., webp not supported)
        try {
          canvas.toBlob(resolve, mime, quality);
        } catch (e) {
          resolve(null);
        }
      });

      if (!blob) {
        // fallback: if requested mime unsupported, try jpeg
        if (mime !== "image/jpeg") {
          mime = "image/jpeg";
          quality = 0.92;
          iter++;
          continue;
        } else {
          // cannot produce blob
          return lastBlob;
        }
      }

      lastBlob = blob;
      const sizeKB = blob.size / 1024;

      // success
      if (sizeKB <= targetKB) return blob;

      // if format is lossy (jpeg/webp), reduce quality first
      if (mime === "image/jpeg" || mime === "image/webp") {
        if (quality > 0.12) {
          quality = Math.max(0.1, quality - 0.12);
        } else {
          // if quality low and still too big, downscale by 90%
          curWidth = Math.max(80, Math.round(curWidth * 0.9));
          curHeight = Math.max(80, Math.round(curHeight * 0.9));
          // slightly reset quality to try again
          quality = 0.92;
        }
      } else {
        // PNG (lossless) -> downscale dimensions aggressively
        curWidth = Math.max(80, Math.round(curWidth * 0.85));
        curHeight = Math.max(80, Math.round(curHeight * 0.85));
      }

      iter++;
    }

    // reached max iterations - return best we have
    return lastBlob;
  }

  // ---------------------------
  // Draw blob to canvas for preview (keeps exact pixel result)
  // ---------------------------
  async _drawBlobToCanvas(blob) {
    const self = this;
    if (!blob) return;
    const canvas = self.$compressedCanvas;
    const ctx = canvas.getContext("2d");

    // create Image from blob
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    // draw, fitting to canvas size while preserving aspect ratio
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    URL.revokeObjectURL(url);
    self.compressedCanvas = canvas;
  }

  // ---------------------------
  // Download compressed blob with chosen mime/extension
  // ---------------------------
  _download() {
    const self = this;
    if (!self.compressedBlob || !self.originalFile) return;

    const sel = self.$format.value;
    let mime =
      sel === "original" ? self.originalFile.type || "image/jpeg" : sel;
    // ensure blob is in requested mime: if not, re-compress on the fly
    const needRecompress =
      self.compressedBlob.type !== mime && sel !== "original";

    if (needRecompress && self.originalImage) {
      // perform quick re-compress using current max size (does not await previous compressed)
      // Disable download until done
      self.$download.disabled = true;
      self
        ._compressImageToTarget(
          self.originalImage,
          parseInt(self.$maxSize.value, 10) || 200,
          mime
        )
        .then((newBlob) => {
          if (newBlob) {
            self._doDownloadBlob(newBlob, mime);
            self.compressedBlob = newBlob;
            self._revokeCompressedURL();
            self.compressedObjectUrl = URL.createObjectURL(newBlob);
            // keep canvas in sync
            self._drawBlobToCanvas(newBlob).catch(() => {});
            self.$compressedInfo.textContent = `Format: ${
              newBlob.type
            } • Size: ${(newBlob.size / 1024).toFixed(2)} KB`;
          } else {
            // fallback to existing blob
            self._doDownloadBlob(self.compressedBlob, self.compressedBlob.type);
          }
        })
        .catch((err) => {
          console.error(err);
          self._doDownloadBlob(self.compressedBlob, self.compressedBlob.type);
        })
        .finally(() => {
          self.$download.disabled = false;
        });
    } else {
      self._doDownloadBlob(self.compressedBlob, mime);
    }
  }

  _doDownloadBlob(blob, mime) {
    const self = this;
    const ext =
      mime && mime.split("/")[1] ? mime.split("/")[1].split("+")[0] : "jpg";
    const filename = `compressed.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  // ---------------------------
  // Revoke previous object URL used for compressed preview
  // ---------------------------
  _revokeCompressedURL() {
    const self = this;
    if (self.compressedObjectUrl) {
      try {
        URL.revokeObjectURL(self.compressedObjectUrl);
      } catch (e) {}
      self.compressedObjectUrl = null;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ImageCompressor("#compressor");
});
