// Supabase client configuration for Chrome Extension
// Optimized version that works with or without the Supabase library

// Import Supabase (we'll load this as a module)
// Note: In a Chrome extension, you need to load external libraries properly
// The actual import will be handled in the HTML files or through a bundler

// Supabase configuration
const SUPABASE_CONFIG = {
    // ⚠️ SECURITY WARNING: Replace these with your actual Supabase project values
    // Get these from your Supabase dashboard: Settings > API
    url: "__SUPABASE_URL__",
    anonKey: "__SUPABASE_ANON_KEY__",
};

// ⚠️ IMPORTANT SECURITY NOTICE:
// The credentials above have been removed for security reasons.
// To use this extension:
// 1. Go to your Supabase dashboard: Settings > API
// 2. Copy your Project URL and anon/public key
// 3. Replace the placeholder values above
// 4. NEVER commit real credentials to version control

// ✅ Configuration completed with your Supabase project credentials

// Check if we're running in a supported environment
function getExtensionRedirectUrl() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL('sidebar.html');
    }
    return window.location.origin + '/sidebar.html';
}

// Initialize Supabase client
let supabaseClient = null;
let isLocalMode = false;
let isLoadingSupabase = false;
let supabaseLoadAttempted = false;

// Dynamically load Supabase from CDN
async function loadSupabaseFromCDN() {
    if (typeof supabase !== 'undefined') {
        console.log('🔐 Supabase already loaded');
        return true;
    }
    
    if (isLoadingSupabase) {
        console.log('🔐 Supabase loading in progress...');
        return false;
    }
    
    if (supabaseLoadAttempted) {
        console.log('🔐 Supabase load already attempted');
        return false;
    }
    
    isLoadingSupabase = true;
    supabaseLoadAttempted = true;
    
    try {
        console.log('🔄 Loading Supabase library from CDN...');
        
        // Create script element to load Supabase
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';
        script.crossOrigin = 'anonymous';
        
        // Wait for script to load
        await new Promise((resolve, reject) => {
            script.onload = () => {
                console.log('✅ Supabase library loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Supabase library');
                reject(new Error('Failed to load Supabase'));
            };
            document.head.appendChild(script);
        });
        
        // Verify Supabase is available
        if (typeof supabase !== 'undefined') {
            isLocalMode = false;
            isLoadingSupabase = false;
            return true;
        } else {
            throw new Error('Supabase object not available after loading');
        }
        
    } catch (error) {
        console.error('🔐 Failed to load Supabase:', error);
        isLocalMode = true;
        isLoadingSupabase = false;
        return false;
    }
}

// Initialize the Supabase client
function initializeSupabase() {
    if (typeof supabase === 'undefined') {
        console.warn('🔐 Supabase library not loaded. Running in local-only mode.');
        isLocalMode = true;
        return null;
    }
    
    if (!supabaseClient) {
        try {
            supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false, // Important for Chrome extensions
                    storage: {
                        // Custom storage adapter for Chrome extension
                        getItem: async (key) => {
                            return new Promise((resolve) => {
                                if (typeof chrome !== 'undefined' && chrome.storage) {
                                    chrome.storage.local.get([key], (result) => {
                                        resolve(result[key] || null);
                                    });
                                } else {
                                    resolve(localStorage.getItem(key));
                                }
                            });
                        },
                        setItem: async (key, value) => {
                            return new Promise((resolve) => {
                                if (typeof chrome !== 'undefined' && chrome.storage) {
                                    chrome.storage.local.set({ [key]: value }, () => {
                                        resolve();
                                    });
                                } else {
                                    localStorage.setItem(key, value);
                                    resolve();
                                }
                            });
                        },
                        removeItem: async (key) => {
                            return new Promise((resolve) => {
                                if (typeof chrome !== 'undefined' && chrome.storage) {
                                    chrome.storage.local.remove([key], () => {
                                        resolve();
                                    });
                                } else {
                                    localStorage.removeItem(key);
                                    resolve();
                                }
                            });
                        }
                    }
                }
            });
            
            console.log('🔐 Supabase client initialized');
            isLocalMode = false;
        } catch (error) {
            console.warn('🔐 Failed to initialize Supabase client, falling back to local mode:', error);
            isLocalMode = true;
            supabaseClient = null;
        }
    }
    
    return supabaseClient;
}

// Get the current Supabase client instance
function getSupabaseClient() {
    if (!supabaseClient && !isLocalMode) {
        return initializeSupabase();
    }
    return supabaseClient;
}

