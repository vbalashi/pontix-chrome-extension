const fs = require('fs');
const path = require('path');

console.log('🔄 Building Supabase library for Chrome extension...');

// Generate supabase-client.js from template using environment variables
const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY environment variables are missing.');
    process.exit(1);
}

const templatePath = path.join(__dirname, 'supabase-client.template.js');
const clientDestPath = path.join(__dirname, 'supabase-client.js');

try {
    let clientContent = fs.readFileSync(templatePath, 'utf8');
    clientContent = clientContent
        .replace('__SUPABASE_URL__', url)
        .replace('__SUPABASE_ANON_KEY__', anonKey);
    fs.writeFileSync(clientDestPath, clientContent);
    console.log('✅ Generated supabase-client.js from template');
} catch (err) {
    console.error('❌ Failed to generate supabase-client.js:', err.message);
    process.exit(1);
}

try {
    // Source path of the Supabase UMD build (corrected path)
    const sourcePath = path.join(__dirname, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
    
    // Destination path in the extension
    const destPath = path.join(__dirname, 'supabase.js');
    
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
    const manifestPath = path.join(__dirname, 'manifest.json');
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