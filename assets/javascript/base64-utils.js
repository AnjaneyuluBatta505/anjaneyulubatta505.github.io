class Base64UtilsUI {
  constructor(targetElement) {
    this.targetElement = targetElement;
    this.elements = {};
    this.initUI();
  }

  initUI() {
    this.targetElement.innerHTML = `
      <div class="input-section">
        <label>Option 1: Copy-paste the string to encode or decode here</label>
        <div class="textarea-wrapper">
          <textarea id="base64-textarea"></textarea>
          <button class="copy-btn" title="Copy to Clipboard">📋</button>
        </div>

        <label>Option 2: Or upload a file to encode or decode</label>
        <input type="file" id="base64-file">

        <div class="error-message" id="base64-error"></div>
      </div>

      <div class="action-buttons">
        <button id="btn-decode">Decode</button>
        <button id="btn-decode-download">Decode & Download</button>
        <button id="btn-encode">Encode</button>
        <button id="btn-encode-download">Encode & Download</button>
      </div>
    `;

    this.cacheElements();
    this.bindEvents();
  }

  cacheElements() {
    this.elements = {
      textarea: this.targetElement.querySelector("#base64-textarea"),
      fileInput: this.targetElement.querySelector("#base64-file"),
      errorDiv: this.targetElement.querySelector("#base64-error"),
      copyBtn: this.targetElement.querySelector(".copy-btn"),
      decodeBtn: this.targetElement.querySelector("#btn-decode"),
      decodeDownloadBtn: this.targetElement.querySelector(
        "#btn-decode-download"
      ),
      encodeBtn: this.targetElement.querySelector("#btn-encode"),
      encodeDownloadBtn: this.targetElement.querySelector(
        "#btn-encode-download"
      ),
    };
  }

  bindEvents() {
    this.elements.copyBtn.addEventListener(
      "click",
      this.handleCopyClick.bind(this)
    );
    this.elements.fileInput.addEventListener(
      "change",
      this.handleFileUpload.bind(this)
    );
    this.elements.encodeBtn.addEventListener("click", () =>
      this.handleEncode(false)
    );
    this.elements.encodeDownloadBtn.addEventListener("click", () =>
      this.handleEncode(true)
    );
    this.elements.decodeBtn.addEventListener("click", () =>
      this.handleDecode(false)
    );
    this.elements.decodeDownloadBtn.addEventListener("click", () =>
      this.handleDecode(true)
    );
  }

  // Utility Methods
  setError(msg) {
    this.elements.errorDiv.textContent = msg;
    this.elements.errorDiv.style.display = msg ? "block" : "none";
  }

  downloadFile(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  encodeBase64(input) {
    return btoa(unescape(encodeURIComponent(input)));
  }

  decodeBase64(input) {
    return decodeURIComponent(escape(atob(input)));
  }

  // Event Handlers
  handleCopyClick() {
    navigator.clipboard
      .writeText(this.elements.textarea.value)
      .then(() => {
        this.elements.copyBtn.textContent = "✅";
        setTimeout(() => (this.elements.copyBtn.textContent = "📋"), 1000);
      })
      .catch(() => alert("Failed to copy text."));
  }

  handleEncode(shouldDownload) {
    try {
      this.setError("");
      const input = this.elements.textarea.value || "";
      const encoded = this.encodeBase64(input);

      this.elements.textarea.value = encoded;

      if (shouldDownload) {
        this.downloadFile(encoded, "encoded.txt");
      }
    } catch (err) {
      this.setError("Invalid text for Base64 encoding.");
    }
  }

  handleDecode(shouldDownload) {
    try {
      this.setError("");
      const input = this.elements.textarea.value || "";
      const decoded = this.decodeBase64(input);

      this.elements.textarea.value = decoded;

      if (shouldDownload) {
        this.downloadFile(decoded, "decoded.txt");
      }
    } catch (err) {
      this.setError("Invalid Base64 string for decoding.");
    }
  }

  handleFileUpload() {
    const file = this.elements.fileInput.files[0];
    if (!file) {
      this.setError("No file selected");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        this.elements.textarea.value = event.target.result;
        this.setError("");
      } catch (err) {
        this.setError("Error reading file");
      }
    };

    reader.onerror = () => {
      this.setError("Failed to read file");
    };

    reader.readAsText(file);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  new Base64UtilsUI(document.getElementById("base64-tool"));
});