// Check if we're in local mode
function isInLocalMode() {
    return isLocalMode || !supabaseClient;
}

// Enable cloud sync by loading Supabase
async function enableCloudSync() {
    try {
        console.log('🔄 Enabling cloud sync...');
        
        const loaded = await loadSupabaseFromCDN();
        if (loaded) {
            const client = initializeSupabase();
            if (client) {
                console.log('✅ Cloud sync enabled successfully');
                return { success: true, error: null };
            }
        }
        
        throw new Error('Failed to initialize cloud sync');
        
    } catch (error) {
        console.error('❌ Failed to enable cloud sync:', error);
        return { success: false, error: error.message };
    }
}

// ======================
// Encryption helpers
// ======================
async function deriveEncryptionKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptApiKeys(apiKeys, password) {
    if (!password) return null;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveEncryptionKey(password, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(apiKeys));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));
    const combined = new Uint8Array(salt.length + iv.length + cipher.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(cipher, salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function decryptApiKeys(encrypted, password) {
    if (!encrypted || !password) return null;
    try {
        const bytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
        const salt = bytes.slice(0, 16);
        const iv = bytes.slice(16, 28);
        const cipher = bytes.slice(28);
        const key = await deriveEncryptionKey(password, salt);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
        const decoded = new TextDecoder().decode(plain);
        return JSON.parse(decoded);
    } catch (e) {
        console.error('Failed to decrypt API keys:', e);
        return null;
    }
}

// Authentication functions with local mode fallback
async function signUp(email, password) {
    if (isInLocalMode()) {
        return { error: 'Cloud sync not available. Extension running in local mode.' };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                // Use extension URL for email confirmation
                emailRedirectTo: getExtensionRedirectUrl()
            }
        });
        
        if (error) {
            console.error('Sign up error:', error);
            return { error: error.message };
        }
        
        console.log('Sign up successful:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Sign up exception:', err);
        return { error: 'Sign up failed' };
    }
}

async function signIn(email, password) {
    if (isInLocalMode()) {
        return { error: 'Cloud sync not available. Extension running in local mode.' };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) {
            console.error('Sign in error:', error);
            return { error: error.message };
        }
        
        console.log('Sign in successful:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Sign in exception:', err);
        return { error: 'Sign in failed' };
    }
}



// Alternative sign up with OTP (recommended for Chrome extensions)
async function signUpWithOtp(email) {
    if (isInLocalMode()) {
        return { error: 'Cloud sync not available. Extension running in local mode.' };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data, error } = await client.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: true
            }
        });
        
        if (error) {
            console.error('Sign up with OTP error:', error);
            return { error: error.message };
        }
        
        console.log('Sign up with OTP successful - check email for verification code');
        return { data, error: null };
    } catch (err) {
        console.error('Sign up with OTP exception:', err);
        return { error: 'Sign up with OTP failed' };
    }
}

// Sign in with OTP
async function signInWithOtp(email) {
    if (isInLocalMode()) {
        return { error: 'Cloud sync not available. Extension running in local mode.' };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data, error } = await client.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false
            }
        });
        
        if (error) {
            console.error('Sign in with OTP error:', error);
            return { error: error.message };
        }
        
        console.log('Sign in with OTP successful - check email for verification code');
        return { data, error: null };
    } catch (err) {
        console.error('Sign in with OTP exception:', err);
        return { error: 'Sign in with OTP failed' };
    }
}

// Verify OTP for sign in
async function verifyOtp(email, token, type = 'email') {
    if (isInLocalMode()) {
        return { error: 'Cloud sync not available. Extension running in local mode.' };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        console.log('🔐 verifyOtp called with:', { email, token: token?.substring(0, 3) + '***', type });
        
        // Try the exact format from Supabase docs
        const otpPayload = {
            email: email,
            token: token,
            type: type
        };
        console.log('🔐 Sending to Supabase:', JSON.stringify(otpPayload, null, 2));
        
        const { data, error } = await client.auth.verifyOtp(otpPayload);
        
        if (error) {
            console.error('OTP verification error:', error);
            return { error: error.message };
        }
        
        console.log('OTP verification successful:', data);
        return { data, error: null };
    } catch (err) {
        console.error('OTP verification exception:', err);
        return { error: 'OTP verification failed' };
    }
}

