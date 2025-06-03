// Supabase client configuration for Chrome Extension
// Import this file in content scripts and other extension files

// Import Supabase (we'll load this as a module)
// Note: In a Chrome extension, you need to load external libraries properly
// The actual import will be handled in the HTML files or through a bundler

// Supabase configuration
const SUPABASE_CONFIG = {
    // Replace these with your actual Supabase project values
    // Get these from your Supabase dashboard: Settings > API
    url: 'https://iyfwymlzdwtqruibeujc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Znd5bWx6ZHd0cXJ1aWJldWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODcyNzYsImV4cCI6MjA2NDQ2MzI3Nn0.Cb1ouxrsNwr52jPH2F-DdbLzymlEiG4uXtnb5VVqlEg',
    
    // ✅ Configuration completed with your Supabase project credentials
};

// Initialize Supabase client
let supabaseClient = null;

// Initialize the Supabase client
function initializeSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Make sure to include it in your HTML files.');
        return null;
    }
    
    if (!supabaseClient) {
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
        
        console.log('Supabase client initialized');
    }
    
    return supabaseClient;
}

// Get the current Supabase client instance
function getSupabaseClient() {
    if (!supabaseClient) {
        return initializeSupabase();
    }
    return supabaseClient;
}

// Authentication functions
async function signUp(email, password) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    try {
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
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

async function signOut() {
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
    const client = getSupabaseClient();
    if (!client) return null;
    
    try {
        const { data: { user }, error } = await client.auth.getUser();
        
        if (error) {
            console.error('Get user error:', error);
            return null;
        }
        
        return user;
    } catch (err) {
        console.error('Get user exception:', err);
        return null;
    }
}

async function getCurrentSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    
    try {
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error) {
            console.error('Get session error:', error);
            return null;
        }
        
        return session;
    } catch (err) {
        console.error('Get session exception:', err);
        return null;
    }
}

// Database functions for user settings
async function saveUserSettings(settings) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };
    
    try {
        const { data, error } = await client
            .from('user_settings')
            .upsert({
                user_id: user.id,
                max_word_count: settings.maxWordCount,
                default_target_language: settings.defaultTargetLanguage,
                enabled_providers: settings.enabledProviders,
                api_keys: settings.apiKeys,
            }, {
                onConflict: 'user_id'
            });
        
        if (error) {
            console.error('Save user settings error:', error);
            return { error: error.message };
        }
        
        console.log('User settings saved:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Save user settings exception:', err);
        return { error: 'Failed to save settings' };
    }
}

async function loadUserSettings() {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };
    
    try {
        const { data, error } = await client
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Load user settings error:', error);
            return { error: error.message };
        }
        
        console.log('User settings loaded:', data);
        return { data: data || null, error: null };
    } catch (err) {
        console.error('Load user settings exception:', err);
        return { error: 'Failed to load settings' };
    }
}

// Database functions for user profiles
async function saveUserProfile(profileName, profileSettings, isCurrent = false) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };
    
    try {
        // If this is the current profile, unset other current profiles
        if (isCurrent) {
            await client
                .from('user_profiles')
                .update({ is_current: false })
                .eq('user_id', user.id);
        }
        
        const { data, error } = await client
            .from('user_profiles')
            .upsert({
                user_id: user.id,
                profile_name: profileName,
                is_current: isCurrent,
                settings: profileSettings,
            }, {
                onConflict: 'user_id,profile_name'
            });
        
        if (error) {
            console.error('Save user profile error:', error);
            return { error: error.message };
        }
        
        console.log('User profile saved:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Save user profile exception:', err);
        return { error: 'Failed to save profile' };
    }
}

async function loadUserProfiles() {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };
    
    try {
        const { data, error } = await client
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Load user profiles error:', error);
            return { error: error.message };
        }
        
        console.log('User profiles loaded:', data);
        return { data: data || [], error: null };
    } catch (err) {
        console.error('Load user profiles exception:', err);
        return { error: 'Failed to load profiles' };
    }
}

async function deleteUserProfile(profileName) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase client not available' };
    
    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };
    
    try {
        const { data, error } = await client
            .from('user_profiles')
            .delete()
            .eq('user_id', user.id)
            .eq('profile_name', profileName);
        
        if (error) {
            console.error('Delete user profile error:', error);
            return { error: error.message };
        }
        
        console.log('User profile deleted:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Delete user profile exception:', err);
        return { error: 'Failed to delete profile' };
    }
}

// Expose functions to window object for use in other scripts
window.SupabaseAuth = {
    initializeSupabase,
    getSupabaseClient,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getCurrentSession,
    saveUserSettings,
    loadUserSettings,
    saveUserProfile,
    loadUserProfiles,
    deleteUserProfile
};

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Supabase auth functions exposed to window.SupabaseAuth');
    initializeSupabase();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔄 Supabase auth functions exposed to window.SupabaseAuth (DOM loaded)');
        initializeSupabase();
    });
} else {
    console.log('🔄 Supabase auth functions exposed to window.SupabaseAuth (DOM ready)');
    initializeSupabase();
} 