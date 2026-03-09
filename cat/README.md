# AI Language Polishing & Translation Assistant

This is a Chrome extension designed to help non-native English speakers write more confidently, efficiently, and authentically. It integrates real-time translation, intelligent tone adjustment, and multi-style sentence rewriting.

## How to Install and Use

### 1. Prerequisites
- You need Google Chrome or a Chromium-based browser (like Microsoft Edge)
- You need at least one API key:
  - **Gemini API Key** (Required) - Get your free API key from [Google AI Studio](https://aistudio.google.com/) (for text polishing, alternatives, and translation fallback)
  - **Google Cloud API Key** (Optional) - Enable Translation API in [Google Cloud Console](https://console.cloud.google.com/) (for faster real-time translation)

### 2. Installation
1. Download all the files from this project into a single folder on your computer
2. Open Chrome and navigate to `chrome://extensions`
3. Turn on the "Developer mode" switch, usually located in the top-right corner
4. Click on the "Load unpacked" button
5. Select the folder where you saved all the project files
6. The "AI Language Assistant" extension should now appear in your list of extensions

### 3. Configuration
1. Click on the extension's icon in the Chrome toolbar. A popup window will appear
2. Enter your API key(s):
   - **Gemini API Key** (Required): For text polishing, alternatives, and translation
   - **Google Cloud API Key** (Optional): For faster translation (if not provided, Gemini API will handle translation)
3. Ensure the "Enable Assistant" switch is turned on
4. For translation: Enable "Translate-as-you-type", select your source language, and choose a default target language

## Features

### Feature A: Real-time Translate-as-you-type
1. In the popup, enable "Translate-as-you-type" and select your source language
2. Go to any webpage with a text box (like Gmail, Twitter, etc.)
3. Start typing in your selected source language
4. After you stop typing for about 2 seconds, the text will be automatically translated into English
5. **Improved**: Translation now preserves your typing flow and cursor position better

### Feature B: Smart Text Polishing & Translation with Language Selection
1. On any webpage, highlight a piece of text you have written in an editable field
2. A small blue circular icon will automatically appear next to your selection
3. Click the icon to open a menu with options:
   - **Translate ▸** - Opens a submenu with multiple target languages (English, Chinese, Japanese, Korean, Spanish, French, German, Italian, Portuguese, Russian, Arabic)
   - **Rewrite** - Improves clarity and flow
   - **Rewrite Options** - Shows multiple alternative phrasings
   - **Tone ▸** - Adjusts tone (Formal, Casual, Fluent, Reasoning)
4. For translation: Click "Translate ▸" then select your desired target language
5. The extension will process your text and replace it with the translated/polished version
6. **New**: Multi-language translation support with easy language selection!

### Feature C: Alternative Sentence Structures
1. Highlight a complete English sentence in an editable field (ending with . ! or ?)
2. Click the blue icon that appears, then select "Alternatives" from the menu
3. A floating window will appear offering 3 alternative ways to phrase the sentence
4. Click on any of the suggestions to instantly replace the original text
5. **Improved**: Better integration with the polishing menu for a smoother experience

## Project Structure
```
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── styles.css            # UI styles
├── icons/                # Extension icons
│   ├── CAT.png           # Original icon
│   ├── icon_14.png
│   ├── icon_16.png
│   ├── icon_19.png
│   ├── icon_32.png
│   ├── icon_38.png
│   ├── icon_48.png
│   ├── icon_64.png
│   ├── icon_96.png
│   └── icon_128.png
└── README.md             # This file
```

## Development
This extension uses:
- Chrome Extension Manifest V3
- **Google Cloud Translation API** for real-time translation
- **Google Gemini API** for text polishing and alternatives
- Vanilla JavaScript (no frameworks)

## API Setup

### Gemini API (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" and create a new key
4. Copy the API key

### Google Cloud Translation API (Optional, Paid)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Cloud Translation API"
4. Enable billing for your project
5. Go to "Credentials" and create an API key
6. Restrict the API key to only Translation API for security
7. Copy the API key

**Note**: 
- Google Cloud Translation API requires billing to be enabled, but offers free usage up to a certain limit each month
- If you don't configure this API, the extension will use Gemini API for translation (which is free but may be slower)
- Common issues: Make sure billing is enabled and the Translation API is activated in your Google Cloud project

## License
This project is for educational and testing purposes.