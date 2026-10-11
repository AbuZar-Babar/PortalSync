# Building FlowMind Worker for macOS (Intel x64)

This guide documents how to package **FlowMind Worker** for macOS Intel machines (`x64` / `darwin-x64`).

---

## 1. Prerequisites

- **Environment**: macOS (Intel or Apple Silicon) or macOS CI runner (e.g. GitHub Actions `macos-13` Intel).
  *Note*: Modern `electron-builder` requires macOS to build `.dmg` and `.app` bundles because of macOS-specific HFS+/APFS filesystem tools and symlink preservation.
- **Node.js**: Version 18.x or 20.x+
- **npm**: Version 9.x or 10.x+

---

## 2. Configuration Overview

The packaging configuration in [`apps/desktop/package.json`](./package.json) is pre-configured for Intel macOS:

```json
"mac": {
  "icon": "assets/icon.icns",
  "category": "public.app-category.business",
  "target": [
    {
      "target": "dmg",
      "arch": ["x64"]
    },
    {
      "target": "zip",
      "arch": ["x64"]
    }
  ],
  "hardenedRuntime": false,
  "gatekeeperAssess": false,
  "darkModeSupport": true,
  "artifactName": "FlowMind-Worker-${version}-mac-x64.${ext}"
},
"dmg": {
  "title": "FlowMind Worker 1.0.0 (Intel x64)",
  "artifactName": "FlowMind-Worker-Setup-${version}-mac-x64.${ext}",
  "contents": [
    { "x": 130, "y": 220 },
    { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
  ]
}
```

- **`arch: ["x64"]`**: Explicitly targets 64-bit Intel x86_64 architecture (`darwin-x64`).
- **`target: ["dmg", "zip"]`**: Generates both an interactive disk image installer (`.dmg`) and a standalone compressed bundle (`.zip`).
- **`assets/icon.icns`**: High-resolution multi-size Apple Icon Image.
- **`schemes: ["flowmind", "portalsync"]`**: Protocol schemes for deep-link activation.

---

## 3. Build Commands

### From Desktop App Directory (`apps/desktop`):

```bash
cd apps/desktop

# Install dependencies if not already done
npm install

# Build both DMG installer and ZIP archive for Intel Mac (x64)
npm run build:mac

# Or build specifically DMG only:
npm run build:mac:dmg

# Or build specifically ZIP only:
npm run build:mac:zip
```

### From Repository Root:

```bash
# Build macOS Intel package from repo root
npm run desktop:build:mac
```

---

## 4. Expected Output Artifacts

Upon running `npm run build:mac` on macOS:
- `dist/FlowMind-Worker-Setup-1.0.0-mac-x64.dmg` (~90 MB) — Drag-to-Applications installer
- `dist/FlowMind-Worker-1.0.0-mac-x64.zip` (~80 MB) — Portable standalone zip archive
- `dist/mac/FlowMind Worker.app` — Raw application bundle

---

## 5. Gatekeeper & Unsigned App Execution on macOS

If distributing without an Apple Developer Team ID and notarization certificate:
1. When double-clicking on macOS, Gatekeeper may flag: *"FlowMind Worker cannot be opened because Apple cannot check it for malicious software."*
2. **User Solution 1**: Right-click (or Control-click) `FlowMind Worker.app` in `/Applications` and click **Open**, then confirm **Open**.
3. **User Solution 2 (Terminal)**: Strip quarantine attribute:
   ```bash
   xattr -cr "/Applications/FlowMind Worker.app"
   ```

---

## 6. Automated GitHub Actions CI (One-Click Build)

To build macOS Intel without having a physical Mac, use the included GitHub Actions workflow [`.github/workflows/build-desktop.yml`](../../.github/workflows/build-desktop.yml).
It runs on GitHub's Intel runner (`macos-13`), builds the `.dmg` and `.zip` artifacts, and uploads them to the GitHub Actions run summary.
