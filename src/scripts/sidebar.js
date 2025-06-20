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

// New auth flow DOM elements
const emailStepForm = document.getElementById("email-step-form");
const emailStepTitle = document.getElementById("email-step-title");
const emailStepDescription = document.getElementById("email-step-description");
const emailStepInput = document.getElementById("email-step-input");
const emailStepSubmit = document.getElementById("email-step-submit");
const emailStepCancel = document.getElementById("email-step-cancel");
const emailStepMessage = document.getElementById("email-step-message");

const tokenStepForm = document.getElementById("token-step-form");
const tokenStepTitle = document.getElementById("token-step-title");
const tokenStepDescription = document.getElementById("token-step-description");
const tokenStepInput = document.getElementById("token-step-input");
const tokenStepSubmit = document.getElementById("token-step-submit");
const tokenStepCancel = document.getElementById("token-step-cancel");
const tokenStepResend = document.getElementById("token-step-resend");
const tokenStepMessage = document.getElementById("token-step-message");

const passwordStepForm = document.getElementById("password-step-form");
const passwordStepTitle = document.getElementById("password-step-title");
const passwordStepWarning = document.getElementById("password-step-warning");
const passwordStepInput = document.getElementById("password-step-input");
const passwordStepSubmit = document.getElementById("password-step-submit");
const passwordStepCancel = document.getElementById("password-step-cancel");
const passwordStepMessage = document.getElementById("password-step-message");

// Password toggle buttons
const signinPasswordToggle = document.getElementById("signin-password-toggle");
const passwordStepToggle = document.getElementById("password-step-toggle");

// OTP-related DOM elements
const signupOtpButton = document.getElementById("signup-otp-button");
const signinOtpButton = document.getElementById("signin-otp-button");
const signupOtpForm = document.getElementById("signup-otp-form");
const signinOtpForm = document.getElementById("signin-otp-form");
const otpVerifyForm = document.getElementById("otp-verify-form");
const passwordResetButton = document.getElementById("password-reset-button");
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
let userPassword = null;

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

// New auth flow tracking
let currentAuthFlow = ''; // 'signup' or 'reset'
let currentAuthEmail = '';

// Default settings - SPLIT INTO GLOBAL AND PROFILE-SPECIFIC
let globalSettings = {
    // Shared across all profiles
    theme: 'system', // 'system', 'light', or 'dark'
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
    }
};

let profileSettings = {
    // Profile-specific settings only
    maxWordCount: 10, // Default maximum word count for translation
    debugSelection: false, // Show/hide selected text and sentence for debugging
    layoutMode: 'overlay', // 'overlay' or 'shift'
    defaultTargetLanguage: "ru",
    translationBoxes: [
        { provider: "google", targetLanguage: "ru" }
    ]
};

// Keep legacy settings object for backward compatibility during transition
let settings = {
    ...profileSettings,
    ...globalSettings
};

// Theme management
function applyTheme(theme) {
    console.log('ApplyTheme: Applying theme:', theme);
    
    if (theme === 'system') {
        // Remove explicit theme attribute to use system preference
        document.documentElement.removeAttribute('data-theme');
        
        // Listen for system theme changes
        if (window.matchMedia) {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }
    } else {
        // Apply explicit theme
        document.documentElement.setAttribute('data-theme', theme);
    }
}

