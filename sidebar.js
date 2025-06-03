// DOM Elements
const selectionElement = document.getElementById("selection");
const sentenceElement = document.getElementById("sentence");
const translationsContainer = document.getElementById("translations-container");
const addTranslationButton = document.getElementById("add-translation-button");
const globalSettingsButton = document.getElementById("global-settings-button");
const backButton = document.getElementById("back-button");
const saveSettingsButton = document.getElementById("save-settings");
const appContainer = document.querySelector(".app-container");

// Profile-related DOM elements
const profileDropdown = document.getElementById("profile-dropdown");
const loadProfileButton = document.getElementById("load-profile-button");
const saveProfileButton = document.getElementById("save-profile-button");
const profilesList = document.getElementById("profiles-list");
const createProfileButton = document.getElementById("create-profile-button");
const profileModalOverlay = document.getElementById("profile-modal-overlay");
const modalTitle = document.getElementById("modal-title");
const profileNameInput = document.getElementById("profile-name-input");
const modalClose = document.getElementById("modal-close");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");

// Auth-related DOM elements
const authContainer = document.getElementById("auth-container");
const authLoggedOut = document.getElementById("auth-logged-out");
const authLoggedIn = document.getElementById("auth-logged-in");
const showSigninButton = document.getElementById("show-signin-button");
const showSignupButton = document.getElementById("show-signup-button");
const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");
const signinSubmit = document.getElementById("signin-submit");
const signinCancel = document.getElementById("signin-cancel");
const signupSubmit = document.getElementById("signup-submit");
const signupCancel = document.getElementById("signup-cancel");
const signoutButton = document.getElementById("signout-button");
const forceSyncButton = document.getElementById("force-sync-button");
const userEmail = document.getElementById("user-email");
const syncStatus = document.getElementById("sync-status");
const syncIndicator = document.getElementById("sync-indicator");
const signinMessage = document.getElementById("signin-message");
const signupMessage = document.getElementById("signup-message");
const syncMessage = document.getElementById("sync-message");

// Auth state management
let isAuthenticated = false;
let currentUser = null;
let syncEnabled = false;

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

// Profile management
let profiles = {};
let currentProfileName = null;
let editingProfileName = null; // Used when editing profile name in modal

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

// Debounce variables for translation requests
let translationDebounceTimer = null;
const TRANSLATION_DEBOUNCE_DELAY = 500; // 500ms delay after last selection change

// Debounced version of translateAllBoxes to prevent rapid-fire requests
function debouncedTranslateAllBoxes() {
    // Clear any existing timer
    if (translationDebounceTimer) {
        clearTimeout(translationDebounceTimer);
    }
    
    // Set a new timer
    translationDebounceTimer = setTimeout(() => {
        console.log("🎯 Debounced translation triggered after user finished selecting");
        translateAllBoxes();
        translationDebounceTimer = null;
    }, TRANSLATION_DEBOUNCE_DELAY);
    
    console.log("⏱️ Translation request debounced, waiting for user to finish selecting...");
}

// Rate limiting queue for Gemini API
let geminiRequestQueue = [];
let geminiRequestInProgress = false;
const GEMINI_REQUEST_DELAY = 1000; // 1 second delay between requests

// Process Gemini request queue
function processGeminiQueue() {
    if (geminiRequestInProgress || geminiRequestQueue.length === 0) {
        return;
    }
    
    geminiRequestInProgress = true;
    const request = geminiRequestQueue.shift();
    
    // Execute the request
    request.execute()
        .finally(() => {
            geminiRequestInProgress = false;
            // Process next request after delay
            setTimeout(() => {
                processGeminiQueue();
            }, GEMINI_REQUEST_DELAY);
        });
}

// Add request to Gemini queue
function queueGeminiRequest(requestFunction) {
    geminiRequestQueue.push({ execute: requestFunction });
    processGeminiQueue();
}

// ====================
// AUTHENTICATION & SYNC
// ====================

// Check authentication status and update UI
async function checkAuthStatus() {
    console.log('🔐 Checking authentication status...');
    
    try {
        // Initialize Supabase client
        if (typeof window.SupabaseAuth === 'undefined') {
            console.warn('🔐 Supabase auth not available, operating in local mode');
            updateAuthUI(false);
            return;
        }
        
        const user = await window.SupabaseAuth.getCurrentUser();
        
        if (user) {
            console.log('🔐 User authenticated:', user.email);
            isAuthenticated = true;
            currentUser = user;
            syncEnabled = true;
            updateAuthUI(true);
            
            // Load data from Supabase
            await syncFromSupabase();
        } else {
            console.log('🔐 User not authenticated');
            isAuthenticated = false;
            currentUser = null;
            syncEnabled = false;
            updateAuthUI(false);
        }
    } catch (error) {
        console.error('🔐 Error checking auth status:', error);
        isAuthenticated = false;
        currentUser = null;
        syncEnabled = false;
        updateAuthUI(false);
    }
}

// Update authentication UI
function updateAuthUI(authenticated) {
    if (!authLoggedOut || !authLoggedIn) {
        console.warn('🔐 Auth UI elements not found');
        return;
    }
    
    if (authenticated && currentUser) {
        authLoggedOut.classList.add('hidden');
        authLoggedIn.classList.remove('hidden');
        
        if (userEmail) {
            userEmail.textContent = currentUser.email;
        }
        
        if (syncIndicator) {
            syncIndicator.textContent = '☁️ Synced';
            syncIndicator.className = 'sync-indicator synced';
        }
        
        console.log('🔐 Updated UI for authenticated user');
    } else {
        authLoggedOut.classList.remove('hidden');
        authLoggedIn.classList.add('hidden');
        
        if (syncIndicator) {
            syncIndicator.textContent = 'Local';
            syncIndicator.className = 'sync-indicator';
        }
        
        console.log('🔐 Updated UI for unauthenticated user');
    }
}

