/*global browser */
function saveOptions(e) {
  let maxTabs = document.getElementById("max-tabs").value;
  let includePinned = document.getElementById("include-pinned").checked;
  let historySize = document.getElementById("history-size").value;
  browser.storage.sync.set({
    maxTabs: maxTabs,
    historySize: historySize,
    includePinned: includePinned
  });
  e.preventDefault();
}

function restoreOptions() {
  var gettingItem = browser.storage.sync.get({
    maxTabs: 10,
    historySize: 30,
    includePinned: false
  });
  gettingItem.then((res) => {
    document.getElementById("max-tabs").value = res.maxTabs;
    document.getElementById("history-size").value = res.historySize;
    document.getElementById("include-pinned").checked = res.includePinned;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
