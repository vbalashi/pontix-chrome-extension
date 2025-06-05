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
const authLocalMode = document.getElementById("auth-local-mode");
const authLoggedOut = document.getElementById("auth-logged-out");
const authLoggedIn = document.getElementById("auth-logged-in");
const enableCloudSyncButton = document.getElementById("enable-cloud-sync-button");
const enableCloudSyncMessage = document.getElementById("enable-cloud-sync-message");
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

// OTP-related DOM elements
const signupOtpButton = document.getElementById("signup-otp-button");
const signinOtpButton = document.getElementById("signin-otp-button");
const signupOtpForm = document.getElementById("signup-otp-form");
const signinOtpForm = document.getElementById("signin-otp-form");
const otpVerifyForm = document.getElementById("otp-verify-form");
const signupOtpSend = document.getElementById("signup-otp-send");
const signupOtpCancel = document.getElementById("signup-otp-cancel");
const signinOtpSend = document.getElementById("signin-otp-send");
const signinOtpCancel = document.getElementById("signin-otp-cancel");
const otpVerifySubmit = document.getElementById("otp-verify-submit");
const otpVerifyCancel = document.getElementById("otp-verify-cancel");
const otpResend = document.getElementById("otp-resend");
const signupOtpMessage = document.getElementById("signup-otp-message");
const signinOtpMessage = document.getElementById("signin-otp-message");
const otpVerifyMessage = document.getElementById("otp-verify-message");

// Advanced auth DOM elements
const showAdvancedAuth = document.getElementById("show-advanced-auth");
const authAdvancedOptions = document.getElementById("auth-advanced-options");
const showSigninPassword = document.getElementById("show-signin-password");
const showSignupPassword = document.getElementById("show-signup-password");
const advancedAuthCancel = document.getElementById("advanced-auth-cancel");

// Auth state management
let isAuthenticated = false;
let currentUser = null;
let syncEnabled = false;

// Sync state management - add these new variables
let syncInProgress = false;
let lastSyncAttempt = null;
let syncRetryCount = 0;
const MAX_SYNC_RETRIES = 3;
const SYNC_COOLDOWN_MS = 5000; // 5 seconds between sync attempts
const SYNC_RETRY_DELAY = [1000, 2000, 5000]; // Exponential backoff delays

// OTP state management
let otpEmail = '';
let otpType = ''; // 'signup' or 'signin'