// Handle sign up
async function handleSignUp() {
    const email = document.getElementById('signup-email')?.value;
    const password = document.getElementById('signup-password')?.value;
    const confirmPassword = document.getElementById('signup-confirm-password')?.value;
    
    if (!email || !password || !confirmPassword) {
        showAuthMessage(signupMessage, 'Please fill in all fields.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthMessage(signupMessage, 'Passwords do not match.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage(signupMessage, 'Password must be at least 6 characters long.', 'error');
        return;
    }
    
    try {
        showAuthMessage(signupMessage, 'Creating account...', 'info');
        signupSubmit.disabled = true;
        
        const { data, error } = await window.SupabaseAuth.signUp(email, password);
        
        if (error) {
            showAuthMessage(signupMessage, error, 'error');
        } else {
            showAuthMessage(signupMessage, 'Account created! Please check your email for verification.', 'success');
            
            // Clear form
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-confirm-password').value = '';
            
            // Hide form after successful signup
            setTimeout(() => {
                hideAuthForms();
            }, 2000);
        }
    } catch (err) {
        console.error('🔐 Sign up error:', err);
        showAuthMessage(signupMessage, 'Failed to create account. Please try again.', 'error');
    } finally {
        signupSubmit.disabled = false;
    }
}

// Handle sign in
async function handleSignIn() {
    const email = document.getElementById('signin-email')?.value;
    const password = document.getElementById('signin-password')?.value;
    
    if (!email || !password) {
        showAuthMessage(signinMessage, 'Please enter both email and password.', 'error');
        return;
    }
    
    try {
        showAuthMessage(signinMessage, 'Signing in...', 'info');
        signinSubmit.disabled = true;
        
        const { data, error } = await window.SupabaseAuth.signIn(email, password);
        
        if (error) {
            showAuthMessage(signinMessage, error, 'error');
        } else {
            showAuthMessage(signinMessage, 'Signed in successfully!', 'success');
            
            // Clear form
            document.getElementById('signin-email').value = '';
            document.getElementById('signin-password').value = '';
            
            // Update auth status
            await checkAuthStatus();
            
            // Hide form
            hideAuthForms();
        }
    } catch (err) {
        console.error('🔐 Sign in error:', err);
        showAuthMessage(signinMessage, 'Failed to sign in. Please try again.', 'error');
    } finally {
        signinSubmit.disabled = false;
    }
}

// Handle sign out
async function handleSignOut() {
    try {
        const { error } = await window.SupabaseAuth.signOut();
        
        if (error) {
            console.error('🔐 Sign out error:', error);
            showSyncMessage('Failed to sign out. Please try again.', 'error');
        } else {
            console.log('🔐 Signed out successfully');
            isAuthenticated = false;
            currentUser = null;
            syncEnabled = false;
            updateAuthUI(false);
            showSyncMessage('Signed out successfully.', 'success');
        }
    } catch (err) {
        console.error('🔐 Sign out exception:', err);
        showSyncMessage('Failed to sign out. Please try again.', 'error');
    }
}

// Sync data to Supabase
async function syncToSupabase() {
    if (!isAuthenticated || !syncEnabled) {
        console.log('🔄 Sync to Supabase skipped - not authenticated');
        return;
    }
    
    try {
        console.log('🔄 Syncing data to Supabase...');
        
        if (syncStatus) {
            syncStatus.textContent = '⏳ Syncing...';
            syncStatus.className = 'sync-status syncing';
        }
        
        // Save global settings
        const settingsResult = await window.SupabaseAuth.saveUserSettings(settings);
        if (settingsResult.error) {
            throw new Error(`Settings sync failed: ${settingsResult.error}`);
        }
        
        // Save all profiles
        const profilePromises = Object.entries(profiles).map(([profileName, profileSettings]) => {
            const isCurrent = profileName === currentProfileName;
            return window.SupabaseAuth.saveUserProfile(profileName, profileSettings, isCurrent);
        });
        
        const profileResults = await Promise.all(profilePromises);
        const failedProfiles = profileResults.filter(result => result.error);
        
        if (failedProfiles.length > 0) {
            throw new Error(`Profile sync failed for ${failedProfiles.length} profiles`);
        }
        
        console.log('🔄 Data synced to Supabase successfully');
        
        if (syncStatus) {
            syncStatus.textContent = '✓ Synced';
            syncStatus.className = 'sync-status';
        }
        
        if (syncIndicator) {
            syncIndicator.textContent = '☁️ Synced';
            syncIndicator.className = 'sync-indicator synced';
        }
        
        showSyncMessage('Data synced to cloud successfully.', 'success');
        
    } catch (error) {
        console.error('🔄 Sync to Supabase failed:', error);
        
        if (syncStatus) {
            syncStatus.textContent = '❌ Sync Failed';
            syncStatus.className = 'sync-status error';
        }
        
        if (syncIndicator) {
            syncIndicator.textContent = '❌ Error';
            syncIndicator.className = 'sync-indicator error';
        }
        
        showSyncMessage(`Sync failed: ${error.message}`, 'error');
    }
}

// Sync data from Supabase
async function syncFromSupabase() {
    if (!isAuthenticated || !syncEnabled) {
        console.log('🔄 Sync from Supabase skipped - not authenticated');
        return;
    }
    
    try {
        console.log('🔄 Loading data from Supabase...');
        
        if (syncStatus) {
            syncStatus.textContent = '⏳ Loading...';
            syncStatus.className = 'sync-status syncing';
        }
        
        // Load global settings
        const settingsResult = await window.SupabaseAuth.loadUserSettings();
        if (settingsResult.error && settingsResult.error !== 'User not authenticated') {
            throw new Error(`Settings load failed: ${settingsResult.error}`);
        }
        
        if (settingsResult.data) {
            // Merge remote settings with local defaults
            settings = {
                ...settings,
                maxWordCount: settingsResult.data.max_word_count || settings.maxWordCount,
                defaultTargetLanguage: settingsResult.data.default_target_language || settings.defaultTargetLanguage,
                enabledProviders: {
                    ...settings.enabledProviders,
                    ...settingsResult.data.enabled_providers
                },
                apiKeys: {
                    ...settings.apiKeys,
                    ...settingsResult.data.api_keys
                }
            };
            
            console.log('🔄 Loaded settings from Supabase');
        }
        
        // Load profiles
        const profilesResult = await window.SupabaseAuth.loadUserProfiles();
        if (profilesResult.error && profilesResult.error !== 'User not authenticated') {
            throw new Error(`Profiles load failed: ${profilesResult.error}`);
        }
        
        if (profilesResult.data && profilesResult.data.length > 0) {
            profiles = {};
            let foundCurrentProfile = false;
            
            profilesResult.data.forEach(profile => {
                profiles[profile.profile_name] = profile.settings;
                if (profile.is_current) {
                    currentProfileName = profile.profile_name;
                    foundCurrentProfile = true;
                }
            });
            
            // If no current profile was marked, use the first one
            if (!foundCurrentProfile && Object.keys(profiles).length > 0) {
                currentProfileName = Object.keys(profiles)[0];
            }
            
            console.log('🔄 Loaded profiles from Supabase:', Object.keys(profiles));
        }
        
        // Update UI
        updateSettingsUI();
        updateProfileDropdown();
        updateProfilesList();
        restoreTranslationBoxes();
        
        if (syncStatus) {
            syncStatus.textContent = '✓ Synced';
            syncStatus.className = 'sync-status';
        }
        
        if (syncIndicator) {
            syncIndicator.textContent = '☁️ Synced';
            syncIndicator.className = 'sync-indicator synced';
        }
        
        console.log('🔄 Data loaded from Supabase successfully');
        showSyncMessage('Data loaded from cloud successfully.', 'success');
        
    } catch (error) {
        console.error('🔄 Sync from Supabase failed:', error);
        
        if (syncStatus) {
            syncStatus.textContent = '❌ Load Failed';
            syncStatus.className = 'sync-status error';
        }
        
        if (syncIndicator) {
            syncIndicator.textContent = '❌ Error';
            syncIndicator.className = 'sync-indicator error';
        }
        
        showSyncMessage(`Load failed: ${error.message}`, 'error');
    }
}

// Show authentication message
function showAuthMessage(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `auth-message ${type}`;
    element.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

// Show sync message
function showSyncMessage(message, type) {
    if (!syncMessage) return;
    
    syncMessage.textContent = message;
    syncMessage.className = `sync-message ${type}`;
    syncMessage.style.display = 'block';
    
    // Auto-hide messages after 3 seconds
    setTimeout(() => {
        syncMessage.style.display = 'none';
    }, 3000);
}

// Show/hide auth forms
function showSignInForm() {
    hideAuthForms();
    signinForm.classList.remove('hidden');
}

function showSignUpForm() {
    hideAuthForms();
    signupForm.classList.remove('hidden');
}

function hideAuthForms() {
    signinForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    
    // Clear messages
    if (signinMessage) signinMessage.style.display = 'none';
    if (signupMessage) signupMessage.style.display = 'none';
}

// ====================
// PROFILE MANAGEMENT
// ====================

// Load profiles from storage
function loadProfiles() {
    console.log('LoadProfiles: Loading profiles from storage...');
    
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('LoadProfiles: Chrome storage API not available');
        profiles = { "Default": JSON.parse(JSON.stringify(settings)) };
        updateProfileDropdown();
        updateProfilesList();
        return;
    }
    
    chrome.storage.sync.get(["translatorProfiles", "currentProfile"], (result) => {
        if (chrome.runtime.lastError) {
            console.error('LoadProfiles: Chrome runtime error:', chrome.runtime.lastError);
            profiles = { "Default": JSON.parse(JSON.stringify(settings)) };
        } else {
            profiles = result.translatorProfiles || { "Default": JSON.parse(JSON.stringify(settings)) };
            currentProfileName = result.currentProfile || null;
            
            console.log('LoadProfiles: Loaded profiles:', Object.keys(profiles));
            console.log('LoadProfiles: Current profile:', currentProfileName);
        }
        
        updateProfileDropdown();
        updateProfilesList();
        
        // Load current profile if set
        if (currentProfileName && profiles[currentProfileName]) {
            loadProfile(currentProfileName, false); // false = don't save settings before loading
        }
    });
}

// Save profiles to storage
function saveProfiles() {
    console.log('SaveProfiles: Saving profiles to storage...');
    console.log('SaveProfiles: Profiles to save:', Object.keys(profiles));
    
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('SaveProfiles: Chrome storage API not available');
        return;
    }
    
    chrome.storage.sync.set({ 
        "translatorProfiles": profiles,
        "currentProfile": currentProfileName
    }, () => {
        if (chrome.runtime.lastError) {
            console.error('SaveProfiles: Error saving profiles:', chrome.runtime.lastError);
        } else {
            console.log('SaveProfiles: Profiles saved successfully');
        }
    });
}

