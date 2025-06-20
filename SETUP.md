# 🚀 Development Setup Guide

This guide helps you set up the Chrome extension project on a new machine after syncing via Syncthing.

## ✅ Prerequisites

1. **Node.js** (v14 or higher)
   ```bash
   # Check version
   node --version
   npm --version
   ```

2. **Chrome/Chromium browser** for testing

## 🔧 Initial Setup

### 1. Install Dependencies
```bash
# Navigate to project directory
cd translate-extension

# Install all dependencies from package.json
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env  # or use your preferred editor
```

### 3. Build the Extension
```bash
# Build Supabase client
npm run build

# Package the extension
npm run package
```

## 📁 What Gets Synced vs Generated

### ✅ Synced Files (Source Code)
- `src/` - All source code
- `package.json` - Dependency definitions
- `docs/` - Documentation
- `icons/` - Extension icons
- `README.md`, `SECURITY.md` - Project docs
- Build scripts: `build-*.js`, `*.sh`

### 🚫 NOT Synced (Generated/Machine-Specific)
- `node_modules/` - **NEVER sync this!** (Use `npm install`)
- `package-lock.json` - Lock file (generated)
- `build/`, `.build/`, `dist/` - Build outputs
- `.env` - Environment variables (machine-specific)
- IDE files (`.vscode/`, `.cursor/`, etc.)
- OS files (`.DS_Store`, `Thumbs.db`)

## 🛠️ Development Workflow

```bash
# Clean build
npm run clean

# Development build
npm run dev

# Test the extension
# Load unpacked extension from build/ folder in Chrome

# Create distribution package
npm run package
```

## 🔍 Troubleshooting

### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules/
npm install
```

### Build Issues
```bash
# Clean all build artifacts
npm run clean

# Rebuild everything
npm run dev
```

### Permissions Issues (Linux/Mac)
```bash
# Make build scripts executable
chmod +x build-extension.sh
chmod +x test-build.sh
```

## 📦 Project Structure

```
translate-extension/
├── src/                    # 🔄 Source code (synced)
│   ├── html/              # Extension pages
│   ├── scripts/           # JavaScript files
│   ├── styles/            # CSS files
│   └── manifest/          # Extension manifest
├── docs/                  # 🔄 Documentation (synced)
├── icons/                 # 🔄 Extension icons (synced)
├── package.json           # 🔄 Dependencies (synced)
├── build-*.js             # 🔄 Build scripts (synced)
├── node_modules/          # ❌ Dependencies (NOT synced)
├── build/                 # ❌ Build output (NOT synced)
├── .env                   # ❌ Environment (NOT synced)
└── dist/                  # ❌ Packages (NOT synced)
```

## 🔒 Security Notes

- Never commit `.env` files
- API keys should be in `.env` only
- Use different Supabase projects for dev/prod
- Test in Chrome incognito mode

## 🤝 Team Development

1. **Sync only source code** via Syncthing
2. **Each developer runs** `npm install` locally
3. **Share environment templates** (`.env.example`)
4. **Coordinate build script changes** in `package.json`
5. **Test builds independently** on each machine 