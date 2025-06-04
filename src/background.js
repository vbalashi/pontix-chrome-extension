// Track sidebar state
let sidebarEnabled = false;

// Check if tab is in Edge immersive reader mode
function isEdgeImmersiveReaderTab(url) {
    return url && (
        url.includes('read.microsoft.com') || 
        url.includes('immersive-reader.microsoft') ||
        url.includes('edge://read')
    );
}

// Safe message sending with error handling
function safelyMessageTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, response => {
        if (chrome.runtime.lastError) {
            console.log(`Error sending message: ${chrome.runtime.lastError.message}`);
            
            // If in immersive reader mode, we may need to inject the content script
            chrome.tabs.get(tabId, tab => {
                if (tab && isEdgeImmersiveReaderTab(tab.url)) {
                    console.log("Attempting to inject content script for immersive reader");
                    
                    // Use scripting API to inject content script
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    }).then(() => {
                        console.log("Content script injected, retrying message");
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabId, message);
                        }, 500);
                    }).catch(err => {
                        console.error("Failed to inject content script:", err);
                    });
                }
            });
        }
    });
}

// Track Edge immersive reader tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act when the tab is fully loaded
    if (changeInfo.status === 'complete') {
        // Check if this is an Edge immersive reader page
        if (tab.url && isEdgeImmersiveReaderTab(tab.url)) {
            console.log("Edge immersive reader detected");
            
            // If sidebar was enabled, ensure it stays enabled in immersive mode
            if (sidebarEnabled) {
                // Wait a moment for immersive reader to fully initialize
                setTimeout(() => {
                    safelyMessageTab(tabId, { 
                        action: "toggleSidebar", 
                        enabled: sidebarEnabled,
                        isImmersiveMode: true 
                    });
                }, 1500);
            }
        }
    }
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
    // Toggle sidebar state
    sidebarEnabled = !sidebarEnabled;
    
    // Set badge based on state (visual feedback)
    if (sidebarEnabled) {
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
    
    // Check if we're in Edge immersive reader mode
    const isImmersiveMode = isEdgeImmersiveReaderTab(tab.url);
    
    // Send the state to content script with error handling
    safelyMessageTab(tab.id, { 
        action: "toggleSidebar", 
        enabled: sidebarEnabled,
        isImmersiveMode: isImmersiveMode
    });
});