async function signOut() {
    if (isInLocalMode()) {
        return { error: null }; // No-op in local mode
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { error } = await client.auth.signOut();
        if (error) {
            console.error('Sign out error:', error);
            return { error: error.message };
        }
        
        console.log('Sign out successful');
        return { error: null };
    } catch (err) {
        console.error('Sign out exception:', err);
        return { error: 'Sign out failed' };
    }
}

async function resetPassword(email) {
    if (isInLocalMode()) {
        return { error: 'Cloud sync not available. Extension running in local mode.' };
    }

    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };

    try {
        const { data, error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: getExtensionRedirectUrl()
        });

        if (error) {
            console.error('Reset password error:', error);
            return { error: error.message };
        }

        console.log('Reset password request sent:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Reset password exception:', err);
        return { error: 'Reset password failed' };
    }
}

async function getCurrentUser() {
    if (isInLocalMode()) {
        return { data: { user: null }, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { data: { user: null }, error: 'Supabase client not available' };
    
    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error) {
            const msg = error.message || '';
            if (msg.toLowerCase().includes('auth session missing')) {
                console.log('Get user: no active session');
            } else {
                console.error('Get user error:', error);
            }
            return { data: { user: null }, error: error.message };
        }
        
        return { data: { user }, error: null };
    } catch (err) {
        console.error('Get user exception:', err);
        return { data: { user: null }, error: 'Failed to get user' };
    }
}

async function getCurrentSession() {
    if (isInLocalMode()) {
        return { data: { session: null }, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { data: { session: null }, error: 'Supabase client not available' };
    
    try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) {
            const msg = error.message || '';
            if (msg.toLowerCase().includes('auth session missing')) {
                console.log('Get session: no active session');
            } else {
                console.error('Get session error:', error);
            }
            return { data: { session: null }, error: error.message };
        }
        
        return { data: { session }, error: null };
    } catch (err) {
        console.error('Get session exception:', err);
        return { data: { session: null }, error: 'Failed to get session' };
    }
}

