// DOM Elements
const selectionElement = document.getElementById("selection");
const sentenceElement = document.getElementById("sentence");
const translationsContainer = document.getElementById("translations-container");
const addTranslationButton = document.getElementById("add-translation-button");
const globalSettingsButton = document.querySelector(".global-settings-button");
const globalSettingsPanel = document.getElementById("global-settings-panel");
const closeSettingsButton = document.getElementById("close-settings");
const saveSettingsButton = document.getElementById("save-settings");

// Default settings
let settings = {
    enabledProviders: {
        google: true,
        deepl: false,
        microsoft: false,
        yandex: false,
        openai: false,
        claude: false
    },
    apiKeys: {
        google: "",
        deepl: "",
        microsoft: "",
        yandex: "",
        openai: "",
        claude: ""
    },
    defaultTargetLanguage: "ru",
    translationBoxes: [
        { provider: "google", targetLanguage: "ru" }
    ]
};

// Current state
let currentWord = "";
let currentSentence = "";
let translationBoxes = [];
let translationBoxCounter = 0;

// Supported languages by provider
const supportedLanguages = {
    google: ["ru", "en", "de", "fr", "es", "zh", "ja"],
    deepl: ["ru", "en", "de", "fr", "es", "zh", "ja"],
    microsoft: ["ru", "en", "de", "fr", "es", "zh", "ja"],
    yandex: ["ru", "en", "de", "fr", "es", "zh", "ja"],
    openai: ["ru", "en", "de", "fr", "es", "zh", "ja"],
    claude: ["ru", "en", "de", "fr", "es", "zh", "ja"]
};

// Provider display names
const providerNames = {
    google: "Google Translate",
    deepl: "DeepL",
    microsoft: "Microsoft Translator",
    yandex: "Yandex Translate",
    openai: "OpenAI",
    claude: "Claude"
};

// Initialize the sidebar
function initializeSidebar() {
    console.log('=== SIDEBAR INITIALIZATION START ===');
    console.log('DOM loaded, starting sidebar initialization...');
    
    // Setup event listeners first
    console.log('Setting up event listeners...');
    setupEventListeners();
    
    // Load saved settings (this will also restore translation boxes)
    console.log('Loading settings...');
    loadSettings();
    
    console.log('=== SIDEBAR INITIALIZATION COMPLETE ===');
}

// Load settings from storage
function loadSettings() {
    console.log('LoadSettings: Attempting to load settings from chrome.storage...');
    
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error('LoadSettings: Chrome storage API not available!');
        console.log('LoadSettings: Using default settings and restoring boxes...');
        updateSettingsUI();
        restoreTranslationBoxes();
        return;
    }
    
    chrome.storage.sync.get("translatorSettings", (result) => {
        console.log('LoadSettings: Storage query result:', result);
        
        if (chrome.runtime.lastError) {
            console.error('LoadSettings: Chrome runtime error:', chrome.runtime.lastError);
            updateSettingsUI();
            restoreTranslationBoxes();
            return;
        }
        
        if (result.translatorSettings) {
            console.log('LoadSettings: Found saved settings:', result.translatorSettings);
            settings = result.translatorSettings;
            
            // Ensure translationBoxes array exists
            if (!settings.translationBoxes) {
                console.log('LoadSettings: No translationBoxes in saved settings, creating default...');
                settings.translationBoxes = [{ provider: "google", targetLanguage: "ru" }];
            }
            
            console.log('LoadSettings: Translation boxes to restore:', settings.translationBoxes);
            updateSettingsUI();
            
            // Now restore translation boxes with the loaded settings
            console.log('LoadSettings: Now restoring translation boxes...');
            restoreTranslationBoxes();
        } else {
            console.log('LoadSettings: No saved settings found, using defaults...');
            // Save default settings if none exist
            saveSettings();
            
            // Restore default translation boxes
            console.log('LoadSettings: Restoring default translation boxes...');
            restoreTranslationBoxes();
        }
    });
}

