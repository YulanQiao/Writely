# Writely ✨

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![AI Powered](https://img.shields.io/badge/AI-Powered-purple)
![Free Trial](https://img.shields.io/badge/Free-Trial-orange)

**AI-powered writing assistant for translation, rewriting, and tone adjustment. Write better, faster.**

Writely is a Chrome extension that transforms how you write online. Whether you're translating between languages, improving your writing style, or adjusting tone, Writely provides intelligent AI assistance right where you need it - no copy-pasting required.

## 🌟 Key Highlights

- **🔄 Real-time Translation**: Type in any language, get instant translation
- **✍️ Smart Rewriting**: 3 unique alternatives for any text
- **🎭 Tone Adjustment**: Formal, casual, fluent, or professional
- **🌐 Universal**: Works on Gmail, Notion, GitHub, and more
- **⚡ In-place Editing**: Text changes directly where you're working
- **🆓 Free Trial**: Test all features before configuring APIs

## 🎬 Quick Demo

### Text Enhancement
```
Original: "I think we should maybe consider doing this project."
↓ Select text → Click Writely icon → Choose "Tone ▸ Professional"
Result: "I recommend we proceed with this project implementation."
```

### Real-time Translation
```
Type: "你好，我是一名开发者" (Chinese)
↓ Pause 1.5 seconds
Auto-translates to: "Hello, I am a developer"
```

### Smart Rewriting
```
Original: "The meeting was postponed."
↓ Select → "Rewrite" → Get 3 options:
1. "We've delayed the meeting."
2. "The scheduled meeting has been rescheduled to a later date."
3. "Our upcoming meeting is now postponed until further notice."
```

## 📦 Installation & Setup

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
6. "Writely" should now appear in your list of extensions

### 3. Configuration
1. Click on the Writely icon in the Chrome toolbar to open the settings popup
2. Enter your API key(s):
   - **Gemini API Key** (Required): For text polishing, rewriting, tone adjustment, and translation
   - **Google Cloud API Key** (Optional): For faster translation (if not provided, Gemini API will handle translation)
3. Toggle the power button to enable Writely
4. For real-time translation: Enable "Translate-as-you-type", select your source language, and choose a target language

## ✨ Features

### 🌐 Real-time Translate-as-You-Type
- **Seamless Translation**: Type in your native language and watch it automatically translate
- **Smart Timing**: 1.5-second delay ensures smooth typing without interruption
- **Cursor Positioning**: Automatically places cursor at the end for continued typing
- **Block-Level**: Translates current paragraph only, preserving document structure
- **Wide Compatibility**: Works in Gmail, Twitter, Google Docs, Notion, GitHub, and more

**How to use:**
1. Enable "Translate-as-you-type" in Writely settings
2. Select your source and target languages
3. Start typing in any text field
4. Text automatically translates after you pause typing

### 📝 Smart Text Enhancement
Select any text to see Writely's AI-powered enhancement options:

- **🌍 Translate ▸**: Instant translation to 6+ languages (English, Chinese, Japanese, Korean, Spanish, French)
- **✍️ Rewrite**: Get 3 distinct rewrite alternatives with different approaches:
  - Concise & direct version
  - Detailed & explanatory version  
  - Alternative vocabulary & structure
- **🎭 Tone ▸**: Adjust writing tone instantly:
  - **Formal**: Professional and structured
  - **Casual**: Relaxed and conversational
  - **Fluent**: Improved flow and readability
  - **Professional**: Business-appropriate language

### 🎯 Universal Compatibility
- **Editable Text**: Works in text areas, content-editable divs, rich text editors
- **Read-only Text**: Translation available even for non-editable content
- **Popular Platforms**: Gmail, LinkedIn, Notion, GitHub, and more
- **Smart Detection**: Automatically detects editable vs. read-only content

### 🚀 Advanced Features
- **In-place Replacement**: Text changes directly where you're working
- **Multiple Alternatives**: Choose from 3 different rewrite options
- **Fallback Support**: Clipboard copy when direct replacement isn't possible
- **Error Handling**: Graceful fallbacks and clear error messages
- **Free Trial**: Built-in trial system for new users

## 🛠️ How It Works

### Text Selection Mode
1. **Select text** on any webpage (in editable fields or read-only content)
2. **Writely icon appears** - a gradient blue-green circle with sparkle (✨)
3. **Click the icon** to open the enhancement menu
4. **Choose your action**: Translate, Rewrite, or adjust Tone
5. **Text is replaced** instantly (or copied to clipboard if needed)

### Real-time Translation Mode
1. **Enable in settings** - toggle "Translate-as-you-type"
2. **Set languages** - choose source and target languages
3. **Start typing** - type naturally in your source language
4. **Automatic translation** - text translates after 1.5 seconds of pause
5. **Continue typing** - cursor positioned for seamless continuation

## 📁 Project Structure
```
├── manifest.json          # Extension configuration
├── background.js          # API handling & service worker
├── content.js            # Main functionality & UI
├── popup.html            # Settings interface
├── popup.js              # Settings logic
├── styles.css            # UI styling
├── icons/                # Extension icons
└── README.md             # Documentation
```

## 🔧 Technical Details

### Architecture
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background processing with `background.js`
- **Content Scripts**: Page interaction via `content.js`
- **Vanilla JavaScript**: No external dependencies for fast loading
- **CSS3**: Modern styling with animations and gradients

### APIs Used
- **Google Gemini API**: Text enhancement, rewriting, tone adjustment, translation fallback
- **Google Cloud Translation API**: Fast, accurate translation (optional)
- **Chrome Storage API**: Settings and trial management
- **Chrome Runtime API**: Message passing between components

### Browser Compatibility
- **Chrome**: Full support (recommended)
- **Edge**: Full support (Chromium-based)
- **Other Chromium browsers**: Should work with minor variations

## 🔑 API Setup

### Gemini API (Required - Free)
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" and create a new key
4. Copy the API key and paste it in Writely settings

**What it's used for:**
- Text rewriting and alternatives
- Tone adjustment
- Translation (when Google Cloud API is not available)
- All text enhancement features

### Google Cloud Translation API (Optional - Paid)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Cloud Translation API"
4. Enable billing for your project (free tier available)
5. Create an API key in "Credentials"
6. Restrict the key to Translation API only (recommended)
7. Copy the API key and paste it in Writely settings

**What it's used for:**
- Faster, more accurate translation
- Real-time translate-as-you-type feature
- Fallback: Gemini API handles translation if this isn't configured

### 💡 API Tips
- **Free Option**: Use only Gemini API for all features (slower translation)
- **Optimal Setup**: Gemini + Google Cloud for best performance
- **Trial Available**: Built-in trial system lets users test before configuring APIs
- **Billing**: Google Cloud offers free translation quota monthly

## 🚀 Getting Started

### Quick Start (5 minutes)
1. **Install**: Load unpacked extension in Chrome
2. **Configure**: Add your Gemini API key (free from Google AI Studio)
3. **Test**: Select any text and click the Writely icon
4. **Enjoy**: Start writing better with AI assistance!

### For Real-time Translation
1. **Enable**: Toggle "Translate-as-you-type" in settings
2. **Set Languages**: Choose your source and target languages
3. **Type**: Start typing in any text field
4. **Watch**: Text automatically translates as you type

## 🎯 Use Cases

- **Email Writing**: Improve tone and clarity in professional emails
- **Social Media**: Translate posts or adjust tone for different audiences
- **Content Creation**: Generate alternative phrasings for better engagement
- **Language Learning**: Practice writing with instant translation feedback
- **Business Communication**: Ensure professional tone in all communications
- **Academic Writing**: Improve clarity and flow in papers and reports

## 🔍 Troubleshooting

### Common Issues
- **Icon not appearing**: Make sure text is selected in an editable field
- **Translation not working**: Check API keys in settings
- **Slow performance**: Consider adding Google Cloud API key for faster translation
- **Text not replacing**: Some websites may block direct text replacement (fallback: clipboard copy)

### Support
- Check console logs for detailed error messages
- Ensure APIs are properly configured with valid keys
- Try refreshing the page if issues persist
- Verify extension is enabled in Chrome extensions page

## 📄 License
This project is for educational and development purposes.