// Create a new profile
function createProfile(profileName) {
    if (!profileName || profileName.trim() === '') {
        console.error('CreateProfile: Invalid profile name');
        return false;
    }
    
    profileName = profileName.trim();
    
    if (profiles[profileName]) {
        console.error('CreateProfile: Profile already exists:', profileName);
        return false;
    }
    
    // Capture current settings as new profile
    const currentSettings = getCurrentSettings();
    profiles[profileName] = JSON.parse(JSON.stringify(currentSettings));
    
    console.log('CreateProfile: Created profile:', profileName);
    
    saveProfiles();
    updateProfileDropdown();
    updateProfilesList();
    
    return true;
}

// Load a profile
function loadProfile(profileName, saveCurrentFirst = true) {
    if (!profiles[profileName]) {
        console.error('LoadProfile: Profile not found:', profileName);
        return false;
    }
    
    console.log('LoadProfile: Loading profile:', profileName);
    
    // Save current settings to current profile if specified
    if (saveCurrentFirst && currentProfileName && profiles[currentProfileName]) {
        const currentSettings = getCurrentSettings();
        profiles[currentProfileName] = JSON.parse(JSON.stringify(currentSettings));
        console.log('LoadProfile: Saved current settings to:', currentProfileName);
    }
    
    // Load new profile
    const profileSettings = profiles[profileName];
    settings = JSON.parse(JSON.stringify(profileSettings));
    currentProfileName = profileName;
    
    console.log('LoadProfile: Loaded settings for profile:', profileName);
    
    // Update UI
    updateSettingsUI();
    restoreTranslationBoxes();
    updateProfileDropdown();
    updateProfilesList();
    
    // Save current profile reference
    saveProfiles();
    
    return true;
}

// Save current settings to profile
function saveToProfile(profileName) {
    if (!profileName || profileName.trim() === '') {
        console.error('SaveToProfile: Invalid profile name');
        return false;
    }
    
    profileName = profileName.trim();
    
    const currentSettings = getCurrentSettings();
    profiles[profileName] = JSON.parse(JSON.stringify(currentSettings));
    currentProfileName = profileName;
    
    console.log('SaveToProfile: Saved current settings to profile:', profileName);
    
    saveProfiles();
    updateProfileDropdown();
    updateProfilesList();
    
    return true;
}

// Delete a profile
function deleteProfile(profileName) {
    if (!profiles[profileName]) {
        console.error('DeleteProfile: Profile not found:', profileName);
        return false;
    }
    
    // Don't allow deleting the last profile
    if (Object.keys(profiles).length <= 1) {
        console.warn('DeleteProfile: Cannot delete the last profile');
        return false;
    }
    
    delete profiles[profileName];
    
    // If we deleted the current profile, switch to first available
    if (currentProfileName === profileName) {
        const firstProfileName = Object.keys(profiles)[0];
        loadProfile(firstProfileName, false);
    }
    
    console.log('DeleteProfile: Deleted profile:', profileName);
    
    saveProfiles();
    updateProfileDropdown();
    updateProfilesList();
    
    return true;
}

