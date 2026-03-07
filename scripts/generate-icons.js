const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgBuffer = fs.readFileSync(path.join(__dirname, '../src/assets/icon.svg'));

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, '../src/public/icon');

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `${size}.png`));
    console.log(`Generated ${size}.png`);
  }
  console.log('All icons generated!');
}

generateIcons().catch(console.error);
