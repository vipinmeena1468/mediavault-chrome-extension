# MediaVault – Chrome Media Extractor

MediaVault is a Chrome extension that extracts images, videos, audio files, and CSS background media from any webpage.

It allows bulk selection and ZIP download for faster media collection.

---

## Features

- Extracts:
  - <img> images (including srcset)
  - <video> media
  - <audio> media
  - <source> elements
  - CSS background images
  - Media links from <a> tags

- Deduplicates media URLs
- Bulk download as ZIP
- Copy media URLs instantly
- Clean dark UI
- Built using Chrome Manifest V3

---

## Installation

1. Click the green "Code" button
2. Click "Download ZIP"
3. Extract the downloaded ZIP file
4. Open Chrome and go to:

   chrome://extensions

5. Enable "Developer Mode" (top right)
6. Click "Load unpacked"
7. Select the extracted folder

The extension will now appear in your toolbar.

---

## Permissions Used

- activeTab
- scripting
- downloads
- host_permissions: <all_urls>

These permissions are required to scan the current webpage and download selected media files.

---

## Disclaimer

This tool is intended for legal and ethical use only.  
Users are responsible for complying with copyright laws and website terms of service.

---

## Version

v1.0.0