// Get current settings including translation boxes
function getCurrentSettings() {
    // Get current translation boxes layout
    const boxes = document.querySelectorAll('.translation-box');
    const translationBoxes = [];
    
    boxes.forEach(box => {
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const targetLanguage = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        
        // Get model if it's an AI provider
        let model = null;
        const modelSelect = box.querySelector('.model-select');
        if (modelSelect) {
            model = modelSelect.value;
        }
        
        const boxConfig = {
            provider: provider,
            targetLanguage: targetLanguage
        };
        
        if (model) {
            boxConfig.model = model;
        }
        
        translationBoxes.push(boxConfig);
    });
    
    // Get current settings from UI
    const maxWordCountInput = document.getElementById('max-word-count');
    const maxWordCount = maxWordCountInput ? parseInt(maxWordCountInput.value) || 25 : settings.maxWordCount;
    
    // Get enabled providers from checkboxes
    const enabledProviders = {};
    for (const provider in settings.enabledProviders) {
        const checkbox = document.getElementById(`enable-${provider}`);
        enabledProviders[provider] = checkbox ? checkbox.checked : settings.enabledProviders[provider];
    }
    
    // Get API keys from inputs
    const apiKeys = {};
    for (const provider in settings.apiKeys) {
        const input = document.getElementById(`${provider}-api-key`);
        apiKeys[provider] = input ? input.value : settings.apiKeys[provider];
    }
    
    return {
        maxWordCount: maxWordCount,
        enabledProviders: enabledProviders,
        apiKeys: apiKeys,
        defaultTargetLanguage: settings.defaultTargetLanguage,
        translationBoxes: translationBoxes
    };
}

// Update profile dropdown
function updateProfileDropdown() {
    console.log('UpdateProfileDropdown: Updating dropdown with profiles:', Object.keys(profiles));
    
    const selectedValue = profileDropdown.value;
    
    // Clear existing options except create new
    profileDropdown.innerHTML = `
        <option value="" disabled ${!currentProfileName ? 'selected' : ''}>Select profile</option>
        <option value="__create_new__">Create new...</option>
    `;
    
    // Add profile options
    Object.keys(profiles).forEach(profileName => {
        const option = document.createElement('option');
        option.value = profileName;
        option.textContent = profileName;
        option.selected = profileName === currentProfileName;
        profileDropdown.appendChild(option);
    });
    
    console.log('UpdateProfileDropdown: Current profile selected:', currentProfileName);
}

// Update profiles list in settings
function updateProfilesList() {
    console.log('UpdateProfilesList: Updating profiles list');
    
    profilesList.innerHTML = '';
    
    if (Object.keys(profiles).length === 0) {
        profilesList.innerHTML = '<p class="no-profiles">No profiles found. Create a new profile to get started.</p>';
        return;
    }
    
    Object.keys(profiles).forEach(profileName => {
        const isActive = profileName === currentProfileName;
        
        const profileItem = document.createElement('div');
        profileItem.className = `profile-item ${isActive ? 'active' : ''}`;
        
        profileItem.innerHTML = `
            <span class="profile-name">${profileName}</span>
            <div class="profile-actions-buttons">
                <button class="profile-action-button edit-profile" data-profile="${profileName}">Rename</button>
                <button class="profile-action-button delete-profile" data-profile="${profileName}" ${Object.keys(profiles).length <= 1 ? 'disabled' : ''}>Delete</button>
            </div>
        `;
        
        profilesList.appendChild(profileItem);
    });
}

// Show profile modal
function showProfileModal(mode = 'create', profileName = '') {
    editingProfileName = mode === 'edit' ? profileName : null;
    
    modalTitle.textContent = mode === 'create' ? 'Create New Profile' : 'Rename Profile';
    profileNameInput.value = profileName;
    profileNameInput.placeholder = mode === 'create' ? 'Enter profile name' : 'Enter new profile name';
    
    profileModalOverlay.classList.remove('hidden');
    profileNameInput.focus();
}

// Hide profile modal
function hideProfileModal() {
    profileModalOverlay.classList.add('hidden');
    profileNameInput.value = '';
    editingProfileName = null;
}

// Handle profile modal save
function handleProfileModalSave() {
    const profileName = profileNameInput.value.trim();
    
    if (!profileName) {
        alert('Please enter a profile name.');
        return;
    }
    
    if (editingProfileName) {
        // Rename existing profile
        if (profileName === editingProfileName) {
            hideProfileModal();
            return; // No change
        }
        
        if (profiles[profileName]) {
            alert('A profile with this name already exists.');
            return;
        }
        
        // Rename profile
        profiles[profileName] = profiles[editingProfileName];
        delete profiles[editingProfileName];
        
        if (currentProfileName === editingProfileName) {
            currentProfileName = profileName;
        }
        
        console.log('HandleProfileModalSave: Renamed profile from', editingProfileName, 'to', profileName);
        
        saveProfiles();
        updateProfileDropdown();
        updateProfilesList();
    } else {
        // Create new profile
        if (createProfile(profileName)) {
            // Switch to new profile
            loadProfile(profileName);
        } else {
            alert('Failed to create profile. It might already exist.');
            return;
        }
    }
    
    hideProfileModal();
}

// ====================
// END PROFILE MANAGEMENT
// ====================

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
    console.log('Current profile:', currentProfileName);
    console.log('Available profiles:', Object.keys(profiles));
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
    
    // Check if critical DOM elements exist
    console.log('🔍 Checking critical DOM elements:');
    console.log('  - selectionElement (#selection):', !!document.getElementById("selection"));
    console.log('  - sentenceElement (#sentence):', !!document.getElementById("sentence"));
    console.log('  - translationsContainer (#translations-container):', !!document.getElementById("translations-container"));
    console.log('  - addTranslationButton (#add-translation-button):', !!document.getElementById("add-translation-button"));
    
    // Ensure debug functions are available
    console.log('🔧 Debug functions available: forceRefreshDropdowns, debugTranslator, testGemini');
    
    try {
        // Setup event listeners first
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        // Load profiles and current profile
        console.log('Loading profiles...');
        loadProfiles();
        
        // Check authentication status and load cloud data if logged in
        console.log('Checking authentication status...');
        setTimeout(async () => {
            try {
                await checkAuthStatus();
            } catch (error) {
                console.error('Auth status check failed:', error);
            }
        }, 1000); // Give Supabase client time to initialize
        
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
        
        // Get model if it's an AI provider
        let model = null;
        const modelSelect = box.querySelector('.model-select');
        if (modelSelect) {
            model = modelSelect.value;
        }
        
        const boxConfig = {
            provider: provider,
            targetLanguage: targetLanguage
        };
        
        if (model) {
            boxConfig.model = model;
        }
        
        settings.translationBoxes.push(boxConfig);
    });
    
    console.log('SaveTranslationBoxesLayout: Saved layout:', settings.translationBoxes);
    saveSettings();
    
    // Also sync to Supabase if authenticated
    if (isAuthenticated && syncEnabled) {
        syncToSupabase();
    }
}

