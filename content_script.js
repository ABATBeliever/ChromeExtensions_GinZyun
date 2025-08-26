(async () => {
  let currentUrl = location.href;
  let rules = [];
  let enabled = true;

  const loadRules = async () => {
    const data = await chrome.storage.local.get(["rules", "enabled"]);
    rules = data.rules || [];
    enabled = data.enabled !== false;
  };

  await loadRules();

  chrome.storage.onChanged.addListener(changes => {
    if (changes.rules || changes.enabled) loadRules();
  });

  const checkUrl = () => {
    if (!enabled) return;
    if (location.href === currentUrl) return;
    currentUrl = location.href;

    for (const rule of rules) {
      if (!rule.enabled) continue;
      try {
        const regex = new RegExp(rule.pattern);
        if (regex.test(currentUrl)) {
          location.replace(chrome.runtime.getURL("block.html") + "?ruleId=" + rule.id);
          return;
        }
      } catch (e) {
        console.warn("ルールが正規表現エラー", rule.pattern);
      }
    }
  };

  const observeHistory = () => {
    const origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      setTimeout(checkUrl, 0);
    };
    window.addEventListener("popstate", checkUrl);
  };

  observeHistory();

  setInterval(checkUrl, 500);
})();
