const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJson = require('../package.json');
const version = packageJson.version;
const [major, minor, patch] = version.split('.').map(Number);

// Calculate versionCode (e.g., 1.2.3 = 10203)
const versionCode = major * 10000 + minor * 100 + patch;

console.log(`\n🔄 Synchronizing versions to ${version} (code: ${versionCode})\n`);

// Update Android build.gradle
try {
  const androidBuildGradle = path.join(__dirname, '../android/app/build.gradle');
  
  if (fs.existsSync(androidBuildGradle)) {
    let androidContent = fs.readFileSync(androidBuildGradle, 'utf8');
    
    androidContent = androidContent.replace(
      /versionCode \d+/,
      `versionCode ${versionCode}`
    );
    
    androidContent = androidContent.replace(
      /versionName "[^"]+"/,
      `versionName "${version}"`
    );
    
    fs.writeFileSync(androidBuildGradle, androidContent);
    console.log('✓ Updated Android version');
  } else {
    console.log('⚠ Android build.gradle not found - run: npx cap add android');
  }
} catch (error) {
  console.error('✗ Failed to update Android version:', error.message);
}

// Update iOS Info.plist
try {
  const iosInfoPlist = path.join(__dirname, '../ios/App/App/Info.plist');
  
  if (fs.existsSync(iosInfoPlist)) {
    let iosContent = fs.readFileSync(iosInfoPlist, 'utf8');
    
    iosContent = iosContent.replace(
      /<key>CFBundleShortVersionString<\/key>\s*<string>[^<]+<\/string>/,
      `<key>CFBundleShortVersionString</key>\n\t<string>${version}</string>`
    );
    
    iosContent = iosContent.replace(
      /<key>CFBundleVersion<\/key>\s*<string>[^<]+<\/string>/,
      `<key>CFBundleVersion</key>\n\t<string>${versionCode}</string>`
    );
    
    fs.writeFileSync(iosInfoPlist, iosContent);
    console.log('✓ Updated iOS version');
  } else {
    console.log('⚠ iOS Info.plist not found - run: npx cap add ios');
  }
} catch (error) {
  console.error('✗ Failed to update iOS version:', error.message);
}

// Update capacitor.config.ts
try {
  const capacitorConfig = path.join(__dirname, '../capacitor.config.ts');
  
  if (fs.existsSync(capacitorConfig)) {
    let capacitorContent = fs.readFileSync(capacitorConfig, 'utf8');
    
    // Add version if not exists
    if (!capacitorContent.includes('version:')) {
      capacitorContent = capacitorContent.replace(
        /appId: '[^']+'/,
        `appId: 'me.medicamenta.app',\n  version: '${version}'`
      );
    } else {
      capacitorContent = capacitorContent.replace(
        /version: '[^']+'/,
        `version: '${version}'`
      );
    }
    
    fs.writeFileSync(capacitorConfig, capacitorContent);
    console.log('✓ Updated Capacitor config');
  }
} catch (error) {
  console.error('✗ Failed to update Capacitor config:', error.message);
}

console.log('\n✅ All versions synchronized!\n');
console.log(`Version: ${version}`);
console.log(`Version Code: ${versionCode}\n`);
