import {
    PONTIX_SECRET_STORAGE_KEYS,
    boundedSelectionSnapshot,
    isSelectionFresh,
    redactForLog,
    validateInternalMessage,
} from './security.js';
import {
    disconnect2000Nl,
    get2000NlSessionState,
    performPlatformAction,
    performPlatformLookup,
    start2000NlConnect,
} from './platformClient.js';
import { createSelectionSourceBinding } from './sourceBinding.js';

const SELECTION_STORAGE_KEY = 'sidePanel_textSelected';
let latestSelectionSnapshot = null;

restrictTrustedStorageAccess();
cleanupLegacySecrets();

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
    safeLog("Pontix extension installed/updated");
    
    // Enable side panel to open when action icon is clicked
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .then(() => {
            safeLog("Side panel behavior set: openPanelOnActionClick = true");
        })
        .catch((error) => {
            console.error("Failed to set side panel behavior:", error);
        });
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const validation = validateInternalMessage(request, sender, chrome.runtime.id);
    if (!validation.ok) {
        safeWarn("Rejected runtime message", { error: validation.error, action: request?.action || request?.type });
        sendResponse({ success: false, error: validation.error });
        return true;
    }
    safeLog("Background received message", { action: validation.action, sender: senderSummary(sender) });
    
    // Handle content script loaded notification
    if (validation.action === "contentScriptLoaded") {
        safeLog("Content script loaded", { tabId: sender.tab?.id });
        sendResponse({ success: true });
        return true;
    }
    
    // Handle text selection from content script - forward to side panel
    if (validation.action === 'textSelected' && request.source === 'translatorContentScript') {
        safeLog("Forwarding bounded text selection to side panel", senderSummary(sender));

        const snapshot = boundedSelectionSnapshot(request, sender);
        const binding = createSelectionSourceBinding({
            url: request.pageUrl || sender.tab?.url || sender.url || '',
            title: request.pageTitle || sender.tab?.title || '',
            languageCode: request.languageCode || '',
            selectedText: snapshot.selectedText,
            containerText: request.containerText || snapshot.sentence || snapshot.selectedText,
            rangeStart: Number.isInteger(request.rangeStart) ? request.rangeStart : undefined,
            rangeEnd: Number.isInteger(request.rangeEnd) ? request.rangeEnd : undefined,
            navigationId: request.navigationId || `${sender.tab?.id || 'tab'}:${sender.documentId || sender.url || ''}`,
            tabId: snapshot.tabId,
            frameId: snapshot.frameId,
            capturedAt: new Date(snapshot.createdAt).toISOString(),
        });
        if (binding.ok) {
            snapshot.sourceBinding = binding.binding;
        } else {
            snapshot.sourceBindingError = binding.error;
        }

        storeSelectionSnapshot(snapshot)
            .catch((error) => safeError("Failed to store ephemeral selection", error));
        
        sendResponse({ success: true });
        return true;
    }

    if (validation.action === 'consumeSelectionSnapshot') {
        consumeSelectionSnapshot()
            .then((snapshot) => sendResponse({ success: true, selection: snapshot }))
            .catch((error) => {
                safeError("Failed to consume selection snapshot", error);
                sendResponse({ success: false, error: 'selection_consume_failed' });
            });
        return true;
    }

    if (validation.action === 'connect2000nl') {
        start2000NlConnect({
            identity: chrome.identity,
            storage: chrome.storage?.local,
            fetchImpl: serviceWorkerFetch,
            clientId: request.clientId,
            baseUrl: request.baseUrl,
            interactive: request.interactive,
        })
            .then((result) => sendResponse(result))
            .catch((error) => {
                safeError("Failed to connect 2000NL", error);
                sendResponse({ success: false, error: 'connect_2000nl_failed' });
            });
        return true;
    }

    if (validation.action === 'disconnect2000nl') {
        disconnect2000Nl({
            storage: chrome.storage?.local,
            fetchImpl: serviceWorkerFetch,
            clientId: request.clientId,
            baseUrl: request.baseUrl,
        })
            .then((result) => sendResponse(result))
            .catch((error) => {
                safeError("Failed to disconnect 2000NL", error);
                sendResponse({ success: false, error: 'disconnect_2000nl_failed' });
            });
        return true;
    }

    if (validation.action === 'get2000nlSession') {
        get2000NlSessionState({ storage: chrome.storage?.local })
            .then((result) => sendResponse(result))
            .catch((error) => {
                safeError("Failed to read 2000NL session", error);
                sendResponse({ success: false, error: 'session_2000nl_failed' });
            });
        return true;
    }

    if (validation.action === 'platformLookup') {
        performPlatformLookup({
            storage: chrome.storage?.local,
            fetchImpl: serviceWorkerFetch,
            baseUrl: request.baseUrl,
            query: request.query,
            languageCode: request.languageCode,
            contextText: request.contextText,
            intent: request.intent,
        })
            .then((result) => sendResponse(result))
            .catch((error) => {
                safeError("Failed to run platform lookup", error);
                sendResponse({ success: false, error: 'platform_lookup_failed' });
            });
        return true;
    }

    if (validation.action === 'platformAction') {
        performPlatformAction({
            request,
            storage: chrome.storage?.local,
            fetchImpl: serviceWorkerFetch,
            baseUrl: request.baseUrl,
            clientId: request.clientId,
        })
            .then((result) => sendResponse(result))
            .catch((error) => {
                safeError("Failed to submit platform action", error);
                sendResponse({ success: false, error: 'platform_action_failed' });
            });
        return true;
    }
    
    // Handle translation requests from sidebar
    if (validation.action === "translate") {
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
    if (validation.action === "updateSettings") {
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
                        safeLog("Could not send settings to tab", { tabId: tab.id, error: error.message });
                    }
                }
                
                safeLog("Settings broadcast", { tabsUpdated: successCount });
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

