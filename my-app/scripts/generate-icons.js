/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons from the source SVG logo.
 * Run with: node scripts/generate-icons.js
 * 
 * Prerequisites: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Icon sizes for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    // Try to import sharp dynamically
    const sharp = require('sharp');
    
    const sourceFile = path.join(__dirname, '../public/webyalaya-main-logo.svg');
    const outputDir = path.join(__dirname, '../public/icons');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('🎨 Generating PWA icons from SVG...\n');

    for (const size of ICON_SIZES) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 22, g: 163, b: 74, alpha: 1 } // Green background #16a34a
        })
        .png()
        .toFile(outputFile);
      
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate Apple touch icon
    const appleTouchIcon = path.join(__dirname, '../public/apple-touch-icon.png');
    await sharp(sourceFile)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 22, g: 163, b: 74, alpha: 1 }
      })
      .png()
      .toFile(appleTouchIcon);
    console.log('✅ Generated: apple-touch-icon.png');

    // Generate favicon
    const favicon = path.join(__dirname, '../public/favicon.png');
    await sharp(sourceFile)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 22, g: 163, b: 74, alpha: 1 }
      })
      .png()
      .toFile(favicon);
    console.log('✅ Generated: favicon.png');

    console.log('\n🎉 All icons generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Optionally create screenshot images for better PWA install experience');
    console.log('2. Screenshots should be placed in public/screenshots/');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('📦 Sharp module not found. Installing...\n');
      console.log('Run: npm install sharp --save-dev');
      console.log('Then run this script again: node scripts/generate-icons.js');
      
      // Create placeholder icons using simple colored squares
      console.log('\n🔄 Creating placeholder icons in the meantime...\n');
      await createPlaceholderIcons();
    } else {
      console.error('Error generating icons:', error);
    }
  }
}

async function createPlaceholderIcons() {
  const outputDir = path.join(__dirname, '../public/icons');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create a simple SVG that can be used as placeholder
  const createSvgIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#16a34a"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">W</text>
</svg>`;

  for (const size of ICON_SIZES) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.svg`);
    fs.writeFileSync(outputFile, createSvgIcon(size));
    console.log(`✅ Created placeholder: icon-${size}x${size}.svg`);
  }

  console.log('\n⚠️  Note: SVG placeholders created. For production, install sharp and run again to generate PNG icons.');
}

generateIcons();