// Restore translation boxes from settings
function restoreTranslationBoxes() {
    console.log('RestoreTranslationBoxes: Restoring boxes from settings...');
    console.log('RestoreTranslationBoxes: Settings boxes:', settings.translationBoxes);
    
    // Clear existing boxes
    if (translationsContainer) {
        translationsContainer.innerHTML = '';
    }
    
    // If no saved boxes, create default
    if (!settings.translationBoxes || settings.translationBoxes.length === 0) {
        console.log('RestoreTranslationBoxes: No saved boxes, creating default');
        const firstProvider = getFirstEnabledProvider();
        addTranslationBox(firstProvider, settings.defaultTargetLanguage);
        return;
    }
    
    // Restore each saved box
    settings.translationBoxes.forEach((boxConfig, index) => {
        console.log(`RestoreTranslationBoxes: Restoring box ${index + 1}:`, boxConfig);
        
        // Validate provider is still enabled
        if (!settings.enabledProviders[boxConfig.provider]) {
            console.warn(`RestoreTranslationBoxes: Provider ${boxConfig.provider} is disabled, using first enabled provider`);
            boxConfig.provider = getFirstEnabledProvider();
        }
        
        addTranslationBox(
            boxConfig.provider, 
            boxConfig.targetLanguage || settings.defaultTargetLanguage,
            boxConfig.model || null
        );
    });
    
    console.log('RestoreTranslationBoxes: Restoration complete');
}

// Update settings UI with current values
function updateSettingsUI() {
    console.log('UpdateSettingsUI: Updating UI with current settings...');
    
    // Update max word count
    const maxWordCountInput = document.getElementById('max-word-count');
    if (maxWordCountInput) {
        maxWordCountInput.value = settings.maxWordCount;
    }
    
    // Update provider checkboxes and API keys
    for (const provider in settings.enabledProviders) {
        const checkbox = document.getElementById(`enable-${provider}`);
        if (checkbox) {
            checkbox.checked = settings.enabledProviders[provider];
        }
        
        const apiKeyInput = document.getElementById(`${provider}-api-key`);
        if (apiKeyInput) {
            apiKeyInput.value = settings.apiKeys[provider] || '';
        }
    }
    
    console.log('UpdateSettingsUI: UI update complete');
}

// Setup event listeners
function setupEventListeners() {
    console.log('SetupEventListeners: Setting up all event listeners...');
    
    // Global settings button
    if (globalSettingsButton) {
        globalSettingsButton.addEventListener('click', () => {
            console.log('Global settings button clicked');
            appContainer.classList.add('settings-open');
        });
    }
    
    // Back button
    if (backButton) {
        backButton.addEventListener('click', () => {
            console.log('Back button clicked');
            appContainer.classList.remove('settings-open');
        });
    }
    
    // Save settings button
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', () => {
            console.log('Save settings button clicked');
            
            // Get current settings from UI
            const maxWordCountInput = document.getElementById('max-word-count');
            if (maxWordCountInput) {
                settings.maxWordCount = parseInt(maxWordCountInput.value) || 25;
            }
            
            // Update provider settings
            for (const provider in settings.enabledProviders) {
                const checkbox = document.getElementById(`enable-${provider}`);
                if (checkbox) {
                    settings.enabledProviders[provider] = checkbox.checked;
                }
                
                const apiKeyInput = document.getElementById(`${provider}-api-key`);
                if (apiKeyInput) {
                    settings.apiKeys[provider] = apiKeyInput.value;
                }
            }
            
            console.log('Settings updated:', settings);
            saveSettings();
            
            // Refresh translation boxes to reflect new settings
            refreshTranslationBoxes();
            
            // Sync to Supabase if authenticated
            if (isAuthenticated && syncEnabled) {
                syncToSupabase();
            }
            
            // Show feedback
            saveSettingsButton.textContent = 'Saved!';
            setTimeout(() => {
                saveSettingsButton.textContent = 'Save Settings';
            }, 2000);
        });
    }
    
    // Add translation button
    if (addTranslationButton) {
        addTranslationButton.addEventListener('click', () => {
            console.log('Add translation button clicked');
            const firstProvider = getFirstEnabledProvider();
            addTranslationBox(firstProvider, settings.defaultTargetLanguage);
            saveTranslationBoxesLayout();
        });
    }
    
    // Translations container for dynamic events
    if (translationsContainer) {
        translationsContainer.addEventListener('click', handleTranslationsContainerClick);
        translationsContainer.addEventListener('change', handleTranslationsContainerChange);
    }
    
    // Profile management events
    if (profileDropdown) {
        profileDropdown.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            if (selectedValue === '__create_new__') {
                showProfileModal('create');
                e.target.value = currentProfileName || '';
            }
        });
    }
    
    if (loadProfileButton) {
        loadProfileButton.addEventListener('click', () => {
            const selectedProfile = profileDropdown.value;
            if (selectedProfile && selectedProfile !== '__create_new__') {
                loadProfile(selectedProfile);
            }
        });
    }
    
    if (saveProfileButton) {
        saveProfileButton.addEventListener('click', () => {
            const selectedProfile = profileDropdown.value;
            if (selectedProfile && selectedProfile !== '__create_new__') {
                saveToProfile(selectedProfile);
            }
        });
    }
    
    if (createProfileButton) {
        createProfileButton.addEventListener('click', () => {
            showProfileModal('create');
        });
    }
    
    // Profile modal events
    if (modalClose) {
        modalClose.addEventListener('click', hideProfileModal);
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', hideProfileModal);
    }
    
    if (modalSave) {
        modalSave.addEventListener('click', handleProfileModalSave);
    }
    
    if (profileNameInput) {
        profileNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleProfileModalSave();
            }
        });
    }
    
    // Profile list events (delegated)
    if (profilesList) {
        profilesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-profile')) {
                const profileName = e.target.getAttribute('data-profile');
                showProfileModal('edit', profileName);
            } else if (e.target.classList.contains('delete-profile')) {
                const profileName = e.target.getAttribute('data-profile');
                if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
                    deleteProfile(profileName);
                }
            }
        });
    }
    
    // Authentication event listeners
    if (showSigninButton) {
        showSigninButton.addEventListener('click', showSignInForm);
    }
    
    if (showSignupButton) {
        showSignupButton.addEventListener('click', showSignUpForm);
    }
    
    if (signinSubmit) {
        signinSubmit.addEventListener('click', handleSignIn);
    }
    
    if (signinCancel) {
        signinCancel.addEventListener('click', hideAuthForms);
    }
    
    if (signupSubmit) {
        signupSubmit.addEventListener('click', handleSignUp);
    }
    
    if (signupCancel) {
        signupCancel.addEventListener('click', hideAuthForms);
    }
    
    if (signoutButton) {
        signoutButton.addEventListener('click', handleSignOut);
    }
    
    if (forceSyncButton) {
        forceSyncButton.addEventListener('click', () => {
            if (isAuthenticated && syncEnabled) {
                syncToSupabase();
            }
        });
    }
    
    // Listen for messages from content script
    window.addEventListener('message', handleContentScriptMessage);
    
    console.log('SetupEventListeners: All event listeners set up successfully');
}

