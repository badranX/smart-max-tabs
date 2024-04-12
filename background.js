// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/*global browser, chroma */
let title = browser.i18n.getMessage('title');
let maxTabs = 10;
let historySize = 30;
let tabs_visit_count = {}
let tabsInfo = {}
let closedTabs = []
let tabs_time = {}
let includePinned = false;
let colorScale = chroma.scale(['#A6A6A6', '#B90000']);

function test() {
    console.log(closedTabs)
}

function recordInfo(id, title, url) {
    tabsInfo[id] = {
        url: url,
        title: title,
        id: id
    }
}

function recordHistory(tab) {
    closedTabs.push(tab)
    console.log('recording history')
    console.log(closedTabs)
    if (closedTabs.length > (maxTabs + historySize)) {
        deleteHistory()
    }
}

function recordTabStats(tabId, tab) {
    prev = tabs_visit_count[tabId] ?? 0;
    tabs_visit_count[tabId] = prev + 1;

    time = Date.now()
    tabs_time[tabId] = time
}

function deleteHistory() {
    tab = closedTabs.shift()
    delete tabsInfo[tab.id]
}

function deleteTab(tabId) {
    delete tabs_time[tabId]
    delete tabs_visit_count[tabId]
}

// Listen for messages to retrieve closed tabs
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getClosedTabs") {
        sendResponse(closedTabs);
    }
});

function updatePrefs() {
    return new Promise((resolve, reject) => {
        browser.storage.sync.get({
            "maxTabs": 10,
            "historySize": 30,
            "includePinned": false,
        }, items => {
            //if (!items) {
            //    reject("No items found in storage");
            //    return;
            //}
            historySize = items.historySize;
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
    console.log(tab)
    if (tab.id != browser.tabs.TAB_ID_NONE) {
        queryNumTabs().then(numTabs => {
            if (numTabs > maxTabs) {
                let matchId = Object.keys(tabs_time).reduce((key, v) => tabs_time[v] < tabs_time[key] ? v : key);
                matchId = parseInt(matchId)
                console.log("matchId", matchId)
                if (matchId in tabsInfo) {
                    tmp = tabsInfo[matchId];
                    console.log('matching : ', tmp)
                    if (!tmp.url.startsWith("about:")) {
                        recordHistory(tmp)
                    }
                } else {
                    console.log('not found in tabsinfo')
                    console.log(matchId)
                }
                browser.tabs.remove(matchId)
            } else {
                updateButton(numTabs);
            }
        });
        recordInfo(tab.id, tab.title, tab.url)
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

function handleUpdated(tabId, changeInfo, tabInfo) {
    console.log('update: ', tabId, tabInfo.url, tabInfo.title)
    recordInfo(tabId, tabInfo.title, tabInfo.url)
}

browser.tabs.onUpdated.addListener(handleUpdated);

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