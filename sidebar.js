// DOM Elements
const wordElement = document.getElementById("word");
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
    defaultTargetLanguage: "ru"
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
    // Load saved settings
    loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
    // If there are no translation boxes, add the default one (Google)
    if (translationsContainer.children.length === 0) {
        addTranslationBox("google", settings.defaultTargetLanguage);
    }
}

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get("translatorSettings", (result) => {
        if (result.translatorSettings) {
            settings = result.translatorSettings;
            updateSettingsUI();
        } else {
            // Save default settings if none exist
            saveSettings();
        }
    });
}

// Save settings to storage
function saveSettings() {
    chrome.storage.sync.set({ translatorSettings: settings }, () => {
        console.log("Settings saved");
    });
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
    
    // Hide Google API key field (as it's not needed for free tier)
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
    wordElement.textContent = event.data.word;
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
    
    // Build the HTML for the new box
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
        <div class="provider-settings hidden">
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
        </div>
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
    // In a real implementation, you would call the Google Translate API
    // For now, we'll use a simple mock implementation
    
    setTimeout(() => {
        const translations = {
            "ru": {
                "triple": "тройной",
                "stores": "хранилища",
                "graph": "граф",
                "database": "база данных",
                "types": "типы",
                "other": "другие",
                "forms": "формы",
                "NoSQL": "NoSQL",
                "though": "хотя",
                "there": "там",
                "are": "есть",
                "some": "некоторые",
                "relational": "реляционные",
                "implementations": "реализации"
            },
            "en": {
                "тройной": "triple",
                "хранилища": "stores",
                "граф": "graph",
                "база данных": "database"
            }
        };
        
        const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
        const translationText = boxElement.querySelector('.translation-text');
        const errorElement = boxElement.querySelector('.translation-error');
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Try to get translation, otherwise generate a placeholder
        let translation = "";
        
        if (translations[targetLang] && translations[targetLang][word.toLowerCase()]) {
            translation = translations[targetLang][word.toLowerCase()];
        } else {
            // Create a fake translation
            translation = `[${providerNames.google}] ${word} → ${targetLang}`;
        }
        
        translationText.textContent = translation;
    }, 700);
}

// Translation implementation for DeepL
function translateWithDeepL(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.deepl;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for DeepL");
        return;
    }
    
    // In a real implementation, you would call the DeepL API
    // For demonstration, we'll just return a simulated response
    
    setTimeout(() => {
        const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
        const translationText = boxElement.querySelector('.translation-text');
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Simulate DeepL translation (more formal/precise than Google)
        translationText.textContent = `[${providerNames.deepl}] ${word} → ${targetLang} (более точный перевод)`;
    }, 900);
}

// Translation implementation for Microsoft Translator
function translateWithMicrosoft(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.microsoft;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for Microsoft Translator");
        return;
    }
    
    // In a real implementation, you would call the Microsoft Translator API
    
    setTimeout(() => {
        const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
        const translationText = boxElement.querySelector('.translation-text');
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Simulate Microsoft translation
        translationText.textContent = `[${providerNames.microsoft}] ${word} → ${targetLang}`;
    }, 800);
}

// Translation implementation for Yandex Translate
function translateWithYandex(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.yandex;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for Yandex Translate");
        return;
    }
    
    // In a real implementation, you would call the Yandex Translate API
    
    setTimeout(() => {
        const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
        const translationText = boxElement.querySelector('.translation-text');
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Simulate Yandex translation (might be better for Russian)
        translationText.textContent = `[${providerNames.yandex}] ${word} → ${targetLang} (оптимизировано для русского)`;
    }, 750);
}

// Translation implementation for OpenAI
function translateWithOpenAI(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.openai;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for OpenAI");
        return;
    }
    
    // In a real implementation, you would call the OpenAI API
    
    setTimeout(() => {
        const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
        const translationText = boxElement.querySelector('.translation-text');
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Simulate OpenAI translation with context awareness
        let translation = `[${providerNames.openai}] ${word} → ${targetLang}\n`;
        translation += `Контекстный перевод с учетом фразы: "${sentence.substring(0, 30)}..."`;
        
        translationText.textContent = translation;
    }, 1200);
}

// Translation implementation for Claude
function translateWithClaude(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.claude;
    
    if (!apiKey) {
        showTranslationError(boxElement, "API key required for Claude");
        return;
    }
    
    // In a real implementation, you would call the Claude API
    
    setTimeout(() => {
        const loadingIndicator = boxElement.querySelector('.translation-loading-indicator');
        const translationText = boxElement.querySelector('.translation-text');
        
        // Hide loading
        loadingIndicator.classList.add('hidden');
        
        // Simulate Claude translation with explanations
        let translation = `[${providerNames.claude}] ${word} → ${targetLang}\n`;
        translation += `Основной перевод: [перевод слова]\nАльтернативы: [альтернативы]\nПояснение: [краткое пояснение]`;
        
        translationText.textContent = translation;
    }, 1100);
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
    errorElement.textContent = errorMessage || "Ошибка перевода. Пожалуйста, попробуйте еще раз.";
    errorElement.classList.remove('hidden');
}

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeSidebar);
