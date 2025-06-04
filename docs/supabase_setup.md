# Supabase Setup Guide for Chrome Pontix Extension

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" 
3. Sign up/Login with GitHub (recommended)
4. Click "New project"
5. Choose your organization
6. Fill in project details:
   - Name: "chrome-translator"
   - Database password: (generate a strong password)
   - Region: Choose closest to your users
7. Click "Create new project"
8. Wait for project setup (2-3 minutes)

## 2. Database Schema

After your project is ready, go to the SQL Editor and run these commands to create the necessary tables:

```sql
-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create profiles table to store user translation profiles
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_name VARCHAR(255) NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, profile_name)
);

-- Create user_settings table for global user preferences
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    max_word_count INTEGER DEFAULT 25,
    default_target_language VARCHAR(10) DEFAULT 'ru',
    enabled_providers JSONB DEFAULT '{}',
    api_keys JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profiles" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 3. Enable Authentication

1. Go to Authentication > Settings in your Supabase dashboard
2. Enable Email authentication (it's enabled by default)
3. Optionally enable other providers (Google, GitHub, etc.)
4. Configure email templates if needed
5. Set Site URL to your extension's origin (we'll handle this in code)

### Configure Email Templates for Chrome Extension

**Important**: Chrome extensions require special email template configuration to avoid redirect issues.

1. Go to Authentication > Email Templates in your Supabase dashboard
2. For the **Magic Link** template, modify it to use OTP instead:

```html
<h2>Confirm your account</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 36px; color: #1a73e8; text-align: center; letter-spacing: 4px;">{{ .Token }}</h1>
<p>This code will expire in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

3. For the **Invite User** template (if using invitations):

```html
<h2>You have been invited</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 36px; color: #1a73e8; text-align: center; letter-spacing: 4px;">{{ .Token }}</h1>
<p>This code will expire in 1 hour.</p>
```

4. For the **Reset Password** template:

```html
<h2>Reset your password</h2>
<p>Your password reset code is:</p>
<h1 style="font-size: 36px; color: #1a73e8; text-align: center; letter-spacing: 4px;">{{ .Token }}</h1>
<p>This code will expire in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

**Why use OTP for Chrome Extensions?**
- Email confirmation links redirect to web URLs, which don't work in Chrome extensions
- OTP codes can be entered directly in the extension UI
- More secure and user-friendly for extension environments

## 4. Get Project Credentials

1. Go to Settings > API in your Supabase dashboard
2. Copy the following values (you'll need them in the extension):
   - Project URL
   - Project API Key (anon/public key)

## 5. Data Structure Explanation

### user_settings table:
- Stores global settings that apply across all profiles
- max_word_count: Maximum words to translate
- default_target_language: Default language code
- enabled_providers: JSON object of provider enable/disable states
- api_keys: JSON object storing API keys (encrypted)

### user_profiles table:
- Stores individual translation profiles
- profile_name: Name of the profile
- is_current: Boolean indicating if this is the active profile
- settings: JSON object containing profile-specific settings:
  ```json
  {
    "translationBoxes": [
      {
        "provider": "google",
        "targetLanguage": "ru",
        "model": "gpt-4" // for AI providers
      }
    ]
  }
  ```

## 6. Security Features

- Row Level Security (RLS) ensures users can only access their own data
- API keys are stored as JSON and can be encrypted
- All operations require user authentication
- Automatic timestamp tracking for created_at and updated_at

## Next Steps

After completing this setup:
1. Install Supabase client in your extension
2. Implement authentication UI
3. Create sync functions for settings and profiles
4. Test the integration

Keep your Project URL and API key secure - you'll need them for the extension integration. 