// Save settings to storage
function saveSettings() {
    // Save current translation boxes layout
    saveTranslationBoxesLayout();
    
    chrome.storage.sync.set({ translatorSettings: settings }, () => {
        console.log("Settings saved");
    });
}

// Save current translation boxes layout
function saveTranslationBoxesLayout() {
    const boxes = document.querySelectorAll('.translation-box');
    settings.translationBoxes = [];
    
    boxes.forEach(box => {
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const targetLanguage = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        
        settings.translationBoxes.push({
            provider: provider,
            targetLanguage: targetLanguage
        });
    });
    
    console.log('Saved translation boxes layout:', settings.translationBoxes);
}

// Restore saved translation boxes
function restoreTranslationBoxes() {
    console.log('=== RESTORE TRANSLATION BOXES START ===');
    console.log('Current settings object:', settings);
    console.log('Translation boxes to restore:', settings.translationBoxes);
    console.log('Enabled providers:', settings.enabledProviders);
    
    // Clear existing boxes first
    const existingBoxes = translationsContainer.querySelectorAll('.translation-box').length;
    console.log('Clearing existing boxes, found:', existingBoxes);
    translationsContainer.innerHTML = '';
    
    // If no saved boxes or empty array, add default Google box
    if (!settings.translationBoxes || settings.translationBoxes.length === 0) {
        console.log('No saved translation boxes, adding default Google box');
        addTranslationBox("google", settings.defaultTargetLanguage);
        console.log('=== RESTORE TRANSLATION BOXES COMPLETE (DEFAULT) ===');
        return;
    }
    
    console.log('Restoring saved translation boxes:', settings.translationBoxes);
    
    let restoredCount = 0;
    
    // Restore each saved box
    settings.translationBoxes.forEach((boxConfig, index) => {
        console.log(`Processing box ${index}:`, boxConfig);
        
        // Check if provider exists in enabledProviders
        if (!settings.enabledProviders.hasOwnProperty(boxConfig.provider)) {
            console.warn(`Provider ${boxConfig.provider} not found in enabledProviders, skipping`);
            return;
        }
        
        // Only restore if the provider is still enabled
        if (settings.enabledProviders[boxConfig.provider]) {
            console.log(`Restoring box for ${boxConfig.provider} with language ${boxConfig.targetLanguage}`);
            addTranslationBox(boxConfig.provider, boxConfig.targetLanguage);
            restoredCount++;
        } else {
            console.log(`Skipping disabled provider: ${boxConfig.provider}`);
        }
    });
    
    console.log(`Restored ${restoredCount} translation boxes`);
    
    // If no boxes were restored (all providers disabled), add default Google box
    if (translationsContainer.children.length === 0) {
        console.log('No enabled providers found, adding default Google box');
        addTranslationBox("google", settings.defaultTargetLanguage);
    }
    
    console.log('Final box count:', translationsContainer.children.length);
    console.log('=== RESTORE TRANSLATION BOXES COMPLETE ===');
}

