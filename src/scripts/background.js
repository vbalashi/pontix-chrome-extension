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

// Inject content script if not already present
async function ensureContentScriptInjected(tabId) {
    try {
        // Try to ping the content script
        const response = await chrome.tabs.sendMessage(tabId, { action: "ping" });
        if (response && response.pong) {
            return true; // Content script already present
        }
    } catch (error) {
        // Content script not present, inject it
        console.log("Injecting content script...");
        
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
            // Wait a moment for script to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
        } catch (injectionError) {
            console.error("Failed to inject content script:", injectionError);
            return false;
        }
    }
    return false;
}

// Safe message sending with content script injection
async function safelyMessageTab(tabId, message) {
    const injected = await ensureContentScriptInjected(tabId);
    
    if (injected) {
        try {
            await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    } else {
        console.error("Could not inject content script");
    }
}

// Translation API handlers
async function translateWithDeepL(word, sentence, targetLang, apiKey) {
    try {
        const isFreeKey = apiKey.endsWith(':fx');
        const baseUrl = isFreeKey ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
        const url = `${baseUrl}/v2/translate`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: [word],
                target_lang: targetLang.toUpperCase()
            })
        });
        
        const data = await response.json();
        
        if (data.translations && data.translations[0]) {
            return { success: true, translation: data.translations[0].text };
        } else {
            return { success: false, error: 'No translation found' };
        }
    } catch (error) {
        console.error('DeepL error:', error);
        return { success: false, error: 'Translation failed' };
    }
}

async function translateWithMicrosoft(word, sentence, targetLang, apiKey) {
    try {
        const url = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=' + targetLang;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ text: word }])
        });
        
        const data = await response.json();
        
        if (data && data[0] && data[0].translations && data[0].translations[0]) {
            return { success: true, translation: data[0].translations[0].text };
        } else {
            return { success: false, error: 'No translation found' };
        }
    } catch (error) {
        console.error('Microsoft Translator error:', error);
        return { success: false, error: 'Translation failed' };
    }
}

async function translateWithOpenAI(word, sentence, targetLang, apiKey, model = 'gpt-3.5-turbo') {
    try {
        const targetLanguageName = getLanguageName(targetLang);
        
        let prompt;
        if (sentence && sentence.trim() && sentence !== word) {
            prompt = `Translate the word "${word}" to ${targetLanguageName}. Context sentence: "${sentence}". Provide only the translation, no explanations.`;
        } else {
            prompt = `Translate "${word}" to ${targetLanguageName}. Provide only the translation, no explanations.`;
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
                temperature: 0.3
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return { success: true, translation: data.choices[0].message.content.trim() };
        } else {
            return { success: false, error: 'No translation found' };
        }
    } catch (error) {
        console.error('OpenAI error:', error);
        return { success: false, error: 'Translation failed' };
    }
}

// Helper function for language names
function getLanguageName(langCode) {
    const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'tr': 'Turkish',
        'pl': 'Polish',
        'nl': 'Dutch',
        'sv': 'Swedish',
        'da': 'Danish',
        'no': 'Norwegian',
        'fi': 'Finnish'
    };
    return languageNames[langCode] || langCode;
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
chrome.action.onClicked.addListener(async (tab) => {
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
    
    // Inject content script and send the state
    await safelyMessageTab(tab.id, { 
        action: "toggleSidebar", 
        enabled: sidebarEnabled,
        isImmersiveMode: isImmersiveMode
    });
});

// Handle content script ping messages and translation requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ pong: true });
        return true;
    }
    
    // Handle translation requests from sidebar
    if (request.action === "translate") {
        (async () => {
            try {
                let result;
                const { provider, word, sentence, targetLang, apiKey, model } = request;
                
                switch (provider) {
                    case 'deepl':
                        result = await translateWithDeepL(word, sentence, targetLang, apiKey);
                        break;
                    case 'microsoft':
                        result = await translateWithMicrosoft(word, sentence, targetLang, apiKey);
                        break;
                    case 'openai':
                        result = await translateWithOpenAI(word, sentence, targetLang, apiKey, model);
                        break;
                    // Add more providers as needed
                    default:
                        result = { success: false, error: 'Unsupported provider' };
                }
                
                sendResponse(result);
            } catch (error) {
                console.error('Translation error:', error);
                sendResponse({ success: false, error: 'Translation failed' });
            }
        })();
        
        return true; // Keep message channel open for async response
    }
    
    return true;
});
