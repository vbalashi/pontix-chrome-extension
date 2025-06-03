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
        