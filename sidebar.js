// DOM Elements
const selectionElement = document.getElementById("selection");
const sentenceElement = document.getElementById("sentence");
const translationsContainer = document.getElementById("translations-container");
const addTranslationButton = document.getElementById("add-translation-button");
const globalSettingsButton = document.getElementById("global-settings-button");
const backButton = document.getElementById("back-button");
const saveSettingsButton = document.getElementById("save-settings");
const appContainer = document.querySelector(".app-container");

// Default settings
let settings = {
    maxWordCount: 25, // Default maximum word count for translation
    enabledProviders: {
        google: true,
        deepl: false,
        microsoft: false,
        yandex: false,
        openai: false,
        claude: false,
        gemini: false
    },
    apiKeys: {
        google: "",
        deepl: "",
        microsoft: "",
        yandex: "",
        openai: "",
        claude: "",
        gemini: ""
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
    claude: ["ru", "en", "de", "fr", "es", "zh", "ja"],
    gemini: ["ru", "en", "de", "fr", "es", "zh", "ja"]
};

// Provider display names
const providerNames = {
    google: "Google Translate",
    deepl: "DeepL",
    microsoft: "Microsoft Translator",
    yandex: "Yandex Translate",
    openai: "OpenAI",
    claude: "Claude",
    gemini: "Gemini"
};

// Force refresh all provider dropdowns immediately
function forceRefreshAllProviderDropdowns() {
    console.log('🔄 FORCE REFRESH ALL PROVIDER DROPDOWNS');
    console.log('Current enabled providers:', settings.enabledProviders);
    
    const allProviderSelects = document.querySelectorAll('.provider-select');
    console.log('Found provider selects:', allProviderSelects.length);
    
    allProviderSelects.forEach((select, index) => {
        console.log(`Updating select ${index + 1}`);
        const currentValue = select.value;
        const newHTML = generateProviderOptions(currentValue);
        select.innerHTML = newHTML;
        
        // Ensure the current value is still selected if it exists
        if (currentValue && settings.enabledProviders[currentValue]) {
            select.value = currentValue;
        }
    });
    
    console.log('✅ Force refresh complete');
}

// Debug function to inspect current state (call from console)
function debugTranslator() {
    console.log('=== TRANSLATOR DEBUG INFO ===');
    console.log('Current settings:', settings);
    console.log('Translation boxes in DOM:', translationsContainer ? translationsContainer.children.length : 'Container not found');
    
    if (translationsContainer) {
        console.log('DOM boxes:', Array.from(translationsContainer.children).map(box => ({
            provider: box.getAttribute('data-provider'),
            language: box.querySelector('.language-select')?.value
        })));
    }
    
    // Check provider selects
    const providerSelects = document.querySelectorAll('.provider-select');
    console.log('Provider selects found:', providerSelects.length);
    providerSelects.forEach((select, index) => {
        console.log(`Select ${index + 1}:`, {
            value: select.value,
            options: Array.from(select.options).map(opt => opt.value)
        });
    });
    
    // Check storage directly
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get("translatorSettings", (result) => {
            console.log('Storage contents:', result);
        });
    } else {
        console.log('Chrome storage not available');
    }
    
    console.log('=== END DEBUG INFO ===');
}

// Manual test function to check Gemini status
function testGemini() {
    console.log('🧪 TESTING GEMINI STATUS');
    console.log('Gemini enabled in settings:', settings.enabledProviders?.gemini);
    console.log('Gemini API key present:', !!settings.apiKeys?.gemini);
    
    // Force enable Gemini for testing
    if (!settings.enabledProviders?.gemini) {
        console.log('⚡ Enabling Gemini for test...');
        if (!settings.enabledProviders) settings.enabledProviders = {};
        settings.enabledProviders.gemini = true;
        
        // Update checkbox in UI
        const geminiCheckbox = document.getElementById('enable-gemini');
        if (geminiCheckbox) {
            geminiCheckbox.checked = true;
            console.log('✅ Updated Gemini checkbox');
        } else {
            console.log('❌ Gemini checkbox not found');
        }
    }
    
    // Refresh dropdowns
    console.log('🔄 Refreshing all dropdowns...');
    forceRefreshAllProviderDropdowns();
    
    // Check if Gemini now appears in options
    const providerSelects = document.querySelectorAll('.provider-select');
    providerSelects.forEach((select, index) => {
        const geminiOption = Array.from(select.options).find(opt => opt.value === 'gemini');
        console.log(`Select ${index + 1} has Gemini option:`, !!geminiOption);
    });
    
    console.log('✅ Test complete');
}

