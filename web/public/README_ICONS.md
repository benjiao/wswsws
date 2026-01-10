# Icon Setup Guide

This app requires the following icon files to be placed in the `/public` directory:

## Required Icon Files

1. **favicon-16x16.png** - Standard favicon (16x16px)
2. **favicon-32x32.png** - Standard favicon (32x32px)
3. **apple-touch-icon.png** - iOS home screen icon (180x180px)
4. **icon-192x192.png** - Android/Chrome icon (192x192px)
5. **icon-512x512.png** - Android/Chrome icon (512x512px)

## Icon Design Guidelines

### For Best Results:
- Use a simple, recognizable design (e.g., paw print, cat silhouette)
- Ensure icons work well at small sizes (16x16)
- Use solid colors or high contrast
- Leave some padding (10-15% margin) around the icon
- For Android maskable icons, keep important content within the safe zone (80% of the icon)

### Color Recommendations:
- Background: White or your brand color
- Icon: Dark color (#333 or brand color) for visibility
- Consider creating versions for light/dark mode if needed

## Creating Icons

### Option 1: Online Tools
- Use tools like https://realfavicongenerator.net/ or https://favicon.io/
- Upload a single high-resolution image (at least 512x512px)
- Generate all required sizes automatically

### Option 2: Design Software
- Create a 512x512px master icon
- Export at the required sizes
- Ensure PNG format with transparency if needed

### Option 3: SVG to PNG
- Create an SVG icon
- Convert to PNG at required sizes using tools like:
  - ImageMagick: `convert icon.svg -resize 192x192 icon-192x192.png`
  - Online converters

## Testing

After adding icons:
1. Clear browser cache
2. Test in different browsers (Chrome, Safari, Firefox)
3. Test on Android device: Add to Home Screen
4. Test on iOS device: Add to Home Screen
5. Check browser tab favicon appears

## File Structure

```
/public
  ├── favicon-16x16.png
  ├── favicon-32x32.png
  ├── apple-touch-icon.png
  ├── icon-192x192.png
  ├── icon-512x512.png
  └── manifest.json (already created)
```