// Handle messages from content script
function handleContentScriptMessage(event) {
    console.log('🔍 Sidebar received message:', event);
    console.log('🔍 Message origin:', event.origin);
    console.log('🔍 Window location origin:', window.location.origin);
    console.log('🔍 Message data:', event.data);
    
    const data = event.data;
    if (!data || data.source !== 'translatorContentScript') {
        console.log('🚫 Message rejected due to invalid source or no data:', data);
        return;
    }
    
    // Skip origin verification for extension sidebar - we only check the source property
    // since the sidebar should accept messages from any webpage where the extension is active
    console.log('✅ Received valid message from content script:', data);
    
    switch (data.type) {
        case 'textSelected':
            console.log('📝 Processing textSelected message');
            currentWord = data.selectedText || '';
            currentSentence = data.sentence || '';
            
            console.log('📝 Updated currentWord:', currentWord);
            console.log('📝 Updated currentSentence:', currentSentence);
            
            // Update UI
            if (selectionElement) {
                selectionElement.textContent = currentWord || 'Select text to translate';
                console.log('✅ Updated selection element');
            } else {
                console.log('❌ Selection element not found');
            }
            
            if (sentenceElement) {
                sentenceElement.textContent = currentSentence;
                console.log('✅ Updated sentence element');
            } else {
                console.log('❌ Sentence element not found');
            }
            
            // Trigger translation with debouncing
            if (currentWord) {
                console.log('🎯 Triggering translation for:', currentWord);
                debouncedTranslateAllBoxes();
            }
            break;
            
        case 'selectionCleared':
            console.log('🧹 Processing selectionCleared message');
            currentWord = '';
            currentSentence = '';
            
            if (selectionElement) {
                selectionElement.textContent = 'Select text to translate';
            }
            if (sentenceElement) {
                sentenceElement.textContent = '';
            }
            break;
    }
}

// Translate all visible translation boxes
function translateAllBoxes() {
    if (!currentWord) {
        console.log('TranslateAllBoxes: No word selected, skipping translation');
        return;
    }
    
    const boxes = document.querySelectorAll('.translation-box');
    boxes.forEach(box => {
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        
        translateText(box, provider, targetLang);
    });
}

// Handle clicks in translations container
function handleTranslationsContainerClick(event) {
    const target = event.target;
    
    // Check if target is a delete button or inside a delete button
    const deleteButton = target.closest('.delete-button');
    if (deleteButton) {
        const box = deleteButton.closest('.translation-box');
        if (box) {
            box.remove();
            saveTranslationBoxesLayout();
        }
        return;
    }
    
    // Check if target is a settings button or inside a settings button
    const settingsButton = target.closest('.settings-button');
    if (settingsButton) {
        const box = settingsButton.closest('.translation-box');
        const settings = box.querySelector('.provider-settings');
        if (settings) {
            const isCurrentlyHidden = settings.style.display === 'none' || !settings.style.display;
            settings.style.display = isCurrentlyHidden ? 'block' : 'none';
        }
        return;
    }
}

// Handle changes in translations container
function handleTranslationsContainerChange(event) {
    const target = event.target;
    
    if (target.classList.contains('provider-select')) {
        const box = target.closest('.translation-box');
        const newProvider = target.value;
        
        // Update box data attribute
        box.setAttribute('data-provider', newProvider);
        
        // Update model selector for AI providers
        updateModelSelector(box, newProvider);
        
        // Retranslate with new provider
        const langSelect = box.querySelector('.language-select');
        const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        translateText(box, newProvider, targetLang);
        
        // Save layout
        saveTranslationBoxesLayout();
        
    } else if (target.classList.contains('language-select')) {
        const box = target.closest('.translation-box');
        const provider = box.getAttribute('data-provider');
        const newLang = target.value;
        
        // Retranslate with new language
        translateText(box, provider, newLang);
        
        // Save layout
        saveTranslationBoxesLayout();
        
    } else if (target.classList.contains('model-select')) {
        const box = target.closest('.translation-box');
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        
        // Retranslate with new model
        translateText(box, provider, targetLang);
        
        // Save layout
        saveTranslationBoxesLayout();
    }
}

