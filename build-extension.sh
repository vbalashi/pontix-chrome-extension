#!/bin/bash

# Chrome Extension Build Script
echo "🔧 Building Chrome Extension..."

# Create build directory
rm -rf build/
mkdir -p build/

# Copy essential files only
echo "📁 Copying essential files..."
cp src/manifest.json build/
cp src/background.js build/
cp src/content.js build/
cp src/sidebar.html build/
cp src/sidebar.css build/
cp src/sidebar.js build/
cp src/supabase-client.js build/

# Copy the bundled Supabase library
if [ -f "src/supabase.js" ]; then
    cp src/supabase.js build/
    echo "✅ Bundled Supabase library included"
else
    echo "⚠️  supabase.js not found - run 'npm run build' first"
fi

# Copy icons directory
cp -r src/icons/ build/ 2>/dev/null || echo "⚠️  Icons directory not found"

echo "✅ Extension built successfully in build/ directory"
echo "📊 Build size:"
du -sh build/
echo ""
echo "🚀 Ready to load in Chrome Developer Mode:"
echo "   1. Open Chrome Extensions (chrome://extensions/)"
echo "   2. Enable Developer Mode"
echo "   3. Click 'Load unpacked' and select the 'build' directory" 