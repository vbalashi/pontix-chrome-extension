# Pontix Chrome Extension

A Chrome extension for translation with multiple providers and cloud sync capabilities powered by Supabase.

## 📁 Project Structure

```
translate-extension/
├── src/                          # Source code
│   ├── scripts/                  # JavaScript files
│   │   ├── background.js         # Background script
│   │   ├── content.js            # Content script
│   │   ├── sidebar.js            # Sidebar logic
│   │   └── supabase-client.template.js  # Supabase client template
│   ├── styles/                   # CSS files
│   │   └── sidebar.css           # Sidebar styles
│   ├── html/                     # HTML files
│   │   ├── sidebar.html          # Main sidebar
│   │   └── test-*.html           # Test pages
│   └── manifest/                 # Extension manifest
│       └── manifest.json         # Chrome extension manifest
├── docs/                         # Documentation
├── build/                        # Build output (generated)
├── .build/                       # Generated files (gitignored)
│   ├── supabase-client.js        # Generated from template
│   └── supabase.js               # Bundled Supabase library
├── dist/                         # Distribution packages
├── icons/                        # Extension icons
├── graphics/                     # Graphics working directory (gitignored)
├── node_modules/                 # Dependencies (gitignored)
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment template
├── package.json                  # Node.js configuration
├── build-extension.sh            # Build script
├── build-supabase.js             # Supabase build script
└── .gitignore                    # Git ignore rules
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Clone the repository
git clone <repository-url>
cd translate-extension

# Install dependencies
npm install

# Setup environment variables
npm run setup
# Then edit .env file with your Supabase credentials
```

### 2. Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing one
3. Go to Settings > API
4. Copy your Project URL and anon/public key
5. Update `.env` file:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Build and Package

**RECOMMENDED**: Use the complete build command:
```bash
npm run package
```

**Alternative**: Step by step:
```bash
npm run build    # Build Supabase client
./build-extension.sh  # Package extension
```

### 4. Load in Chrome

1. Open Chrome Extensions (`chrome://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build/` directory

## Permissions

The extension requires host permissions for translation APIs as well as Google
Books reader pages:

- `https://play.google.com/*`
- `https://books.googleusercontent.com/*`

## 📝 Available Scripts

- `npm run build` - Build Supabase client from template
- `npm run package` - **Complete build and package** (recommended)
- `npm run dev` - Build and package in one command
- `npm run clean` - Clean build artifacts
- `npm run setup` - Setup environment configuration
- `npm test` - Run tests

## 🔧 Build Process Explained

### What should you run?

**✅ RECOMMENDED**: `npm run package`
- This is the complete command that handles everything
- Loads environment variables from `.env` file automatically
- Generates Supabase files and packages the extension

**Alternative**: `./build-extension.sh` 
- Only packages the extension (requires previous build)
- Use this if you only want to re-package without rebuilding Supabase files

### Build Steps

1. **Supabase Client Generation** (`npm run build`)
   - Loads environment variables from `.env` file using `dotenv`
   - Reads `src/scripts/supabase-client.template.js`
   - Replaces `__SUPABASE_URL__` and `__SUPABASE_ANON_KEY__` placeholders
   - Generates `supabase-client.js` in `.build/` directory
   - Copies Supabase library to `.build/supabase.js`

2. **Extension Packaging** (`./build-extension.sh`)
   - Copies source files from `src/` to `build/`
   - Includes generated files from `.build/`
   - Creates production-ready extension in `build/` directory

## 🔒 Security & File Organization

**Generated Files**: 
- ✅ Stored in `.build/` directory (gitignored)
- ✅ Keeps root directory clean
- ✅ No credentials exposed in version control

**Environment Variables**:
- ✅ Automatically loaded from `.env` file
- ✅ Validated before build process
- ✅ Template system prevents credential exposure

**Extension Runtime Baseline**:
- `AGENTS.md` and `ARCHITECTURE.md` define source ownership and safe-change
  boundaries.
- Selected page text is transported through ephemeral extension session storage
  and consumed by the side panel; it is not persisted in sync/local storage.
- Provider API keys are local-only secrets and are not written to
  `chrome.storage.sync`.
- Pontix Supabase auth is separate from the future 2000NL Connected Client
  identity.

## 📦 Distribution

Built packages are stored in `dist/` directory:
- `*.zip` files for Chrome Web Store
- `*.tar.gz` files for distribution

## 🤝 Contributing

1. Follow the existing code structure
2. Update documentation for any new features
3. Test thoroughly before submitting
4. Ensure build process works correctly

## 📄 License

ISC License - see package.json for details.