function setupSystemThemeListener() {
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        function handleThemeChange(e) {
            if (globalSettings.theme === 'system') {
                if (e.matches) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                }
            }
        }
        
        // Listen for changes
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleThemeChange);
        } else if (mediaQuery.addListener) {
            // Fallback for older browsers
            mediaQuery.addListener(handleThemeChange);
        }
    }
}

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
const TRANSLATION_DEBOUNCE_DELAY = 800; // Increased from 500ms to 800ms for better user experience

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
            
            // Try to retrieve stored password for encryption
            if (!userPassword) {
                userPassword = await retrieveUserPassword();
                console.log('🔐 Retrieved stored password:', !!userPassword);
            }
            
            updateAuthUI(true);
            
                    // Always load data from Supabase when user changes or first auth
        const previousUserId = window.lastSyncedUserId;
        const currentUserId = currentUser?.id;
        
        if (!window.lastSuccessfulSync || 
            (Date.now() - window.lastSuccessfulSync) > 60000 ||
            previousUserId !== currentUserId) {
            
            if (previousUserId !== currentUserId) {
                console.log('🔐 User changed, forcing sync from cloud...');
            } else {
                console.log('🔐 Loading data from Supabase after auth check...');
            }
            
            try {
                await syncFromSupabase();
                window.lastSuccessfulSync = Date.now();
                window.lastSyncedUserId = currentUserId;
            } catch (syncError) {
                console.warn('🔐 Failed to sync after auth check, but auth is valid:', syncError);
                // Don't fail the auth check just because sync failed
            }
        } else {
            console.log('🔐 Skipping sync - recently synced for same user');
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

            userPassword = password;
            await storeUserPassword(password); // Store securely for later use
            
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

async function handlePasswordReset() {
    const email = document.getElementById('signin-email')?.value;
    if (!email) {
        showAuthMessage(signinMessage, 'Please enter your email above and try again.', 'error');
        return;
    }

    try {
        showAuthMessage(signinMessage, 'Sending password reset email...', 'info');
        passwordResetButton.disabled = true;

        const { error } = await window.SupabaseAuth.resetPassword(email);

        if (error) {
            showAuthMessage(signinMessage, error, 'error');
        } else {
            showAuthMessage(signinMessage, 'Password reset email sent.', 'success');
        }
    } catch (err) {
        console.error('🔐 Password reset error:', err);
        showAuthMessage(signinMessage, 'Failed to send reset email.', 'error');
    } finally {
        passwordResetButton.disabled = false;
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
            userPassword = null;
            
            // Clear sync tracking to force fresh sync on next login
            window.lastSuccessfulSync = null;
            window.lastSyncedUserId = null;
            console.log('🔐 Cleared sync tracking for fresh login');
            
            clearStoredPassword(); // Clear stored password on sign out
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

// Legacy OTP verification function - now handled by the new multi-step flow
// Keeping for backwards compatibility, but not actively used

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

// New authentication flow handlers

// Handle email step submission (for both signup and password reset)
async function handleEmailStep() {
    const email = emailStepInput?.value;
    
    if (!email) {
        showAuthMessage(emailStepMessage, 'Please enter your email.', 'error');
        return;
    }
    
    try {
        showAuthMessage(emailStepMessage, 'Sending verification code...', 'info');
        emailStepSubmit.disabled = true;
        
        let result;
        if (currentAuthFlow === 'signup') {
            result = await window.SupabaseAuth.signUpWithOtp(email);
        } else if (currentAuthFlow === 'reset') {
            result = await window.SupabaseAuth.signInWithOtp(email);
        }
        
        const { data, error } = result;
        
        if (error) {
            showAuthMessage(emailStepMessage, error, 'error');
        } else {
            showAuthMessage(emailStepMessage, 'Verification code sent! Check your email.', 'success');
            currentAuthEmail = email;
            
            // Show token verification form
            setTimeout(() => {
                showTokenStepForm();
            }, 1500);
        }
    } catch (err) {
        console.error('🔐 Email step error:', err);
        showAuthMessage(emailStepMessage, 'Failed to send verification code. Please try again.', 'error');
    } finally {
        emailStepSubmit.disabled = false;
    }
}

// Handle token verification
async function handleTokenStep() {
    const code = tokenStepInput?.value;
    
    if (!code || code.length !== 6) {
        showAuthMessage(tokenStepMessage, 'Please enter a valid 6-digit code.', 'error');
        return;
    }
    
    try {
        showAuthMessage(tokenStepMessage, 'Verifying code...', 'info');
        tokenStepSubmit.disabled = true;
        
        // Use verifyOtp for both signup and signin flows
        const result = await window.SupabaseAuth.verifyOtp(currentAuthEmail, code, 'email');
        const { data, error } = result;
        
        if (error) {
            showAuthMessage(tokenStepMessage, error, 'error');
        } else {
            showAuthMessage(tokenStepMessage, 'Verification successful!', 'success');
            
            // Clear token input
            tokenStepInput.value = '';
            
            // Show password step form
            setTimeout(() => {
                showPasswordStepForm();
            }, 1500);
        }
    } catch (err) {
        console.error('🔐 Token verification error:', err);
        showAuthMessage(tokenStepMessage, 'Verification failed. Please try again.', 'error');
    } finally {
        tokenStepSubmit.disabled = false;
    }
}

// Handle password setting
async function handlePasswordStep() {
    const password = passwordStepInput?.value;
    
    if (!password) {
        showAuthMessage(passwordStepMessage, 'Please enter a password.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage(passwordStepMessage, 'Password must be at least 6 characters long.', 'error');
        return;
    }
    
    try {
        showAuthMessage(passwordStepMessage, 'Setting password...', 'info');
        passwordStepSubmit.disabled = true;
        
        // For password reset, we need to update the password using the Supabase client directly
        if (currentAuthFlow === 'reset') {
            const client = window.SupabaseAuth.getSupabaseClient();
            if (!client) {
                showAuthMessage(passwordStepMessage, 'Supabase client not available', 'error');
                return;
            }
            
            const { error } = await client.auth.updateUser({ password: password });
            if (error) {
                console.error('🔐 Password update error:', error);
                showAuthMessage(passwordStepMessage, error.message || 'Failed to update password', 'error');
                return;
            }
            
            console.log('✅ Password updated successfully via Supabase client');
        }
        
        showAuthMessage(passwordStepMessage, 'Password set successfully!', 'success');
        
        // Store password for encryption
        userPassword = password;
        await storeUserPassword(password); // Store securely for later use
        
        // Clear form
        passwordStepInput.value = '';
        
        // Update auth status
        await checkAuthStatus();
        
        // Immediately sync current profile to cloud after successful signup or password reset
        // This ensures the user's profile is established in the cloud database
        if (isAuthenticated && syncEnabled && !syncInProgress) {
            console.log('🔄 Syncing profile to cloud after successful auth...');
            try {
                await syncToSupabase();
                console.log('✅ Profile synced to cloud after auth');
            } catch (syncError) {
                console.error('❌ Failed to sync profile after auth:', syncError);
                // Don't fail the auth flow, just log the error
                showSyncMessage('Profile setup but sync to cloud failed. Will retry automatically.', 'warning');
            }
        }
        
        // Hide forms and reset state (flow completed successfully)
        hideAuthForms(true);
        
    } catch (err) {
        console.error('🔐 Password step error:', err);
        showAuthMessage(passwordStepMessage, 'Failed to set password. Please try again.', 'error');
    } finally {
        passwordStepSubmit.disabled = false;
    }
}

// Handle token resend
async function handleTokenResend() {
    if (!currentAuthEmail || !currentAuthFlow) {
        showAuthMessage(tokenStepMessage, 'Unable to resend code. Please start over.', 'error');
        return;
    }
    
    try {
        showAuthMessage(tokenStepMessage, 'Resending verification code...', 'info');
        tokenStepResend.disabled = true;
        
        let result;
        if (currentAuthFlow === 'signup') {
            result = await window.SupabaseAuth.signUpWithOtp(currentAuthEmail);
        } else if (currentAuthFlow === 'reset') {
            result = await window.SupabaseAuth.signInWithOtp(currentAuthEmail);
        }
        
        const { data, error } = result;
        
        if (error) {
            showAuthMessage(tokenStepMessage, error, 'error');
        } else {
            showAuthMessage(tokenStepMessage, 'Verification code resent! Check your email.', 'success');
        }
    } catch (err) {
        console.error('🔐 Token resend error:', err);
        showAuthMessage(tokenStepMessage, 'Failed to resend code. Please try again.', 'error');
    } finally {
        tokenStepResend.disabled = false;
    }
}

// Handle password toggle visibility
function togglePasswordVisibility(inputId, toggleButton) {
    const input = document.getElementById(inputId);
    if (!input || !toggleButton) return;
    
    const eyeIcon = toggleButton.querySelector('.eye-icon');
    if (!eyeIcon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>';
        toggleButton.setAttribute('aria-label', 'Hide password');
    } else {
        input.type = 'password';
        eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        toggleButton.setAttribute('aria-label', 'Show password');
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
        
        // REFACTORED: Save global settings (API keys and enabled providers only)
        console.log('🔄 Saving global user settings...');
        
        // Get current global settings from UI
        const currentGlobalSettings = getCurrentGlobalSettings();
        
        console.log('🔐 Debug - userPassword available:', !!userPassword);
        console.log('🔐 Debug - globalSettings.apiKeys:', currentGlobalSettings.apiKeys);
        
        // Check if we have API keys but no password for encryption
        const hasApiKeys = Object.values(currentGlobalSettings.apiKeys || {}).some(key => key && key.trim() !== '');
        if (hasApiKeys && !userPassword) {
            console.log('🔐 API keys present but no password available, attempting to retrieve stored password...');
            
            // Try to retrieve stored password first
            userPassword = await retrieveUserPassword();
            
            if (!userPassword) {
                console.log('🔐 No stored password found, prompting user...');
                userPassword = await promptForPassword();
                if (!userPassword) {
                    throw new Error('Password required for API key encryption. Cannot sync API keys to cloud without encryption.');
                }
                // Store the password for future use
                await storeUserPassword(userPassword);
                console.log('🔐 Password provided and stored for future use');
            } else {
                console.log('🔐 Retrieved stored password successfully');
            }
        } else if (hasApiKeys && userPassword) {
            console.log('🔐 API keys present and password available for encryption');
        } else if (!hasApiKeys) {
            console.log('🔐 No API keys present, password not required for sync');
        }
        
        // Update global settings and save to cloud
        globalSettings = { ...currentGlobalSettings };
        
        // Update legacy settings object for backward compatibility
        settings = {
            ...profileSettings,
            ...globalSettings
        };
        
        const settingsResult = await window.SupabaseAuth.saveUserSettings(globalSettings, userPassword);
        if (settingsResult.error) {
            throw new Error(`Settings sync failed: ${settingsResult.error}`);
        }
        
        // Save all profiles (profile-specific settings only)
        console.log('🔄 Saving user profiles...');
        const profilePromises = Object.entries(profiles).map(([profileName, profileData]) => {
            const isCurrent = profileName === currentProfileName;
            return window.SupabaseAuth.saveUserProfile(profileName, profileData, isCurrent);
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
        const settingsResult = await window.SupabaseAuth.loadUserSettings(userPassword);
        if (settingsResult.error && settingsResult.error !== 'User not authenticated') {
            throw new Error(`Settings load failed: ${settingsResult.error}`);
        }
        
        if (settingsResult.data) {
            console.log('🔄 Merging cloud global settings with local global settings...');
            console.log('🔄 Local API keys before merge:', Object.keys(globalSettings.apiKeys).filter(k => globalSettings.apiKeys[k]));
            console.log('🔄 Cloud API keys:', Object.keys(settingsResult.data.api_keys || {}).filter(k => settingsResult.data.api_keys[k]));
            
            // Smart merge: local non-empty values take precedence, cloud fills empty locals
            const mergedApiKeys = { ...globalSettings.apiKeys };
            const cloudApiKeys = settingsResult.data.api_keys || {};
            
            // For each provider, use local if non-empty, otherwise use cloud
            for (const provider in cloudApiKeys) {
                if (!mergedApiKeys[provider] || mergedApiKeys[provider].trim() === '') {
                    mergedApiKeys[provider] = cloudApiKeys[provider];
                    console.log(`🔄 Populated ${provider} API key from cloud (local was empty)`);
                } else {
                    console.log(`🔄 Kept local ${provider} API key (non-empty)`);
                }
            }
            
            // REFACTORED: Merge only global settings (API keys, enabled providers, and theme)
            const previousGlobalSettings = { ...globalSettings };
            globalSettings = {
                theme: settingsResult.data.theme || globalSettings.theme,
                enabledProviders: {
                    ...globalSettings.enabledProviders,
                    ...settingsResult.data.enabled_providers
                },
                apiKeys: mergedApiKeys
            };
            
            console.log('🔄 Final merged API keys:', Object.keys(globalSettings.apiKeys).filter(k => globalSettings.apiKeys[k]));
            
            // CRITICAL FIX: Update legacy settings object with merged globalSettings
            settings = {
                ...profileSettings,
                ...globalSettings
            };
            
            // Check if we need to sync back to cloud due to local precedence
            const hasLocalUpdates = JSON.stringify(previousGlobalSettings.apiKeys) !== JSON.stringify(globalSettings.apiKeys) ||
                                  JSON.stringify(previousGlobalSettings.enabledProviders) !== JSON.stringify(globalSettings.enabledProviders);
            
            if (hasLocalUpdates) {
                console.log('🔄 Local global settings took precedence, will sync back to cloud...');
                // Schedule a sync back to cloud after loading is complete
                setTimeout(() => {
                    if (isAuthenticated && syncEnabled && !syncInProgress) {
                        console.log('🔄 Syncing merged global settings back to cloud...');
                        syncToSupabase();
                    }
                }, 2000);
            }
            
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

            if (settingsResult.decryptionFailed) {
                showSyncMessage('API keys could not be decrypted. They have been cleared.', 'error');
                globalSettings.apiKeys = {};
                settings.apiKeys = {};
                await window.SupabaseAuth.saveUserSettings(globalSettings, userPassword);
            }
            
            if (settingsResult.plaintextKeysDetected) {
                showSyncMessage('🚨 SECURITY: Plain text API keys detected and blocked. Please re-enter your API keys.', 'error');
                globalSettings.apiKeys = {};
                settings.apiKeys = {};
                // Force immediate re-encryption of settings to secure the database
                if (userPassword) {
                    await window.SupabaseAuth.saveUserSettings(globalSettings, userPassword);
                }
            }
        }
        
        // Load profiles
        console.log('🔄 Loading user profiles...');
        const profilesResult = await window.SupabaseAuth.loadUserProfiles(userPassword);
        if (profilesResult.error && profilesResult.error !== 'User not authenticated') {
            throw new Error(`Profiles load failed: ${profilesResult.error}`);
        }
        
        if (profilesResult.data && profilesResult.data.length > 0) {
            console.log('🔄 Merging cloud profiles with local profiles...');
            console.log('🔄 Local profiles before merge:', Object.keys(profiles));
            console.log('🔄 Cloud profiles:', profilesResult.data.map(p => p.profile_name));
            
            const cloudProfiles = {};
            let cloudCurrentProfile = null;
            let foundCurrentProfile = false;
            
            // Process cloud profiles
            profilesResult.data.forEach(profile => {
                cloudProfiles[profile.profile_name] = profile.settings;
                if (profile.is_current) {
                    cloudCurrentProfile = profile.profile_name;
                    foundCurrentProfile = true;
                }
            });
            
            // Smart merge: preserve local profiles, add missing cloud profiles
            const mergedProfiles = { ...profiles };
            let hasProfileUpdates = false;
            
            // Add cloud profiles that don't exist locally
            for (const profileName in cloudProfiles) {
                if (!mergedProfiles[profileName]) {
                    mergedProfiles[profileName] = cloudProfiles[profileName];
                    console.log(`🔄 Added cloud profile: ${profileName}`);
                    hasProfileUpdates = true;
                } else {
                    console.log(`🔄 Kept local profile: ${profileName}`);
                }
            }
            
            profiles = mergedProfiles;
            
            // Handle current profile selection
            if (!currentProfileName && cloudCurrentProfile && profiles[cloudCurrentProfile]) {
                currentProfileName = cloudCurrentProfile;
                console.log(`🔄 Set current profile from cloud: ${cloudCurrentProfile}`);
            } else if (!currentProfileName && Object.keys(profiles).length > 0) {
                currentProfileName = Object.keys(profiles)[0];
                console.log(`🔄 Set first available profile as current: ${currentProfileName}`);
            }
            
            console.log('🔄 Final merged profiles:', Object.keys(profiles));
            console.log('🔄 Current profile:', currentProfileName);
            
            // Schedule sync back if we had local updates
            if (hasProfileUpdates) {
                setTimeout(() => {
                    if (isAuthenticated && syncEnabled && !syncInProgress) {
                        console.log('🔄 Syncing merged profiles back to cloud...');
                        syncToSupabase();
                    }
                }, 3000);
            }
        }
        
        // Update UI
        updateSettingsUI();
        updateProfileDropdown();
        updateProfilesList();
        restoreTranslationBoxes();
        
        // Apply theme after syncing from cloud
        if (globalSettings.theme) {
            console.log('SyncFromSupabase: Applying synced theme:', globalSettings.theme);
            applyTheme(globalSettings.theme);
        }
        
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

function hideAuthForms(resetState = false) {
    authLocalMode && authLocalMode.classList.add('hidden');
    signinForm.classList.add('hidden');
    signupForm && signupForm.classList.add('hidden');
    signupOtpForm && signupOtpForm.classList.add('hidden');
    signinOtpForm && signinOtpForm.classList.add('hidden');
    otpVerifyForm && otpVerifyForm.classList.add('hidden');
    
    // Hide new auth forms
    emailStepForm && emailStepForm.classList.add('hidden');
    tokenStepForm && tokenStepForm.classList.add('hidden');
    passwordStepForm && passwordStepForm.classList.add('hidden');
    
    // Clear messages
    if (signinMessage) signinMessage.style.display = 'none';
    if (signupMessage) signupMessage.style.display = 'none';
    if (signupOtpMessage) signupOtpMessage.style.display = 'none';
    if (signinOtpMessage) signinOtpMessage.style.display = 'none';
    if (otpVerifyMessage) otpVerifyMessage.style.display = 'none';
    if (enableCloudSyncMessage) enableCloudSyncMessage.style.display = 'none';
    if (emailStepMessage) emailStepMessage.style.display = 'none';
    if (tokenStepMessage) tokenStepMessage.style.display = 'none';
    if (passwordStepMessage) passwordStepMessage.style.display = 'none';
    
    // Reset auth flow state only if explicitly requested
    if (resetState) {
        currentAuthFlow = '';
        currentAuthEmail = '';
    }
}

// Legacy OTP form functions - removed (using new multi-step flow instead)
// showSignUpOtpForm and showSignInOtpForm removed as they reference non-existent elements

function showOtpVerifyForm() {
    hideAuthForms();
    otpVerifyForm && otpVerifyForm.classList.remove('hidden');
    
    // Focus on OTP input
    const otpInput = document.getElementById('otp-code');
    if (otpInput) {
        setTimeout(() => otpInput.focus(), 100);
    }
}

// New auth flow form functions
function showEmailStepForm(flow) {
    hideAuthForms();
    currentAuthFlow = flow;
    
    if (emailStepForm) {
        emailStepForm.classList.remove('hidden');
        
        // Update form content based on flow
        if (flow === 'signup') {
            emailStepTitle.textContent = 'Sign Up';
            emailStepDescription.textContent = 'Enter your email address to get started';
        } else if (flow === 'reset') {
            emailStepTitle.textContent = 'Reset Password';
            emailStepDescription.textContent = 'Enter your email address to reset your password';
        }
        
        // Focus on email input
        setTimeout(() => emailStepInput?.focus(), 100);
    }
}

function showTokenStepForm() {
    hideAuthForms(); // Don't reset state during form transitions
    if (tokenStepForm) {
        tokenStepForm.classList.remove('hidden');
        
        // Update description
        if (tokenStepDescription) {
            tokenStepDescription.textContent = `We've sent a 6-digit verification code to ${currentAuthEmail}. Please enter it below:`;
        }
        
        // Focus on token input
        setTimeout(() => tokenStepInput?.focus(), 100);
    }
}

function showPasswordStepForm() {
    hideAuthForms(); // Don't reset state during form transitions
    if (passwordStepForm) {
        passwordStepForm.classList.remove('hidden');
        
        // Update content based on flow
        if (currentAuthFlow === 'signup') {
            passwordStepTitle.textContent = 'Create Password';
            passwordStepWarning.style.display = 'block';
        } else if (currentAuthFlow === 'reset') {
            passwordStepTitle.textContent = 'Reset Password';
            passwordStepWarning.style.display = 'block';
        }
        
        // Focus on password input
        setTimeout(() => passwordStepInput?.focus(), 100);
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
    
    // Save current profile-specific settings to current profile if specified
    if (saveCurrentFirst && currentProfileName && profiles[currentProfileName]) {
        const currentSettings = getCurrentSettings();
        profiles[currentProfileName] = JSON.parse(JSON.stringify(currentSettings));
        console.log('LoadProfile: Saved current profile settings to:', currentProfileName);
    }
    
    // Load new profile (profile-specific settings only)
    const newProfileSettings = profiles[profileName];
    profileSettings = JSON.parse(JSON.stringify(newProfileSettings));
    currentProfileName = profileName;
    
    // Update legacy settings object for backward compatibility
    settings = {
        ...profileSettings,
        ...globalSettings
    };
    
    console.log('LoadProfile: Loaded profile settings for:', profileName);
    
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
    const maxWordCount = maxWordCountInput ? parseInt(maxWordCountInput.value) || 10 : profileSettings.maxWordCount;
    
    // Get debug selection setting
    const debugSelectionCheckbox = document.getElementById('debug-selection');
    const debugSelection = debugSelectionCheckbox ? debugSelectionCheckbox.checked : profileSettings.debugSelection;

    const layoutModeCheckbox = document.getElementById('layout-mode');
    const layoutMode = layoutModeCheckbox ? (layoutModeCheckbox.checked ? 'shift' : 'overlay') : profileSettings.layoutMode;
    
    // REFACTORED: Return only profile-specific settings (no global settings like API keys or enabled providers)
    return {
        maxWordCount: maxWordCount,
        debugSelection: debugSelection,
        defaultTargetLanguage: profileSettings.defaultTargetLanguage,
        translationBoxes: translationBoxes,
        layoutMode: layoutMode
    };
}

// NEW: Get current global settings from UI
function getCurrentGlobalSettings() {
    // Get theme setting
    const themeSelect = document.getElementById('theme-select');
    const theme = themeSelect ? themeSelect.value : globalSettings.theme;
    
    // Get enabled providers from checkboxes
    const enabledProviders = {};
    for (const provider in globalSettings.enabledProviders) {
        const checkbox = document.getElementById(`enable-${provider}`);
        enabledProviders[provider] = checkbox ? checkbox.checked : globalSettings.enabledProviders[provider];
    }
    
    // Get API keys from inputs
    const apiKeys = {};
    for (const provider in globalSettings.apiKeys) {
        const input = document.getElementById(`${provider}-api-key`);
        apiKeys[provider] = input ? input.value : globalSettings.apiKeys[provider];
    }
    
    return {
        theme: theme,
        enabledProviders: enabledProviders,
        apiKeys: apiKeys
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
        
        // Setup system theme listener
        console.log('Setting up theme system...');
        setupSystemThemeListener();
        
        // Apply initial theme
        applyTheme(globalSettings.theme);
        
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
        
        // Check for any existing text selection in storage on startup
        setTimeout(() => {
            try {
                chrome.storage.local.get('sidePanel_textSelected', (result) => {
                    if (result.sidePanel_textSelected) {
                        console.log('🔍 Found existing text selection on startup:', result.sidePanel_textSelected);
                        handleBackgroundScriptMessage(result.sidePanel_textSelected, null, () => {});
                        // Clean up after processing
                        chrome.storage.local.remove('sidePanel_textSelected').catch(console.error);
                    }
                });
            } catch (error) {
                console.error('Error checking for existing text selection:', error);
            }
        }, 100);
        
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
                
                // Update global settings with theme if present
                if (result.translatorSettings.theme) {
                    globalSettings.theme = result.translatorSettings.theme;
                }
                
                console.log('LoadSettings: Final merged settings:', settings);
            } else {
                console.log('LoadSettings: No saved settings found, using defaults');
            }
            
            // Apply theme after loading settings
            if (globalSettings.theme || settings.theme) {
                const theme = globalSettings.theme || settings.theme;
                console.log('LoadSettings: Applying loaded theme:', theme);
                applyTheme(theme);
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
    
    // Update theme selection
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = settings.theme || globalSettings.theme;
    }
    
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

    const layoutModeCheckbox = document.getElementById('layout-mode');
    if (layoutModeCheckbox) {
        layoutModeCheckbox.checked = settings.layoutMode === 'shift';
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
    
    // Theme selection
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            console.log('Theme selection changed:', e.target.value);
            globalSettings.theme = e.target.value;
            settings.theme = e.target.value; // Update legacy settings object
            
            // Apply theme immediately
            applyTheme(e.target.value);
            
            // Save settings
            saveSettings();
            
            // Sync to cloud if authenticated
            if (isAuthenticated && syncEnabled && !syncInProgress) {
                setTimeout(() => {
                    syncToSupabase();
                }, 1000);
            }
        });
    }

    // Save settings button
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', async () => {
            console.log('Save settings button clicked');
            
            // Get current settings from UI and track what was newly enabled
            const previouslyEnabledProviders = { ...settings.enabledProviders };
            
            // Get theme setting
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                globalSettings.theme = themeSelect.value;
                settings.theme = themeSelect.value; // Update legacy settings object
                applyTheme(themeSelect.value);
            }
            
            const maxWordCountInput = document.getElementById('max-word-count');
            if (maxWordCountInput) {
                settings.maxWordCount = parseInt(maxWordCountInput.value) || 10;
            }
            
            // Get debug selection setting
            const debugSelectionCheckbox = document.getElementById('debug-selection');
            if (debugSelectionCheckbox) {
                settings.debugSelection = debugSelectionCheckbox.checked;
            }

            const layoutModeCheckbox = document.getElementById('layout-mode');
            if (layoutModeCheckbox) {
                settings.layoutMode = layoutModeCheckbox.checked ? 'shift' : 'overlay';
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

    // Security audit and cleanup buttons
    const auditSecurityButton = document.getElementById('audit-security');
    if (auditSecurityButton) {
        auditSecurityButton.addEventListener('click', handleSecurityAudit);
    }

    const cleanupPlaintextButton = document.getElementById('cleanup-plaintext');
    if (cleanupPlaintextButton) {
        cleanupPlaintextButton.addEventListener('click', handleCleanupPlaintext);
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

    // Layout mode checkbox - immediate application
    const layoutModeCheckbox = document.getElementById('layout-mode');
    if (layoutModeCheckbox) {
        layoutModeCheckbox.addEventListener('change', (e) => {
            console.log('Layout mode checkbox changed:', e.target.checked);
            settings.layoutMode = e.target.checked ? 'shift' : 'overlay';
            // Also save the setting immediately
            saveSettings();
            
            // Save to current profile if we have one
            if (currentProfileName && profiles[currentProfileName]) {
                const currentSettings = getCurrentSettings();
                profiles[currentProfileName] = JSON.parse(JSON.stringify(currentSettings));
                saveProfiles();
            }
            
            // Sync to cloud if authenticated
            if (isAuthenticated && syncEnabled && !syncInProgress) {
                setTimeout(() => {
                    syncToSupabase();
                }, 1000);
            }
        });
    }

    // Max word count input - immediate application
    const maxWordCountInput = document.getElementById('max-word-count');
    if (maxWordCountInput) {
        maxWordCountInput.addEventListener('change', (e) => {
            console.log('Max word count changed:', e.target.value);
            settings.maxWordCount = parseInt(e.target.value) || 10;
            // Also save the setting immediately
            saveSettings();
            
            // Save to current profile if we have one
            if (currentProfileName && profiles[currentProfileName]) {
                const currentSettings = getCurrentSettings();
                profiles[currentProfileName] = JSON.parse(JSON.stringify(currentSettings));
                saveProfiles();
            }
            
            // Sync to cloud if authenticated
            if (isAuthenticated && syncEnabled && !syncInProgress) {
                setTimeout(() => {
                    syncToSupabase();
                }, 1000);
            }
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
        showSigninButton.addEventListener('click', showSignInForm);
    }
    
    if (showSignupButton) {
        showSignupButton.addEventListener('click', () => showEmailStepForm('signup'));
    }
    
    if (signinSubmit) {
        signinSubmit.addEventListener('click', handleSignIn);
    }
    
    if (signinCancel) {
        signinCancel.addEventListener('click', () => hideAuthForms(true));
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

    if (passwordResetButton) {
        passwordResetButton.addEventListener('click', () => showEmailStepForm('reset'));
    }
    
    if (signupOtpSend) {
        signupOtpSend.addEventListener('click', handleSignUpWithOtp);
    }
    
    if (signupOtpCancel) {
        signupOtpCancel.addEventListener('click', hideAuthForms);
    }
    
    if (signinOtpSend) {
        // signinOtpSend.addEventListener('click', handleSignInWithOtp); // Removed - using simplified auth flow
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
    
    // New auth flow event listeners
    if (emailStepSubmit) {
        emailStepSubmit.addEventListener('click', handleEmailStep);
    }
    
    if (emailStepCancel) {
        emailStepCancel.addEventListener('click', () => hideAuthForms(true));
    }
    
    if (tokenStepSubmit) {
        tokenStepSubmit.addEventListener('click', handleTokenStep);
    }
    
    if (tokenStepCancel) {
        tokenStepCancel.addEventListener('click', () => hideAuthForms(true));
    }
    
    if (tokenStepResend) {
        tokenStepResend.addEventListener('click', handleTokenResend);
    }
    
    if (passwordStepSubmit) {
        passwordStepSubmit.addEventListener('click', handlePasswordStep);
    }
    
    if (passwordStepCancel) {
        passwordStepCancel.addEventListener('click', () => hideAuthForms(true));
    }
    
    // Password toggle event listeners
    if (signinPasswordToggle) {
        signinPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility('signin-password', signinPasswordToggle);
        });
    }
    
    if (passwordStepToggle) {
        passwordStepToggle.addEventListener('click', () => {
            togglePasswordVisibility('password-step-input', passwordStepToggle);
        });
    }
    
    // Add Enter key support for new auth forms
    if (emailStepInput) {
        emailStepInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleEmailStep();
            }
        });
    }
    
    if (tokenStepInput) {
        tokenStepInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleTokenStep();
            }
        });
        
        // Auto-format token input (numbers only)
        tokenStepInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }
    
    if (passwordStepInput) {
        passwordStepInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handlePasswordStep();
            }
        });
    }
    
    // Listen for messages from background script via storage (this actually works for side panels)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes['sidePanel_textSelected']) {
            const newValue = changes['sidePanel_textSelected'].newValue;
            if (newValue) {
                console.log('🔍 Sidebar received storage update:', newValue);
                handleBackgroundScriptMessage(newValue, null, () => {});
                
                // Clean up the storage to prevent re-processing
                chrome.storage.local.remove('sidePanel_textSelected').catch(console.error);
            }
        }
    });
    
    // Keep the runtime message listener for other types of messages (settings, etc.)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Handle non-textSelected messages here if needed
        if (message.action !== 'textSelected') {
            handleBackgroundScriptMessage(message, sender, sendResponse);
            return true;
        }
        // For textSelected messages, we use storage instead
        return false;
    });
    
    console.log('SetupEventListeners: All event listeners set up successfully');
}