// Default settings
let settings = {
    maxWordCount: 10, // Default maximum word count for translation
    debugSelection: false, // Show/hide selected text and sentence for debugging
    layoutMode: 'overlay', // 'overlay' or 'shift'
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

// Separate dynamic data cache (not stored in profiles)
let dynamicData = {
    supportedLanguages: {
        google: [],
        deepl: [],
        microsoft: [],
        yandex: [],
        // AI providers will use Google's language list
        openai: [],
        claude: [],
        gemini: []
    },
    availableModels: {
        openai: [],
        claude: [],
        gemini: []
    },
    lastLanguageUpdate: null,
    lastModelUpdate: null
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

// Language code to name mapping
const languageNames = {
    'af': 'Afrikaans',
    'sq': 'Albanian', 
    'am': 'Amharic',
    'ar': 'Arabic',
    'hy': 'Armenian',
    'az': 'Azerbaijani',
    'eu': 'Basque',
    'be': 'Belarusian',
    'bg': 'Bulgarian',
    'bn': 'Bengali',
    'bs': 'Bosnian',
    'ca': 'Catalan',
    'ceb': 'Cebuano',
    'ny': 'Chichewa',
    'co': 'Corsican',
    'hr': 'Croatian',
    'cs': 'Czech',
    'cy': 'Welsh',
    'da': 'Danish',
    'de': 'German',
    'el': 'Greek',
    'en': 'English',
    'en-gb': 'English (British)',
    'en-us': 'English (American)',
    'eo': 'Esperanto',
    'es': 'Spanish',
    'et': 'Estonian',
    'fa': 'Persian',
    'fi': 'Finnish',
    'fr': 'French',
    'fy': 'Frisian',
    'ga': 'Irish',
    'gd': 'Scottish Gaelic',
    'gl': 'Galician',
    'gu': 'Gujarati',
    'ha': 'Hausa',
    'haw': 'Hawaiian',
    'he': 'Hebrew',
    'iw': 'Hebrew',
    'hi': 'Hindi',
    'hmn': 'Hmong',
    'hu': 'Hungarian',
    'is': 'Icelandic',
    'ig': 'Igbo',
    'id': 'Indonesian',
    'it': 'Italian',
    'ja': 'Japanese',
    'jw': 'Javanese',
    'ka': 'Georgian',
    'kk': 'Kazakh',
    'km': 'Khmer',
    'kn': 'Kannada',
    'ko': 'Korean',
    'ku': 'Kurdish',
    'ky': 'Kyrgyz',
    'la': 'Latin',
    'lb': 'Luxembourgish',
    'lo': 'Lao',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'mg': 'Malagasy',
    'mi': 'Maori',
    'mk': 'Macedonian',
    'ml': 'Malayalam',
    'mn': 'Mongolian',
    'mr': 'Marathi',
    'ms': 'Malay',
    'mt': 'Maltese',
    'my': 'Myanmar (Burmese)',
    'ne': 'Nepali',
    'nl': 'Dutch',
    'no': 'Norwegian',
    'nb': 'Norwegian Bokmål',
    'pa': 'Punjabi',
    'pl': 'Polish',
    'ps': 'Pashto',
    'pt': 'Portuguese',
    'pt-br': 'Portuguese (Brazilian)',
    'pt-pt': 'Portuguese (European)',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sm': 'Samoan',
    'sn': 'Shona',
    'sd': 'Sindhi',
    'si': 'Sinhala',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'so': 'Somali',
    'sr': 'Serbian',
    'st': 'Sesotho',
    'su': 'Sundanese',
    'sv': 'Swedish',
    'sw': 'Swahili',
    'ta': 'Tamil',
    'te': 'Telugu',
    'tg': 'Tajik',
    'th': 'Thai',
    'tl': 'Filipino',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'uz': 'Uzbek',
    'vi': 'Vietnamese',
    'xh': 'Xhosa',
    'yi': 'Yiddish',
    'yo': 'Yoruba',
    'zh': 'Chinese',
    'zh-cn': 'Chinese (Simplified)',
    'zh-tw': 'Chinese (Traditional)',
    'zh-hans': 'Chinese (Simplified)',
    'zh-hant': 'Chinese (Traditional)',
    'zu': 'Zulu',
    'ht': 'Haitian Creole'
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
    
    // Prevent too frequent auth checks
    if (window.lastAuthCheck && (Date.now() - window.lastAuthCheck) < 3000) {
        console.log('🔐 Skipping auth check - too recent');
        return;
    }
    window.lastAuthCheck = Date.now();
    
    try {
        // Initialize Supabase client
        if (typeof window.SupabaseAuth === 'undefined') {
            console.warn('🔐 Supabase auth not available, operating in local mode');
            updateAuthUI(false);
            return;
        }
        
        // Check if we're in local mode
        if (window.SupabaseAuth.isInLocalMode && window.SupabaseAuth.isInLocalMode()) {
            console.log('🔐 Operating in local mode');
            isAuthenticated = false;
            currentUser = null;
            syncEnabled = false;
            updateAuthUI(false, true); // Pass true for local mode
            return;
        }
        
        const response = await window.SupabaseAuth.getCurrentUser();
        
        if (response && response.data && response.data.user) {
            console.log('🔐 User authenticated:', response.data.user.email);
            isAuthenticated = true;
            currentUser = response.data.user;
            syncEnabled = true;
            updateAuthUI(true);
            
            // Load data from Supabase only if not already synced recently
            if (!window.lastSuccessfulSync || (Date.now() - window.lastSuccessfulSync) > 60000) {
                console.log('🔐 Loading data from Supabase after auth check...');
                try {
                    await syncFromSupabase();
                    window.lastSuccessfulSync = Date.now();
                } catch (syncError) {
                    console.warn('🔐 Failed to sync after auth check, but auth is valid:', syncError);
                    // Don't fail the auth check just because sync failed
                }
            } else {
                console.log('🔐 Skipping sync - recently synced');
            }
        } else {
            console.log('🔐 User not authenticated');
            isAuthenticated = false;
            currentUser = null;
            syncEnabled = false;
            updateAuthUI(false);
        }
    } catch (error) {
        console.error('🔐 Error checking auth status:', error);
        // Don't immediately reset auth state on network errors
        if (!error.message || (!error.message.includes('network') && !error.message.includes('fetch'))) {
            isAuthenticated = false;
            currentUser = null;
            syncEnabled = false;
            updateAuthUI(false);
        } else {
            console.log('🔐 Network error during auth check, keeping current state');
        }
    }
}

// Update authentication UI
function updateAuthUI(authenticated, localMode = false) {
    if (!authLoggedOut || !authLoggedIn) {
        console.warn('🔐 Auth UI elements not found');
        return;
    }
    
    if (authenticated && currentUser) {
        authLocalMode && authLocalMode.classList.add('hidden');
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
        authLoggedIn.classList.add('hidden');
        
        if (localMode) {
            // Show local mode UI
            authLocalMode && authLocalMode.classList.remove('hidden');
            authLoggedOut.classList.add('hidden');
            
            if (syncIndicator) {
                syncIndicator.textContent = 'Local Mode';
                syncIndicator.className = 'sync-indicator local-mode';
                syncIndicator.title = 'Extension running in local mode. Cloud sync unavailable.';
            }
        } else {
            // Show normal logged out UI
            authLocalMode && authLocalMode.classList.add('hidden');
            authLoggedOut.classList.remove('hidden');
            
            if (syncIndicator) {
                syncIndicator.textContent = 'Local';
                syncIndicator.className = 'sync-indicator';
                syncIndicator.title = 'Sign in to enable cloud sync';
            }
        }
        
        // Hide any error messages when in local mode
        if (localMode) {
            const authMessages = document.querySelectorAll('.auth-message');
            authMessages.forEach(msg => {
                if (msg.textContent.includes('not available')) {
                    msg.style.display = 'none';
                }
            });
        }
        
        console.log('🔐 Updated UI for unauthenticated user' + (localMode ? ' (local mode)' : ''));
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

// Handle sign up with OTP
async function handleSignUpWithOtp() {
    const email = document.getElementById('signup-otp-email')?.value;
    
    if (!email) {
        showAuthMessage(signupOtpMessage, 'Please enter your email.', 'error');
        return;
    }
    
    try {
        showAuthMessage(signupOtpMessage, 'Sending verification code...', 'info');
        signupOtpSend.disabled = true;
        
        const { data, error } = await window.SupabaseAuth.signUpWithOtp(email);
        
        if (error) {
            showAuthMessage(signupOtpMessage, error, 'error');
        } else {
            showAuthMessage(signupOtpMessage, 'Verification code sent! Check your email.', 'success');
            
            // Store email and type for verification
            otpEmail = email;
            otpType = 'signup';
            
            // Show OTP verification form
            setTimeout(() => {
                showOtpVerifyForm();
            }, 1500);
        }
    } catch (err) {
        console.error('🔐 Sign up with OTP error:', err);
        showAuthMessage(signupOtpMessage, 'Failed to send verification code. Please try again.', 'error');
    } finally {
        signupOtpSend.disabled = false;
    }
}

// Handle sign in with OTP
async function handleSignInWithOtp() {
    const email = document.getElementById('signin-otp-email')?.value;
    
    if (!email) {
        showAuthMessage(signinOtpMessage, 'Please enter your email.', 'error');
        return;
    }
    
    try {
        showAuthMessage(signinOtpMessage, 'Sending verification code...', 'info');
        signinOtpSend.disabled = true;
        
        const { data, error } = await window.SupabaseAuth.signInWithOtp(email);
        
        if (error) {
            showAuthMessage(signinOtpMessage, error, 'error');
        } else {
            showAuthMessage(signinOtpMessage, 'Verification code sent! Check your email.', 'success');
            
            // Store email and type for verification
            otpEmail = email;
            otpType = 'signin';
            
            // Show OTP verification form
            setTimeout(() => {
                showOtpVerifyForm();
            }, 1500);
        }
    } catch (err) {
        console.error('🔐 Sign in with OTP error:', err);
        showAuthMessage(signinOtpMessage, 'Failed to send verification code. Please try again.', 'error');
    } finally {
        signinOtpSend.disabled = false;
    }
}

// Handle OTP verification
async function handleOtpVerification() {
    const code = document.getElementById('otp-code')?.value;
    
    if (!code || code.length !== 6) {
        showAuthMessage(otpVerifyMessage, 'Please enter a valid 6-digit code.', 'error');
        return;
    }
    
    try {
        showAuthMessage(otpVerifyMessage, 'Verifying code...', 'info');
        otpVerifySubmit.disabled = true;
        
        const otpChannel = otpType === 'signup' ? 'signup' : 'email';
        const { data, error } = await window.SupabaseAuth.verifyOtp(otpEmail, code, otpChannel);
        
        if (error) {
            showAuthMessage(otpVerifyMessage, error, 'error');
        } else {
            showAuthMessage(otpVerifyMessage, 'Verification successful!', 'success');
            
            // Clear OTP form
            document.getElementById('otp-code').value = '';
            
            // Update auth status
            await checkAuthStatus();
            
            // Hide form
            hideAuthForms();
        }
    } catch (err) {
        console.error('🔐 OTP verification error:', err);
        showAuthMessage(otpVerifyMessage, 'Verification failed. Please try again.', 'error');
    } finally {
        otpVerifySubmit.disabled = false;
    }
}

// Handle OTP resend
async function handleOtpResend() {
    if (!otpEmail || !otpType) {
        showAuthMessage(otpVerifyMessage, 'Unable to resend code. Please start over.', 'error');
        return;
    }
    
    try {
        showAuthMessage(otpVerifyMessage, 'Resending verification code...', 'info');
        otpResend.disabled = true;
        
        let result;
        if (otpType === 'signup') {
            result = await window.SupabaseAuth.signUpWithOtp(otpEmail);
        } else {
            result = await window.SupabaseAuth.signInWithOtp(otpEmail);
        }
        
        const { data, error } = result;
        
        if (error) {
            showAuthMessage(otpVerifyMessage, error, 'error');
        } else {
            showAuthMessage(otpVerifyMessage, 'Verification code resent! Check your email.', 'success');
        }
    } catch (err) {
        console.error('🔐 OTP resend error:', err);
        showAuthMessage(otpVerifyMessage, 'Failed to resend code. Please try again.', 'error');
    } finally {
        otpResend.disabled = false;
    }
}

// Helper function to check if we can attempt sync
function canAttemptSync() {
    if (syncInProgress) {
        console.log('🔄 Sync already in progress, skipping...');
        return false;
    }
    
    if (!isAuthenticated || !syncEnabled) {
        console.log('🔄 Not authenticated or sync disabled, skipping sync');
        return false;
    }
    
    if (lastSyncAttempt && (Date.now() - lastSyncAttempt) < SYNC_COOLDOWN_MS) {
        console.log('🔄 Sync cooldown active, skipping...');
        return false;
    }
    
    return true;
}

// Helper function to handle sync errors and determine if retry is appropriate
function handleSyncError(error, operation) {
    console.error(`🔄 ${operation} failed:`, error);
    
    const errorMessage = error.message || error.toString();
    
    // Check for authentication errors
    if (errorMessage.includes('not authenticated') || 
        errorMessage.includes('row-level security policy') ||
        errorMessage.includes('401')) {
        console.log('🔐 Authentication error detected, checking auth status...');
        // Reset auth state and recheck
        isAuthenticated = false;
        syncEnabled = false;
        updateAuthUI(false);
        
        // Attempt to recheck authentication after a delay
        setTimeout(() => {
            checkAuthStatus();
        }, 2000);
        
        return false; // Don't retry auth errors immediately
    }
    
    // Check for rate limiting errors
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        console.log('⏰ Rate limit detected, will retry after longer delay...');
        return true; // Can retry rate limit errors after delay
    }
    
    // Other errors might be retryable
    return syncRetryCount < MAX_SYNC_RETRIES;
}

// Sync data to Supabase
async function syncToSupabase() {
    if (!canAttemptSync()) {
        return;
    }
    
    syncInProgress = true;
    lastSyncAttempt = Date.now();
    
    try {
        console.log('🔄 Syncing data to Supabase...');
        
        if (syncStatus) {
            syncStatus.textContent = '⏳ Syncing...';
            syncStatus.className = 'sync-status syncing';
        }
        
        // Double-check authentication before proceeding
        if (typeof window.SupabaseAuth === 'undefined') {
            throw new Error('Supabase auth not available');
        }
        
        const currentUserResponse = await window.SupabaseAuth.getCurrentUser();
        if (!currentUserResponse?.data?.user) {
            throw new Error('User not authenticated');
        }
        
        // Update our auth state if it was stale
        if (!isAuthenticated) {
            console.log('🔐 Auth state was stale, updating...');
            isAuthenticated = true;
            currentUser = currentUserResponse.data.user;
            syncEnabled = true;
            updateAuthUI(true);
        }
        
        // Save global settings
        console.log('🔄 Saving user settings...');
        const settingsResult = await window.SupabaseAuth.saveUserSettings(settings);
        if (settingsResult.error) {
            throw new Error(`Settings sync failed: ${settingsResult.error}`);
        }
        
        // Save all profiles
        console.log('🔄 Saving user profiles...');
        const profilePromises = Object.entries(profiles).map(([profileName, profileSettings]) => {
            const isCurrent = profileName === currentProfileName;
            return window.SupabaseAuth.saveUserProfile(profileName, profileSettings, isCurrent);
        });
        
        const profileResults = await Promise.all(profilePromises);
        const failedProfiles = profileResults.filter(result => result.error);
        
        if (failedProfiles.length > 0) {
            console.error('🔄 Profile sync errors:', failedProfiles.map(r => r.error));
            throw new Error(`Profile sync failed for ${failedProfiles.length} profiles`);
        }
        
        // Reset retry count on success
        syncRetryCount = 0;
        
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
        const canRetry = handleSyncError(error, 'Sync to Supabase');
        
        if (syncStatus) {
            syncStatus.textContent = '❌ Sync Failed';
            syncStatus.className = 'sync-status error';
        }
        
        if (syncIndicator) {
            syncIndicator.textContent = '❌ Error';
            syncIndicator.className = 'sync-indicator error';
        }
        
        const errorMessage = error.message || error.toString();
        showSyncMessage(`Sync failed: ${errorMessage}`, 'error');
        
        // Implement retry with exponential backoff for retryable errors
        if (canRetry && syncRetryCount < MAX_SYNC_RETRIES) {
            const delay = SYNC_RETRY_DELAY[syncRetryCount] || 5000;
            syncRetryCount++;
            
            console.log(`🔄 Scheduling sync retry ${syncRetryCount}/${MAX_SYNC_RETRIES} in ${delay}ms...`);
            
            setTimeout(() => {
                syncToSupabase();
            }, delay);
        } else {
            // Reset retry count after max retries reached
            syncRetryCount = 0;
        }
    } finally {
        syncInProgress = false;
    }
}

// Sync data from Supabase
async function syncFromSupabase() {
    if (!canAttemptSync()) {
        return;
    }
    
    syncInProgress = true;
    lastSyncAttempt = Date.now();
    
    try {
        console.log('🔄 Loading data from Supabase...');
        
        if (syncStatus) {
            syncStatus.textContent = '⏳ Loading...';
            syncStatus.className = 'sync-status syncing';
        }
        
        // Double-check authentication before proceeding
        if (typeof window.SupabaseAuth === 'undefined') {
            throw new Error('Supabase auth not available');
        }
        
        const currentUserResponse = await window.SupabaseAuth.getCurrentUser();
        if (!currentUserResponse?.data?.user) {
            throw new Error('User not authenticated');
        }
        
        // Update our auth state if it was stale
        if (!isAuthenticated) {
            console.log('🔐 Auth state was stale during load, updating...');
            isAuthenticated = true;
            currentUser = currentUserResponse.data.user;
            syncEnabled = true;
            updateAuthUI(true);
        }
        
        // Load global settings
        console.log('🔄 Loading user settings...');
        const settingsResult = await window.SupabaseAuth.loadUserSettings();
        if (settingsResult.error && settingsResult.error !== 'User not authenticated') {
            throw new Error(`Settings load failed: ${settingsResult.error}`);
        }
        
        if (settingsResult.data) {
            // Merge remote settings with local defaults
            settings = {
                ...settings,
                maxWordCount: settingsResult.data.max_word_count || settings.maxWordCount,
                debugSelection: settingsResult.data.debug_selection !== undefined ? settingsResult.data.debug_selection : settings.debugSelection,
                defaultTargetLanguage: settingsResult.data.default_target_language || settings.defaultTargetLanguage,
                layoutMode: settingsResult.data.layout_mode || settings.layoutMode,
                enabledProviders: {
                    ...settings.enabledProviders,
                    ...settingsResult.data.enabled_providers
                },
                apiKeys: {
                    ...settings.apiKeys,
                    ...settingsResult.data.api_keys
                }
            };
            
            // Handle dynamic data separately if it exists in Supabase
            if (settingsResult.data.supported_languages || settingsResult.data.available_models) {
                dynamicData = {
                    ...dynamicData,
                    supportedLanguages: {
                        ...dynamicData.supportedLanguages,
                        ...(settingsResult.data.supported_languages || {})
                    },
                    availableModels: {
                        ...dynamicData.availableModels,
                        ...(settingsResult.data.available_models || {})
                    },
                    lastLanguageUpdate: settingsResult.data.last_language_update || dynamicData.lastLanguageUpdate,
                    lastModelUpdate: settingsResult.data.last_model_update || dynamicData.lastModelUpdate
                };
                
                // Save dynamic data locally
                saveSettings();
            }
            
            console.log('🔄 Loaded settings from Supabase');
        }
        
        // Load profiles
        console.log('🔄 Loading user profiles...');
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
        handleSyncError(error, 'Sync from Supabase');
        
        if (syncStatus) {
            syncStatus.textContent = '❌ Load Failed';
            syncStatus.className = 'sync-status error';
        }
        
        if (syncIndicator) {
            syncIndicator.textContent = '❌ Error';
            syncIndicator.className = 'sync-indicator error';
        }
        
        const errorMessage = error.message || error.toString();
        showSyncMessage(`Load failed: ${errorMessage}`, 'error');
    } finally {
        syncInProgress = false;
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
    authLocalMode && authLocalMode.classList.add('hidden');
    signinForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    signupOtpForm.classList.add('hidden');
    signinOtpForm.classList.add('hidden');
    otpVerifyForm.classList.add('hidden');
    
    // Clear messages
    if (signinMessage) signinMessage.style.display = 'none';
    if (signupMessage) signupMessage.style.display = 'none';
    if (signupOtpMessage) signupOtpMessage.style.display = 'none';
    if (signinOtpMessage) signinOtpMessage.style.display = 'none';
    if (otpVerifyMessage) otpVerifyMessage.style.display = 'none';
    if (enableCloudSyncMessage) enableCloudSyncMessage.style.display = 'none';
}

// Show specific OTP forms
function showSignUpOtpForm() {
    hideAuthForms();
    signupOtpForm.classList.remove('hidden');
}

function showSignInOtpForm() {
    hideAuthForms();
    signinOtpForm.classList.remove('hidden');
}

function showOtpVerifyForm() {
    hideAuthForms();
    otpVerifyForm.classList.remove('hidden');
    
    // Focus on OTP input
    const otpInput = document.getElementById('otp-code');
    if (otpInput) {
        setTimeout(() => otpInput.focus(), 100);
    }
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
        
        // Load current profile if set (this will update settings and restore translation boxes)
        if (currentProfileName && profiles[currentProfileName]) {
            console.log('LoadProfiles: Loading current profile:', currentProfileName);
            loadProfile(currentProfileName, false); // false = don't save settings before loading
        } else {
            // If no profile is set, just restore translation boxes with current settings
            console.log('LoadProfiles: No current profile, restoring translation boxes with current settings');
            restoreTranslationBoxes();
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
async function deleteProfile(profileName) {
    if (!profiles[profileName]) {
        console.error('DeleteProfile: Profile not found:', profileName);
        return false;
    }
    
    // Don't allow deleting the last profile
    if (Object.keys(profiles).length <= 1) {
        console.warn('DeleteProfile: Cannot delete the last profile');
        return false;
    }
    
    // Delete from Supabase first if authenticated
    if (isAuthenticated && syncEnabled) {
        console.log('DeleteProfile: Deleting from Supabase:', profileName);
        try {
            const result = await window.SupabaseAuth.deleteUserProfile(profileName);
            if (result.error) {
                console.error('DeleteProfile: Failed to delete from Supabase:', result.error);
                // Don't return false here, still allow local deletion
                // Just log the error and show a message to the user
                showSyncMessage(`Failed to delete profile from cloud: ${result.error}`, 'error');
            } else {
                console.log('DeleteProfile: Successfully deleted from Supabase');
            }
        } catch (error) {
            console.error('DeleteProfile: Exception deleting from Supabase:', error);
            showSyncMessage('Failed to delete profile from cloud', 'error');
        }
    }
    
    // Delete locally
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
    
    // Show success message if we're authenticated
    if (isAuthenticated && syncEnabled) {
        showSyncMessage('Profile deleted from cloud successfully', 'success');
    }
    
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
    const maxWordCount = maxWordCountInput ? parseInt(maxWordCountInput.value) || 10 : settings.maxWordCount;
    
    // Get debug selection setting
    const debugSelectionCheckbox = document.getElementById('debug-selection');
    const debugSelection = debugSelectionCheckbox ? debugSelectionCheckbox.checked : settings.debugSelection;

    const layoutModeSelect = document.getElementById('layout-mode');
    const layoutMode = layoutModeSelect ? layoutModeSelect.value : settings.layoutMode;
    
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
    
    // Only include user-specific settings, not dynamic data
    return {
        maxWordCount: maxWordCount,
        debugSelection: debugSelection,
        enabledProviders: enabledProviders,
        apiKeys: apiKeys,
        defaultTargetLanguage: settings.defaultTargetLanguage,
        translationBoxes: translationBoxes,
        layoutMode: layoutMode
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

// Test persistence by manually saving and restoring translation boxes
function testPersistence() {
    console.log('🧪 TESTING TRANSLATION BOX PERSISTENCE');
    
    // Save current state
    console.log('💾 Saving current translation boxes...');
    saveTranslationBoxesLayout();
    
    // Show current state
    const boxes = document.querySelectorAll('.translation-box');
    console.log('📊 Current boxes before test:');
    boxes.forEach((box, index) => {
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const modelSelect = box.querySelector('.model-select');
        console.log(`  Box ${index + 1}: ${provider}, ${langSelect?.value}, model: ${modelSelect?.value || 'none'}`);
    });
    
    // Clear and restore
    console.log('🔄 Clearing and restoring translation boxes...');
    setTimeout(() => {
        if (translationsContainer) {
            translationsContainer.innerHTML = '';
        }
        
        setTimeout(() => {
            restoreTranslationBoxes();
            
            // Check restored state
            setTimeout(() => {
                const restoredBoxes = document.querySelectorAll('.translation-box');
                console.log('📊 Restored boxes after test:');
                restoredBoxes.forEach((box, index) => {
                    const provider = box.getAttribute('data-provider');
                    const langSelect = box.querySelector('.language-select');
                    const modelSelect = box.querySelector('.model-select');
                    console.log(`  Box ${index + 1}: ${provider}, ${langSelect?.value}, model: ${modelSelect?.value || 'none'}`);
                });
                
                console.log('✅ Persistence test complete');
            }, 200);
        }, 100);
    }, 100);
}

// Attach functions to window immediately
window.forceRefreshDropdowns = forceRefreshAllProviderDropdowns;
window.debugTranslator = debugTranslator;  
window.testGemini = testGemini;
window.testPersistence = testPersistence;

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
        
        // Load base settings first
        console.log('Loading base settings...');
        loadSettings();
        
        // Immediately start fetching Google languages if needed (for initialization)
        setTimeout(async () => {
            const googleLanguages = dynamicData.supportedLanguages.google || [];
            if (googleLanguages.length <= 7) {
                console.log('🔄 Force-fetching Google languages during initialization...');
                try {
                    const langs = await fetchGoogleLanguages();
                    dynamicData.supportedLanguages.google = langs;
                    dynamicData.lastLanguageUpdate = new Date().toISOString();
                    saveSettings();
                    
                    // Refresh any existing Google translation boxes
                    const googleBoxes = document.querySelectorAll('.translation-box[data-provider="google"]');
                    googleBoxes.forEach(box => {
                        const langSelect = box.querySelector('.language-select');
                        if (langSelect) {
                            const currentValue = langSelect.value;
                            langSelect.innerHTML = generateLanguageOptions('google', currentValue);
                            langSelect.value = currentValue;
                            console.log('✅ Refreshed Google language dropdown during init');
                        }
                    });
                    
                    console.log(`✅ Force-fetched ${langs.length} Google languages during initialization`);
                } catch (error) {
                    console.error('❌ Failed to fetch Google languages during initialization:', error);
                }
            }
            
            // Also force-fetch models for enabled AI providers during initialization
            const aiProviders = ['openai', 'claude', 'gemini'];
            for (const provider of aiProviders) {
                if (settings.enabledProviders[provider]) {
                    const currentModels = dynamicData.availableModels[provider] || [];
                    const defaultModels = {
                        openai: ['gpt-4', 'gpt-3.5-turbo'],
                        claude: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                        gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
                    };
                    
                    const hasDefaultModelsOnly = currentModels.length === 0 || 
                        (currentModels.length <= 3 && 
                         JSON.stringify(currentModels.sort()) === JSON.stringify((defaultModels[provider] || []).sort()));
                    
                    if (hasDefaultModelsOnly) {
                        console.log(`🔄 Force-fetching ${provider} models during initialization...`);
                        try {
                            await ensureAIModelsAvailable(provider);
                            
                            // Refresh any existing AI provider translation boxes
                            const aiBoxes = document.querySelectorAll(`.translation-box[data-provider="${provider}"]`);
                            aiBoxes.forEach(box => {
                                const modelSelect = box.querySelector('.model-select');
                                if (modelSelect) {
                                    const currentValue = modelSelect.value;
                                    const newModels = dynamicData.availableModels[provider] || [];
                                    if (newModels.length > 3) {
                                        const newOptions = newModels.map(m => 
                                            `<option value="${m}" ${m === currentValue ? 'selected' : ''}>${m}</option>`
                                        ).join('');
                                        modelSelect.innerHTML = newOptions;
                                        modelSelect.value = currentValue;
                                        console.log(`✅ Refreshed ${provider} model dropdown during init`);
                                    }
                                }
                            });
                        } catch (error) {
                            console.error(`❌ Failed to fetch ${provider} models during initialization:`, error);
                        }
                    }
                }
            }
        }, 500);
        
        // Then load profiles and current profile (this will also trigger restoreTranslationBoxes)
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
        // Note: restoreTranslationBoxes will be called by loadProfiles
        return;
    }
    
    try {
        // Load both user settings and dynamic data separately
        chrome.storage.sync.get(["translatorSettings", "translatorDynamicData"], (result) => {
            console.log('LoadSettings: Storage query result:', result);
            
            if (chrome.runtime.lastError) {
                console.error('LoadSettings: Chrome runtime error:', chrome.runtime.lastError);
                console.log('LoadSettings: Falling back to defaults...');
                updateSettingsUI();
                // Note: restoreTranslationBoxes will be called by loadProfiles
                return;
            }
            
            // Load user settings
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
            
            // Load dynamic data separately
            if (result.translatorDynamicData) {
                console.log('LoadSettings: Found saved dynamic data, merging...');
                dynamicData = {
                    ...dynamicData,
                    ...result.translatorDynamicData,
                    supportedLanguages: {
                        ...dynamicData.supportedLanguages,
                        ...(result.translatorDynamicData.supportedLanguages || {})
                    },
                    availableModels: {
                        ...dynamicData.availableModels,
                        ...(result.translatorDynamicData.availableModels || {})
                    }
                };
                console.log('LoadSettings: Final merged dynamic data:', dynamicData);
            } else {
                console.log('LoadSettings: No saved dynamic data found, using defaults');
            }
            
            // Update UI (restoreTranslationBoxes will be called by loadProfiles)
            updateSettingsUI();
        });
    } catch (error) {
        console.error('LoadSettings: Error accessing chrome.storage:', error);
        console.log('LoadSettings: Using default settings and proceeding...');
        updateSettingsUI();
        // Note: restoreTranslationBoxes will be called by loadProfiles
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
        // Save user settings and dynamic data separately to avoid quota issues
        chrome.storage.sync.set({
            "translatorSettings": settings,
            "translatorDynamicData": dynamicData
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('SaveSettings: Error saving settings:', chrome.runtime.lastError);
            } else {
                console.log('SaveSettings: Settings and dynamic data saved successfully');
                try {
                    chrome.runtime.sendMessage({
                        action: 'updateSettings',
                        settings: settings
                    });
                } catch (e) {
                    console.error('SaveSettings: Failed to send update message:', e);
                }
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
    
    console.log('SaveTranslationBoxesLayout: Found', boxes.length, 'boxes to save');
    
    boxes.forEach((box, index) => {
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
        
        console.log(`SaveTranslationBoxesLayout: Box ${index + 1}:`, {
            provider,
            targetLanguage,
            model: model || 'none'
        });
    });
    
    console.log('SaveTranslationBoxesLayout: Final saved layout:', settings.translationBoxes);
    
    // Save to chrome storage
    saveSettings();
    
    // Save to current profile if we have one
    if (currentProfileName && profiles[currentProfileName]) {
        const currentSettings = getCurrentSettings();
        profiles[currentProfileName] = JSON.parse(JSON.stringify(currentSettings));
        saveProfiles();
        console.log('SaveTranslationBoxesLayout: Also saved to current profile:', currentProfileName);
    }
    
    // Only sync to Supabase if authenticated and not already syncing
    if (isAuthenticated && syncEnabled && !syncInProgress) {
        // Use setTimeout to avoid blocking UI and allow for batching
        setTimeout(() => {
            syncToSupabase();
        }, 1500); // Longer delay for bulk updates
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
        let provider = boxConfig.provider;
        if (!settings.enabledProviders[provider]) {
            console.warn(`RestoreTranslationBoxes: Provider ${provider} is disabled, using first enabled provider`);
            provider = getFirstEnabledProvider();
        }
        
        const targetLanguage = boxConfig.targetLanguage || settings.defaultTargetLanguage;
        const model = boxConfig.model || null;
        
        console.log(`RestoreTranslationBoxes: Creating box with provider=${provider}, language=${targetLanguage}, model=${model}`);
        
        addTranslationBox(provider, targetLanguage, model);
        
        // Double-check that the model was set correctly after creation
        if (model) {
            setTimeout(() => {
                const boxes = document.querySelectorAll('.translation-box');
                const box = boxes[index];
                if (box) {
                    const modelSelect = box.querySelector('.model-select');
                    if (modelSelect && modelSelect.value !== model) {
                        console.log(`RestoreTranslationBoxes: Correcting model selection for box ${index + 1} from ${modelSelect.value} to ${model}`);
                        modelSelect.value = model;
                    }
                }
            }, 100);
        }
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
    
    // Update debug selection checkbox
    const debugSelectionCheckbox = document.getElementById('debug-selection');
    if (debugSelectionCheckbox) {
        debugSelectionCheckbox.checked = settings.debugSelection;
    }

    const layoutModeSelect = document.getElementById('layout-mode');
    if (layoutModeSelect) {
        layoutModeSelect.value = settings.layoutMode;
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
    
    // Update debug selection visibility
    updateDebugSelectionVisibility();
    
    console.log('UpdateSettingsUI: UI update complete');
}

// Update debug selection visibility
function updateDebugSelectionVisibility() {
    const selectedWordContainer = document.querySelector('.selected-word-container');
    if (selectedWordContainer) {
        if (settings.debugSelection) {
            selectedWordContainer.style.display = 'block';
        } else {
            selectedWordContainer.style.display = 'none';
        }
    }
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
        saveSettingsButton.addEventListener('click', async () => {
            console.log('Save settings button clicked');
            
            // Get current settings from UI and track what was newly enabled
            const previouslyEnabledProviders = { ...settings.enabledProviders };
            
            const maxWordCountInput = document.getElementById('max-word-count');
            if (maxWordCountInput) {
                settings.maxWordCount = parseInt(maxWordCountInput.value) || 10;
            }
            
            // Get debug selection setting
            const debugSelectionCheckbox = document.getElementById('debug-selection');
            if (debugSelectionCheckbox) {
                settings.debugSelection = debugSelectionCheckbox.checked;
            }

            const layoutModeSelect = document.getElementById('layout-mode');
            if (layoutModeSelect) {
                settings.layoutMode = layoutModeSelect.value;
            }
            
            // Update provider settings and track newly enabled providers
            const newlyEnabledProviders = [];
            for (const provider in settings.enabledProviders) {
                const checkbox = document.getElementById(`enable-${provider}`);
                if (checkbox) {
                    const wasEnabled = previouslyEnabledProviders[provider];
                    const isNowEnabled = checkbox.checked;
                    settings.enabledProviders[provider] = isNowEnabled;
                    
                    // Track newly enabled providers
                    if (!wasEnabled && isNowEnabled) {
                        newlyEnabledProviders.push(provider);
                        console.log(`🆕 Provider newly enabled: ${provider}`);
                    }
                }
                
                const apiKeyInput = document.getElementById(`${provider}-api-key`);
                if (apiKeyInput) {
                    settings.apiKeys[provider] = apiKeyInput.value;
                }
            }
            
            console.log('Settings updated:', settings);
            saveSettings();
            
            // Update debug selection visibility
            updateDebugSelectionVisibility();
            
            // Show saving feedback
            saveSettingsButton.textContent = 'Saving...';
            saveSettingsButton.disabled = true;
            
            try {
                // Automatically fetch data for newly enabled providers
                if (newlyEnabledProviders.length > 0) {
                    console.log('🔄 Auto-fetching data for newly enabled providers:', newlyEnabledProviders);
                    
                    // Fetch languages and models for newly enabled providers
                    const fetchPromises = [];
                    
                    for (const provider of newlyEnabledProviders) {
                        // Fetch languages for translation providers
                        switch (provider) {
                            case 'google':
                                fetchPromises.push(fetchGoogleLanguages().then(langs => {
                                    dynamicData.supportedLanguages.google = langs;
                                }));
                                break;
                            case 'deepl':
                                fetchPromises.push(fetchDeepLLanguages().then(langs => {
                                    dynamicData.supportedLanguages.deepl = langs;
                                }));
                                break;
                            case 'microsoft':
                                fetchPromises.push(fetchMicrosoftLanguages().then(langs => {
                                    dynamicData.supportedLanguages.microsoft = langs;
                                }));
                                break;
                            case 'yandex':
                                fetchPromises.push(fetchYandexLanguages().then(langs => {
                                    dynamicData.supportedLanguages.yandex = langs;
                                }));
                                break;
                            case 'openai':
                                // AI providers use Google's language list but need their own models
                                fetchPromises.push(fetchOpenAIModels().then(models => {
                                    dynamicData.availableModels.openai = models;
                                }));
                                fetchPromises.push(fetchGoogleLanguages().then(langs => {
                                    dynamicData.supportedLanguages.openai = langs;
                                }));
                                break;
                            case 'claude':
                                fetchPromises.push(fetchClaudeModels().then(models => {
                                    dynamicData.availableModels.claude = models;
                                }));
                                fetchPromises.push(fetchGoogleLanguages().then(langs => {
                                    dynamicData.supportedLanguages.claude = langs;
                                }));
                                break;
                            case 'gemini':
                                fetchPromises.push(fetchGeminiModels().then(models => {
                                    dynamicData.availableModels.gemini = models;
                                }));
                                fetchPromises.push(fetchGoogleLanguages().then(langs => {
                                    dynamicData.supportedLanguages.gemini = langs;
                                }));
                                break;
                        }
                    }
                    
                    // Execute all fetch operations
                    if (fetchPromises.length > 0) {
                        await Promise.allSettled(fetchPromises);
                        
                        // Update timestamps
                        dynamicData.lastLanguageUpdate = new Date().toISOString();
                        dynamicData.lastModelUpdate = new Date().toISOString();
                        
                        // Save updated dynamic data
                        saveSettings();
                        
                        console.log('✅ Auto-fetch complete for newly enabled providers');
                    }
                }
                
                // Refresh translation boxes to reflect new settings and data
                refreshTranslationBoxes();
                
                // Sync to Supabase if authenticated and not already syncing
                if (isAuthenticated && syncEnabled && !syncInProgress) {
                    // Use setTimeout to avoid blocking UI and allow for batching
                    setTimeout(() => {
                        syncToSupabase();
                    }, 1500); // Longer delay for bulk updates
                }
                
                // Show success feedback
                saveSettingsButton.textContent = 'Saved!';
                setTimeout(() => {
                    saveSettingsButton.textContent = 'Save Settings';
                    saveSettingsButton.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('Error during settings save:', error);
                saveSettingsButton.textContent = 'Error!';
                setTimeout(() => {
                    saveSettingsButton.textContent = 'Save Settings';
                    saveSettingsButton.disabled = false;
                }, 2000);
            }
        });
    }
    
    // Update languages and models button
    const updateLanguagesModelsButton = document.getElementById('update-languages-models');
    if (updateLanguagesModelsButton) {
        updateLanguagesModelsButton.addEventListener('click', updateLanguagesAndModels);
    }
    
    // Debug selection checkbox - immediate visibility update
    const debugSelectionCheckbox = document.getElementById('debug-selection');
    if (debugSelectionCheckbox) {
        debugSelectionCheckbox.addEventListener('change', (e) => {
            console.log('Debug selection checkbox changed:', e.target.checked);
            settings.debugSelection = e.target.checked;
            updateDebugSelectionVisibility();
            // Also save the setting immediately
            saveSettings();
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
        profilesList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-profile')) {
                const profileName = e.target.getAttribute('data-profile');
                showProfileModal('edit', profileName);
            } else if (e.target.classList.contains('delete-profile')) {
                const profileName = e.target.getAttribute('data-profile');
                if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
                    // Disable the delete button during deletion to prevent double-clicks
                    const deleteButton = e.target;
                    deleteButton.disabled = true;
                    deleteButton.textContent = 'Deleting...';
                    
                    try {
                        await deleteProfile(profileName);
                    } catch (error) {
                        console.error('Error deleting profile:', error);
                        showSyncMessage('Failed to delete profile', 'error');
                    } finally {
                        // Re-enable the button (though it might be removed if deletion was successful)
                        if (deleteButton && deleteButton.parentNode) {
                            deleteButton.disabled = false;
                            deleteButton.textContent = 'Delete';
                        }
                    }
                }
            }
        });
    }
    
    // Authentication event listeners
    if (enableCloudSyncButton) {
        enableCloudSyncButton.addEventListener('click', handleEnableCloudSync);
    }
    
    if (showSigninButton) {
        showSigninButton.addEventListener('click', showSignInOtpForm);
    }
    
    if (showSignupButton) {
        showSignupButton.addEventListener('click', showSignUpOtpForm);
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
    
    // OTP authentication event listeners
    if (signupOtpButton) {
        signupOtpButton.addEventListener('click', showSignUpOtpForm);
    }
    
    if (signinOtpButton) {
        signinOtpButton.addEventListener('click', showSignInOtpForm);
    }
    
    if (signupOtpSend) {
        signupOtpSend.addEventListener('click', handleSignUpWithOtp);
    }
    
    if (signupOtpCancel) {
        signupOtpCancel.addEventListener('click', hideAuthForms);
    }
    
    if (signinOtpSend) {
        signinOtpSend.addEventListener('click', handleSignInWithOtp);
    }
    
    if (signinOtpCancel) {
        signinOtpCancel.addEventListener('click', hideAuthForms);
    }
    
    if (otpVerifySubmit) {
        otpVerifySubmit.addEventListener('click', handleOtpVerification);
    }
    
    if (otpVerifyCancel) {
        otpVerifyCancel.addEventListener('click', hideAuthForms);
    }
    
    if (otpResend) {
        otpResend.addEventListener('click', handleOtpResend);
    }
    
    // Add Enter key support for OTP input
    const otpCodeInput = document.getElementById('otp-code');
    if (otpCodeInput) {
        otpCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleOtpVerification();
            }
        });
        
        // Auto-format OTP input (numbers only)
        otpCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
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
    
    // Don't interfere with select elements and their options
    if (target.tagName === 'SELECT' || target.tagName === 'OPTION' || 
        target.closest('select') || target.classList.contains('provider-select') || 
        target.classList.contains('language-select') || target.classList.contains('model-select')) {
        // Let the select handle its own events
        return;
    }
    
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
        
        // Update provider name in header
        const providerNameElement = box.querySelector('.provider-name');
        if (providerNameElement) {
            providerNameElement.textContent = providerNames[newProvider] || newProvider;
        }
        
        // Automatically fetch data for this provider and update UI
        ensureProviderDataAvailable(newProvider).then(() => {
            // Update model selector for AI providers (this handles model display too)
            updateModelSelector(box, newProvider);
            
            // Refresh the language dropdown with new data
            const langSelect = box.querySelector('.language-select');
            if (langSelect) {
                const currentValue = langSelect.value;
                langSelect.innerHTML = generateLanguageOptions(newProvider, currentValue);
                langSelect.value = currentValue;
            }
        });
        
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
        
        // Update target language display in header
        const targetLanguageElement = box.querySelector('.target-language');
        if (targetLanguageElement) {
            targetLanguageElement.textContent = getLanguageName(newLang);
        }
        
        // Retranslate with new language
        translateText(box, provider, newLang);
        
        // Save layout
        saveTranslationBoxesLayout();
        
    } else if (target.classList.contains('model-select')) {
        const box = target.closest('.translation-box');
        const provider = box.getAttribute('data-provider');
        const langSelect = box.querySelector('.language-select');
        const targetLang = langSelect ? langSelect.value : settings.defaultTargetLanguage;
        const newModel = target.value;
        
        // Update model name in header
        const modelNameElement = box.querySelector('.model-name');
        if (modelNameElement) {
            modelNameElement.textContent = newModel;
        }
        
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
    
    // Automatically fetch languages and models for any provider if needed
    const setupBoxWithData = async () => {
        // Ensure all necessary data is available for this provider
        await ensureProviderDataAvailable(provider);
        
        const getModelSelectorHTML = (provider) => {
            const aiProviders = ['openai', 'claude', 'gemini'];
            if (!aiProviders.includes(provider)) return '';
            
            const providerModels = dynamicData.availableModels[provider] || [];
            
            if (providerModels.length === 0) {
                return `
                    <div class="model-selector">
                        <label for="model-select-${translationBoxCounter}">Model:</label>
                        <select class="model-select" id="model-select-${translationBoxCounter}" disabled>
                            <option value="" selected>⚠️ Unable to fetch models - check API key</option>
                        </select>
                    </div>
                `;
            }
            
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
        
        const getModelDisplayHTML = (provider) => {
            const aiProviders = ['openai', 'claude', 'gemini'];
            if (!aiProviders.includes(provider)) return '';
            
            const providerModels = dynamicData.availableModels[provider] || [];
            const selectedModel = model || providerModels[0] || '';
            
            return `<span class="model-name">${selectedModel}</span>`;
        };
        
        const box = document.createElement('div');
        box.className = 'translation-box';
        box.setAttribute('data-provider', provider);
        
        box.innerHTML = `
            <div class="translation-header">
                <div class="provider-info">
                    <span class="provider-name">${providerNames[provider] || provider}</span>
                    <span class="target-language">${getLanguageName(targetLang)}</span>
                    ${getModelDisplayHTML(provider)}
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
                    ${provider === 'google' ? 
                        '✓ No API key required (free service)' : 
                        (settings.apiKeys[provider] ? '✓ API key configured' : '⚠️ API key required in settings')
                    }
                </div>
            </div>
        `;
        
        translationsContainer.appendChild(box);
        
        // Refresh the language dropdown with newly fetched data (if any was fetched)
        // We need to do this more aggressively to ensure new languages appear
        const refreshLanguageDropdown = () => {
            const langSelect = box.querySelector('.language-select');
            if (langSelect) {
                const currentValue = langSelect.value;
                const newOptions = generateLanguageOptions(provider, currentValue);
                
                // Always refresh if we have more than the default languages
                const currentLanguages = dynamicData.supportedLanguages[provider] || [];
                if (currentLanguages.length > 7) {
                    langSelect.innerHTML = newOptions;
                    langSelect.value = currentValue;
                    console.log(`✅ Refreshed language dropdown for ${provider} with ${currentLanguages.length} languages`);
                }
            }
        };
        
        // Try multiple times to catch the data when it's fetched
        setTimeout(refreshLanguageDropdown, 100);
        setTimeout(refreshLanguageDropdown, 500);
        setTimeout(refreshLanguageDropdown, 1000);
        
        // Translate immediately if we have text
        if (currentWord) {
            translateText(box, provider, targetLang);
        }
    };
    
    // Execute the setup
    setupBoxWithData();
}

// Ensure provider data (languages and models) is available
async function ensureProviderDataAvailable(provider) {
    console.log(`🔄 Ensuring data is available for provider: ${provider}`);
    
    const promises = [];
    
    // Check if we need to fetch languages
    const currentLanguages = dynamicData.supportedLanguages[provider] || [];
    
    if (currentLanguages.length === 0) {
        console.log(`🔄 Auto-fetching languages for ${provider} (no languages available)...`);
        
        switch (provider) {
            case 'google':
                promises.push(fetchGoogleLanguages().then(langs => {
                    dynamicData.supportedLanguages.google = langs;
                    console.log(`✅ Fetched ${langs.length} Google languages`);
                }));
                break;
            case 'deepl':
                promises.push(fetchDeepLLanguages().then(langs => {
                    dynamicData.supportedLanguages.deepl = langs;
                    console.log(`✅ Fetched ${langs.length} DeepL languages`);
                }));
                break;
            case 'microsoft':
                promises.push(fetchMicrosoftLanguages().then(langs => {
                    dynamicData.supportedLanguages.microsoft = langs;
                    console.log(`✅ Fetched ${langs.length} Microsoft languages`);
                }));
                break;
            case 'yandex':
                promises.push(fetchYandexLanguages().then(langs => {
                    dynamicData.supportedLanguages.yandex = langs;
                    console.log(`✅ Fetched ${langs.length} Yandex languages`);
                }));
                break;
            case 'openai':
            case 'claude':
            case 'gemini':
                // AI providers use Google's language list
                promises.push(fetchGoogleLanguages().then(langs => {
                    dynamicData.supportedLanguages[provider] = langs;
                    console.log(`✅ Fetched ${langs.length} languages for ${provider}`);
                }));
                break;
        }
    } else {
        console.log(`✅ ${provider} already has ${currentLanguages.length} languages, skipping fetch`);
    }
    
    // For AI providers, also ensure models are available
    await ensureAIModelsAvailable(provider);
    
    // Execute language fetch if needed
    if (promises.length > 0) {
        console.log(`🔄 Fetching data for ${provider}...`);
        await Promise.allSettled(promises);
        dynamicData.lastLanguageUpdate = new Date().toISOString();
        saveSettings();
        
        console.log(`✅ Auto-fetched data for ${provider}`);
        
        // Sync to cloud if authenticated
        if (isAuthenticated && syncEnabled) {
            syncToSupabase();
        }
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
    const languages = dynamicData.supportedLanguages[provider] || [];
    
    if (languages.length === 0) {
        // No languages available - show provider-specific error message
        if (provider === 'google') {
            return `<option value="" disabled selected>⚠️ Unable to fetch languages - check internet connection</option>`;
        } else {
            return `<option value="" disabled selected>⚠️ Unable to fetch languages - check API key/connection</option>`;
        }
    }
    
    let options = '';
    languages.forEach(lang => {
        const selected = lang === selectedLang ? 'selected' : '';
        options += `<option value="${lang}" ${selected}>${languageNames[lang] || lang}</option>`;
    });
    return options;
}

// Get language display name
function getLanguageName(langCode) {
    return languageNames[langCode] || langCode;
}

// Refresh all translation boxes (when settings change)
function refreshTranslationBoxes() {
    console.log('RefreshTranslationBoxes: Refreshing all translation boxes...');
    console.log('RefreshTranslationBoxes: Using dynamic language data:', Object.keys(dynamicData.supportedLanguages));
    console.log('RefreshTranslationBoxes: Using dynamic model data:', Object.keys(dynamicData.availableModels));
    
    const boxes = document.querySelectorAll('.translation-box');
    boxes.forEach((box, index) => {
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
            
            // Update language options with new dynamic data
            const languageSelect = box.querySelector('.language-select');
            if (languageSelect) {
                const currentValue = languageSelect.value;
                languageSelect.innerHTML = generateLanguageOptions(provider, currentValue);
                languageSelect.value = currentValue;
                console.log(`RefreshTranslationBoxes: Updated language options for box ${index + 1} (${provider})`);
            }
            
            // Update model selector with new dynamic data
            updateModelSelector(box, provider);
            console.log(`RefreshTranslationBoxes: Updated model options for box ${index + 1} (${provider})`);
        }
        
        // Update API key reminder
        const apiKeyReminder = box.querySelector('.api-key-reminder');
        if (apiKeyReminder) {
            const currentProvider = box.getAttribute('data-provider');
            if (currentProvider === 'google') {
                apiKeyReminder.textContent = '✓ No API key required (free service)';
            } else {
                apiKeyReminder.textContent = settings.apiKeys[currentProvider] ? 
                    '✓ API key configured' : '⚠️ API key required in settings';
            }
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
        // Hide model name in header for non-AI providers
        const modelNameElement = box.querySelector('.model-name');
        if (modelNameElement) {
            modelNameElement.remove();
        }
        return;
    }
    
    const providerModels = dynamicData.availableModels[provider] || [];
    
    if (modelSelector) {
        // Model selector already exists, just update it
        modelSelector.style.display = 'block';
        const modelSelect = modelSelector.querySelector('.model-select');
        if (modelSelect) {
            if (providerModels.length === 0) {
                // No models available - show error
                modelSelect.innerHTML = '<option value="" selected>⚠️ Unable to fetch models - check API key</option>';
                modelSelect.disabled = true;
                
                // Update model name in header to show error
                const modelNameElement = box.querySelector('.model-name');
                if (modelNameElement) {
                    modelNameElement.textContent = '⚠️ No models';
                }
            } else {
                // Models available - populate normally
                const currentValue = modelSelect.value;
                modelSelect.innerHTML = providerModels.map(model => 
                    `<option value="${model}" ${model === currentValue ? 'selected' : ''}>${model}</option>`
                ).join('');
                modelSelect.disabled = false;
                
                // If current value is not available, select first option
                if (!providerModels.includes(currentValue)) {
                    modelSelect.value = providerModels[0] || '';
                }
                
                // Update model name in header
                const modelNameElement = box.querySelector('.model-name');
                if (modelNameElement) {
                    modelNameElement.textContent = modelSelect.value;
                } else {
                    // Create model name element if it doesn't exist
                    const targetLanguageElement = box.querySelector('.target-language');
                    if (targetLanguageElement) {
                        const modelSpan = document.createElement('span');
                        modelSpan.className = 'model-name';
                        modelSpan.textContent = modelSelect.value;
                        targetLanguageElement.parentNode.appendChild(modelSpan);
                    }
                }
            }
        }
    } else {
        // Model selector doesn't exist, create it
        const providerSettings = box.querySelector('.provider-settings');
        if (providerSettings) {
            // Find the language selector to insert the model selector after it
            const languageSelector = providerSettings.querySelector('.language-selector');
            if (languageSelector) {
                let modelSelectorHTML;
                
                if (providerModels.length === 0) {
                    // No models available - show error
                    modelSelectorHTML = `
                        <div class="model-selector">
                            <label for="model-select-${Date.now()}">Model:</label>
                            <select class="model-select" id="model-select-${Date.now()}" disabled>
                                <option value="" selected>⚠️ Unable to fetch models - check API key</option>
                            </select>
                        </div>
                    `;
                } else {
                    // Models available - create normally
                    const selectedModel = providerModels[0] || '';
                    modelSelectorHTML = `
                        <div class="model-selector">
                            <label for="model-select-${Date.now()}">Model:</label>
                            <select class="model-select" id="model-select-${Date.now()}">
                                ${providerModels.map(m => `<option value="${m}" ${m === selectedModel ? 'selected' : ''}>${m}</option>`).join('')}
                            </select>
                        </div>
                    `;
                }
                
                // Insert the model selector after the language selector
                languageSelector.insertAdjacentHTML('afterend', modelSelectorHTML);
                
                // Create model name element in header
                const targetLanguageElement = box.querySelector('.target-language');
                if (targetLanguageElement) {
                    const modelSpan = document.createElement('span');
                    modelSpan.className = 'model-name';
                    modelSpan.textContent = providerModels.length > 0 ? providerModels[0] : '⚠️ No models';
                    targetLanguageElement.parentNode.appendChild(modelSpan);
                }
            }
        }
    }
}

// Get first enabled provider (prefer Google as default)
function getFirstEnabledProvider() {
    // Prefer Google first if it's enabled
    if (settings.enabledProviders.google) {
        return 'google';
    }
    
    // Then check other providers
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
    console.log('🔍 DeepL translation started:', {
        word: word,
        sentence: sentence,
        targetLang: targetLang,
        hasApiKey: !!settings.apiKeys.deepl
    });
    
    const apiKey = settings.apiKeys.deepl;
    if (!apiKey) {
        console.error('❌ DeepL API key missing');
        showTranslationError(boxElement, 'DeepL API key required');
        return;
    }
    
    console.log('🔄 Sending DeepL translation request to background script...');
    
    // Send translation request to background script
    chrome.runtime.sendMessage({
        action: 'translate',
        provider: 'deepl',
        word: word,
        sentence: sentence,
        targetLang: targetLang,
        apiKey: apiKey
    })
    .then(result => {
        console.log('📨 DeepL response received:', result);
        if (result.success) {
            const contentElement = boxElement.querySelector('.translation-content');
            if (contentElement) {
                contentElement.innerHTML = `<div class="translation-text">${result.translation}</div>`;
            }
        } else {
            console.error('❌ DeepL translation failed:', result.error);
            showTranslationError(boxElement, result.error || 'Translation failed');
        }
    })
    .catch(error => {
        console.error('❌ DeepL promise chain error:', error);
        showTranslationError(boxElement, 'Translation failed');
    });
}

// Microsoft Translator implementation
// Yandex Translate implementation (keep direct call for now as it might work)
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
    // Use dynamic model data instead of hardcoded default
    const availableModels = dynamicData.availableModels.openai || ['gpt-3.5-turbo'];
    const model = modelSelect ? modelSelect.value : availableModels[0];
    
    // Send translation request to background script
    chrome.runtime.sendMessage({
        action: 'translate',
        provider: 'openai',
        word: word,
        sentence: sentence,
        targetLang: targetLang,
        apiKey: apiKey,
        model: model
    })
    .then(result => {
        if (result.success) {
            const contentElement = boxElement.querySelector('.translation-content');
            if (contentElement) {
                contentElement.innerHTML = `<div class="translation-text">${result.translation}</div>`;
            }
        } else {
            showTranslationError(boxElement, result.error || 'Translation failed');
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
    // Use dynamic model data instead of hardcoded default
    const availableModels = dynamicData.availableModels.claude || ['claude-3-sonnet-20240229'];
    const model = modelSelect ? modelSelect.value : availableModels[0];
    
    // Use global languageNames instead of hardcoded short list
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
    // Use dynamic model data instead of hardcoded default
    const availableModels = dynamicData.availableModels.gemini || ['gemini-1.5-flash'];
    const model = modelSelect ? modelSelect.value : availableModels[0];
    
    // Use global languageNames instead of hardcoded short list
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

// Primary authentication (OTP) event listeners
if (showSigninButton) {
    showSigninButton.addEventListener('click', showSignInOtpForm);
}

if (showSignupButton) {
    showSignupButton.addEventListener('click', showSignUpOtpForm);
}

// Advanced auth options
if (showAdvancedAuth) {
    showAdvancedAuth.addEventListener('click', () => {
        authLoggedOut.classList.add('hidden');
        authAdvancedOptions.classList.remove('hidden');
    });
}

if (advancedAuthCancel) {
    advancedAuthCancel.addEventListener('click', () => {
        authAdvancedOptions.classList.add('hidden');
        authLoggedOut.classList.remove('hidden');
        hideAuthForms();
    });
}

if (showSigninPassword) {
    showSigninPassword.addEventListener('click', showSignInForm);
}

if (showSignupPassword) {
    showSignupPassword.addEventListener('click', showSignUpForm);
}

// ====================
// DYNAMIC LANGUAGE AND MODEL FETCHING
// ====================

// Fetch supported languages from Google Translate
async function fetchGoogleLanguages() {
    console.log('🌐 Fetching Google Translate languages...');
    
    try {
        // Try the free Google Translate endpoint first (no API key required)
        const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=test');
        
        if (response.ok) {
            // If the free endpoint works, return comprehensive language list
            // This is based on Google's actually supported languages
            console.log('✅ Google Translate free endpoint accessible, using comprehensive language list');
            return ['af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh', 'zh-cn', 'zh-tw', 'co', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'];
        }
    } catch (error) {
        console.warn('⚠️ Google Translate free endpoint not accessible:', error);
    }
    
    // If we have an API key, try the official API
    const apiKey = settings.apiKeys.google;
    if (apiKey) {
        try {
            console.log('🔄 Trying Google Translate official API...');
            const response = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}`);
            const data = await response.json();
            
            if (data.data && data.data.languages) {
                const languages = data.data.languages.map(lang => lang.language.toLowerCase());
                console.log('✅ Google Translate official API languages fetched:', languages.length);
                return languages;
            }
        } catch (error) {
            console.warn('⚠️ Google Translate official API failed:', error);
        }
    }
    
    // If both endpoints fail, return empty array
    console.warn('⚠️ All Google Translate endpoints failed');
    return [];
}

// Fetch supported languages from DeepL
async function fetchDeepLLanguages() {
    console.log('🌐 Fetching DeepL languages...');
    
    const apiKey = settings.apiKeys.deepl;
    if (!apiKey) {
        console.warn('⚠️ DeepL API key not configured');
        return [];
    }
    
    try {
        const isFreeKey = apiKey.endsWith(':fx');
        const baseUrl = isFreeKey ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
        
        const response = await fetch(`${baseUrl}/v2/languages?type=target`, {
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`
            }
        });
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            const languages = data.map(lang => lang.language.toLowerCase());
            console.log('✅ DeepL languages fetched:', languages.length);
            return languages;
        } else {
            console.warn('⚠️ DeepL API returned unexpected response format');
            return [];
        }
    } catch (error) {
        console.warn('⚠️ Failed to fetch DeepL languages:', error);
        return [];
    }
}

// Fetch supported languages from Microsoft Translator
async function fetchMicrosoftLanguages() {
    console.log('🌐 Fetching Microsoft Translator languages...');
    
    try {
        const response = await fetch('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation');
        const data = await response.json();
        
        if (data.translation) {
            const languages = Object.keys(data.translation);
            console.log('✅ Microsoft languages fetched:', languages.length);
            return languages;
        } else {
            console.warn('⚠️ Microsoft API returned unexpected response format');
            return [];
        }
    } catch (error) {
        console.warn('⚠️ Failed to fetch Microsoft languages:', error);
        return [];
    }
}

// Fetch supported languages from Yandex Translate
async function fetchYandexLanguages() {
    console.log('🌐 Fetching Yandex Translate languages...');
    
    const apiKey = settings.apiKeys.yandex;
    if (!apiKey) {
        console.warn('⚠️ Yandex API key not configured');
        return [];
    }
    
    try {
        const response = await fetch(`https://translate.yandex.net/api/v1.5/tr.json/getLangs?key=${apiKey}&ui=en`);
        const data = await response.json();
        
        if (data.langs) {
            const languages = Object.keys(data.langs);
            console.log('✅ Yandex languages fetched:', languages.length);
            return languages;
        } else {
            console.warn('⚠️ Yandex API returned unexpected response format');
            return [];
        }
    } catch (error) {
        console.warn('⚠️ Failed to fetch Yandex languages:', error);
        return [];
    }
}

// Fetch available models from OpenAI
async function fetchOpenAIModels() {
    console.log('🤖 Fetching OpenAI models...');
    
    const apiKey = settings.apiKeys.openai;
    if (!apiKey) {
        console.warn('⚠️ OpenAI API key not configured');
        return [];
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        const data = await response.json();
        
        if (data.data) {
            // Filter for chat completion models
            const chatModels = data.data
                .filter(model => 
                    model.id.includes('gpt') && 
                    !model.id.includes('instruct') &&
                    !model.id.includes('davinci') &&
                    !model.id.includes('ada') &&
                    !model.id.includes('babbage') &&
                    !model.id.includes('curie')
                )
                .map(model => model.id)
                .sort();
            
            console.log('✅ OpenAI models fetched:', chatModels.length);
            return chatModels;
        } else {
            console.warn('⚠️ OpenAI API returned unexpected response format');
            return [];
        }
    } catch (error) {
        console.warn('⚠️ Failed to fetch OpenAI models:', error);
        return [];
    }
}

// Fetch available models from Claude (Anthropic)
async function fetchClaudeModels() {
    console.log('🤖 Fetching Claude models...');
    
    // Anthropic doesn't have a models endpoint in their current API
    // We'll use the known available models
    console.log('📋 Using known Claude models (no API endpoint available)');
    return [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022', 
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
    ];
}

// Fetch available models from Gemini
async function fetchGeminiModels() {
    console.log('🤖 Fetching Gemini models...');
    
    const apiKey = settings.apiKeys.gemini;
    if (!apiKey) {
        console.warn('⚠️ Gemini API key not configured');
        return [];
    }
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.models) {
            // Filter for text generation models that support generateContent
            const textModels = data.models
                .filter(model => 
                    model.supportedGenerationMethods && 
                    model.supportedGenerationMethods.includes('generateContent') &&
                    !model.name.includes('embedding')
                )
                .map(model => model.name.replace('models/', ''))
                .sort();
            
            console.log('✅ Gemini models fetched:', textModels.length);
            return textModels;
        } else {
            console.warn('⚠️ Gemini API returned unexpected response format');
            return [];
        }
    } catch (error) {
        console.warn('⚠️ Failed to fetch Gemini models:', error);
        return [];
    }
}

// Update all languages and models
async function updateLanguagesAndModels() {
    console.log('🔄 Starting languages and models update...');
    
    // Show loading state
    const updateButton = document.getElementById('update-languages-models');
    if (updateButton) {
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';
    }
    
    try {
        // Fetch languages from translation providers
        const [googleLangs, deeplLangs, microsoftLangs, yandexLangs] = await Promise.all([
            fetchGoogleLanguages(),
            fetchDeepLLanguages(),
            fetchMicrosoftLanguages(),
            fetchYandexLanguages()
        ]);
        
        // Update language settings
        dynamicData.supportedLanguages = {
            google: googleLangs,
            deepl: deeplLangs,
            microsoft: microsoftLangs,
            yandex: yandexLangs,
            // AI providers use Google's comprehensive list
            openai: googleLangs,
            claude: googleLangs,
            gemini: googleLangs
        };
        
        // Fetch models from AI providers
        const [openaiModels, claudeModels, geminiModels] = await Promise.all([
            fetchOpenAIModels(),
            fetchClaudeModels(),
            fetchGeminiModels()
        ]);
        
        // Update model settings
        dynamicData.availableModels = {
            openai: openaiModels,
            claude: claudeModels,
            gemini: geminiModels
        };
        
        // Update timestamps
        dynamicData.lastLanguageUpdate = new Date().toISOString();
        dynamicData.lastModelUpdate = new Date().toISOString();
        
        // Save settings (this will save both user settings and dynamic data separately)
        saveSettings();
        
        // Update current profile if we have one (but don't include dynamic data)
        if (currentProfileName && profiles[currentProfileName]) {
            const currentSettings = getCurrentSettings();
            profiles[currentProfileName] = currentSettings;
            saveProfiles();
        }
        
        // Sync to Supabase if authenticated and not already syncing
        if (isAuthenticated && syncEnabled && !syncInProgress) {
            // Use setTimeout to avoid blocking UI and allow for batching
            setTimeout(() => {
                syncToSupabase();
            }, 1500); // Longer delay for bulk updates
        }
        
        // Refresh all translation boxes to use new data
        refreshTranslationBoxes();
        
        console.log('✅ Languages and models updated successfully');
        
        // Show success feedback
        if (updateButton) {
            updateButton.textContent = 'Updated!';
            updateButton.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                updateButton.textContent = 'Update Languages & Models';
                updateButton.style.backgroundColor = '';
                updateButton.disabled = false;
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Failed to update languages and models:', error);
        
        // Show error feedback
        if (updateButton) {
            updateButton.textContent = 'Update Failed';
            updateButton.style.backgroundColor = '#f44336';
            setTimeout(() => {
                updateButton.textContent = 'Update Languages & Models';
                updateButton.style.backgroundColor = '';
                updateButton.disabled = false;
            }, 3000);
        }
    }
}

// ====================
// END DYNAMIC LANGUAGE AND MODEL FETCHING
// ====================

// Automatically fetch models for AI providers
async function ensureAIModelsAvailable(provider) {
    const aiProviders = ['openai', 'claude', 'gemini'];
    if (!aiProviders.includes(provider)) {
        return; // Not an AI provider, skip
    }
    
    // Check if we already have models for this provider
    const currentModels = dynamicData.availableModels[provider] || [];
    
    if (currentModels.length === 0) {
        console.log(`🔄 Fetching models for ${provider} (no models available)...`);
        
        try {
            let models = [];
            
            switch (provider) {
                case 'openai':
                    models = await fetchOpenAIModels();
                    break;
                case 'claude':
                    models = await fetchClaudeModels();
                    break;
                case 'gemini':
                    models = await fetchGeminiModels();
                    break;
            }
            
            if (models && models.length > 0) {
                // Update dynamic data
                dynamicData.availableModels[provider] = models;
                dynamicData.lastModelUpdate = new Date().toISOString();
                
                // Save to storage
                saveSettings();
                
                // Refresh translation boxes to show new models immediately
                setTimeout(() => {
                    refreshTranslationBoxes();
                }, 100);
                
                // Sync to cloud if authenticated and not already syncing
                if (isAuthenticated && syncEnabled && !syncInProgress) {
                    // Use setTimeout to avoid blocking UI and allow for batching
                    setTimeout(() => {
                        syncToSupabase();
                    }, 2000); // Longer delay for automatic model fetching
                }
                
                console.log(`✅ Updated ${provider} models: ${models.length} models fetched`);
            } else {
                console.warn(`⚠️ No models fetched for ${provider} - API may be unavailable or key invalid`);
            }
        } catch (error) {
            console.error(`❌ Failed to fetch models for ${provider}:`, error);
        }
    } else {
        console.log(`✅ ${provider} already has ${currentModels.length} models, skipping fetch`);
    }
}

// Handle enable cloud sync
async function handleEnableCloudSync() {
    if (!enableCloudSyncButton || !enableCloudSyncMessage) {
        console.error('Enable cloud sync elements not found');
        return;
    }
    
    try {
        showAuthMessage(enableCloudSyncMessage, 'Loading cloud sync library...', 'info');
        enableCloudSyncButton.disabled = true;
        enableCloudSyncButton.textContent = 'Loading...';
        
        const result = await window.SupabaseAuth.enableCloudSync();
        
        if (result.success) {
            showAuthMessage(enableCloudSyncMessage, 'Cloud sync enabled successfully!', 'success');
            
            // Update UI after successful enablement
            setTimeout(async () => {
                await checkAuthStatus();
                hideAuthForms();
            }, 1500);
        } else {
            showAuthMessage(enableCloudSyncMessage, `Failed to enable cloud sync: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('🔐 Enable cloud sync error:', error);
        showAuthMessage(enableCloudSyncMessage, 'Failed to enable cloud sync. Please try again.', 'error');
    } finally {
        enableCloudSyncButton.disabled = false;
        enableCloudSyncButton.textContent = 'Enable Cloud Sync';
    }
}