// Update settings UI
function updateSettingsUI() {
    // Update checkboxes
    for (const provider in settings.enabledProviders) {
        const checkbox = document.getElementById(`enable-${provider}`);
        if (checkbox) {
            checkbox.checked = settings.enabledProviders[provider];
        }
    }
    
    // Update API key fields
    for (const provider in settings.apiKeys) {
        const input = document.getElementById(`${provider}-api-key`);
        if (input) {
            input.value = settings.apiKeys[provider];
        }
    }
    
    // Hide Google API key field (as it's not needed)
    const googleApiField = document.querySelector('[data-provider="google"] .api-key-field');
    if (googleApiField) {
        googleApiField.classList.add('hidden');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Listen for messages from content script
    window.addEventListener("message", handleContentScriptMessage);
    
    // Add translation button
    addTranslationButton.addEventListener("click", () => {
        // Find first enabled provider that isn't already used
        const usedProviders = Array.from(document.querySelectorAll('.translation-box')).map(
            box => box.getAttribute('data-provider')
        );
        
        let nextProvider = "google"; // Default
        
        for (const provider in settings.enabledProviders) {
            if (settings.enabledProviders[provider] && !usedProviders.includes(provider)) {
                nextProvider = provider;
                break;
            }
        }
        
        addTranslationBox(nextProvider, settings.defaultTargetLanguage);
        
        // Save the updated layout
        saveTranslationBoxesLayout();
        saveSettings();
    });
    
    // Global settings button
    globalSettingsButton.addEventListener("click", () => {
        globalSettingsPanel.classList.remove("hidden");
    });
    
    // Close settings button
    closeSettingsButton.addEventListener("click", () => {
        globalSettingsPanel.classList.add("hidden");
    });
    
    // Save settings button
    saveSettingsButton.addEventListener("click", () => {
        // Save enabled status for each provider
        for (const provider in settings.enabledProviders) {
            const checkbox = document.getElementById(`enable-${provider}`);
            if (checkbox) {
                settings.enabledProviders[provider] = checkbox.checked;
            }
        }
        
        // Save API keys
        for (const provider in settings.apiKeys) {
            const input = document.getElementById(`${provider}-api-key`);
            if (input) {
                settings.apiKeys[provider] = input.value;
            }
        }
        
        saveSettings();
        globalSettingsPanel.classList.add("hidden");
        
        // Refresh translation boxes based on new settings
        refreshTranslationBoxes();
    });
    
    // Set up delegates for dynamic elements
    translationsContainer.addEventListener("click", handleTranslationsContainerClick);
    translationsContainer.addEventListener("change", handleTranslationsContainerChange);
}

// Handle messages from content script
function handleContentScriptMessage(event) {
    // Verify the message has the required data
    if (!event.data || !event.data.word) return;
    
    // Update the UI with new word and context
    selectionElement.textContent = event.data.selectedText || "No selection";
    sentenceElement.textContent = event.data.sentence || "";
    
    // Store current word and sentence
    currentWord = event.data.word;
    currentSentence = event.data.sentence || "";
    
    // Translate with all visible translation boxes
    translateAllBoxes();
}

// Translate all visible translation boxes
function translateAllBoxes() {
    const boxes = document.querySelectorAll('.translation-box');
    
    boxes.forEach(box => {
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        
        translateText(box, provider, targetLang);
    });
}

// Handle clicks on translation container elements
function handleTranslationsContainerClick(event) {
    // Settings button click
    if (event.target.closest('.settings-button')) {
        const box = event.target.closest('.translation-box');
        const settingsPanel = box.querySelector('.provider-settings');
        settingsPanel.classList.toggle('hidden');
    }
    
    // Delete button click
    if (event.target.closest('.delete-button')) {
        const box = event.target.closest('.translation-box');
        if (translationsContainer.querySelectorAll('.translation-box').length > 1) {
            box.remove();
            
            // Save the updated layout
            saveTranslationBoxesLayout();
            saveSettings();
        } else {
            // Don't remove the last box, just reset it
            const provider = box.getAttribute('data-provider');
            const langSelect = box.querySelector('.language-select');
            const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
            
            // Reset the translation
            const translationText = box.querySelector('.translation-text');
            translationText.textContent = '';
        }
    }
}

// Handle changes in the translation container elements
function handleTranslationsContainerChange(event) {
    // Provider selection change
    if (event.target.classList.contains('provider-select')) {
        const box = event.target.closest('.translation-box');
        const newProvider = event.target.value;
        const langSelect = box.querySelector('.language-select');
        const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        
        // Update box provider
        box.setAttribute('data-provider', newProvider);
        box.querySelector('.provider-name').textContent = providerNames[newProvider];
        
        // Hide settings
        const settingsPanel = box.querySelector('.provider-settings');
        settingsPanel.classList.add('hidden');
        
        // Translate with new provider
        translateText(box, newProvider, targetLang);
        
        // Save the updated layout
        saveTranslationBoxesLayout();
        saveSettings();
    }
    
    // Language selection change
    if (event.target.classList.contains('language-select')) {
        const box = event.target.closest('.translation-box');
        const provider = box.getAttribute('data-provider');
        const targetLang = event.target.value;
        
        // Update language display
        box.querySelector('.target-language').textContent = event.target.options[event.target.selectedIndex].text;
        
        // Hide settings
        const settingsPanel = box.querySelector('.provider-settings');
        settingsPanel.classList.add('hidden');
        
        // Translate with new language
        translateText(box, provider, targetLang);
        
        // Save the updated layout
        saveTranslationBoxesLayout();
        saveSettings();
    }
}

// Add a new translation box
function addTranslationBox(provider, targetLang) {
    translationBoxCounter++;
    const boxId = `translation-box-${translationBoxCounter}`;
    
    // Create new translation box
    const boxDiv = document.createElement('div');
    boxDiv.className = 'translation-box';
    boxDiv.setAttribute('data-provider', provider);
    boxDiv.id = boxId;
    
    // When generating provider settings, exclude API key field for Google
    const providerSettingsHTML = provider === 'google' ?
        `<div class="provider-settings hidden">
            <div class="provider-selector">
                <label for="provider-select-${boxId}">Translation service:</label>
                <select class="provider-select" id="provider-select-${boxId}">
                    ${generateProviderOptions(provider)}
                </select>
            </div>
            <div class="language-selector">
                <label for="language-select-${boxId}">Target language:</label>
                <select class="language-select" id="language-select-${boxId}">
                    ${generateLanguageOptions(provider, targetLang)}
                </select>
            </div>
        </div>` :
        `<div class="provider-settings hidden">
            <div class="provider-selector">
                <label for="provider-select-${boxId}">Translation service:</label>
                <select class="provider-select" id="provider-select-${boxId}">
                    ${generateProviderOptions(provider)}
                </select>
            </div>
            <div class="language-selector">
                <label for="language-select-${boxId}">Target language:</label>
                <select class="language-select" id="language-select-${boxId}">
                    ${generateLanguageOptions(provider, targetLang)}
                </select>
            </div>
            ${provider !== 'google' ? 
            `<div class="api-key-reminder">
                <small>API key required in global settings</small>
            </div>` : ''}
        </div>`;
    
    // Use the proper HTML with conditional API key reminders
    boxDiv.innerHTML = `
        <div class="translation-header">
            <div class="provider-info">
                <span class="provider-name">${providerNames[provider]}</span>
                <span class="target-language">${getLanguageName(targetLang)}</span>
            </div>
            <div class="translation-controls">
                <button class="settings-button" title="Translation settings">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                </button>
                <button class="delete-button" title="Remove translation">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="translation-content">
            <div class="translation-loading-indicator hidden">Переводим...</div>
            <div class="translation-text"></div>
            <div class="translation-error hidden">Ошибка перевода. Пожалуйста, попробуйте еще раз.</div>
        </div>
        ${providerSettingsHTML}
    `;
    
    // Add box to container
    translationsContainer.appendChild(boxDiv);
    
    // Translate if we have a word
    if (currentWord) {
        translateText(boxDiv, provider, targetLang);
    }
}

// Generate HTML options for provider select
function generateProviderOptions(selectedProvider) {
    let options = '';
    
    for (const provider in settings.enabledProviders) {
        if (settings.enabledProviders[provider]) {
            options += `<option value="${provider}" ${provider === selectedProvider ? 'selected' : ''}>
                ${providerNames[provider]}
            </option>`;
        }
    }
    
    return options;
}

// Generate HTML options for language select
function generateLanguageOptions(provider, selectedLang) {
    let options = '';
    const languages = supportedLanguages[provider] || supportedLanguages.google;
    
    for (const lang of languages) {
        options += `<option value="${lang}" ${lang === selectedLang ? 'selected' : ''}>
            ${getLanguageName(lang)}
        </option>`;
    }
    
    return options;
}

// Get human-readable language name
function getLanguageName(langCode) {
    const languages = {
        ru: "Russian",
        en: "English",
        de: "German",
        fr: "French",
        es: "Spanish",
        zh: "Chinese",
        ja: "Japanese"
    };
    
    return languages[langCode] || langCode;
}

// Refresh translation boxes based on settings
function refreshTranslationBoxes() {
    // Get current boxes
    const boxes = document.querySelectorAll('.translation-box');
    
    // Check if each box's provider is still enabled
    boxes.forEach(box => {
        const provider = box.getAttribute('data-provider');
        
        if (!settings.enabledProviders[provider]) {
            // Provider is disabled, need to change to an enabled one
            const newProvider = getFirstEnabledProvider();
            
            if (newProvider) {
                // Update box to use new provider
                box.setAttribute('data-provider', newProvider);
                box.querySelector('.provider-name').textContent = providerNames[newProvider];
                
                // Update provider options
                const providerSelect = box.querySelector('.provider-select');
                if (providerSelect) {
                    providerSelect.innerHTML = generateProviderOptions(newProvider);
                }
                
                // Update language options
                const langSelect = box.querySelector('.language-select');
                if (langSelect) {
                    const currentLang = langSelect.value;
                    langSelect.innerHTML = generateLanguageOptions(newProvider, currentLang);
                }
                
                // Retranslate
                if (currentWord) {
                    translateText(box, newProvider, langSelect ? langSelect.value : settings.defaultTargetLanguage);
                }
            }
        } else {
            // Provider is still enabled, just refresh the provider options
            const providerSelect = box.querySelector('.provider-select');
            if (providerSelect) {
                providerSelect.innerHTML = generateProviderOptions(provider);
            }
        }
    });
    
    // Save the updated layout
    saveTranslationBoxesLayout();
}

// Get the first enabled provider
function getFirstEnabledProvider() {
    for (const provider in settings.enabledProviders) {
        if (settings.enabledProviders[provider]) {
            return provider;
        }
    }
    // If somehow none are enabled, fall back to Google
    settings.enabledProviders.google = true;
    return "google";
}

// Translate text using specified provider
function translateText(boxElement, provider, targetLang) {
    if (!currentWord) return;
    
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    const errorElement = boxElement.querySelector('.translation-error');
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    translationText.textContent = '';
    errorElement.classList.add('hidden');
    
    // Get the translation based on provider
    switch (provider) {
        case 'google':
            translateWithGoogle(currentWord, currentSentence, targetLang, boxElement);
            break;
        case 'deepl':
            translateWithDeepL(currentWord, currentSentence, targetLang, boxElement);
            break;
        case 'microsoft':
            translateWithMicrosoft(currentWord, currentSentence, targetLang, boxElement);
            break;
        case 'yandex':
            translateWithYandex(currentWord, currentSentence, targetLang, boxElement);
            break;
        case 'openai':
            translateWithOpenAI(currentWord, currentSentence, targetLang, boxElement);
            break;
        case 'claude':
            translateWithClaude(currentWord, currentSentence, targetLang, boxElement);
            break;
        default:
            // Fallback to Google
            translateWithGoogle(currentWord, currentSentence, targetLang, boxElement);
    }
}

// Translation implementation for Google Translate
function translateWithGoogle(word, sentence, targetLang, boxElement) {
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    const errorElement = boxElement.querySelector('.translation-error');
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    errorElement.classList.add('hidden');
    
    // Use the free Google Translate API endpoint (no API key required)
    const sourceLang = 'auto'; // Auto-detect source language
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading
            loadingIndicator.classList.add('hidden');
            
            // Parse the translation result - the first result is the translation
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                const translation = data[0][0][0];
                translationText.textContent = translation;
            } else {
                throw new Error('Invalid translation response');
            }
        })
        .catch(error => {
            console.error('Translation error:', error);
            showTranslationError(boxElement, "Translation failed. The service might be temporarily unavailable.");
        });
}

