#!/bin/bash

echo "🔄 Building Pontix Chrome Extension..."

# Create build directory structure
rm -rf build
mkdir -p build
mkdir -p build/html
mkdir -p build/styles
mkdir -p build/icons

echo "📁 Created build directory structure"

# Copy manifest
cp src/manifest/manifest.json build/
echo "✅ Copied manifest.json"

# Copy HTML files
cp src/html/* build/html/
echo "✅ Copied HTML files"

# Copy CSS files
cp src/styles/* build/styles/
echo "✅ Copied CSS files"

# Copy icons
cp icons/* build/icons/
echo "✅ Copied icons"

# Copy scripts to build root (for side panel access)
cp src/scripts/content.js build/
cp src/scripts/background.js build/
cp src/scripts/sidebar.js build/
echo "✅ Copied script files to build root"

# Copy Supabase files from .build directory to build root (if they exist)
if [ -f ".build/supabase.js" ]; then
    cp .build/supabase.js build/
    echo "✅ Copied supabase.js"
else
    echo "⚠️  supabase.js not found - run npm run build:supabase first"
fi

if [ -f ".build/supabase-client.js" ]; then
    cp .build/supabase-client.js build/
    echo "✅ Copied supabase-client.js"
else
    echo "⚠️  supabase-client.js not found - run npm run build:supabase first"
fi

echo "🎉 Build complete! Extension files are in ./build/"
echo ""
echo "📋 To install:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the ./build/ folder"
echo ""
echo "💡 Remember to run 'npm run build:supabase' if you need cloud sync features" 