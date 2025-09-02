// Background service worker for Resume Autofiller extension

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Resume Autofiller extension installed successfully!');
        
        chrome.storage.local.set({
            settingsData: {
                autoDetect: true,
                showButton: true,
                confirmBeforeFill: false
            }
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NOTIFY_CONTENT_SCRIPTS') {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: 'DATA_UPDATED' }).catch(() => {});
            });
        });
        sendResponse({ success: true });
    }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: 'DATA_UPDATED' }).catch(() => {});
            });
        });
    }
});