// Translation implementation for DeepL
function translateWithDeepL(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.deepl;
    
    console.log('DeepL Translation Debug:');
    console.log('- API Key present:', !!apiKey);
    console.log('- API Key length:', apiKey ? apiKey.length : 0);
    console.log('- API Key starts with:', apiKey ? apiKey.substring(0, 8) + '...' : 'N/A');
    console.log('- Word to translate:', word);
    console.log('- Target language:', targetLang);
    console.log('- Target language (uppercase):', targetLang.toUpperCase());
    
    if (!apiKey) {
        console.error('DeepL: No API key provided');
        showTranslationError(boxElement, "API key required for DeepL. Please add your API key in settings.");
        return;
    }
    
    // Validate API key format (DeepL keys end with :fx for free tier)
    if (!apiKey.includes(':')) {
        console.warn('DeepL: API key might be invalid - DeepL keys typically contain a colon');
    }
    
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    
    // Determine the correct API endpoint based on key type
    const isFreeKey = apiKey.endsWith(':fx');
    const url = isFreeKey ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
    
    // Prepare request body as JSON (new format)
    const requestBody = {
        text: [word],
        target_lang: targetLang.toUpperCase()
    };
    
    console.log('DeepL: Using API endpoint:', url);
    console.log('DeepL: API key type:', isFreeKey ? 'Free' : 'Pro');
    console.log('DeepL: Request body:', requestBody);
    console.log('DeepL: Authorization header:', `DeepL-Auth-Key ${apiKey.substring(0, 8)}...`);
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `DeepL-Auth-Key ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        console.log('DeepL: Response status:', response.status);
        console.log('DeepL: Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            return response.text().then(errorText => {
                console.error('DeepL: Error response body:', errorText);
                
                // Parse common DeepL error messages
                let userFriendlyMessage = 'Translation failed. ';
                if (response.status === 403) {
                    userFriendlyMessage += 'Invalid API key or authorization failed.';
                } else if (response.status === 456) {
                    userFriendlyMessage += 'Quota exceeded.';
                } else if (response.status === 400) {
                    userFriendlyMessage += 'Bad request - check target language.';
                } else {
                    userFriendlyMessage += `HTTP ${response.status}: ${errorText}`;
                }
                
                throw new Error(userFriendlyMessage);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('DeepL: Success response:', data);
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data.translations && data.translations.length > 0) {
            const translation = data.translations[0].text;
            console.log('DeepL: Translation result:', translation);
            translationText.textContent = translation;
        } else {
            console.error('DeepL: Invalid response structure:', data);
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('DeepL: Translation error:', error);
        console.error('DeepL: Error details:', {
            message: error.message,
            stack: error.stack
        });
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Show user-friendly error
        showTranslationError(boxElement, error.message);
    });
}

// Translation implementation for Microsoft Translator
function translateWithMicrosoft(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.microsoft;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for Microsoft Translator. Please add your API key in settings.");
        return;
    }
    
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    
    // Call the Microsoft Translator API
    const url = 'https://api.cognitive.microsofttranslator.com/translate';
    const params = new URLSearchParams({
        'api-version': '3.0',
        'to': targetLang
    });
    
    fetch(`${url}?${params}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey,
            'Ocp-Apim-Subscription-Region': 'global' // Change this to your region
        },
        body: JSON.stringify([{ 'text': word }])
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Translation API error');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data && data.length > 0 && data[0].translations && data[0].translations.length > 0) {
            translationText.textContent = data[0].translations[0].text;
        } else {
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('Translation error:', error);
        showTranslationError(boxElement, "Translation failed. Please check your API key and try again.");
    });
}

