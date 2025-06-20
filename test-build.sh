#!/bin/bash

echo "🧪 Testing Pontix Extension Build Process..."

# First run the Supabase build
echo "1️⃣ Building Supabase library..."
node build-supabase.js
if [ $? -ne 0 ]; then
    echo "❌ Supabase build failed"
    exit 1
fi

# Then run the extension build
echo "2️⃣ Building extension..."
./build-extension.sh
if [ $? -ne 0 ]; then
    echo "❌ Extension build failed"
    exit 1
fi

# Verify build structure
echo "3️⃣ Verifying build structure..."

required_files=(
    "build/manifest.json"
    "build/background.js" 
    "build/content.js"
    "build/sidebar.js"
    "build/html/sidebar.html"
    "build/styles/sidebar.css"
    "build/icons/pontix_icon_16.png"
)

all_good=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        all_good=false
    fi
done

# Check optional Supabase files
optional_files=(
    "build/supabase.js"
    "build/supabase-client.js"
)

for file in "${optional_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file (optional)"
    else
        echo "⚠️  Missing optional: $file"
    fi
done

if [ "$all_good" = true ]; then
    echo ""
    echo "🎉 Build verification complete! Extension is ready."
    echo ""
    echo "📋 Next steps:"
    echo "1. Open Chrome and go to chrome://extensions/"
    echo "2. Enable Developer mode" 
    echo "3. Click 'Load unpacked' and select the ./build/ folder"
    echo ""
    echo "💡 To test: Select some text on any webpage and click the extension icon"
else
    echo ""
    echo "❌ Build verification failed. Please fix the missing files."
    exit 1
fi 