// Add a new translation box
function addTranslationBox(provider, targetLang, model = null) {
    if (!translationsContainer) return;
    
    translationBoxCounter++;
    
    const getModelSelectorHTML = (provider) => {
        const aiProviders = ['openai', 'claude', 'gemini'];
        if (!aiProviders.includes(provider)) return '';
        
        const models = {
            openai: ['gpt-4', 'gpt-3.5-turbo'],
            claude: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
            gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
        };
        
        const providerModels = models[provider] || [];
        const selectedModel = model || providerModels[0] || '';
        
        return `
            <div class="model-selector">
                <label for="model-select-${translationBoxCounter}">Model:</label>
                <select class="model-select" id="model-select-${translationBoxCounter}">
                    ${providerModels.map(m => `<option value="${m}" ${m === selectedModel ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
            </div>
        `;
    };
    
    const box = document.createElement('div');
    box.className = 'translation-box';
    box.setAttribute('data-provider', provider);
    
    box.innerHTML = `
        <div class="translation-header">
            <div class="provider-info">
                <span class="provider-name">${providerNames[provider] || provider}</span>
                <span class="target-language">${getLanguageName(targetLang)}</span>
            </div>
            <div class="translation-controls">
                <button class="settings-button" title="Settings">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                </button>
                <button class="delete-button" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="translation-content">
            <div class="translation-loading-indicator">Ready to translate...</div>
        </div>
        <div class="provider-settings" style="display: none;">
            <div class="provider-selector">
                <label for="provider-select-${translationBoxCounter}">Provider:</label>
                <select class="provider-select" id="provider-select-${translationBoxCounter}">
                    ${generateProviderOptions(provider)}
                </select>
            </div>
            <div class="language-selector">
                <label for="language-select-${translationBoxCounter}">Target Language:</label>
                <select class="language-select" id="language-select-${translationBoxCounter}">
                    ${generateLanguageOptions(provider, targetLang)}
                </select>
            </div>
            ${getModelSelectorHTML(provider)}
            <div class="api-key-reminder">
                ${settings.apiKeys[provider] ? '✓ API key configured' : '⚠️ API key required in settings'}
            </div>
        </div>
    `;
    
    translationsContainer.appendChild(box);
    
    // Translate immediately if we have text
    if (currentWord) {
        translateText(box, provider, targetLang);
    }
}

// Generate provider options HTML
function generateProviderOptions(selectedProvider) {
    let options = '';
    for (const provider in settings.enabledProviders) {
        if (settings.enabledProviders[provider]) {
            const selected = provider === selectedProvider ? 'selected' : '';
            options += `<option value="${provider}" ${selected}>${providerNames[provider] || provider}</option>`;
        }
    }
    return options;
}

// Generate language options HTML
function generateLanguageOptions(provider, selectedLang) {
    const languages = supportedLanguages[provider] || supportedLanguages.google;
    let options = '';
    languages.forEach(lang => {
        const selected = lang === selectedLang ? 'selected' : '';
        options += `<option value="${lang}" ${selected}>${getLanguageName(lang)}</option>`;
    });
    return options;
}

// Get language display name
function getLanguageName(langCode) {
    const languageNames = {
        'ru': 'Russian',
        'en': 'English',
        'de': 'German',
        'fr': 'French',
        'es': 'Spanish',
        'zh': 'Chinese',
        'ja': 'Japanese'
    };
    return languageNames[langCode] || langCode;
}

// Refresh all translation boxes (when settings change)
function refreshTranslationBoxes() {
    console.log('RefreshTranslationBoxes: Refreshing all translation boxes...');
    
    const boxes = document.querySelectorAll('.translation-box');
    boxes.forEach(box => {
        const provider = box.getAttribute('data-provider');
        
        // Check if provider is still enabled
        if (!settings.enabledProviders[provider]) {
            console.log(`RefreshTranslationBoxes: Provider ${provider} disabled, switching to first enabled`);
            const newProvider = getFirstEnabledProvider();
            box.setAttribute('data-provider', newProvider);
            
            // Update provider name in header
            const providerNameElement = box.querySelector('.provider-name');
            if (providerNameElement) {
                providerNameElement.textContent = providerNames[newProvider] || newProvider;
            }
            
            // Update provider select
            const providerSelect = box.querySelector('.provider-select');
            if (providerSelect) {
                providerSelect.innerHTML = generateProviderOptions(newProvider);
                providerSelect.value = newProvider;
            }
            
            // Update model selector
            updateModelSelector(box, newProvider);
        } else {
            // Just refresh the provider options
            const providerSelect = box.querySelector('.provider-select');
            if (providerSelect) {
                const currentValue = providerSelect.value;
                providerSelect.innerHTML = generateProviderOptions(currentValue);
                providerSelect.value = currentValue;
            }
        }
        
        // Update API key reminder
        const apiKeyReminder = box.querySelector('.api-key-reminder');
        if (apiKeyReminder) {
            const currentProvider = box.getAttribute('data-provider');
            apiKeyReminder.textContent = settings.apiKeys[currentProvider] ? 
                '✓ API key configured' : '⚠️ API key required in settings';
        }
    });
    
    // Save the updated layout
    saveTranslationBoxesLayout();
    
    console.log('RefreshTranslationBoxes: Refresh complete');
}

// Update model selector for AI providers
function updateModelSelector(box, provider) {
    const modelSelector = box.querySelector('.model-selector');
    const aiProviders = ['openai', 'claude', 'gemini'];
    
    if (!aiProviders.includes(provider)) {
        if (modelSelector) {
            modelSelector.style.display = 'none';
        }
        return;
    }
    
    const models = {
        openai: ['gpt-4', 'gpt-3.5-turbo'],
        claude: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
    };
    
    const providerModels = models[provider] || [];
    
    if (modelSelector) {
        modelSelector.style.display = 'block';
        const modelSelect = modelSelector.querySelector('.model-select');
        if (modelSelect) {
            const currentValue = modelSelect.value;
            modelSelect.innerHTML = providerModels.map(model => 
                `<option value="${model}" ${model === currentValue ? 'selected' : ''}>${model}</option>`
            ).join('');
            
            // If current value is not available, select first option
            if (!providerModels.includes(currentValue)) {
                modelSelect.value = providerModels[0] || '';
            }
        }
    }
}

// Get first enabled provider
function getFirstEnabledProvider() {
    for (const provider in settings.enabledProviders) {
        if (settings.enabledProviders[provider]) {
            return provider;
        }
    }
    return 'google'; // fallback
}

// Translate text using specified provider
function translateText(boxElement, provider, targetLang) {
    if (!currentWord) return;
    
    console.log(`Translating "${currentWord}" using ${provider} to ${targetLang}`);
    
    const contentElement = boxElement.querySelector('.translation-content');
    if (contentElement) {
        contentElement.innerHTML = '<div class="translation-loading-indicator">Translating...</div>';
    }
    
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
            showTranslationError(boxElement, `Unknown provider: ${provider}`);
    }
}

// Google Translate implementation
function translateWithGoogle(word, sentence, targetLang, boxElement) {
    // Google Translate doesn't require API key for basic usage
    const text = encodeURIComponent(word);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${text}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                const translation = data[0][0][0];
                const contentElement = boxElement.querySelector('.translation-content');
                if (contentElement) {
                    contentElement.innerHTML = `<div class="translation-text">${translation}</div>`;
                }
            } else {
                showTranslationError(boxElement, 'No translation found');
            }
        })
        .catch(error => {
            console.error('Google Translate error:', error);
            showTranslationError(boxElement, 'Translation failed');
        });
}

// DeepL implementation
function translateWithDeepL(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.deepl;
    if (!apiKey) {
        showTranslationError(boxElement, 'DeepL API key required');
        return;
    }
    
    // Determine the correct endpoint based on API key
    const isFreeKey = apiKey.endsWith(':fx');
    const baseUrl = isFreeKey ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
    const url = `${baseUrl}/v2/translate`;
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: [word],
            target_lang: targetLang.toUpperCase()
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.translations && data.translations[0]) {
                const translation = data.translations[0].text;
                const contentElement = boxElement.querySelector('.translation-content');
                if (contentElement) {
                    contentElement.innerHTML = `<div class="translation-text">${translation}</div>`;
                }
            } else {
                showTranslationError(boxElement, 'No translation found');
            }
        })
        .catch(error => {
            console.error('DeepL error:', error);
            showTranslationError(boxElement, 'Translation failed');
        });
}

// Microsoft Translator implementation
function translateWithMicrosoft(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.microsoft;
    if (!apiKey) {
        showTranslationError(boxElement, 'Microsoft API key required');
        return;
    }
    
    const url = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=' + targetLang;
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ text: word }])
    })
        .then(response => response.json())
        .then(data => {
            if (data && data[0] && data[0].translations && data[0].translations[0]) {
                const translation = data[0].translations[0].text;
                const contentElement = boxElement.querySelector('.translation-content');
                if (contentElement) {
                    contentElement.innerHTML = `<div class="translation-text">${translation}</div>`;
                }
            } else {
                showTranslationError(boxElement, 'No translation found');
            }
        })
        .catch(error => {
            console.error('Microsoft Translator error:', error);
            showTranslationError(boxElement, 'Translation failed');
        });
}

// Yandex Translate implementation
function translateWithYandex(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.yandex;
    if (!apiKey) {
        showTranslationError(boxElement, 'Yandex API key required');
        return;
    }
    
    const url = 'https://translate.yandex.net/api/v1.5/tr.json/translate';
    const params = new URLSearchParams({
        key: apiKey,
        text: word,
        lang: targetLang
    });
    
    fetch(`${url}?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.text && data.text[0]) {
                const translation = data.text[0];
                const contentElement = boxElement.querySelector('.translation-content');
                if (contentElement) {
                    contentElement.innerHTML = `<div class="translation-text">${translation}</div>`;
                }
            } else {
                showTranslationError(boxElement, 'No translation found');
            }
        })
        .catch(error => {
            console.error('Yandex Translate error:', error);
            showTranslationError(boxElement, 'Translation failed');
        });
}

