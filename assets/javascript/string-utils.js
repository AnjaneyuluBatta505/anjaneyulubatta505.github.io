class StringUtilsUI {
  constructor(targetElement) {
    this.target = targetElement;
    this.initUI();
  }

  initUI() {
    // Main container
    this.container = document.createElement("div");
    this.container.classList.add("string-utils-container");

    // Textarea wrapper (to hold textarea + copy icon)
    this.textareaWrapper = document.createElement("div");
    this.textareaWrapper.classList.add("string-utils-textarea-wrapper");

    // Textarea
    this.textarea = document.createElement("textarea");
    this.textarea.classList.add("string-utils-textarea");

    // Copy button
    this.copyBtn = document.createElement("button");
    this.copyBtn.classList.add("string-utils-copy-btn");
    this.copyBtn.title = "Copy to clipboard";
    this.copyBtn.innerHTML = "📋";
    this.copyBtn.addEventListener("click", () => this.copyToClipboard());

    // Append textarea and copy button to wrapper
    this.textareaWrapper.appendChild(this.textarea);
    this.textareaWrapper.appendChild(this.copyBtn);

    // Buttons container
    this.buttonsContainer = document.createElement("div");
    this.buttonsContainer.classList.add("string-utils-buttons");

    // Action buttons
    this.buttons = [
      { label: "Slugify", action: () => this.slugify() },
      { label: "Camel Case", action: () => this.camelCase() },
      { label: "Snake Case", action: () => this.snakeCase() },
      { label: "Lower Case", action: () => this.lowerCase() },
      { label: "Upper Case", action: () => this.upperCase() },
      { label: "URL Encode", action: () => this.urlEncode() },
      { label: "URL Decode", action: () => this.urlDecode() },
    ];

    this.buttons.forEach((btnData) => {
      const btn = document.createElement("button");
      btn.textContent = btnData.label;
      btn.classList.add("string-utils-btn");
      btn.addEventListener("click", btnData.action);
      this.buttonsContainer.appendChild(btn);
    });

    // Assemble layout
    this.container.appendChild(this.textareaWrapper);
    this.container.appendChild(this.buttonsContainer);
    this.target.appendChild(this.container);
  }

  get value() {
    return this.textarea.value;
  }

  set value(val) {
    this.textarea.value = val;
  }

  copyToClipboard() {
    navigator.clipboard
      .writeText(this.value)
      .then(() => {
        this.copyBtn.textContent = "✅";
        setTimeout(() => (this.copyBtn.textContent = "📋"), 1000);
      })
      .catch(() => alert("Failed to copy text."));
  }

  slugify() {
    this.value = this.value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  camelCase() {
    this.value = this.value
      .replace(/[_\s]+/g, " ")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join("");
  }

  snakeCase() {
    this.value = this.value
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[_\s]+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .replace(/_+/g, "_")
      .toLowerCase();
  }

  lowerCase() {
    this.value = this.value.toLowerCase();
  }

  upperCase() {
    this.value = this.value.toUpperCase();
  }

  urlEncode() {
    try {
      this.value = encodeURIComponent(this.value);
    } catch {
      alert("Failed to encode URL");
    }
  }

  urlDecode() {
    try {
      this.value = decodeURIComponent(this.value);
    } catch {
      alert("Failed to decode URL");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new StringUtilsUI(document.getElementById("string-utils-root"));
});
