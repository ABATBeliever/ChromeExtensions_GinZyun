chrome.runtime.onInstalled.addListener(async () => {
  await ensureStorageInitialized();
  await updateDNRRules();
});
chrome.runtime.onStartup.addListener(async () => {
  await ensureStorageInitialized();
  await updateDNRRules();
});

async function ensureStorageInitialized() {
  const data = await chrome.storage.local.get(["enabled", "rules"]);
  if (data.enabled === undefined || !Array.isArray(data.rules)) {
    await chrome.storage.local.set({ enabled: true, rules: [] });
  }
}

async function updateDNRRules() {
  const { enabled, rules } = await chrome.storage.local.get(["enabled", "rules"]);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);
  if (removeIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
  }

  if (!enabled) return;

  const addRules = rules
    .filter(r => r.enabled)
    .map(r => ({
      id: r.id,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: `/block.html?ruleId=${r.id}` } },
      condition: { regexFilter: r.pattern, resourceTypes: ["main_frame"] }
    }));

  if (addRules.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.action) {
      case "addRule": await addRule(msg.pattern); break;
      case "removeRule": await removeRule(msg.id); break;
      case "toggleRule": await toggleRule(msg.id, msg.enabled); break;
      case "toggleAll": await toggleAll(msg.enabled); break;
      case "disableRule": await disableRule(msg.id); break;
    }
    sendResponse({ success: true });
  })();
  return true;
});

async function addRule(pattern) {
  const data = await chrome.storage.local.get(["rules"]);
  const newId = data.rules.length ? Math.max(...data.rules.map(r => r.id)) + 1 : 1;
  data.rules.push({ id: newId, pattern, enabled: true });
  await chrome.storage.local.set({ rules: data.rules });
  await updateDNRRules();
}

async function removeRule(id) {
  const data = await chrome.storage.local.get(["rules"]);
  const newRules = data.rules.filter(r => r.id !== id);
  await chrome.storage.local.set({ rules: newRules });
  await updateDNRRules();
}

async function toggleRule(id, enabled) {
  const data = await chrome.storage.local.get(["rules"]);
  const rule = data.rules.find(r => r.id === id);
  if (rule) rule.enabled = enabled;
  await chrome.storage.local.set({ rules: data.rules });
  await updateDNRRules();
}

async function toggleAll(enabled) {
  await chrome.storage.local.set({ enabled });
  await updateDNRRules();
}

async function disableRule(id) {
  const data = await chrome.storage.local.get(["rules"]);
  const rule = data.rules.find(r => r.id === id);
  if (rule) rule.enabled = false;
  await chrome.storage.local.set({ rules: data.rules });
  await updateDNRRules();
}
