// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/*global browser, chroma */
let title = browser.i18n.getMessage('title');
let maxTabs = 2;
let historySize = 30;
let tabs = {}
let tabsInfo = {}
let closedTabs = []
let tabs_time = {}
let includePinned = false;
let colorScale = chroma.scale(['#A6A6A6', '#B90000']);

function recordHistory(tab) {
    closedTabs.push(tab)
    console.log('recording history')
    console.log(closedTabs)
    tabsInfo[tab.id] = {
        url: tab.url,
        title: tab.title
    }
    if (closedTabs.length > (maxTabs + historySize)) {
        deleteHistory()
    }
}

function recordTabStats(tabId) {
    prev = tabs[tabId] ?? 0;
    tabs[tabId] = prev + 1;

    time = Date.now()
    tabs_time[tabId] = time
}

function deleteHistory() {
    tab = closedTabs.shift()
    console.log("detetHistory")
    console.log(closedTabs)
    delete tabsInfo[tab.id]
}
function deleteTab(tabId) {
    delete tabs_time[tabId]
    delete tabs[tabId]
}


// Listen for messages to retrieve closed tabs
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("INNNN")
    if (request.action === "getClosedTabs") {
        console.log("INNNNiifffff")
        console.log(historySize)
        console.log(closedTabs)
        sendResponse(closedTabs);
    }
});

function updatePrefs() {
    return new Promise((resolve, reject) => {
        browser.storage.sync.get({
            "maxTabs": 2,
            //"historySize": 30,
            "includePinned": false,
        }, items => {
            //historySize = items.historySize;
            maxTabs = items.maxTabs;
            includePinned = items.includePinned;
            resolve();
        });
    });
}

function updateButton(numTabs) {
    browser.browserAction.setTitle({
        title: title + ' - ' + numTabs + '/' + maxTabs
    });
    browser.browserAction.setBadgeText({
        text: numTabs > 99 ? '99+' : numTabs.toString()
    });
    browser.browserAction.setBadgeBackgroundColor({
        color: colorScale(numTabs / maxTabs).hex()
    });
}

async function queryNumTabs() {
    let tabs = await browser.tabs.query({
        currentWindow: true,
        pinned: includePinned ? null : false
    });
    return tabs.length;
}

let last_active = browser.tabs.getCurrent()

browser.tabs.onActivated.addListener(activeInfo => {
    recordTabStats(activeInfo.tabId);
})

browser.tabs.onRemoved.addListener(
    (tabId, removeInfo) => {
        deleteTab(tabId)
    });

browser.tabs.onCreated.addListener(tab => {
    if (browser.windows.get(tab.windowId).focused) {
        // We only care about the current window
        return;
    }
    if (tab.id != browser.tabs.TAB_ID_NONE) {
        queryNumTabs().then(numTabs => {
            if (numTabs > maxTabs) {
                var keys = Object.keys(tabs_time);
                var lowest = Math.min.apply(null, keys.map(function(x) {
                    return tabs_time[x]
                }));
                var match = keys.filter(function(y) {
                    return tabs_time[y] === lowest
                });
                matchid = match[0]
                browser.tabs.remove(parseInt(matchid))
                recordHistory(tab)
            } else {
                updateButton(numTabs);
            }
        });
        recordTabStats(tab.id)
    }
});


browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (removeInfo.isWindowClosing) {
        return;
    }
    queryNumTabs().then(updateButton);
});

browser.tabs.onDetached.addListener((tabId, detachInfo) => {
    if (browser.windows.get(detachInfo.oldWindowId).focused) {
        queryNumTabs().then(updateButton);
    }
});

browser.tabs.onAttached.addListener((tabId, attachInfo) => {
    if (browser.windows.get(attachInfo.oldWindowId).focused) {
        queryNumTabs().then(updateButton);
    }
});

const filter = {
    properties: ["pinned"]
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
    queryNumTabs().then(updateButton);
}, filter);

browser.windows.onFocusChanged.addListener(windowId => {
    queryNumTabs().then(updateButton);
});

browser.storage.onChanged.addListener((changes, areaName) => {
    updatePrefs().then(() => {
        queryNumTabs().then(updateButton);
    });
});

browser.browserAction.disable();
updatePrefs().then(() => {
    queryNumTabs().then(updateButton);
});