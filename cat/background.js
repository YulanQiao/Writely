// This script acts as the service worker for the extension.
// It routes requests to either Google Cloud Translation API or Gemini API based on the request type.

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=";
const TRANSLATE_API_URL = "https://translation.googleapis.com/language/translate/v2";

// Function to convert language names to language codes
function getLanguageCode(languageName) {
    const languageMap = {
        'Chinese': 'zh',
        'Spanish': 'es',
        'French': 'fr',
        'German': 'de',
        'Japanese': 'ja',
        'Korean': 'ko',
        'Italian': 'it',
        'Portuguese': 'pt',
        'Russian': 'ru',
        'Arabic': 'ar'
    };
    return languageMap[languageName] || 'en'; // Default to English if not found
}

// Function to get language name from language code (for Gemini prompts)
function getLanguageName(languageCode) {
    const codeToNameMap = {
        'en': 'English',
        'zh': 'Chinese',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'ja': 'Japanese',
        'ko': 'Korean',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ar': 'Arabic'
    };
    return codeToNameMap[languageCode] || 'English';
}

// Function to call Google Cloud Translation API
async function callGoogleTranslate(text, sourceLang, targetLang, apiKey) {
    console.log("AI Assistant: Calling Google Cloud Translation API");

    if (!apiKey) {
        console.error("AI Assistant: Google Cloud API Key is missing");
        return { error: "Google Cloud API Key is missing. Please set it in the extension popup." };
    }

    try {
        // Handle Auto language detection
        const sourceCode = (sourceLang === 'Auto') ? undefined : getLanguageCode(sourceLang);
        
        // Prevent same source and target language (only if source is not Auto)
        if (sourceCode && sourceCode === targetLang) {
            console.log("AI Assistant: Source and target languages are the same, skipping translation");
            return { text: text }; // Return original text if same language
        }
        
        const requestBody = {
            q: text,
            target: targetLang || 'en',
            format: 'text'
        };
        
        // Only add source if it's not Auto (let API auto-detect)
        if (sourceCode) {
            requestBody.source = sourceCode;
        }

        // Convert the body to x-www-form-urlencoded format
        const formBody = new URLSearchParams(requestBody).toString();

        const response = await fetch(`${TRANSLATE_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body: formBody
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("AI Assistant: Google Translate API Error:", JSON.stringify(errorBody, null, 2));

            // Pass the detailed error message from the API back to the content script
            const errorMessage = errorBody?.error?.message || `Translation API request failed with status ${response.status}.`;
            return { error: `Google Translation API error: ${errorMessage}` };
        }

        const data = await response.json();
        const translatedText = data.data?.translations?.[0]?.translatedText;

        if (translatedText) {
            console.log("AI Assistant: Translation successful:", translatedText.substring(0, 100) + "...");
            // Decode HTML entities that might be returned by the API
            const decodedText = translatedText.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            return { text: decodedText };
        } else {
            console.error("AI Assistant: Failed to extract translated text:", data);
            return { error: "Failed to extract translated text from response." };
        }

    } catch (error) {
        console.error("AI Assistant: Error calling Google Translate API:", error);
        return { error: `An unexpected error occurred during translation: ${error.message}` };
    }
}

// Function to call the Gemini API
async function callGemini(prompt, apiKey) {
    console.log("AI Assistant: Calling Gemini API with prompt:", prompt.substring(0, 100) + "...");

    if (!apiKey) {
        console.error("AI Assistant: Gemini API Key is missing");
        return { error: "Gemini API Key is missing. Please set it in the extension popup." };
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{ "text": prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("AI Assistant: Gemini API Error:", errorBody);
            const errorMessage = errorBody?.error?.message || `Gemini API request failed with status ${response.status}.`;
            return { error: `Gemini API error: ${errorMessage}` };
        }

        const data = await response.json();
        const text = data.candidates[0]?.content?.parts[0]?.text;

        if (text) {
            console.log("AI Assistant: Gemini API call successful, response:", text.substring(0, 100) + "...");
            return { text: text.trim() };
        } else {
            console.error("AI Assistant: Failed to extract text from Gemini response:", data);
            return { error: "Failed to extract text from Gemini response." };
        }

    } catch (error) {
        console.error("AI Assistant: Error calling Gemini API:", error);
        return { error: `An unexpected error occurred with Gemini API: ${error.message}` };
    }
}

// Prompts for Gemini API (polishing and alternatives only)
const polishingPrompts = {
    formal: `You are a professional editor. Rewrite the following text to be more formal. Avoid contractions, and ensure a respectful tone. The output should be suitable for a business setting. Only return the rewritten text, without any introductory phrases.
Text: "{text}"`,
    casual: `You are a friendly, casual writer. Rewrite the following text to sound more relaxed and informal. You can use common slang, simple phrases, and contractions. The output should be conversational and easygoing. Only return the rewritten text, without any introductory phrases.
Text: "{text}"`,
    fluent: `You are a native speaker. Rephrase the following text to be more fluent and natural. The goal is to make it sound idiomatic, as if a native speaker wrote it. Improve the sentence flow, grammar, and word choice where necessary, but keep the original meaning. Only return the rewritten text, without any introductory phrases.
Text: "{text}"`,
    shorten: `You are a concise writer. Rewrite the following text to be shorter while keeping the original meaning intact. Remove unnecessary words, simplify phrases, and make the expression as clear and direct as possible. Only return the shortened text, without any introductory phrases.
Text: "{text}"`,
    alternatives: `Rewrite the following text in exactly 3 distinctly different ways. Each version must be unique and improve the text while maintaining the original meaning.

Requirements:
- Version 1: Make it more concise and direct
- Version 2: Make it more detailed and explanatory,yet keep it short.
- Version 3: Use completely different sentence structure,Change phrasing, order of ideas, and synonyms, but preserve the original meaning. 

IMPORTANT: Each version must be significantly different from the others. Do not repeat similar phrases or structures.

Format your response exactly as: Alternative1||Alternative2||Alternative3

Only return the three alternatives separated by double pipes (||). No explanations, no numbering, no additional text.

Text: "{text}"`,
    rewrite: `You are a professional editor. Rewrite the following text to improve clarity, flow, and readability while maintaining the original meaning. Make it sound more natural and polished. Only return the rewritten text, without any introductory phrases.
Text: "{text}"`,
    summary: `You are an expert at creating concise summaries. Create a brief, easy-to-read summary of the following text.

Requirements:
- Keep it short and simple (maximum 2 sentences for summary)
- Use only 2-3 key bullet points maximum
- Each bullet point should be 1 short sentence (under 15 words)
- Use simple, clear language
- Focus on the most important information only

Format your response as:
Summary:
[1-2 sentence brief overview]

Key Points:
• [First key point - 1 short sentence]
• [Second key point - 1 short sentence]
• [Third key point - 1 short sentence]

Text: "{text}"`
};

// 免费试用配置
const FREE_TRIAL_LIMIT = 100;
// 注意：这里需要替换为你自己有效的API keys
const TRIAL_GEMINI_API_KEY = 'AIzaSyCuqN_dykMReR2nzZnpIJJ4dtdGn6f8Xlw'; // 替换为你的有效共享Gemini API key
const TRIAL_GOOGLE_CLOUD_API_KEY = 'AIzaSyCFoeuAuu4j9VcNhmu0DvS2LJHEsYPwEAk'; // 替换为你的有效共享Google Cloud API key

// 初始化试用数据（如果不存在）
async function initializeTrialData() {
    const settings = await chrome.storage.local.get(['isTrialMode', 'trialUsesRemaining']);

    // 如果试用数据不存在，初始化为默认值
    if (settings.isTrialMode === undefined || settings.trialUsesRemaining === undefined) {
        await chrome.storage.local.set({
            isTrialMode: true,
            trialUsesRemaining: FREE_TRIAL_LIMIT
        });
        console.log("AI Assistant: Initialized trial data - remaining uses:", FREE_TRIAL_LIMIT);
        return { isTrialMode: true, trialUsesRemaining: FREE_TRIAL_LIMIT };
    }

    return settings;
}

// 获取有效的Gemini API key (试用模式或用户自己的)
async function getEffectiveGeminiApiKey() {
    // 确保试用数据已初始化
    await initializeTrialData();

    const settings = await chrome.storage.local.get(['geminiApiKey', 'isTrialMode', 'trialUsesRemaining']);

    // 如果试用API key无效，直接使用用户的API key
    if (TRIAL_GEMINI_API_KEY === 'YOUR_VALID_GEMINI_API_KEY_HERE') {
        console.log("AI Assistant: Trial Gemini API key not configured, using user's API key");
        return settings.geminiApiKey;
    }

    if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
        return TRIAL_GEMINI_API_KEY;
    }

    return settings.geminiApiKey;
}

// 获取有效的Google Cloud API key (试用模式或用户自己的)
async function getEffectiveGoogleCloudApiKey() {
    // 确保试用数据已初始化
    await initializeTrialData();

    const settings = await chrome.storage.local.get(['googleCloudApiKey', 'isTrialMode', 'trialUsesRemaining']);

    // 如果试用API key无效，直接使用用户的API key
    if (TRIAL_GOOGLE_CLOUD_API_KEY === 'YOUR_VALID_GOOGLE_CLOUD_API_KEY_HERE') {
        console.log("AI Assistant: Trial Google Cloud API key not configured, using user's API key");
        return settings.googleCloudApiKey;
    }

    if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
        return TRIAL_GOOGLE_CLOUD_API_KEY;
    }

    return settings.googleCloudApiKey;
}

// 减少试用次数
async function decrementTrialUses() {
    // 确保试用数据已初始化
    await initializeTrialData();

    const settings = await chrome.storage.local.get(['isTrialMode', 'trialUsesRemaining']);

    if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
        const newRemaining = settings.trialUsesRemaining - 1;
        await chrome.storage.local.set({
            trialUsesRemaining: newRemaining,
            isTrialMode: newRemaining > 0
        });
        console.log(`AI Assistant: Trial uses remaining: ${newRemaining}`);
    }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    console.log("AI Assistant: Received message:", request.type, request.text ? request.text.substring(0, 50) + "..." : "");

    // It's important to return true to indicate you'll send a response asynchronously
    (async () => {
        // Get settings including trial information
        const settings = await chrome.storage.local.get(['geminiApiKey', 'googleCloudApiKey', 'isTrialMode', 'trialUsesRemaining']);

        // 获取有效的API keys
        const geminiApiKey = await getEffectiveGeminiApiKey();
        const googleCloudApiKey = await getEffectiveGoogleCloudApiKey(); // Google Cloud API 现在也支持试用

        console.log("AI Assistant: Gemini API Key available:", !!geminiApiKey);
        console.log("AI Assistant: Google Cloud API Key available:", !!googleCloudApiKey);
        console.log("AI Assistant: Trial mode:", settings.isTrialMode, "Remaining:", settings.trialUsesRemaining);

        let result;

        switch (request.type) {
            case 'translate':
                const targetLang = request.targetLang || 'en';
                const targetLanguageName = getLanguageName(targetLang);
                const sourceLangForPrompt = (request.sourceLang && request.sourceLang !== 'Auto') ? request.sourceLang : 'Auto';

                // 翻译功能：优先使用Google Cloud API，如果没有则使用Gemini作为fallback
                if (googleCloudApiKey) {
                    console.log("AI Assistant: Using Google Cloud Translation API for translation");
                    result = await callGoogleTranslate(request.text, sourceLangForPrompt, targetLang, googleCloudApiKey);

                    if (result.error) {
                        console.log("AI Assistant: Google Cloud Translation failed, trying Gemini fallback");
                        // Google Cloud失败时，尝试使用Gemini
                        if (geminiApiKey) {
                            const translatePrompt = `Translate the following text from ${sourceLangForPrompt} to ${targetLanguageName}. Only return the translated text, without any explanations or additional content.\n\nText: "${request.text}"`;
                            result = await callGemini(translatePrompt, geminiApiKey);

                            // 如果使用了试用API key，减少试用次数
                            if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
                                await decrementTrialUses();
                            }
                        } else {
                            result = { error: `Translation failed: Google Cloud API error. Please check your API key settings.` };
                        }
                    } else {
                        // Google Cloud翻译成功，如果使用了试用API key，减少试用次数
                        if (settings.isTrialMode && settings.trialUsesRemaining > 0 && googleCloudApiKey === TRIAL_GOOGLE_CLOUD_API_KEY) {
                            await decrementTrialUses();
                        }
                    }
                } else if (geminiApiKey) {
                    // 没有Google Cloud API时，使用Gemini进行翻译
                    console.log("AI Assistant: Using Gemini API for translation (no Google Cloud API)");
                    const translatePrompt = `Translate the following text from ${sourceLangForPrompt} to ${targetLanguageName}. Only return the translated text, without any explanations or additional content.\n\nText: "${request.text}"`;
                    result = await callGemini(translatePrompt, geminiApiKey);

                    // If Gemini API also failed, provide friendly error message
                    if (result.error) {
                        if (result.error.includes('overloaded')) {
                            result = { error: "AI service temporarily overloaded, please try again later. Consider configuring Google Cloud Translation API for more stable translation service." };
                        } else if (result.error.includes('API key')) {
                            result = { error: "Invalid API key. Please configure a valid Gemini API key or Google Cloud Translation API key in extension settings." };
                        }
                    } else {
                        // 如果使用了试用API key，减少试用次数
                        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
                            await decrementTrialUses();
                        }
                    }
                } else {
                    result = { error: "Translation requires API key. Please configure Google Cloud Translation API key or Gemini API key in extension settings." };
                }
                break;
            case 'tone':
            case 'polish':
                // Use Gemini API for tone adjustment/polishing
                if (geminiApiKey) {
                    console.log("AI Assistant: Using Gemini API for tone adjustment");
                    const toneStyle = request.tone || request.style || 'formal';
                    const polishPrompt = polishingPrompts[toneStyle].replace('{text}', request.text);
                    result = await callGemini(polishPrompt, geminiApiKey);

                    if (result.error) {
                        if (result.error.includes('overloaded')) {
                            result = { error: "AI service temporarily overloaded, please try again later." };
                        } else if (result.error.includes('API key')) {
                            result = { error: "Invalid API key. Please configure a valid Gemini API key in extension settings." };
                        }
                    } else {
                        // If using trial API key, decrement trial uses
                        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
                            await decrementTrialUses();
                        }
                    }
                } else {
                    result = { error: "Tone adjustment requires Gemini API key. Please configure in extension settings or use free trial." };
                }
                break;
            case 'alternatives':
                // Use Gemini API for alternatives
                if (geminiApiKey) {
                    console.log("AI Assistant: Using Gemini API for text alternatives");
                    console.log("AI Assistant: Input text:", request.text);
                    const alternativesPrompt = polishingPrompts.alternatives.replace('{text}', request.text);
                    console.log("AI Assistant: Alternatives prompt:", alternativesPrompt);
                    result = await callGemini(alternativesPrompt, geminiApiKey);
                    console.log("AI Assistant: Gemini alternatives result:", result);

                    if (result.error) {
                        console.error("AI Assistant: Alternatives generation failed:", result.error);
                        if (result.error.includes('overloaded')) {
                            result = { error: "AI service temporarily overloaded, please try again later." };
                        } else if (result.error.includes('API key')) {
                            result = { error: "Invalid API key. Please configure a valid Gemini API key in extension settings." };
                        }
                    } else {
                        console.log("AI Assistant: Alternatives generated successfully:", result.text);
                        // 如果使用了试用API key，减少试用次数
                        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
                            await decrementTrialUses();
                        }
                    }
                } else {
                    console.error("AI Assistant: No Gemini API key available for alternatives");
                    result = { error: "Rewrite feature requires Gemini API key. Please configure in extension settings or use free trial." };
                }
                break;
            case 'rewrite':
                // Use Gemini API for rewriting - use alternatives prompt to generate 3 different versions
                if (geminiApiKey) {
                    console.log("AI Assistant: Using Gemini API for text rewriting (3 alternatives)");
                    const rewritePrompt = polishingPrompts.alternatives.replace('{text}', request.text);
                    result = await callGemini(rewritePrompt, geminiApiKey);

                    if (result.error) {
                        if (result.error.includes('overloaded')) {
                            result = { error: "AI service temporarily overloaded, please try again later." };
                        } else if (result.error.includes('API key')) {
                            result = { error: "Invalid API key. Please configure a valid Gemini API key in extension settings." };
                        }
                    } else {
                        // 如果使用了试用API key，减少试用次数
                        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
                            await decrementTrialUses();
                        }
                    }
                } else {
                    result = { error: "Rewrite feature requires Gemini API key. Please configure in extension settings or use free trial." };
                }
                break;
            case 'summary':
                // Use Gemini API for text summarization
                if (geminiApiKey) {
                    console.log("AI Assistant: Using Gemini API for text summarization");
                    const summaryPrompt = polishingPrompts.summary.replace('{text}', request.text);
                    result = await callGemini(summaryPrompt, geminiApiKey);

                    if (result.error) {
                        if (result.error.includes('overloaded')) {
                            result = { error: "AI service temporarily overloaded, please try again later." };
                        } else if (result.error.includes('API key')) {
                            result = { error: "Invalid API key. Please configure a valid Gemini API key in extension settings." };
                        }
                    } else {
                        // 如果使用了试用API key，减少试用次数
                        if (settings.isTrialMode && settings.trialUsesRemaining > 0) {
                            await decrementTrialUses();
                        }
                    }
                } else {
                    result = { error: "Summary feature requires Gemini API key. Please configure in extension settings or use free trial." };
                }
                break;
            default:
                console.error("AI Assistant: Unknown request type:", request.type);
                sendResponse({ error: 'Unknown request type.' });
                return;
        }

        console.log("AI Assistant: Sending response:", result.error ? "ERROR: " + result.error : "SUCCESS");
        sendResponse(result);

    })();

    return true;
});