// Translation implementation for Yandex Translate
function translateWithYandex(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.yandex;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for Yandex Translate. Please add your API key in settings.");
        return;
    }
    
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    
    // Call the Yandex Translate API
    const url = 'https://translate.api.cloud.yandex.net/translate/v2/translate';
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Api-Key ${apiKey}`
        },
        body: JSON.stringify({
            texts: [word],
            targetLanguageCode: targetLang
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Translation API error');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data.translations && data.translations.length > 0) {
            translationText.textContent = data.translations[0].text;
        } else {
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('Translation error:', error);
        showTranslationError(boxElement, "Translation failed. Please check your API key and try again.");
    });
}

// Translation implementation for OpenAI
function translateWithOpenAI(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.openai;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for OpenAI. Please add your API key in settings.");
        return;
    }
    
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    
    // Define the language to use in the prompt
    const languageNames = {
        'ru': 'Russian',
        'en': 'English',
        'de': 'German',
        'fr': 'French',
        'es': 'Spanish',
        'zh': 'Chinese',
        'ja': 'Japanese'
    };
    
    const targetLanguageName = languageNames[targetLang] || targetLang;
    
    // Call the OpenAI API
    const url = 'https://api.openai.com/v1/chat/completions';
    const contextPrompt = sentence ? `In the context: "${sentence}"` : '';
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional translator. Translate the given word to ${targetLanguageName}. Be precise and concise.`
                },
                {
                    role: 'user',
                    content: `Translate the word "${word}" to ${targetLanguageName}. ${contextPrompt}`
                }
            ],
            temperature: 0.3,
            max_tokens: 50
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Translation API error');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            translationText.textContent = data.choices[0].message.content.trim();
        } else {
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('Translation error:', error);
        showTranslationError(boxElement, "Translation failed. Please check your API key and try again.");
    });
}

