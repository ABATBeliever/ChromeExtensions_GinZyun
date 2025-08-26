(async () => {
  const params = new URLSearchParams(location.search);
  const ruleId = Number(params.get("ruleId"));
  let blockedUrl = "不明";
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) blockedUrl = tabs[0].url;
  } catch (e) { console.warn("タブのURL取得に失敗", e); }

  const data = await chrome.storage.local.get(["rules"]);
  const rule = data.rules.find(r => r.id === ruleId);

  document.getElementById("blocked-rule").textContent = rule ? rule.pattern : "(ルール情報なし)";

  const disableBtn = document.getElementById("disable-rule");
  disableBtn.addEventListener("click", async () => {
    if (rule) {
      await chrome.runtime.sendMessage({ action: "disableRule", id: ruleId });
      disableBtn.disabled = true;
      disableBtn.textContent = "無効化しました";
    }
  });
})();

