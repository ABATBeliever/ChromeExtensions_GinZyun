//銀盾v1.0
//2024 ABATBeliever
document.addEventListener("DOMContentLoaded", () => {
  const wordInput = document.getElementById("wordInput");
  const addButton = document.getElementById("addButton");
  const wordList = document.getElementById("wordList");
  const toggleBlock = document.getElementById("toggleBlock");

  chrome.storage.local.get(["blocklist", "blockEnabled"], (result) => {
    const blocklist = result.blocklist || [];
    blocklist.forEach(word => addWordToList(word));
    
    toggleBlock.checked = result.blockEnabled !== false;

    if (toggleBlock.checked) {
      updateRules(blocklist);
    }
  });

  toggleBlock.addEventListener("change", () => {
    const isEnabled = toggleBlock.checked;
    chrome.storage.local.set({ blockEnabled: isEnabled }, () => {
      chrome.storage.local.get("blocklist", (result) => {
        const blocklist = result.blocklist || [];
        updateRules(blocklist);
      });
    });
  });

  addButton.addEventListener("click", () => {
    const word = wordInput.value.trim();
    if (word) {
      chrome.storage.local.get(["blocklist"], (result) => {
        const blocklist = result.blocklist || [];
        if (!blocklist.includes(word)) {
          blocklist.push(word);
          chrome.storage.local.set({ blocklist }, () => {
            addWordToList(word);
            updateRules(blocklist);
            wordInput.value = "";
          });
        }
      });
    }
  });

  function addWordToList(word) {
    const li = document.createElement("li");
    li.textContent = word;
    const removeButton = document.createElement("button");
    removeButton.textContent = "削除";
    removeButton.addEventListener("click", () => {
      chrome.storage.local.get(["blocklist"], (result) => {
        const blocklist = result.blocklist || [];
        const newBlocklist = blocklist.filter(item => item !== word);
        chrome.storage.local.set({ blocklist: newBlocklist }, () => {
          li.remove();
          updateRules(newBlocklist);
        });
      });
    });
    li.appendChild(removeButton);
    wordList.appendChild(li);
  }

  function updateRules(blocklist = []) {
    chrome.storage.local.get(["blockEnabled"], (result) => {
      const blockEnabled = result.blockEnabled !== false;
      if (!blockEnabled) {
        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
          const existingRuleIds = existingRules.map(rule => rule.id);
          chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds
          });
        });
        return;
      }

      chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const existingRuleIds = existingRules.map(rule => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds
        }, () => {
          const newRules = blocklist.map((word, index) => {
            const hasNonASCII = /[^\x00-\x7F]/.test(word);
            const urlFilterWord = hasNonASCII ? encodeURIComponent(word) : word;
            return {
              id: index + 1,
              priority: 1,
              action: { type: "block" },
              condition: {
                urlFilter: urlFilterWord,
                resourceTypes: ["main_frame"]
              }
            };
          });

          chrome.declarativeNetRequest.updateDynamicRules({
            addRules: newRules
          }, () => {
            console.log("Rules updated");
          });
        });
      });
    });
  }
});
