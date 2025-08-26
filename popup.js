document.addEventListener("DOMContentLoaded", async () => {
  const enabledCheckbox = document.getElementById("enabled");
  const patternInput = document.getElementById("pattern-input");
  const addButton = document.getElementById("add-rule");

  await loadState();

  enabledCheckbox.addEventListener("change", async () => {
    await chrome.runtime.sendMessage({ action: "toggleAll", enabled: enabledCheckbox.checked });
    await loadState();
  });

  addButton.addEventListener("click", async () => {
    const input = patternInput.value.trim();
    if (!input) return;
    const regex = wildcardToRegex(input);
    try { new RegExp(regex); } catch { alert("無効なパターンです"); return; }
    await chrome.runtime.sendMessage({ action: "addRule", pattern: regex });
    patternInput.value = "";
    await loadState();
  });

  async function loadState() {
    const { enabled, rules } = await chrome.storage.local.get(["enabled", "rules"]);
    enabledCheckbox.checked = enabled;
    renderRules(rules || []);
  }

  function renderRules(rules) {
    const container = document.getElementById("rules");
    container.innerHTML = "";
    rules.forEach(rule => {
      const div = document.createElement("div");
      div.className = "rule";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = rule.enabled;
      checkbox.addEventListener("change", () => toggleRule(rule.id, checkbox.checked));

      const span = document.createElement("span");
      span.textContent = rule.pattern;

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.innerHTML = "x";
      delBtn.addEventListener("click", () => removeRule(rule.id));

      div.appendChild(checkbox);
      div.appendChild(span);
      div.appendChild(delBtn);
      container.appendChild(div);
    });
  }

  async function toggleRule(id, enabled) {
    await chrome.runtime.sendMessage({ action: "toggleRule", id, enabled });
    await loadState();
  }

  async function removeRule(id) {
    await chrome.runtime.sendMessage({ action: "removeRule", id });
    await loadState();
  }

  function wildcardToRegex(input) {
    let pattern = input.trim();
    if (!/^https?:\/\//.test(pattern)) pattern = "*://" + pattern;
    pattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace("\\:\\/\\/", "://");
    return "^" + pattern + "$";
  }
});