// OpenAI implementation
function translateWithOpenAI(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.openai;
    if (!apiKey) {
        showTranslationError(boxElement, 'OpenAI API key required');
        return;
    }
    
    const modelSelect = boxElement.querySelector('.model-select');
    const model = modelSelect ? modelSelect.value : 'gpt-3.5-turbo';
    
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
    
    let prompt;
    if (sentence && sentence.trim() && sentence !== word) {
        prompt = `Translate the word "${word}" to ${targetLanguageName}. Context sentence: "${sentence}". Provide only the translation, no explanations.`;
    } else {
        prompt = `Translate "${word}" to ${targetLanguageName}. Provide only the translation, no explanations.`;
    }
    
    fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 100,
            temperature: 0.3
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const translation = data.choices[0].message.content.trim();
                const contentElement = boxElement.querySelector('.translation-content');
                if (contentElement) {
                    contentElement.innerHTML = `<div class="translation-text">${translation}</div>`;
                }
            } else {
                showTranslationError(boxElement, 'No translation found');
            }
        })
        .catch(error => {
            console.error('OpenAI error:', error);
            showTranslationError(boxElement, 'Translation failed');
        });
}

// Claude implementation
function translateWithClaude(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.claude;
    if (!apiKey) {
        showTranslationError(boxElement, 'Claude API key required');
        return;
    }
    
    const modelSelect = boxElement.querySelector('.model-select');
    const model = modelSelect ? modelSelect.value : 'claude-3-sonnet-20240229';
    
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
    
    let prompt;
    if (sentence && sentence.trim() && sentence !== word) {
        prompt = `Translate the word "${word}" to ${targetLanguageName}. Context sentence: "${sentence}". Provide only the translation, no explanations.`;
    } else {
        prompt = `Translate "${word}" to ${targetLanguageName}. Provide only the translation, no explanations.`;
    }
    
    fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.content && data.content[0] && data.content[0].text) {
                const translation = data.content[0].text.trim();
                const contentElement = boxElement.querySelector('.translation-content');
                if (contentElement) {
                    contentElement.innerHTML = `<div class="translation-text">${translation}</div>`;
                }
            } else {
                showTranslationError(boxElement, 'No translation found');
            }
        })
        .catch(error => {
            console.error('Claude error:', error);
            showTranslationError(boxElement, 'Translation failed');
        });
}

// Gemini implementation with rate limiting
function translateWithGemini(word, sentence, targetLang, boxElement) {
    const apiKey = settings.apiKeys.gemini;
    if (!apiKey) {
        showTranslationError(boxElement, 'Gemini API key required');
        return;
    }
    
    const modelSelect = boxElement.querySelector('.model-select');
    const model = modelSelect ? modelSelect.value : 'gemini-1.5-flash';
    
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
    
    let prompt;
    if (sentence && sentence.trim() && sentence !== word) {
        prompt = `Translate the word "${word}" to ${targetLanguageName}. Context sentence: "${sentence}". Provide only the translation, no explanations.`;
    } else {
        prompt = `Translate "${word}" to ${targetLanguageName}. Provide only the translation, no explanations.`;
    }
    
    // Queue the request to handle rate limiting
    const geminiRequest = () => {
        return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    const translation = data.candidates[0].content.parts[0].text.trim();
                    const contentElement = boxElement.querySelector('.translation-content');
                    if (contentElement) {
                        contentElement.innerHTML = `<div class="translation-text">${translation}</div>`;
                    }
                } else {
                    showTranslationError(boxElement, 'No translation found');
                }
            })
            .catch(error => {
                console.error('Gemini error:', error);
                showTranslationError(boxElement, 'Translation failed');
            });
    };
    
    queueGeminiRequest(geminiRequest);
}

// Show translation error
function showTranslationError(boxElement, errorMessage) {
    const contentElement = boxElement.querySelector('.translation-content');
    if (contentElement) {
        contentElement.innerHTML = `<div class="translation-error">${errorMessage}</div>`;
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
    initializeSidebar();
}