// Attach functions to window immediately
window.forceRefreshDropdowns = forceRefreshAllProviderDropdowns;
window.debugTranslator = debugTranslator;  
window.testGemini = testGemini;

// Initialize the sidebar
function initializeSidebar() {
    console.log('=== SIDEBAR INITIALIZATION START ===');
    console.log('DOM loaded, starting sidebar initialization...');
    console.log('Running in iframe context:', window !== window.top);
    console.log('Chrome APIs available:', typeof chrome !== 'undefined' && !!chrome.runtime);
    
    // Ensure debug functions are available
    console.log('🔧 Debug functions available: forceRefreshDropdowns, debugTranslator, testGemini');
    
    try {
        // Setup event listeners first
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        // Load saved settings (this will also restore translation boxes)
        console.log('Loading settings...');
        loadSettings();
        
        // Post a message to parent window to indicate sidebar is ready
        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: 'sidebarReady',
                    source: 'translatorSidebar'
                }, '*');
                console.log('Posted sidebarReady message to parent');
            } catch (error) {
                console.warn('Could not post message to parent:', error);
            }
        }
        
        console.log('=== SIDEBAR INITIALIZATION COMPLETE ===');
    } catch (error) {
        console.error('=== SIDEBAR INITIALIZATION FAILED ===');
        console.error('Error during sidebar initialization:', error);
        console.error('Stack trace:', error.stack);
        
        // Still try to show basic UI even if initialization fails
        try {
            updateSettingsUI();
            restoreTranslationBoxes();
        } catch (fallbackError) {
            console.error('Even fallback initialization failed:', fallbackError);
        }
    }
}

// Load settings from storage
function loadSettings() {
    console.log('LoadSettings: Attempting to load settings from chrome.storage...');
    
    // Check if Chrome APIs are available
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('LoadSettings: Chrome storage API not available, using defaults');
        console.log('LoadSettings: This might be expected in iframe context');
        updateSettingsUI();
        restoreTranslationBoxes();
        return;
    }
    
    try {
        chrome.storage.sync.get("translatorSettings", (result) => {
            console.log('LoadSettings: Storage query result:', result);
            
            if (chrome.runtime.lastError) {
                console.error('LoadSettings: Chrome runtime error:', chrome.runtime.lastError);
                console.log('LoadSettings: Falling back to defaults...');
                updateSettingsUI();
                restoreTranslationBoxes();
                return;
            }
            
            if (result.translatorSettings) {
                console.log('LoadSettings: Found saved settings, merging with defaults...');
                // Merge saved settings with defaults to ensure all properties exist
                settings = {
                    ...settings,
                    ...result.translatorSettings,
                    // Ensure nested objects are properly merged
                    enabledProviders: {
                        ...settings.enabledProviders,
                        ...(result.translatorSettings.enabledProviders || {})
                    },
                    apiKeys: {
                        ...settings.apiKeys,
                        ...(result.translatorSettings.apiKeys || {})
                    }
                };
                console.log('LoadSettings: Final merged settings:', settings);
            } else {
                console.log('LoadSettings: No saved settings found, using defaults');
            }
            
            // Update UI and restore boxes
            updateSettingsUI();
            restoreTranslationBoxes();
        });
    } catch (error) {
        console.error('LoadSettings: Error accessing chrome.storage:', error);
        console.log('LoadSettings: Using default settings and proceeding...');
        updateSettingsUI();
        restoreTranslationBoxes();
    }
}