async function storeSelectionSnapshot(snapshot) {
    latestSelectionSnapshot = snapshot;
    if (chrome.storage?.session) {
        await chrome.storage.session.set({ [SELECTION_STORAGE_KEY]: snapshot });
    }
}

async function consumeSelectionSnapshot() {
    let snapshot = latestSelectionSnapshot;
    if (chrome.storage?.session) {
        const result = await chrome.storage.session.get(SELECTION_STORAGE_KEY);
        snapshot = result?.[SELECTION_STORAGE_KEY] || snapshot;
        await chrome.storage.session.remove(SELECTION_STORAGE_KEY);
    }
    latestSelectionSnapshot = null;
    return isSelectionFresh(snapshot) ? snapshot : null;
}

function restrictTrustedStorageAccess() {
    if (!chrome.storage?.local?.setAccessLevel) return;
    chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }, () => {
        if (chrome.runtime.lastError) {
            safeWarn("Failed to restrict local storage access", chrome.runtime.lastError.message);
        }
    });
}

function cleanupLegacySecrets() {
    if (!chrome.storage?.local?.remove) return;
    chrome.storage.local.remove(PONTIX_SECRET_STORAGE_KEYS.filter((key) => key === 'encrypted_user_password'));
}

function serviceWorkerFetch(url, init) {
    return fetch(url, init);
}

function senderSummary(sender) {
    return {
        id: sender?.id || '',
        tabId: sender?.tab?.id,
        frameId: sender?.frameId,
        origin: sender?.origin || '',
    };
}

function safeLog(message, data = null) {
    if (data === null) {
        console.log(message);
    } else {
        console.log(message, redactForLog(data));
    }
}

function safeWarn(message, data = null) {
    if (data === null) {
        console.warn(message);
    } else {
        console.warn(message, redactForLog(data));
    }
}

function safeError(message, error) {
    console.error(message, error?.message || String(error));
}
