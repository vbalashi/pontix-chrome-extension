const fs = require('fs');
const path = require('path');

console.log('🔄 Building Supabase library for Chrome extension...');

try {
    // Source path of the Supabase UMD build (corrected path)
    const sourcePath = path.join(__dirname, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
    
    // Destination path in the extension
    const destPath = path.join(__dirname, 'src', 'supabase.js');
    
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
        console.error('❌ Supabase UMD build not found at:', sourcePath);
        console.log('💡 Trying alternative path...');
        
        // Try alternative path structure
        const altSourcePath = path.join(__dirname, 'node_modules', '@supabase', 'supabase-js', 'dist', 'main', 'index.js');
        if (fs.existsSync(altSourcePath)) {
            fs.copyFileSync(altSourcePath, destPath);
            console.log('✅ Supabase library copied from alternative path');
        } else {
            console.error('❌ Could not find Supabase library in node_modules');
            process.exit(1);
        }
    } else {
        // Copy the file
        fs.copyFileSync(sourcePath, destPath);
        console.log('✅ Supabase library copied successfully');
    }
    
    // Update manifest to include the bundled library
    const manifestPath = path.join(__dirname, 'src', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Add supabase.js to web accessible resources if not already there
    const resources = manifest.web_accessible_resources[0].resources;
    if (!resources.includes('supabase.js')) {
        resources.push('supabase.js');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('✅ Updated manifest.json to include supabase.js');
    }
    
    console.log('🎉 Build complete! Supabase library is now bundled with the extension.');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
} 