// Save settings to storage
function saveSettings() {
    console.log('SaveSettings: Attempting to save settings...');
    console.log('SaveSettings: Current settings:', settings);
    
    // Check if Chrome APIs are available
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('SaveSettings: Chrome storage API not available, skipping save');
        return;
    }
    
    try {
        chrome.storage.sync.set({ "translatorSettings": settings }, () => {
            if (chrome.runtime.lastError) {
                console.error('SaveSettings: Error saving settings:', chrome.runtime.lastError);
            } else {
                console.log('SaveSettings: Settings saved successfully');
            }
        });
    } catch (error) {
        console.error('SaveSettings: Error accessing chrome.storage:', error);
    }
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
    // Update word count setting
    const maxWordCountInput = document.getElementById('max-word-count');
    if (maxWordCountInput) {
        maxWordCountInput.value = settings.maxWordCount || 25;
    }
    
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
    
    // Global settings button - slide to settings page
    globalSettingsButton.addEventListener("click", () => {
        appContainer.classList.add("settings-open");
    });
    
    // Back button - slide back to main page
    backButton.addEventListener("click", () => {
        appContainer.classList.remove("settings-open");
    });
    
    // Save settings button
    saveSettingsButton.addEventListener("click", () => {
        console.log('💾 SAVE SETTINGS CLICKED');
        
        // Save word count setting
        const maxWordCountInput = document.getElementById('max-word-count');
        if (maxWordCountInput) {
            settings.maxWordCount = parseInt(maxWordCountInput.value) || 25;
        }
        
        // Save enabled status for each provider
        for (const provider in settings.enabledProviders) {
            const checkbox = document.getElementById(`enable-${provider}`);
            if (checkbox) {
                const wasEnabled = settings.enabledProviders[provider];
                const isNowEnabled = checkbox.checked;
                settings.enabledProviders[provider] = isNowEnabled;
                
                if (wasEnabled !== isNowEnabled) {
                    console.log(`Provider ${provider} changed from ${wasEnabled} to ${isNowEnabled}`);
                }
            }
        }
        
        // Save API keys
        for (const provider in settings.apiKeys) {
            const input = document.getElementById(`${provider}-api-key`);
            if (input) {
                settings.apiKeys[provider] = input.value;
            }
        }
        
        console.log('Settings after update:', settings);
        
        saveSettings();
        
        // Slide back to main page
        appContainer.classList.remove("settings-open");
        
        // Force refresh all dropdowns immediately
        setTimeout(() => {
            console.log('🔄 About to force refresh dropdowns...');
            forceRefreshAllProviderDropdowns();
            
            // Also call the regular refresh
            refreshTranslationBoxes();
        }, 100);
        
        // Send updated settings to content script
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updateSettings",
                        settings: { maxWordCount: settings.maxWordCount }
                    });
                }
            });
        }
    });
    
    // Set up delegates for dynamic elements
    translationsContainer.addEventListener("click", handleTranslationsContainerClick);
    translationsContainer.addEventListener("change", handleTranslationsContainerChange);
}