// Translation implementation for Claude
function translateWithClaude(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.claude;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for Claude. Please add your API key in settings.");
        return;
    }
    
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    
    // Define the language to use in the prompt
    const languageNames = {
        'ru': 'Russian',
        'en': 'English',
        'de': 'German',
        'fr': 'French',
        'es': 'Spanish',
        'zh': 'Chinese',
        'ja': 'Japanese'
    };
    
    const targetLanguageName = languageNames[targetLang] || targetLang;
    
    // Call the Claude API
    const url = 'https://api.anthropic.com/v1/messages';
    const contextPrompt = sentence ? `Consider the context: "${sentence}"` : '';
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: `Translate the word "${word}" to ${targetLanguageName}. ${contextPrompt} Only provide the translation, without any explanations or additional text.`
                }
            ]
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Translation API error');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data.content && data.content.length > 0) {
            translationText.textContent = data.content[0].text.trim();
        } else {
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('Translation error:', error);
        showTranslationError(boxElement, "Translation failed. Please check your API key and try again.");
    });
}

// Show translation error
function showTranslationError(boxElement, errorMessage) {
    const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
    const translationText = boxElement.querySelector('.translation-text');
    const errorElement = boxElement.querySelector('.translation-error');
    
    // Hide loading
    loadingIndicator.classList.add('hidden');
    translationText.textContent = '';
    
    // Show error
    errorElement.textContent = errorMessage || "Translation error. Please try again.";
    errorElement.classList.remove('hidden');
}

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log('DOMContentLoaded event fired');
    initializeSidebar();
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded');
} else {
    console.log('Document already loaded, initializing immediately');
    initializeSidebar();
}

// Debug function to inspect current state (call from console)
window.debugTranslator = function() {
    console.log('=== TRANSLATOR DEBUG INFO ===');
    console.log('Current settings:', settings);
    console.log('Translation boxes in DOM:', translationsContainer.children.length);
    console.log('DOM boxes:', Array.from(translationsContainer.children).map(box => ({
        provider: box.getAttribute('data-provider'),
        language: box.querySelector('.language-select')?.value
    })));
    
    // Check storage directly
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get("translatorSettings", (result) => {
            console.log('Storage contents:', result);
        });
    } else {
        console.log('Chrome storage not available');
    }
    
    console.log('=== END DEBUG INFO ===');
};

// Auto-call debug function after a short delay for immediate insight
setTimeout(() => {
    if (window.debugTranslator) {
        console.log('Auto-running debug after initialization...');
        window.debugTranslator();
    }
}, 2000);
