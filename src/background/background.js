chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method == "getLocalStorage") {
        chrome.storage.local.get(request.data).then(sendResponse);
        return true;
    } else {
        sendResponse({});
    }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url) {
        if (tab.url.indexOf('talk915') > 0) {
            chrome.action.enable(tabId);
            if (tab.url.indexOf('timetable') > 0 && tab.status === 'loading') {
                chrome.tabs.sendMessage(tabId, { type: 'inject', tab: tab });
            }
        } else {
            chrome.action.disable(tabId);
        }
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    let tabId = activeInfo.tabId;
    const tab = await chrome.tabs.get(tabId);
    if (tab.url.indexOf('talk915') > 0) {
        chrome.action.enable(tabId);
    } else {
        chrome.action.disable(tabId);
    }
});