// Handle messages from content script (with proper iframe messaging)
function handleContentScriptMessage(event) {
    // Ensure we only handle messages from our content script
    if (event.origin !== window.location.origin && event.source !== window.parent) {
        return;
    }
    
    const data = event.data;
    
    // Handle different message types
    if (data && data.type === "translateWord") {
        currentWord = data.word || "";
        currentSentence = data.sentence || "";
        
        // Update UI
        if (selectionElement) {
            selectionElement.textContent = currentWord;
        }
        if (sentenceElement) {
            sentenceElement.textContent = currentSentence;
        }
        
        // Translate in all boxes
        translateAllBoxes();
    }
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
        
        // Update model selector visibility - add or remove model selector based on provider
        const existingModelSelector = box.querySelector('.model-selector');
        if (existingModelSelector) {
            existingModelSelector.remove();
        }
        
        // Add model selector for AI providers
        if (newProvider === 'openai' || newProvider === 'claude' || newProvider === 'gemini') {
            const langSelector = box.querySelector('.language-selector');
            const boxId = box.id;
            let modelSelectorHTML = '';
            
            if (newProvider === 'openai') {
                modelSelectorHTML = `<div class="model-selector">
                    <label for="model-select-${boxId}">Model:</label>
                    <select class="model-select" id="model-select-${boxId}">
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o mini</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo" selected>GPT-3.5 Turbo</option>
                    </select>
                </div>`;
            } else if (newProvider === 'claude') {
                modelSelectorHTML = `<div class="model-selector">
                    <label for="model-select-${boxId}">Model:</label>
                    <select class="model-select" id="model-select-${boxId}">
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                        <option value="claude-3-haiku-20240307" selected>Claude 3 Haiku</option>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </select>
                </div>`;
            } else if (newProvider === 'gemini') {
                modelSelectorHTML = `<div class="model-selector">
                    <label for="model-select-${boxId}">Model:</label>
                    <select class="model-select" id="model-select-${boxId}">
                        <option value="gemini-1.5-flash-latest" selected>Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
                        <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                    </select>
                </div>`;
            }
            
            if (modelSelectorHTML) {
                langSelector.insertAdjacentHTML('afterend', modelSelectorHTML);
            }
        }
        
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
    
    // Model selection change
    if (event.target.classList.contains('model-select')) {
        const box = event.target.closest('.translation-box');
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        
        // Hide settings
        const settingsPanel = box.querySelector('.provider-settings');
        settingsPanel.classList.add('hidden');
        
        // Translate with new model
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
    
    // Generate model selector HTML for AI providers
    const getModelSelectorHTML = (provider) => {
        if (provider === 'openai') {
            return `<div class="model-selector">
                <label for="model-select-${boxId}">Model:</label>
                <select class="model-select" id="model-select-${boxId}">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo" selected>GPT-3.5 Turbo</option>
                </select>
            </div>`;
        } else if (provider === 'claude') {
            return `<div class="model-selector">
                <label for="model-select-${boxId}">Model:</label>
                <select class="model-select" id="model-select-${boxId}">
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                    <option value="claude-3-haiku-20240307" selected>Claude 3 Haiku</option>
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </select>
            </div>`;
        } else if (provider === 'gemini') {
            return `<div class="model-selector">
                <label for="model-select-${boxId}">Model:</label>
                <select class="model-select" id="model-select-${boxId}">
                    <option value="gemini-1.5-flash-latest" selected>Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
                    <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                </select>
            </div>`;
        }
        return '';
    };
    
    // When generating provider settings, exclude API key field for Google
    const providerSettingsHTML = `<div class="provider-settings hidden">
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
        ${getModelSelectorHTML(provider)}
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
    console.log('=== GENERATE PROVIDER OPTIONS ===');
    console.log('Selected provider:', selectedProvider);
    console.log('Available providers in settings:', Object.keys(settings.enabledProviders));
    console.log('Enabled providers:', Object.entries(settings.enabledProviders).filter(([provider, enabled]) => enabled).map(([provider]) => provider));
    
    let options = '';
    
    for (const provider in settings.enabledProviders) {
        if (settings.enabledProviders[provider]) {
            console.log(`Adding provider option: ${provider} (${providerNames[provider]})`);
            options += `<option value="${provider}" ${provider === selectedProvider ? 'selected' : ''}>
                ${providerNames[provider]}
            </option>`;
        } else {
            console.log(`Skipping disabled provider: ${provider}`);
        }
    }
    
    console.log('Final options HTML:', options);
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
    console.log('=== REFRESH TRANSLATION BOXES START ===');
    console.log('Current enabled providers:', settings.enabledProviders);
    
    // Get current boxes
    const boxes = document.querySelectorAll('.translation-box');
    console.log('Found translation boxes:', boxes.length);
    
    // Update all boxes to reflect current settings
    boxes.forEach((box, index) => {
        const provider = box.getAttribute('data-provider');
        console.log(`Processing box ${index + 1}: current provider = ${provider}`);
        
        // Always refresh provider dropdown options to include newly enabled providers
        const providerSelect = box.querySelector('.provider-select');
        if (providerSelect) {
            const currentValue = providerSelect.value || provider;
            console.log(`Updating provider dropdown for box ${index + 1}, current value: ${currentValue}`);
            
            const newOptions = generateProviderOptions(currentValue);
            console.log(`Generated options for box ${index + 1}:`, newOptions);
            
            providerSelect.innerHTML = newOptions;
        } else {
            console.log(`No provider select found for box ${index + 1}`);
        }
        
        // Check if current provider is still enabled
        if (!settings.enabledProviders[provider]) {
            console.log(`Provider ${provider} is disabled, switching to enabled provider`);
            // Provider is disabled, need to change to an enabled one
            const newProvider = getFirstEnabledProvider();
            
            if (newProvider) {
                // Update box to use new provider
                box.setAttribute('data-provider', newProvider);
                box.querySelector('.provider-name').textContent = providerNames[newProvider];
                
                // Update provider dropdown
                if (providerSelect) {
                    providerSelect.innerHTML = generateProviderOptions(newProvider);
                    providerSelect.value = newProvider;
                }
                
                // Update language options
                const langSelect = box.querySelector('.language-select');
                if (langSelect) {
                    const currentLang = langSelect.value;
                    langSelect.innerHTML = generateLanguageOptions(newProvider, currentLang);
                }
                
                // Update model selector if needed
                updateModelSelector(box, newProvider);
                
                // Retranslate
                if (currentWord) {
                    translateText(box, newProvider, langSelect ? langSelect.value : settings.defaultTargetLanguage);
                }
            }
        } else {
            console.log(`Provider ${provider} is still enabled, updating model selector only`);
            // Provider is still enabled, but make sure model selector is updated
            updateModelSelector(box, provider);
        }
    });
    
    console.log('=== REFRESH TRANSLATION BOXES COMPLETE ===');
    
    // Save the updated layout
    saveTranslationBoxesLayout();
}

// Helper function to update model selector for AI providers
function updateModelSelector(box, provider) {
    const existingModelSelector = box.querySelector('.model-selector');
    const boxId = box.id;
    
    // Remove existing model selector
    if (existingModelSelector) {
        existingModelSelector.remove();
    }
    
    // Add model selector for AI providers
    if (provider === 'openai' || provider === 'claude' || provider === 'gemini') {
        const langSelector = box.querySelector('.language-selector');
        if (langSelector) {
            let modelSelectorHTML = '';
            
            if (provider === 'openai') {
                modelSelectorHTML = `<div class="model-selector">
                    <label for="model-select-${boxId}">Model:</label>
                    <select class="model-select" id="model-select-${boxId}">
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o mini</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo" selected>GPT-3.5 Turbo</option>
                    </select>
                </div>`;
            } else if (provider === 'claude') {
                modelSelectorHTML = `<div class="model-selector">
                    <label for="model-select-${boxId}">Model:</label>
                    <select class="model-select" id="model-select-${boxId}">
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                        <option value="claude-3-haiku-20240307" selected>Claude 3 Haiku</option>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </select>
                </div>`;
            } else if (provider === 'gemini') {
                modelSelectorHTML = `<div class="model-selector">
                    <label for="model-select-${boxId}">Model:</label>
                    <select class="model-select" id="model-select-${boxId}">
                        <option value="gemini-1.5-flash-latest" selected>Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
                        <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                    </select>
                </div>`;
            }
            
            if (modelSelectorHTML) {
                langSelector.insertAdjacentHTML('afterend', modelSelectorHTML);
            }
        }
    }
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
        case 'gemini':
            translateWithGemini(currentWord, currentSentence, targetLang, boxElement);
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
    
    // Get model from the per-box selector
    const modelSelect = boxElement.querySelector('.model-select');
    const modelName = modelSelect ? modelSelect.value : 'gpt-3.5-turbo';
    
    // Call the OpenAI API
    const url = 'https://api.openai.com/v1/chat/completions';
    const contextPrompt = sentence ? `In the context: "${sentence}"` : '';
    
    // Create the request payload
    const systemMessage = `You are a professional translator. Translate the given word to ${targetLanguageName}. Be precise and concise.`;
    const userMessage = `Translate the word "${word}" to ${targetLanguageName}. ${contextPrompt}`;
    
    const requestPayload = {
        model: modelName,
        messages: [
            {
                role: 'system',
                content: systemMessage
            },
            {
                role: 'user',
                content: userMessage
            }
        ],
        temperature: 0.3,
        max_tokens: 50
    };
    
    // Debug: Log the prompt being sent
    console.log('🤖 OpenAI Translation Debug:');
    console.log('- Model:', modelName);
    console.log('- Word to translate:', word);
    console.log('- Target language:', targetLanguageName);
    console.log('- Context:', sentence || 'None');
    console.log('- System message:', systemMessage);
    console.log('- User message:', userMessage);
    console.log('- Full request payload:', requestPayload);
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestPayload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Translation API error');
        }
        return response.json();
    })
    .then(data => {
        // Debug: Log the full response received
        console.log('🤖 OpenAI Response received:', data);
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            const translatedText = data.choices[0].message.content.trim();
            
            // Debug: Log the extracted translation
            console.log('🤖 OpenAI Translation result:', translatedText);
            console.log('🤖 OpenAI Token usage:', data.usage);
            
            translationText.textContent = translatedText;
        } else {
            console.error('🤖 OpenAI Invalid response structure:', data);
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('🤖 OpenAI Translation error:', error);
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
    
    // Get model from the per-box selector
    const modelSelect = boxElement.querySelector('.model-select');
    const modelName = modelSelect ? modelSelect.value : 'claude-3-haiku-20240307';
    
    // Call the Claude API
    const url = 'https://api.anthropic.com/v1/messages';
    const contextPrompt = sentence ? `Consider the context: "${sentence}"` : '';
    const userMessage = `Translate the word "${word}" to ${targetLanguageName}. ${contextPrompt} Only provide the translation, without any explanations or additional text.`;
    
    const requestPayload = {
        model: modelName,
        max_tokens: 100,
        messages: [
            {
                role: 'user',
                content: userMessage
            }
        ]
    };
    
    // Debug: Log the prompt being sent
    console.log('🧠 Claude Translation Debug:');
    console.log('- Model:', modelName);
    console.log('- Word to translate:', word);
    console.log('- Target language:', targetLanguageName);
    console.log('- Context:', sentence || 'None');
    console.log('- User message:', userMessage);
    console.log('- Full request payload:', requestPayload);
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestPayload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Translation API error');
        }
        return response.json();
    })
    .then(data => {
        // Debug: Log the full response received
        console.log('🧠 Claude Response received:', data);
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data.content && data.content.length > 0) {
            const translatedText = data.content[0].text.trim();
            
            // Debug: Log the extracted translation
            console.log('🧠 Claude Translation result:', translatedText);
            console.log('🧠 Claude Usage info:', data.usage);
            
            translationText.textContent = translatedText;
        } else {
            console.error('🧠 Claude Invalid response structure:', data);
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('🧠 Claude Translation error:', error);
        showTranslationError(boxElement, "Translation failed. Please check your API key and try again.");
    });
}

// Translation implementation for Gemini
function translateWithGemini(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.gemini;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for Gemini. Please add your API key in settings.");
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
    
    // Get model from the per-box selector
    const modelSelect = boxElement.querySelector('.model-select');
    const modelName = modelSelect ? modelSelect.value : 'gemini-1.5-flash-latest';
    
    // Call the Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const contextPrompt = sentence ? `Consider the context: "${sentence}"` : '';
    const promptText = `Translate the word "${word}" to ${targetLanguageName}. ${contextPrompt} Only provide the translation, without any explanations or additional text.`;
    
    const requestPayload = {
        contents: [
            {
                parts: [
                    {
                        text: promptText
                    }
                ]
            }
        ]
    };
    
    // Debug: Log the prompt being sent
    console.log('💎 Gemini Translation Debug:');
    console.log('- Model:', modelName);
    console.log('- Word to translate:', word);
    console.log('- Target language:', targetLanguageName);
    console.log('- Context:', sentence || 'None');
    console.log('- Prompt text:', promptText);
    console.log('- Full request payload:', requestPayload);
    console.log('- API URL:', url.replace(apiKey, '[API_KEY_HIDDEN]'));
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Translation API error');
        }
        return response.json();
    })
    .then(data => {
        // Debug: Log the full response received
        console.log('💎 Gemini Response received:', data);
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Check for valid response
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            const translatedText = data.candidates[0].content.parts[0].text.trim();
            
            // Debug: Log the extracted translation
            console.log('💎 Gemini Translation result:', translatedText);
            console.log('💎 Gemini Usage metadata:', data.usageMetadata);
            console.log('💎 Gemini Safety ratings:', data.candidates[0].safetyRatings);
            
            translationText.textContent = translatedText;
        } else {
            console.error('💎 Gemini Invalid response structure:', data);
            throw new Error('Invalid translation response');
        }
    })
    .catch(error => {
        console.error('💎 Gemini Translation error:', error);
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
