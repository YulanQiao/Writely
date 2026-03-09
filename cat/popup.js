// This script handles the logic for the popup UI (popup.html).
// It saves and retrieves user settings from chrome.storage.

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const googleCloudApiKeyInput = document.getElementById('googleCloudApiKey');
    const powerButton = document.getElementById('power-button');
    const powerStatus = document.getElementById('power-status');
    const translateAsYouTypeCheckbox = document.getElementById('translateAsYouTypeEnabled');

    const translateSettings = document.getElementById('translate-settings');
    const languageOptions = document.getElementById('language-options');
    const sourceLangSelect = document.getElementById('sourceLang');
    const targetLangSelect = document.getElementById('targetLang');
    const statusDiv = document.getElementById('status');
    const trialInfo = document.getElementById('trial-info');
    const apiKeysSection = document.getElementById('api-keys-section');
    const remainingUsesSpan = document.getElementById('remaining-uses');

    // Free trial configuration
    const FREE_TRIAL_LIMIT = 100;
    const TRIAL_GEMINI_API_KEY = ''; // Put your valid shared Gemini API key here
    const TRIAL_GOOGLE_CLOUD_API_KEY = ''; // Put your valid shared Google Cloud API key here

    // Default settings
    const defaultSettings = {
        geminiApiKey: '',
        googleCloudApiKey: '',
        extensionEnabled: false,
        translateAsYouTypeEnabled: false,

        sourceLang: 'Auto',
        targetLang: 'en',
        trialUsesRemaining: FREE_TRIAL_LIMIT,
        isTrialMode: true
    };

    // --- Functions ---

    // Mapping between target language codes and source language names
    const codeToName = {
        en: 'English',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        pt: 'Portuguese',
        ru: 'Russian',
        ar: 'Arabic',
        hi: 'Hindi',
        th: 'Thai',
        vi: 'Vietnamese'
    };

    const nameToCode = {
        English: 'en',
        Chinese: 'zh',
        Japanese: 'ja',
        Korean: 'ko',
        Spanish: 'es',
        French: 'fr',
        German: 'de',
        Italian: 'it',
        Portuguese: 'pt',
        Russian: 'ru',
        Arabic: 'ar',
        Hindi: 'hi',
        Thai: 'th',
        Vietnamese: 'vi'
    };

    // Update trial information display
    function updateTrialDisplay(settings) {
        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
            trialInfo.style.display = 'block';
            apiKeysSection.classList.remove('show');
            remainingUsesSpan.textContent = settings.trialUsesRemaining;
        } else {
            trialInfo.style.display = 'none';
            apiKeysSection.classList.add('show');
        }
    }

    // Update power button status
    function updatePowerButton(enabled) {
        if (enabled) {
            powerButton.classList.add('active');
            powerStatus.textContent = 'Writely Enabled';
            powerStatus.className = 'power-status active';
        } else {
            powerButton.classList.remove('active');
            powerStatus.textContent = 'Writely Disabled';
            powerStatus.className = 'power-status inactive';
        }
    }

    // Get effective Gemini API key (trial mode or user's own)
    function getEffectiveGeminiApiKey(settings) {
        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
            return TRIAL_GEMINI_API_KEY;
        }
        return settings.geminiApiKey;
    }

    // Get effective Google Cloud API key (trial mode or user's own)
    function getEffectiveGoogleCloudApiKey(settings) {
        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
            return TRIAL_GOOGLE_CLOUD_API_KEY;
        }
        return settings.googleCloudApiKey;
    }

    // Decrement trial uses
    function decrementTrialUses() {
        chrome.storage.local.get(defaultSettings, (settings) => {
            if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
                const newRemaining = settings.trialUsesRemaining - 1;
                chrome.storage.local.set({
                    trialUsesRemaining: newRemaining,
                    isTrialMode: newRemaining > 0
                }, () => {
                    updateTrialDisplay({
                        isTrialMode: newRemaining > 0,
                        trialUsesRemaining: newRemaining
                    });
                });
            }
        });
    }

    // Saves settings to chrome.storage.local
    function saveSettings() {
        chrome.storage.local.get(defaultSettings, (currentSettings) => {
            const settings = {
                ...currentSettings,
                geminiApiKey: geminiApiKeyInput.value.trim(),
                googleCloudApiKey: googleCloudApiKeyInput.value.trim(),
                extensionEnabled: currentSettings.extensionEnabled, // Controlled by power button
                translateAsYouTypeEnabled: translateAsYouTypeCheckbox.checked,
                sourceLang: sourceLangSelect.value,
                targetLang: targetLangSelect.value
            };
            chrome.storage.local.set(settings, () => {
                statusDiv.textContent = 'Settings saved!';
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 2000);
            });
        });
    }

    // Toggle extension on/off status
    function toggleExtension() {
        chrome.storage.local.get(defaultSettings, (settings) => {
            const newEnabled = !settings.extensionEnabled;
            chrome.storage.local.set({ extensionEnabled: newEnabled }, () => {
                updatePowerButton(newEnabled);
                // translate-as-you-type feature is independent, not affected by main switch
                statusDiv.textContent = newEnabled ? 'Writely Enabled!' : 'Writely Disabled!';
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 2000);
            });
        });
    }

    // Loads settings from chrome.storage.local and updates the UI
    function loadSettings() {
        chrome.storage.local.get(defaultSettings, (settings) => {
            // Ensure trial data is properly initialized
            const finalSettings = {
                ...defaultSettings,
                ...settings,
                // If trial data is undefined, use default values
                isTrialMode: settings.isTrialMode !== undefined ? settings.isTrialMode : defaultSettings.isTrialMode,
                trialUsesRemaining: settings.trialUsesRemaining !== undefined ? settings.trialUsesRemaining : defaultSettings.trialUsesRemaining
            };

            geminiApiKeyInput.value = finalSettings.geminiApiKey;
            googleCloudApiKeyInput.value = finalSettings.googleCloudApiKey;
            translateAsYouTypeCheckbox.checked = finalSettings.translateAsYouTypeEnabled;
            sourceLangSelect.value = finalSettings.sourceLang;
            targetLangSelect.value = finalSettings.targetLang;

            updatePowerButton(finalSettings.extensionEnabled);
            updateTrialDisplay(finalSettings);
            toggleTranslateOptions(finalSettings.extensionEnabled, finalSettings.translateAsYouTypeEnabled);

            // If trial data is not initialized, save default values to storage
            if (settings.isTrialMode === undefined || settings.trialUsesRemaining === undefined) {
                chrome.storage.local.set({
                    isTrialMode: defaultSettings.isTrialMode,
                    trialUsesRemaining: defaultSettings.trialUsesRemaining
                });
            }
        });
    }

    // Toggles the visibility of translation-related settings - now independent of main switch
    function toggleTranslateOptions(extensionEnabled, translateEnabled) {
        // translate-as-you-type feature is independent of main switch
        translateSettings.style.display = 'block';
        // Language options are always displayed
        languageOptions.style.display = 'block';
    }

    // --- Event Listeners ---

    // Power button click event
    powerButton.addEventListener('click', toggleExtension);

    // Swap languages button
    const swapLanguagesBtn = document.getElementById('swapLanguages');
    if (swapLanguagesBtn) {
        swapLanguagesBtn.addEventListener('click', () => {
            const sourceValue = sourceLangSelect.value; // name or 'Auto'
            const targetCode = targetLangSelect.value; // code

            // Compute new values
            let newSourceName = codeToName[targetCode] || 'English';
            let newTargetCode;
            if (sourceValue === 'Auto') {
                // If source was Auto, keep Auto -> swap will set target to default English
                newTargetCode = targetCode; // keep same
                newSourceName = codeToName[targetCode] || 'English';
            } else {
                newTargetCode = nameToCode[sourceValue] || 'en';
            }

            // Apply
            sourceLangSelect.value = sourceValue === 'Auto' ? 'Auto' : newSourceName;
            targetLangSelect.value = newTargetCode;

            // If source was not Auto, actually set source to name derived from previous target
            if (sourceValue !== 'Auto') {
                sourceLangSelect.value = codeToName[targetCode] || 'English';
            }

            // Save the new settings
            saveSettings();
        });
    }

    // Add event listeners to all input elements to save on change
    geminiApiKeyInput.addEventListener('change', saveSettings);
    googleCloudApiKeyInput.addEventListener('change', saveSettings);
    translateAsYouTypeCheckbox.addEventListener('change', () => {
        chrome.storage.local.get(defaultSettings, (settings) => {
            toggleTranslateOptions(settings.extensionEnabled, translateAsYouTypeCheckbox.checked);
            saveSettings();
        });
    });

    sourceLangSelect.addEventListener('change', saveSettings);
    targetLangSelect.addEventListener('change', saveSettings);

    // Expose functions for use by other scripts
    window.decrementTrialUses = decrementTrialUses;
    window.getEffectiveGeminiApiKey = getEffectiveGeminiApiKey;
    window.getEffectiveGoogleCloudApiKey = getEffectiveGoogleCloudApiKey;

    // Page Translation button
    const pageTranslateBtn = document.getElementById('page-translate-btn');
    if (pageTranslateBtn) {
        pageTranslateBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs[0]?.id;
                if (!tabId) return;
                chrome.storage.local.get(defaultSettings, (settings) => {
                    chrome.tabs.sendMessage(tabId, {
                        type: 'page_translate',
                        sourceLang: settings.sourceLang || 'Chinese',
                        targetLang: settings.targetLang || 'en'
                    });
                });
            });
        });
    }


    // Initial load of settings when the popup is opened
    loadSettings();
});
