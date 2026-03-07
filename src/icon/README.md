# Extension Icons

Place your extension icons here with the following sizes:

- `16.png` - 16x16 pixels (toolbar icon)
- `32.png` - 32x32 pixels (toolbar icon retina)
- `48.png` - 48x48 pixels (extension management page)
- `128.png` - 128x128 pixels (Chrome Web Store)

You can generate these from the SVG in `src/assets/icon.svg` using:

1. Online converters like [cloudconvert.com](https://cloudconvert.com/svg-to-png)
2. Design tools like Figma, Sketch, or Adobe Illustrator
3. Command line tools like ImageMagick:
   ```bash
   convert -background none icon.svg -resize 16x16 icon/16.png
   convert -background none icon.svg -resize 32x32 icon/32.png
   convert -background none icon.svg -resize 48x48 icon/48.png
   convert -background none icon.svg -resize 128x128 icon/128.png
   ```

The icon should use the ChatGPT green color (#10a37f) with a white symbol.