// Data storage functions with local mode fallback
async function saveUserSettings(settings, password = null) {
    if (isInLocalMode()) {
        console.log('📱 Local mode: Settings saved locally only');
        return { data: null, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated' };
        
        console.log('🔐 saveUserSettings - password available:', !!password);
        console.log('🔐 saveUserSettings - apiKeys providers:', Object.keys(settings.apiKeys || {}));
        
        // Check if we have API keys that need encryption
        const hasApiKeys = Object.values(settings.apiKeys || {}).some(key => key && key.trim() !== '');
        
        let encryptedKeys;
        if (hasApiKeys) {
            if (!password) {
                // SECURITY: Never store API keys without encryption
                console.error('🔐 SECURITY: Attempted to store API keys without password - BLOCKING');
                return { error: 'Password required for API key encryption. API keys cannot be stored without encryption.' };
            }
            encryptedKeys = await encryptApiKeys(settings.apiKeys || {}, password);
            if (!encryptedKeys) {
                return { error: 'Failed to encrypt API keys' };
            }
            console.log('🔐 saveUserSettings - API keys encrypted successfully');
        } else {
            // No API keys to store, can save empty object
            encryptedKeys = {};
            console.log('🔐 saveUserSettings - No API keys to store');
        }
        
        console.log('🔐 saveUserSettings - encryptedKeys type:', typeof encryptedKeys);

        // REFACTORED: Only store global settings (API keys, enabled providers, and theme)
        const settingsData = {
            user_id: user.id,
            theme: settings.theme || 'system',
            enabled_providers: settings.enabledProviders,
            api_keys: encryptedKeys,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await client
            .from('user_settings')
            .upsert(settingsData, { onConflict: 'user_id' });
        
        if (error) {
            console.error('Save settings error:', error);
            return { error: error.message };
        }
        
        return { data, error: null };
    } catch (err) {
        console.error('Save settings exception:', err);
        return { error: 'Failed to save settings' };
    }
}

async function loadUserSettings(password = null) {
    if (isInLocalMode()) {
        return { data: null, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated' };
        
        const { data, error } = await client
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        // Handle cases where no settings exist yet for new users
        if (error) {
            if (error.code === 'PGRST116') {
                // PGRST116 is "not found" - normal for new users
                console.log('🔄 No user settings found (new user) - this is normal');
                return { data: null, error: null };
            } else if (error.message && error.message.includes('406')) {
                // 406 errors can also occur with .single() when no data exists
                console.log('🔄 No user settings found (406 error with .single()) - this is normal for new users');
                return { data: null, error: null };
            } else {
                // Other errors are actual problems
                console.error('Load settings error:', error);
                return { error: error.message };
            }
        }
        
        let decryptionFailed = false;
        let plaintextKeysDetected = false;
        
        if (data && data.api_keys) {
            if (typeof data.api_keys === 'string') {
                // Encrypted API keys (expected format)
                const decrypted = await decryptApiKeys(data.api_keys, password);
                if (decrypted) {
                    data.api_keys = decrypted;
                    console.log('🔐 Successfully decrypted API keys from cloud');
                } else {
                    console.error('🔐 Failed to decrypt API keys - clearing them for security');
                    data.api_keys = {};
                    decryptionFailed = true;
                }
            } else if (typeof data.api_keys === 'object') {
                // SECURITY ISSUE: Plain text API keys detected in database
                console.error('🚨 SECURITY ALERT: Plain text API keys detected in database!');
                console.error('🚨 This should never happen with the new security measures.');
                
                // Check if these are actually API keys (non-empty values)
                const hasActualKeys = Object.values(data.api_keys).some(key => key && key.trim() !== '');
                if (hasActualKeys) {
                    console.error('🚨 Blocking load of plain text API keys for security');
                    plaintextKeysDetected = true;
                    data.api_keys = {}; // Clear for security
                } else {
                    // Empty object is fine
                    console.log('🔐 Empty API keys object loaded (no encryption needed)');
                }
            }
        }

        return { data, error: null, decryptionFailed, plaintextKeysDetected };
    } catch (err) {
        console.error('Load settings exception:', err);
        return { error: 'Failed to load settings' };
    }
}

async function saveUserProfile(profileName, profileSettings, isCurrent = false, password = null) {
    if (isInLocalMode()) {
        console.log('📱 Local mode: Profile saved locally only');
        return { data: null, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated' };
        
        // If this is the current profile, unset other current profiles
        if (isCurrent) {
            await client
                .from('user_profiles')
                .update({ is_current: false })
                .eq('user_id', user.id);
        }
        
        // REFACTORED: Profiles no longer store API keys (they're global now)
        // Remove any API keys from profile settings for security
        let processedSettings = { ...profileSettings };
        delete processedSettings.apiKeys;
        delete processedSettings.enabledProviders;
        
        console.log('🔐 Saving profile-specific settings only for:', profileName);
        
        const profileData = {
            user_id: user.id,
            profile_name: profileName,
            settings: processedSettings,
            is_current: isCurrent,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await client
            .from('user_profiles')
            .upsert(profileData, { onConflict: 'user_id,profile_name' });
        
        if (error) {
            console.error('Save profile error:', error);
            return { error: error.message };
        }
        
        return { data, error: null };
    } catch (err) {
        console.error('Save profile exception:', err);
        return { error: 'Failed to save profile' };
    }
}

async function loadUserProfiles(password = null) {
    if (isInLocalMode()) {
        return { data: [], error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated' };
        
        const { data, error } = await client
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });
        
        if (error) {
            console.error('Load profiles error:', error);
            return { error: error.message };
        }
        
        // REFACTORED: Profiles no longer store API keys, so no decryption needed
        // Just clean up any legacy API keys that might exist
        if (data) {
            for (let profile of data) {
                if (profile.settings?.apiKeys) {
                    console.log('🔐 Removing legacy API keys from profile:', profile.profile_name);
                    delete profile.settings.apiKeys;
                }
                if (profile.settings?.enabledProviders) {
                    console.log('🔐 Removing legacy enabled providers from profile:', profile.profile_name);
                    delete profile.settings.enabledProviders;
                }
            }
        }
        
        return { data: data || [], error: null };
    } catch (err) {
        console.error('Load profiles exception:', err);
        return { error: 'Failed to load profiles' };
    }
}

async function deleteUserProfile(profileName) {
    if (isInLocalMode()) {
        console.log('📱 Local mode: Profile deleted locally only');
        return { data: null, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated' };
        
        const { data, error } = await client
            .from('user_profiles')
            .delete()
            .eq('user_id', user.id)
            .eq('profile_name', profileName);
        
        if (error) {
            console.error('Delete profile error:', error);
            return { error: error.message };
        }
        
        return { data, error: null };
    } catch (err) {
        console.error('Delete profile exception:', err);
        return { error: 'Failed to delete profile' };
    }
}

// Security audit function to check for plain text API keys
async function auditDatabaseSecurity() {
    if (isInLocalMode()) {
        return { 
            error: null, 
            message: 'Local mode - no database audit needed',
            issues: [],
            summary: {
                total_locations_checked: 0,
                encrypted_locations: 0,
                plaintext_locations: 0,
                empty_locations: 0
            }
        };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available', issues: [] };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated', issues: [] };
        
        const issues = [];
        const summary = {
            total_locations_checked: 0,
            encrypted_locations: 0,
            plaintext_locations: 0,
            empty_locations: 0
        };
        
        console.log('🔍 Starting security audit for user:', user.email);
        
        // Check user settings for plain text API keys
        console.log('🔍 Auditing user settings...');
        summary.total_locations_checked++;
        
        const { data: settingsData, error: settingsError } = await client
            .from('user_settings')
            .select('api_keys')
            .eq('user_id', user.id)
            .single();
        
        // Handle cases where no settings exist yet (normal for new users)
        if (settingsError && 
            (settingsError.code === 'PGRST116' || 
             (settingsError.message && settingsError.message.includes('406')))) {
            // No settings found - this is normal for new users
            summary.empty_locations++;
            console.log('ℹ️ User settings: No settings found (new user)');
        } else if (settingsError) {
            // Other errors are actual problems
            console.error('🔍 Audit error for user settings:', settingsError);
            summary.empty_locations++;
        } else if (settingsData?.api_keys) {
            if (typeof settingsData.api_keys === 'string') {
                // Encrypted (good)
                summary.encrypted_locations++;
                console.log('✅ User settings: API keys are encrypted');
            } else if (typeof settingsData.api_keys === 'object') {
                const hasPlaintextKeys = Object.values(settingsData.api_keys).some(key => key && key.trim() !== '');
                if (hasPlaintextKeys) {
                    summary.plaintext_locations++;
                    issues.push({
                        type: 'user_settings',
                        severity: 'critical',
                        description: 'Plain text API keys found in user settings',
                        affected_providers: Object.keys(settingsData.api_keys).filter(k => settingsData.api_keys[k] && settingsData.api_keys[k].trim() !== '')
                    });
                    console.error('🚨 User settings: Found plain text API keys for providers:', Object.keys(settingsData.api_keys).filter(k => settingsData.api_keys[k] && settingsData.api_keys[k].trim() !== ''));
                } else {
                    summary.empty_locations++;
                    console.log('ℹ️ User settings: API keys object is empty');
                }
            }
        } else {
            summary.empty_locations++;
            console.log('ℹ️ User settings: No API keys found');
        }
        
        // Check profiles for plain text API keys
        console.log('🔍 Auditing user profiles...');
        const { data: profilesData, error: profilesError } = await client
            .from('user_profiles')
            .select('profile_name, settings')
            .eq('user_id', user.id);
        
        if (!profilesError && profilesData) {
            for (const profile of profilesData) {
                summary.total_locations_checked++;
                console.log(`🔍 Auditing profile: ${profile.profile_name}`);
                
                if (profile.settings?.apiKeys) {
                    if (typeof profile.settings.apiKeys === 'string') {
                        // Encrypted (good)
                        summary.encrypted_locations++;
                        console.log(`✅ Profile ${profile.profile_name}: API keys are encrypted`);
                    } else if (typeof profile.settings.apiKeys === 'object') {
                        const hasPlaintextKeys = Object.values(profile.settings.apiKeys).some(key => key && key.trim() !== '');
                        if (hasPlaintextKeys) {
                            summary.plaintext_locations++;
                            issues.push({
                                type: 'profile',
                                profile_name: profile.profile_name,
                                severity: 'critical',
                                description: `Plain text API keys found in profile: ${profile.profile_name}`,
                                affected_providers: Object.keys(profile.settings.apiKeys).filter(k => profile.settings.apiKeys[k] && profile.settings.apiKeys[k].trim() !== '')
                            });
                            console.error(`🚨 Profile ${profile.profile_name}: Found plain text API keys for providers:`, Object.keys(profile.settings.apiKeys).filter(k => profile.settings.apiKeys[k] && profile.settings.apiKeys[k].trim() !== ''));
                        } else {
                            summary.empty_locations++;
                            console.log(`ℹ️ Profile ${profile.profile_name}: API keys object is empty`);
                        }
                    }
                } else {
                    summary.empty_locations++;
                    console.log(`ℹ️ Profile ${profile.profile_name}: No API keys found`);
                }
            }
        }
        
        // Log audit summary
        console.log('🔍 Security audit complete:', {
            total_issues: issues.length,
            summary: summary
        });
        
        return {
            error: null,
            message: issues.length === 0 ? 'No security issues found' : `Found ${issues.length} security issue(s)`,
            issues: issues,
            summary: summary
        };
        
    } catch (err) {
        console.error('🚨 Security audit error:', err);
        return { error: 'Failed to perform security audit', issues: [] };
    }
}

// Security cleanup function to remove all plain text API keys
async function cleanupPlaintextApiKeys() {
    if (isInLocalMode()) {
        return { 
            error: null, 
            message: 'Local mode - no cleanup needed',
            cleanedCount: 0,
            details: []
        };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated' };
        
        let cleanedCount = 0;
        const details = [];
        
        console.log('🧹 Starting security cleanup for user:', user.email);
        
        // Clean user settings
        console.log('🧹 Checking user settings for cleanup...');
        const { data: settingsData, error: settingsError } = await client
            .from('user_settings')
            .select('api_keys')
            .eq('user_id', user.id)
            .single();
        
        if (!settingsError && settingsData?.api_keys && typeof settingsData.api_keys === 'object') {
            const plaintextProviders = Object.keys(settingsData.api_keys).filter(k => settingsData.api_keys[k] && settingsData.api_keys[k].trim() !== '');
            if (plaintextProviders.length > 0) {
                await client
                    .from('user_settings')
                    .update({ api_keys: {} })
                    .eq('user_id', user.id);
                cleanedCount++;
                details.push({
                    location: 'user_settings',
                    providers_cleaned: plaintextProviders
                });
                console.log('🧹 Cleaned plain text API keys from user settings for providers:', plaintextProviders);
            } else {
                console.log('ℹ️ User settings: No plain text API keys to clean');
            }
        } else {
            console.log('ℹ️ User settings: No API keys object found or already encrypted');
        }
        
        // Clean profiles
        console.log('🧹 Checking profiles for cleanup...');
        const { data: profilesData, error: profilesError } = await client
            .from('user_profiles')
            .select('profile_name, settings')
            .eq('user_id', user.id);
        
        if (!profilesError && profilesData) {
            for (const profile of profilesData) {
                console.log(`🧹 Checking profile: ${profile.profile_name}`);
                
                if (profile.settings?.apiKeys && typeof profile.settings.apiKeys === 'object') {
                    const plaintextProviders = Object.keys(profile.settings.apiKeys).filter(k => profile.settings.apiKeys[k] && profile.settings.apiKeys[k].trim() !== '');
                    if (plaintextProviders.length > 0) {
                        const cleanedSettings = { ...profile.settings, apiKeys: {} };
                        await client
                            .from('user_profiles')
                            .update({ settings: cleanedSettings })
                            .eq('user_id', user.id)
                            .eq('profile_name', profile.profile_name);
                        cleanedCount++;
                        details.push({
                            location: `profile:${profile.profile_name}`,
                            providers_cleaned: plaintextProviders
                        });
                        console.log('🧹 Cleaned plain text API keys from profile:', profile.profile_name, 'for providers:', plaintextProviders);
                    } else {
                        console.log(`ℹ️ Profile ${profile.profile_name}: No plain text API keys to clean`);
                    }
                } else {
                    console.log(`ℹ️ Profile ${profile.profile_name}: No API keys object found or already encrypted`);
                }
            }
        }
        
        console.log('🧹 Security cleanup complete:', {
            cleaned_count: cleanedCount,
            details: details
        });
        
        return {
            error: null,
            message: `Security cleanup complete. Cleaned ${cleanedCount} item(s).`,
            cleanedCount: cleanedCount,
            details: details
        };
        
    } catch (err) {
        console.error('🚨 Security cleanup error:', err);
        return { error: 'Failed to perform security cleanup' };
    }
}

// Export the auth functions to window object for use in sidebar.js
window.SupabaseAuth = {
    initializeSupabase,
    getSupabaseClient,
    isInLocalMode,
    enableCloudSync,
    loadSupabaseFromCDN,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getCurrentSession,
    signUpWithOtp,
    signInWithOtp,
    verifyOtp,
    saveUserSettings,
    loadUserSettings,
    resetPassword,
    saveUserProfile,
    loadUserProfiles,
    deleteUserProfile,
    auditDatabaseSecurity,
    cleanupPlaintextApiKeys
};

// Initialize when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔄 Supabase auth functions exposed to window.SupabaseAuth (DOM loaded)');
        initializeSupabase();
    });
} else {
    console.log('🔄 Supabase auth functions exposed to window.SupabaseAuth (DOM ready)');
    initializeSupabase();
} 