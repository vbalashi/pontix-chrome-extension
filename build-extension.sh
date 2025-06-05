#!/bin/bash

# Chrome Extension Build Script
echo "🔧 Building Chrome Extension..."

# Create build directory
rm -rf build/
mkdir -p build/

# Copy essential files from src directory
echo "📁 Copying essential files..."
cp src/manifest/manifest.json build/
cp src/scripts/background.js build/
cp src/scripts/content.js build/
cp src/html/sidebar.html build/
cp src/styles/sidebar.css build/
cp src/scripts/sidebar.js build/

# Copy the generated supabase-client.js (from .build directory)
if [ -f ".build/supabase-client.js" ]; then
    cp .build/supabase-client.js build/
    echo "✅ Generated Supabase client included"
else
    echo "⚠️  supabase-client.js not found in .build/ - run 'npm run build' first"
fi

# Copy the bundled Supabase library (from .build directory)
if [ -f ".build/supabase.js" ]; then
    cp .build/supabase.js build/
    echo "✅ Bundled Supabase library included"
else
    echo "⚠️  supabase.js not found in .build/ - run 'npm run build' first"
fi

# Copy icons directory
if [ -d "icons" ]; then
    cp -r icons build/
    echo "✅ Icons directory copied"
else
    echo "⚠️  Icons directory not found"
fi

echo "✅ Extension built successfully in build/ directory"
echo "📊 Build size:"
du -sh build/

# Create distribution zip automatically
echo ""
echo "📦 Creating distribution package..."
mkdir -p dist/
cd build/
zip -r ../dist/pontix-extension.zip . > /dev/null
cd ..
echo "✅ Created dist/pontix-extension.zip"

echo ""
echo "🚀 Ready to load in Chrome Developer Mode:"
echo "   1. Open Chrome Extensions (chrome://extensions/)"
echo "   2. Enable Developer Mode"
echo "   3. Click 'Load unpacked' and select the 'build' directory"
echo ""
echo "📤 Ready for Chrome Web Store:"
echo "   Upload: dist/pontix-extension.zip" 