// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');

console.log('🔄 Building Supabase library for Chrome extension...');

// Create .build directory for generated files
const buildDir = path.join(__dirname, '.build');
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
    console.log('📁 Created .build directory for generated files');
}

// Generate supabase-client.js from template using environment variables
const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY environment variables are missing.');
    console.log('💡 Create a .env file with your Supabase credentials or set environment variables');
    console.log('   SUPABASE_URL=your_supabase_url');
    console.log('   SUPABASE_ANON_KEY=your_supabase_anon_key');
    console.log('');
    console.log('📁 Expected .env file location: ' + path.join(__dirname, '.env'));
    process.exit(1);
}

console.log('✅ Environment variables loaded from .env file');

const templatePath = path.join(__dirname, 'src', 'scripts', 'supabase-client.template.js');
const clientDestPath = path.join(buildDir, 'supabase-client.js');

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
    
    // Destination path in the .build directory
    const destPath = path.join(buildDir, 'supabase.js');
    
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
            console.log('💡 Try running: npm install');
            process.exit(1);
        }
    } else {
        // Copy the file
        fs.copyFileSync(sourcePath, destPath);
        console.log('✅ Supabase library copied successfully');
    }
    
    // Update manifest to include the bundled library
    const manifestPath = path.join(__dirname, 'src', 'manifest', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Add supabase.js to web accessible resources if not already there
    const resources = manifest.web_accessible_resources[0].resources;
    if (!resources.includes('supabase.js')) {
        resources.push('supabase.js');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('✅ Updated manifest.json to include supabase.js');
    }
    
    console.log('🎉 Build complete! Generated files saved to .build/ directory');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
} 