// Handle messages from background script (forwarded from content script)
function handleBackgroundScriptMessage(message, sender, sendResponse) {
    console.log('🔍 Sidebar received message from background:', message);
    
    const data = message;
    if (!data) {
        console.log('🚫 Message rejected due to no data:', data);
        sendResponse({ success: false, error: 'No data' });
        return;
    }
    
    // Check if this is a forwarded message from the background script
    if (data.source === 'backgroundScript' && data.action === 'textSelected') {
        console.log('✅ Received text selection from background script:', data);
        
        currentWord = data.selectedText || '';
        currentSentence = data.sentence || '';
        
        console.log('📝 Updated currentWord:', currentWord);
        console.log('📝 Updated currentSentence:', currentSentence);
        
        // Update UI
        if (selectionElement) {
            if (data.error) {
                selectionElement.textContent = data.error;
            } else {
                selectionElement.textContent = currentWord || 'Select text to translate';
            }
            console.log('✅ Updated selection element');
        } else {
            console.log('❌ Selection element not found');
        }
        
        if (sentenceElement) {
            sentenceElement.textContent = currentSentence || '';
            console.log('✅ Updated sentence element');
        } else {
            console.log('❌ Sentence element not found');
        }
        
        // Trigger translation with debouncing if we have text and no error
        if (currentWord && !data.error) {
            console.log('🎯 Triggering translation for:', currentWord);
            debouncedTranslateAllBoxes();
        }
        
        sendResponse({ success: true });
        return;
    }
    
    // Handle other message types as needed
    console.log('🤔 Unhandled message type:', data);
    sendResponse({ success: false, error: 'Unhandled message type' });
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

// Legacy authentication event listeners - removed (using new multi-step flow instead)

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

// Prompt user for password when needed for encryption
async function promptForPassword() {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            color: var(--text-color, #fff);
        `;
        
        modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 18px;">🔐 Password Required</h3>
            <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.8;">
                Enter your password to encrypt your API keys before saving to cloud.
            </p>
            <input type="password" id="encrypt-password" placeholder="Enter your password" 
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #333); 
                          border-radius: 4px; background: var(--input-bg, #2a2a2a); 
                          color: var(--text-color, #fff); margin-bottom: 16px;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="encrypt-cancel" style="padding: 8px 16px; border: 1px solid var(--border-color, #333); 
                                                   border-radius: 4px; background: transparent; 
                                                   color: var(--text-color, #fff); cursor: pointer;">
                    Cancel
                </button>
                <button id="encrypt-confirm" style="padding: 8px 16px; border: 1px solid var(--accent-color, #007acc); 
                                                    border-radius: 4px; background: var(--accent-color, #007acc); 
                                                    color: white; cursor: pointer;">
                    Encrypt & Save
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        const passwordInput = document.getElementById('encrypt-password');
        const cancelBtn = document.getElementById('encrypt-cancel');
        const confirmBtn = document.getElementById('encrypt-confirm');
        
        passwordInput.focus();
        
        function cleanup() {
            document.body.removeChild(overlay);
        }
        
        function handleConfirm() {
            const password = passwordInput.value.trim();
            if (password) {
                cleanup();
                resolve(password);
            } else {
                passwordInput.style.borderColor = '#ff4444';
                passwordInput.placeholder = 'Password is required';
            }
        }
        
        function handleCancel() {
            cleanup();
            resolve(null);
        }
        
        // Event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        });
        
        // Click outside to cancel
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleCancel();
            }
        });
    });
}

// Password storage helpers
async function storeUserPassword(password) {
    if (!password) return;
    
    try {
        // Get current session to use as encryption key
        const { data: { session } } = await window.SupabaseAuth.getCurrentSession();
        if (!session?.access_token) {
            console.warn('🔐 No session available, cannot store password securely');
            return;
        }
        
        // Use first 32 chars of access token as encryption key
        const sessionKey = session.access_token.substring(0, 32);
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        // Encrypt password with session key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(sessionKey),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const encryptionKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 1000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            encryptionKey,
            encoder.encode(password)
        );
        
        // Store encrypted password with salt and iv
        const encryptedData = {
            encrypted: Array.from(new Uint8Array(encrypted)),
            salt: Array.from(salt),
            iv: Array.from(iv),
            userId: session.user?.id
        };
        
        chrome.storage.local.set({ 'encrypted_user_password': encryptedData }, () => {
            console.log('🔐 Password stored securely');
        });
        
    } catch (error) {
        console.error('🔐 Failed to store password:', error);
    }
}

async function retrieveUserPassword() {
    try {
        // Get current session
        const { data: { session } } = await window.SupabaseAuth.getCurrentSession();
        if (!session?.access_token) {
            console.log('🔐 No session available, cannot retrieve password');
            return null;
        }
        
        // Get encrypted password from storage
        return new Promise((resolve) => {
            chrome.storage.local.get(['encrypted_user_password'], async (result) => {
                try {
                    const encryptedData = result.encrypted_user_password;
                    if (!encryptedData) {
                        console.log('🔐 No stored password found');
                        resolve(null);
                        return;
                    }
                    
                    // Check if password belongs to current user
                    if (encryptedData.userId !== session.user?.id) {
                        console.log('🔐 Stored password belongs to different user, clearing');
                        chrome.storage.local.remove(['encrypted_user_password']);
                        resolve(null);
                        return;
                    }
                    
                    // Use same session key for decryption
                    const sessionKey = session.access_token.substring(0, 32);
                    const encoder = new TextEncoder();
                    const decoder = new TextDecoder();
                    
                    const keyMaterial = await crypto.subtle.importKey(
                        'raw',
                        encoder.encode(sessionKey),
                        'PBKDF2',
                        false,
                        ['deriveKey']
                    );
                    
                    const salt = new Uint8Array(encryptedData.salt);
                    const decryptionKey = await crypto.subtle.deriveKey(
                        {
                            name: 'PBKDF2',
                            salt: salt,
                            iterations: 1000,
                            hash: 'SHA-256'
                        },
                        keyMaterial,
                        { name: 'AES-GCM', length: 256 },
                        false,
                        ['decrypt']
                    );
                    
                    const iv = new Uint8Array(encryptedData.iv);
                    const encrypted = new Uint8Array(encryptedData.encrypted);
                    
                    const decrypted = await crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: iv },
                        decryptionKey,
                        encrypted
                    );
                    
                    const password = decoder.decode(decrypted);
                    console.log('🔐 Password retrieved successfully');
                    resolve(password);
                    
                } catch (error) {
                    console.error('🔐 Failed to decrypt password:', error);
                    // Clear corrupted data
                    chrome.storage.local.remove(['encrypted_user_password']);
                    resolve(null);
                }
            });
        });
        
    } catch (error) {
        console.error('🔐 Failed to retrieve password:', error);
        return null;
    }
}

function clearStoredPassword() {
    chrome.storage.local.remove(['encrypted_user_password'], () => {
        console.log('🔐 Stored password cleared');
    });
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

// Security functions
async function handleSecurityAudit() {
    const auditButton = document.getElementById('audit-security');
    const securityMessage = document.getElementById('security-message');
    
    if (!isAuthenticated || !syncEnabled) {
        showSecurityMessage('Please sign in to audit database security.', 'error');
        return;
    }
    
    if (!window.SupabaseAuth || !window.SupabaseAuth.auditDatabaseSecurity) {
        showSecurityMessage('Security audit function not available.', 'error');
        return;
    }
    
    try {
        auditButton.disabled = true;
        auditButton.textContent = '🔍 Auditing...';
        showSecurityMessage('Scanning database for security issues...', 'info');
        
        const result = await window.SupabaseAuth.auditDatabaseSecurity();
        
        if (result.error) {
            showSecurityMessage(`Audit failed: ${result.error}`, 'error');
        } else {
            if (result.issues.length === 0) {
                // No issues found - show detailed success message
                let message = '✅ Security Audit Complete: No issues found!\n\n';
                if (result.summary) {
                    message += `📊 Audit Summary:\n`;
                    message += `• Locations checked: ${result.summary.total_locations_checked}\n`;
                    message += `• Encrypted locations: ${result.summary.encrypted_locations}\n`;
                    message += `• Empty locations: ${result.summary.empty_locations}\n`;
                    message += `• Plain text locations: ${result.summary.plaintext_locations}\n\n`;
                }
                message += 'All API keys are properly encrypted or empty. Your data is secure! 🔒';
                showSecurityMessage(message, 'success');
            } else {
                // Issues found - show detailed error message
                let message = `🚨 Security Issues Found (${result.issues.length} issue${result.issues.length > 1 ? 's' : ''}):\n\n`;
                
                // Group issues by type for better readability
                const userSettingsIssues = result.issues.filter(issue => issue.type === 'user_settings');
                const profileIssues = result.issues.filter(issue => issue.type === 'profile');
                
                if (userSettingsIssues.length > 0) {
                    message += '🔧 User Settings:\n';
                    userSettingsIssues.forEach(issue => {
                        message += `  • ${issue.description}\n`;
                        if (issue.affected_providers && issue.affected_providers.length > 0) {
                            message += `    Providers: ${issue.affected_providers.join(', ')}\n`;
                        }
                    });
                    message += '\n';
                }
                
                if (profileIssues.length > 0) {
                    message += '👤 Profiles:\n';
                    profileIssues.forEach(issue => {
                        message += `  • ${issue.description}\n`;
                        if (issue.affected_providers && issue.affected_providers.length > 0) {
                            message += `    Providers: ${issue.affected_providers.join(', ')}\n`;
                        }
                    });
                    message += '\n';
                }
                
                if (result.summary) {
                    message += `📊 Audit Summary:\n`;
                    message += `• Total locations: ${result.summary.total_locations_checked}\n`;
                    message += `• 🔒 Encrypted: ${result.summary.encrypted_locations}\n`;
                    message += `• 📭 Empty: ${result.summary.empty_locations}\n`;
                    message += `• 🚨 Plain text: ${result.summary.plaintext_locations}\n\n`;
                }
                
                message += '⚠️ Use "Clean Plaintext API Keys" to fix these security issues.\n';
                message += '📝 You will need to re-enter your API keys after cleanup.';
                
                showSecurityMessage(message, 'error');
            }
        }
    } catch (error) {
        console.error('Security audit error:', error);
        showSecurityMessage('Security audit failed due to an unexpected error.', 'error');
    } finally {
        auditButton.disabled = false;
        auditButton.textContent = '🔍 Audit Database Security';
    }
}

async function handleCleanupPlaintext() {
    const cleanupButton = document.getElementById('cleanup-plaintext');
    
    if (!isAuthenticated || !syncEnabled) {
        showSecurityMessage('Please sign in to clean up database.', 'error');
        return;
    }
    
    if (!window.SupabaseAuth || !window.SupabaseAuth.cleanupPlaintextApiKeys) {
        showSecurityMessage('Security cleanup function not available.', 'error');
        return;
    }
    
    // Enhanced confirmation with more details
    const confirmed = confirm(
        '🔒 SECURITY CLEANUP CONFIRMATION\n\n' +
        '⚠️  This will permanently remove all plain text API keys from your cloud storage.\n\n' +
        '📋 What will happen:\n' +
        '   • All unencrypted API keys will be deleted\n' +
        '   • Your profiles and settings will remain intact\n' +
        '   • You will need to re-enter your API keys\n' +
        '   • Future API keys will be properly encrypted\n\n' +
        '💡 Tip: Have your API keys ready to re-enter after cleanup.\n\n' +
        'Continue with security cleanup?'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        cleanupButton.disabled = true;
        cleanupButton.textContent = '🧹 Cleaning...';
        showSecurityMessage('Removing plain text API keys from database...', 'info');
        
        const result = await window.SupabaseAuth.cleanupPlaintextApiKeys();
        
        if (result.error) {
            showSecurityMessage(`Cleanup failed: ${result.error}`, 'error');
        } else {
            if (result.cleanedCount === 0) {
                showSecurityMessage('✅ No plain text API keys found. Database is already secure! 🔒', 'success');
            } else {
                // Enhanced success message with details
                let message = `✅ Security cleanup completed successfully!\n\n`;
                message += `📊 Cleanup Summary:\n`;
                message += `• Locations cleaned: ${result.cleanedCount}\n`;
                
                if (result.details && result.details.length > 0) {
                    message += '\n🧹 Cleaned Locations:\n';
                    result.details.forEach(detail => {
                        message += `  • ${detail.location}\n`;
                        if (detail.providers_cleaned && detail.providers_cleaned.length > 0) {
                            message += `    Providers: ${detail.providers_cleaned.join(', ')}\n`;
                        }
                    });
                }
                
                message += '\n🔐 Next Steps:\n';
                message += '1. Re-enter your API keys in Settings\n';
                message += '2. Save settings to encrypt and store them securely\n';
                message += '3. Run another audit to verify security\n\n';
                message += '⚠️ Important: Your API keys are now cleared and need to be re-entered.';
                
                showSecurityMessage(message, 'success');
                
                // Clear local API keys too for consistency
                settings.apiKeys = {};
                Object.keys(profiles).forEach(profileName => {
                    if (profiles[profileName].apiKeys) {
                        profiles[profileName].apiKeys = {};
                    }
                });
                
                // Update UI
                updateSettingsUI();
                saveSettings();
                saveProfiles();
                
                // Show additional notification for immediate action
                setTimeout(() => {
                    showSecurityMessage(
                        '🔔 Reminder: Please go to Settings and re-enter your API keys to continue using translation services.',
                        'warning'
                    );
                }, 8000); // Show reminder after 8 seconds
            }
        }
    } catch (error) {
        console.error('Security cleanup error:', error);
        showSecurityMessage('Security cleanup failed due to an unexpected error.', 'error');
    } finally {
        cleanupButton.disabled = false;
        cleanupButton.textContent = '🧹 Clean Plaintext API Keys';
    }
}

// Show security message
function showSecurityMessage(message, type) {
    const securityMessage = document.getElementById('security-message');
    if (!securityMessage) return;
    
    securityMessage.textContent = message;
    securityMessage.className = `security-message ${type}`;
    securityMessage.style.display = 'block';
    
    // Auto-hide success and info messages after 5 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            securityMessage.style.display = 'none';
        }, 5000);
    }
}


