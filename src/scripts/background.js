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

// Initialize side panel when extension starts
chrome.runtime.onInstalled.addListener(() => {
    console.log("Pontix extension installed/updated");
    
    // Enable side panel to open when action icon is clicked
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .then(() => {
            console.log("Side panel behavior set: openPanelOnActionClick = true");
        })
        .catch((error) => {
            console.error("Failed to set side panel behavior:", error);
        });
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background received message:", request);
    
    // Handle content script loaded notification
    if (request.action === "contentScriptLoaded") {
        console.log("Content script loaded on tab:", sender.tab?.id);
        sendResponse({ success: true });
        return true;
    }
    
    // Handle text selection from content script - forward to side panel
    if (request.action === 'textSelected' && request.source === 'translatorContentScript') {
        console.log("Forwarding text selection to side panel:", request.selectedText);
        
        // Use storage to communicate with side panel
        try {
            chrome.storage.local.set({
                'sidePanel_textSelected': {
                    action: 'textSelected',
                    selectedText: request.selectedText,
                    sentence: request.sentence,
                    error: request.error,
                    timestamp: Date.now(), // Add timestamp to ensure fresh data
                    source: 'backgroundScript'
                }
            }).then(() => {
                console.log("Text selection stored for side panel");
            }).catch(error => {
                console.error("Failed to store text selection:", error);
            });
        } catch (error) {
            console.error("Storage error:", error);
        }
        
        sendResponse({ success: true });
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

    // Broadcast updated settings to all tabs with content script
    if (request.action === "updateSettings") {
        (async () => {
            try {
                const tabs = await chrome.tabs.query({});
                let successCount = 0;
                
                for (const tab of tabs) {
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            action: "updateSettings",
                            settings: request.settings
                        });
                        successCount++;
                    } catch (error) {
                        // Ignore tabs without content script
                        console.log(`Could not send settings to tab ${tab.id}:`, error.message);
                    }
                }
                
                console.log(`Settings broadcast to ${successCount} tabs`);
                sendResponse({ success: true, tabsUpdated: successCount });
            } catch (error) {
                console.error('Settings broadcast error:', error);
                sendResponse({ success: false });
            }
        })();
        return true;
    }
    
    return true;
}); 