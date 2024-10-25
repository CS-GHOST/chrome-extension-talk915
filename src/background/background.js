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
        if (tab.url.indexOf('timetable') > 0) {
            if (tab.status === 'loading') {
                chrome.tabs.sendMessage(tabId, { type: 'inject', tab: tab }, function (response) {
                });
            }
        }
    }
})