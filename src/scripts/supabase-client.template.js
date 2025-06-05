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

// New function to handle email verification with OTP
async function verifyEmailOtp(email, token) {
    if (isInLocalMode()) {
        return { error: 'Cloud sync not available. Extension running in local mode.' };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data, error } = await client.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
        });
        
        if (error) {
            console.error('Email verification error:', error);
            return { error: error.message };
        }
        
        console.log('Email verification successful:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Email verification exception:', err);
        return { error: 'Email verification failed' };
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
        const { data, error } = await client.auth.verifyOtp({
            email: email,
            token: token,
            type: type
        });
        
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

async function getCurrentUser() {
    if (isInLocalMode()) {
        return { data: { user: null }, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { data: { user: null }, error: 'Supabase client not available' };
    
    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error) {
            console.error('Get user error:', error);
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
            console.error('Get session error:', error);
            return { data: { session: null }, error: error.message };
        }
        
        return { data: { session }, error: null };
    } catch (err) {
        console.error('Get session exception:', err);
        return { data: { session: null }, error: 'Failed to get session' };
    }
}

// Data storage functions with local mode fallback
async function saveUserSettings(settings) {
    if (isInLocalMode()) {
        console.log('📱 Local mode: Settings saved locally only');
        return { data: null, error: null };
    }
    
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: 'User not authenticated' };
        
        const settingsData = {
            user_id: user.id,
            max_word_count: settings.maxWordCount,
            debug_selection: settings.debugSelection,
            default_target_language: settings.defaultTargetLanguage,
            layout_mode: settings.layoutMode,
            enabled_providers: settings.enabledProviders,
            api_keys: settings.apiKeys,
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

async function loadUserSettings() {
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
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Load settings error:', error);
            return { error: error.message };
        }
        
        return { data, error: null };
    } catch (err) {
        console.error('Load settings exception:', err);
        return { error: 'Failed to load settings' };
    }
}

async function saveUserProfile(profileName, profileSettings, isCurrent = false) {
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
        
        const profileData = {
            user_id: user.id,
            profile_name: profileName,
            settings: profileSettings,
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

async function loadUserProfiles() {
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
    verifyEmailOtp,
    saveUserSettings,
    loadUserSettings,
    saveUserProfile,
    loadUserProfiles,
    deleteUserProfile
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