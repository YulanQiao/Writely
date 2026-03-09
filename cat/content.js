// AI Assistant Content Script - Enhanced Version
// Core functionality: Select text → Show options → Replace text

let currentSelection = null;
let activeIcon = null;
let activeMenu = null;
let activeSubMenu = null;
let activeAlternativesWindow = null;
let lastUIMouseDownTime = 0;

// Variables for translate-as-you-type
let translateTimeout = null;
let lastOriginalBlockText = '';
let isTranslating = false;

// Initialize the extension
function init() {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
        if (chrome.runtime.lastError) {
            console.log('Extension context invalidated, skipping initialization');
            return;
        }
        setupEventListeners();
    });
}

// Set up event listeners
function setupEventListeners() {
    document.addEventListener('mouseup', handleTextSelection, true);
    document.addEventListener('mousedown', handleDocumentMouseDown, true);

    // Add translate-as-you-type functionality
    document.addEventListener('input', handleInput, true);
}

// Handle document clicks - hide UI
function handleDocumentMouseDown(event) {
    if (event.target.id?.startsWith('ai-assistant-')) return;

    // Check if enough time has passed since last UI interaction
    const timeSinceLastUIClick = Date.now() - lastUIMouseDownTime;
    if (timeSinceLastUIClick < 100) {
        return; // Too soon, likely part of UI interaction
    }

    setTimeout(() => {
        if (!isClickInsideUI(event.target)) {
            hideAllUI();
        }
    }, 10);
}

// Check if click is inside UI
function isClickInsideUI(element) {
    while (element) {
        if (element.id?.startsWith('ai-assistant-')) return true;
        element = element.parentElement;
    }
    return false;
}

// Handle text selection
function handleTextSelection(event) {
    if (event.target.id?.startsWith('ai-assistant-')) return;

    setTimeout(() => {
        chrome.storage.local.get(['extensionEnabled'], (settings) => {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, skipping selection handling');
                return;
            }
            if (settings.extensionEnabled === false) return;

            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (!selectedText) {
                if (!isClickInsideUI(event.target)) hideAllUI();
                return;
            }

            // Save selection info - key improvement: maintain selection
            let range;
            try {
                range = selection.getRangeAt(0);
            } catch (error) {
                console.error('AI Assistant: Error getting selection range:', error);
                return;
            }

            const editableElement = findEditableElement(event.target, selection);

            // Save detailed selection information
            currentSelection = {
                text: selectedText,
                range: range.cloneRange(), // Clone range to prevent invalidation
                element: editableElement,
                isReadOnly: !editableElement,
                // Save position info for re-targeting
                startContainer: range.startContainer,
                endContainer: range.endContainer,
                startOffset: range.startOffset,
                endOffset: range.endOffset
            };

            console.log('AI Assistant: Text selected:', selectedText.substring(0, 50) + '...');
            showAssistantIcon(range);
        });
    }, 10);
}

// Find editable element
function findEditableElement(target, selection) {
    // Check target itself
    if (isEditable(target)) return target;

    // Check target's parent elements
    let element = target;
    while (element && element !== document.body) {
        if (isEditable(element)) return element;
        element = element.parentElement;
    }

    // Check elements within selection range
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;

        if (container.nodeType === Node.TEXT_NODE) {
            element = container.parentElement;
        } else {
            element = container;
        }

        while (element && element !== document.body) {
            if (isEditable(element)) return element;
            element = element.parentElement;
        }
    }

    return null;
}

// Check if element is editable
function isEditable(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    return element.isContentEditable ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'INPUT';
}

// Show assistant icon
function showAssistantIcon(range) {
    hideAllUI();

    const rect = range.getBoundingClientRect();

    activeIcon = document.createElement('div');
    activeIcon.id = 'ai-assistant-icon';
    activeIcon.style.left = `${rect.right + window.scrollX + 5}px`;
    activeIcon.style.top = `${rect.top + window.scrollY + rect.height / 2 - 16}px`;

    activeIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        lastUIMouseDownTime = Date.now();
        showPrimaryMenu();
    });

    activeIcon.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        lastUIMouseDownTime = Date.now();
    });

    document.body.appendChild(activeIcon);
}

// Handle input for translate-as-you-type
function handleInput(event) {
    const element = event.target;
    if (!isEditableElement(element)) return;

    // For simple textareas, we can use the whole value
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const text = element.value;
        if (!text || text.trim().length === 0) return;
        // Focus on contentEditable case for now
        return;
    }

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // Find the specific block (paragraph) the user is typing in
    const currentBlock = findCurrentBlock(selection);
    if (!currentBlock) return;

    // Get text from this block, preserving line breaks
    const text = getTextWithLineBreaks(currentBlock).trim();

    if (!text || text.length === 0) {
        if (translateTimeout) clearTimeout(translateTimeout);
        lastOriginalBlockText = '';
        return;
    }

    if (isTranslating || text === lastOriginalBlockText) return;

    if (translateTimeout) {
        clearTimeout(translateTimeout);
    }

    translateTimeout = setTimeout(() => {
        console.log('AI Assistant: Starting real-time translation for block:', text.substring(0, 50) + '...');
        lastOriginalBlockText = text;

        chrome.storage.local.get(['sourceLang', 'targetLang', 'translateAsYouTypeEnabled'], (settings) => {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, skipping translation');
                return;
            }
            if (settings.translateAsYouTypeEnabled === false) return;

            const sourceLang = settings.sourceLang || 'Auto';
            const targetLang = settings.targetLang || 'en';

            // Pass the specific block element to the translation function
            translateTextRealTime(text, sourceLang, targetLang, currentBlock);
        });

    }, 1500);
}

// Real-time translation function
function translateTextRealTime(text, sourceLang, targetLang, blockElement) {
    if (isTranslating) return;

    isTranslating = true;

    chrome.runtime.sendMessage({
        type: 'translate',
        text: text,
        sourceLang: sourceLang,
        targetLang: targetLang,
        isRealTime: true
    }, (response) => {
        isTranslating = false;

        if (chrome.runtime.lastError || (response && response.error) || !response || !response.text) {
            console.error('AI Assistant: Translation failed:', chrome.runtime.lastError || (response && response.error));
            lastOriginalBlockText = ''; // Allow re-translation on next input
            return;
        }

        console.log('AI Assistant: Translation completed:', response.text.substring(0, 50) + '...');

        // Create a range that selects the entire content of the target block
        const range = document.createRange();
        range.selectNodeContents(blockElement);

        // Replace the content of the block with translated text
        const htmlText = response.text.replace(/\n/g, '<br>');
        replaceTextInBlock(blockElement, htmlText, range);
    });
}

// Helper function to check if element is editable
function isEditableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // Standard editable elements
    if (element.isContentEditable ||
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA') {
        return true;
    }

    // Check contenteditable attribute
    if (element.getAttribute('contenteditable') === 'true') {
        return true;
    }

    // Special site detection
    const hostname = window.location.hostname;

    // Google Docs
    if (hostname.includes('docs.google.com')) {
        return element.classList.contains('kix-lineview-content') ||
            element.classList.contains('kix-paragraphrenderer') ||
            element.getAttribute('contenteditable') === 'true';
    }

    // Notion
    if (hostname.includes('notion.so') || hostname.includes('notion.site')) {
        return element.hasAttribute('data-block-id') ||
            element.classList.contains('notion-page-content') ||
            element.getAttribute('contenteditable') === 'true';
    }

    // GitHub
    if (hostname.includes('github.com')) {
        return element.classList.contains('CodeMirror') ||
            element.classList.contains('ace_editor') ||
            element.getAttribute('contenteditable') === 'true';
    }

    return false;
}

// Find the current block element
function findCurrentBlock(selection) {
    let node = selection.anchorNode;
    if (!node) return null;

    // If we're on a text node, start from its parent element
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
    }

    const editableRoot = findEditableParent(node);
    if (!editableRoot) return null;

    // Traverse up until we find a direct child of the editable root, or a block element
    while (node && node !== editableRoot) {
        const display = window.getComputedStyle(node).display;
        if (display === 'block' || display === 'list-item') {
            return node; // Found a block element
        }
        // If the parent is the root, this node is a direct child
        if (node.parentNode === editableRoot) {
            return node;
        }
        node = node.parentNode;
    }

    // If no block is found inside, the editable element itself is the block
    return editableRoot;
}

// Get text with line breaks preserved
function getTextWithLineBreaks(element) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.innerHTML
        .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newline
        .replace(/<div>/gi, '\n')     // Convert start of <div> to newline
        .replace(/<\/div>/gi, '');    // Remove end of </div>

    return tempDiv.textContent || tempDiv.innerText || '';
}

// Replace text in block element
function replaceTextInBlock(blockElement, htmlText, range) {
    try {
        // Replace the content
        blockElement.innerHTML = htmlText;

        // Always place cursor at the end of the text
        const selection = window.getSelection();
        const newRange = document.createRange();
        
        // Find the last text node in the block
        const walker = document.createTreeWalker(
            blockElement,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let lastTextNode = null;
        let currentNode;
        while (currentNode = walker.nextNode()) {
            lastTextNode = currentNode;
        }
        
        if (lastTextNode) {
            // Place cursor at the end of the last text node
            newRange.setStart(lastTextNode, lastTextNode.textContent.length);
            newRange.setEnd(lastTextNode, lastTextNode.textContent.length);
        } else {
            // If no text node found, place cursor at the end of the block element
            newRange.selectNodeContents(blockElement);
            newRange.collapse(false); // false = collapse to end
        }
        
        selection.removeAllRanges();
        selection.addRange(newRange);
        
    } catch (error) {
        console.error('AI Assistant: Error replacing text in block:', error);
        // Fallback: just replace the content without cursor positioning
        blockElement.innerHTML = htmlText;
    }
}

// Find editable parent element
function findEditableParent(node) {
    while (node) {
        if (node.nodeType === Node.ELEMENT_NODE && isEditableElement(node)) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

// Show primary menu
function showPrimaryMenu() {
    const iconRect = activeIcon.getBoundingClientRect();
    hideAllUI();

    activeMenu = document.createElement('div');
    activeMenu.id = 'ai-assistant-menu';
    activeMenu.style.left = `${iconRect.left + window.scrollX}px`;
    activeMenu.style.top = `${iconRect.bottom + window.scrollY + 5}px`;

    activeMenu.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        lastUIMouseDownTime = Date.now();
    });

    // Menu options - now same for all text types since we can replace read-only text too
    const options = [
        { key: 'translate', label: 'Translate ▸' },
        { key: 'summary', label: 'Summary' },
        { key: 'rewrite', label: 'Rewrite' },
        { key: 'change_tone', label: 'Tone ▸' },
        { key: 'close_extension', label: 'Close' }
    ];

    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.label;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
            console.log("AI Assistant: Button clicked:", option.key);
            handlePrimaryMenuClick(option.key);
        });
        button.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
        });
        activeMenu.appendChild(button);
    });

    document.body.appendChild(activeMenu);
}

// Handle primary menu clicks
function handlePrimaryMenuClick(key) {
    lastUIMouseDownTime = Date.now();
    console.log("AI Assistant: Primary menu click:", key, "timestamp updated");

    switch (key) {
        case 'translate':
            showTranslateSubMenu();
            break;
        case 'summary':
            showSummaryWindow();
            break;
        case 'rewrite':
            showRewriteWindow();
            break;
        case 'change_tone':
            showToneSubMenu();
            break;
        case 'close_extension':
            closeExtension();
            break;
    }
}

// Show tone submenu
function showToneSubMenu() {
    // Close any existing submenu first
    if (activeSubMenu) {
        activeSubMenu.remove();
        activeSubMenu = null;
    }
    
    const menuRect = activeMenu.getBoundingClientRect();
    activeSubMenu = document.createElement('div');
    activeSubMenu.id = 'ai-assistant-menu';
    activeSubMenu.style.left = `${menuRect.right + window.scrollX + 5}px`;
    activeSubMenu.style.top = `${menuRect.top + window.scrollY}px`;
    activeSubMenu.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        lastUIMouseDownTime = Date.now();
    });

    const toneOptions = [
        { key: 'formal', label: 'Formal' },
        { key: 'casual', label: 'Casual' },
        { key: 'fluent', label: 'Fluent' },
        { key: 'shorten', label: 'Shorten' }
    ];

    toneOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.label;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
            console.log("AI Assistant: Tone button clicked:", option.key);
            performToneAdjustment(option.key, option.label);
        });
        button.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
        });
        activeSubMenu.appendChild(button);
    });
    document.body.appendChild(activeSubMenu);
}

// Show translate submenu
function showTranslateSubMenu() {
    // Close any existing submenu first
    if (activeSubMenu) {
        activeSubMenu.remove();
        activeSubMenu = null;
    }
    
    const menuRect = activeMenu.getBoundingClientRect();
    activeSubMenu = document.createElement('div');
    activeSubMenu.id = 'ai-assistant-menu';
    activeSubMenu.style.left = `${menuRect.right + window.scrollX + 5}px`;
    activeSubMenu.style.top = `${menuRect.top + window.scrollY}px`;
    activeSubMenu.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        lastUIMouseDownTime = Date.now();
    });

    const languages = [
        { key: 'en', label: '🇺🇸 English' },
        { key: 'zh', label: '🇨🇳 Chinese' },
        { key: 'ja', label: '🇯🇵 Japanese' },
        { key: 'ko', label: '🇰🇷 Korean' },
        { key: 'es', label: '🇪🇸 Spanish' },
        { key: 'fr', label: '🇫🇷 French' }
    ];

    languages.forEach(lang => {
        const button = document.createElement('button');
        button.textContent = lang.label;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
            console.log("AI Assistant: Language button clicked:", lang.key);
            performTranslation(lang.key);
        });
        button.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
        });
        activeSubMenu.appendChild(button);
    });
    document.body.appendChild(activeSubMenu);
}

// Close extension
function closeExtension() {
    hideAllUI();
}

// Show summary window
function showSummaryWindow() {
    lastUIMouseDownTime = Date.now();
    console.log("AI Assistant: showSummaryWindow called, timestamp updated immediately");

    if (!activeMenu) {
        console.error("AI Assistant: activeMenu is null");
        return;
    }

    // Get menu position
    const menuRect = activeMenu.getBoundingClientRect();
    console.log("AI Assistant: Menu rect:", menuRect);

    // Create summary window
    activeAlternativesWindow = document.createElement('div');
    activeAlternativesWindow.id = 'ai-assistant-summary';
    
    // Calculate position with boundary checking
    const windowWidth = 400;
    const windowHeight = 300; // Estimated height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = menuRect.right + window.scrollX + 10;
    let top = menuRect.top + window.scrollY;
    
    // Adjust horizontal position if would overflow right
    if (left + windowWidth > viewportWidth) {
        left = menuRect.left + window.scrollX - windowWidth - 10;
    }
    
    // Adjust vertical position if would overflow bottom
    if (top + windowHeight > viewportHeight + window.scrollY) {
        top = viewportHeight + window.scrollY - windowHeight - 20;
    }
    
    // Ensure it doesn't go above viewport
    if (top < window.scrollY) {
        top = window.scrollY + 20;
    }
    
    // Ensure it doesn't go left of viewport
    if (left < 10) {
        left = 10;
    }
    
    activeAlternativesWindow.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        z-index: 9999999;
        background-color: #ffffff;
        color: #333;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        padding: 12px;
        max-width: 400px;
        width: 380px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        border: 1px solid #e0e0e0;
        display: block;
        visibility: visible;
    `;

    // Prevent clicks from closing the window
    activeAlternativesWindow.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        lastUIMouseDownTime = Date.now();
    });

    // Show loading state
    activeAlternativesWindow.innerHTML = '<div class="ai-loading">Generating summary...</div>';
    document.body.appendChild(activeAlternativesWindow);

    // Perform summary
    performSummary();
}

// Perform summary
function performSummary() {
    if (!currentSelection) return;

    chrome.runtime.sendMessage({
        type: 'summary',
        text: currentSelection.text
    }, (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
            showError('Summary failed, please try again');
            return;
        }

        displaySummaryResult(response.text);
    });
}

// Display summary result
function displaySummaryResult(responseText) {
    console.log("AI Assistant: displaySummaryResult called with:", responseText);

    if (!activeAlternativesWindow) {
        console.error("AI Assistant: activeAlternativesWindow is null");
        return;
    }

    lastUIMouseDownTime = Date.now();
    console.log("AI Assistant: Updated timestamp in displaySummaryResult");

    // Check if window is still in DOM
    if (!document.body.contains(activeAlternativesWindow)) {
        console.error("AI Assistant: activeAlternativesWindow not in DOM");
        return;
    }

    console.log("AI Assistant: Summary result window found, clearing loading content");

    // Clear loading content
    activeAlternativesWindow.innerHTML = '';

    // Create result display
    const resultContainer = document.createElement('div');
    resultContainer.style.cssText = `
        padding: 16px;
        border-radius: 8px;
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        margin-bottom: 12px;
        max-width: 400px;
    `;

    // Add title
    const title = document.createElement('div');
    title.style.cssText = `
        font-weight: 600;
        color: #495057;
        margin-bottom: 12px;
        font-size: 14px;
    `;
    title.textContent = 'Text Summary:';

    // Add summary content
    const summaryText = document.createElement('div');
    summaryText.style.cssText = `
        line-height: 1.5;
        color: #212529;
        margin-bottom: 12px;
        padding: 12px;
        background-color: #ffffff;
        border-radius: 6px;
        border: 1px solid #dee2e6;
    `;
    summaryText.innerHTML = responseText.trim().replace(/\n/g, '<br>');

    // Add action buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    `;

    // Copy button
    const copyButton = document.createElement('button');
    copyButton.style.cssText = `
        padding: 8px 16px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background-color 0.2s;
    `;
    copyButton.textContent = 'Copy Summary';
    copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("AI Assistant: Summary result copied:", responseText);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(responseText.trim()).then(() => {
                showTemporaryNotification('Summary copied to clipboard');
                hideAllUI();
            }).catch(() => {
                showTemporaryNotification('Failed to copy to clipboard');
            });
        } else {
            showTemporaryNotification('Clipboard not available');
        }
    });
    copyButton.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        lastUIMouseDownTime = Date.now();
    });

    // Close button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
        padding: 8px 16px;
        background-color: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background-color 0.2s;
    `;
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("AI Assistant: Summary result closed");
        hideAllUI();
    });
    closeButton.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        lastUIMouseDownTime = Date.now();
    });

    // Assemble interface
    resultContainer.appendChild(title);
    resultContainer.appendChild(summaryText);
    buttonContainer.appendChild(closeButton);
    buttonContainer.appendChild(copyButton);
    resultContainer.appendChild(buttonContainer);
    activeAlternativesWindow.appendChild(resultContainer);

    console.log("AI Assistant: Successfully created summary result display");

    // Ensure window is visible
    activeAlternativesWindow.style.display = 'block';
    activeAlternativesWindow.style.visibility = 'visible';
}

// Show rewrite window
function showRewriteWindow() {
    lastUIMouseDownTime = Date.now();
    console.log("AI Assistant: showRewriteWindow called, timestamp updated immediately");

    if (!activeMenu) {
        console.error("AI Assistant: activeMenu is null");
        return;
    }

    // Get menu position
    const menuRect = activeMenu.getBoundingClientRect();
    console.log("AI Assistant: Menu rect:", menuRect);

    // Create rewrite window
    activeAlternativesWindow = document.createElement('div');
    activeAlternativesWindow.id = 'ai-assistant-rewrite';
    
    // Calculate position with boundary checking
    const windowWidth = 400;
    const windowHeight = 300; // Estimated height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = menuRect.right + window.scrollX + 10;
    let top = menuRect.top + window.scrollY;
    
    // Adjust horizontal position if would overflow right
    if (left + windowWidth > viewportWidth) {
        left = menuRect.left + window.scrollX - windowWidth - 10;
    }
    
    // Adjust vertical position if would overflow bottom
    if (top + windowHeight > viewportHeight + window.scrollY) {
        top = viewportHeight + window.scrollY - windowHeight - 20;
    }
    
    // Ensure it doesn't go above viewport
    if (top < window.scrollY) {
        top = window.scrollY + 20;
    }
    
    // Ensure it doesn't go left of viewport
    if (left < 10) {
        left = 10;
    }
    
    activeAlternativesWindow.style.left = `${left}px`;
    activeAlternativesWindow.style.top = `${top}px`;

    // Prevent clicks from closing the window
    activeAlternativesWindow.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        lastUIMouseDownTime = Date.now();
    });

    // Show loading state
    activeAlternativesWindow.innerHTML = '<div class="ai-loading">Generating rewrite options...</div>';
    document.body.appendChild(activeAlternativesWindow);

    // Perform rewrite
    performRewrite();
}

// Perform rewrite
function performRewrite() {
    if (!currentSelection) return;

    chrome.runtime.sendMessage({
        type: 'rewrite',
        text: currentSelection.text
    }, (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
            showError('Rewrite failed, please try again');
            return;
        }

        displayAlternatives(response.text);
    });
}

// Perform tone adjustment - direct replacement
function performToneAdjustment(tone, toneLabel) {
    if (!currentSelection) return;

    chrome.runtime.sendMessage({
        type: 'tone',
        text: currentSelection.text,
        tone: tone
    }, (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
            showError('Tone adjustment failed, please try again');
            return;
        }

        // Direct text replacement
        if (replaceSelectedText(response.text)) {
            hideAllUI();
            showTemporaryNotification('Tone adjustment completed');
        } else {
            showError('Text replacement failed');
        }
    });
}

// Perform translation
function performTranslation(targetLang) {
    if (!currentSelection) return;

    chrome.runtime.sendMessage({
        type: 'translate',
        text: currentSelection.text,
        targetLang: targetLang
    }, (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
            showError('Translation failed, please try again');
            return;
        }

        // Always try to replace text directly, regardless of read-only status
        if (replaceSelectedTextInPlace(response.text)) {
            hideAllUI();
            showTemporaryNotification('Translation completed');
        } else {
            // If direct replacement fails, show translation result as fallback
            showTranslationResult(response.text);
        }
    });
}

// Display alternatives for rewrite
function displayAlternatives(responseText) {
    console.log("AI Assistant: displayAlternatives called with:", responseText);

    if (!activeAlternativesWindow) {
        console.error("AI Assistant: activeAlternativesWindow is null");
        return;
    }

    lastUIMouseDownTime = Date.now();
    console.log("AI Assistant: Updated timestamp in displayAlternatives");

    // Check if window is still in DOM
    if (!document.body.contains(activeAlternativesWindow)) {
        console.error("AI Assistant: activeAlternativesWindow not in DOM");
        return;
    }

    console.log("AI Assistant: Alternatives window found, clearing loading content");

    // Clear loading content
    activeAlternativesWindow.innerHTML = '';

    // Parse alternatives - more flexible parsing
    let alternatives = [];

    // Method 1: Try || separator
    if (responseText.includes('||')) {
        alternatives = responseText.split('||').map(alt => alt.trim()).filter(alt => alt.length > 0);
    }
    // Method 2: Try newline separator
    else if (responseText.includes('\n')) {
        alternatives = responseText.split('\n').map(alt => alt.trim()).filter(alt => alt.length > 0);
    }
    // Method 3: If no separators, treat entire response as single option
    else {
        alternatives = [responseText.trim()];
    }

    // Limit to maximum 3 alternatives, but don't duplicate if we have fewer
    if (alternatives.length > 3) {
        alternatives = alternatives.slice(0, 3);
    }

    // Remove any empty alternatives
    alternatives = alternatives.filter(alt => alt && alt.trim().length > 0);

    console.log("AI Assistant: Parsed alternatives:", alternatives);
    console.log("AI Assistant: Number of alternatives:", alternatives.length);

    if (alternatives.length === 0) {
        console.warn("AI Assistant: No alternatives found, showing error message");
        activeAlternativesWindow.innerHTML = '<div class="alternative-item">Failed to generate rewrite options, please try again</div>';
        return;
    }

    // Create clickable items for each alternative
    alternatives.forEach((alt, index) => {
        const item = document.createElement('div');
        item.className = 'alternative-item';
        item.innerHTML = `<strong>Option ${index + 1}:</strong><br>${alt}`;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
            console.log("AI Assistant: Alternative selected:", alt);

            // Direct text replacement
            if (replaceSelectedText(alt)) {
                hideAllUI();
                showTemporaryNotification('Text replaced successfully');
            } else {
                showError('Text replacement failed');
            }
        });

        item.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
            console.log("AI Assistant: Alternative item mousedown, updating timestamp");
        });

        activeAlternativesWindow.appendChild(item);
    });

    console.log("AI Assistant: Successfully created", alternatives.length, "alternative items");

    // Ensure window is visible
    activeAlternativesWindow.style.display = 'block';
    activeAlternativesWindow.style.visibility = 'visible';
}

// Show translation result (for read-only text)
function showTranslationResult(translatedText) {
    if (!activeAlternativesWindow) {
        // Create window if it doesn't exist
        const iconRect = activeIcon ? activeIcon.getBoundingClientRect() : { left: 100, bottom: 100 };

        activeAlternativesWindow = document.createElement('div');
        activeAlternativesWindow.id = 'ai-assistant-alternatives';
        activeAlternativesWindow.style.left = `${iconRect.left + window.scrollX}px`;
        activeAlternativesWindow.style.top = `${iconRect.bottom + window.scrollY + 5}px`;

        activeAlternativesWindow.addEventListener('mousedown', e => {
            e.stopPropagation();
            e.preventDefault();
            lastUIMouseDownTime = Date.now();
        });

        document.body.appendChild(activeAlternativesWindow);
    }

    activeAlternativesWindow.innerHTML = `
        <div style="padding: 16px;">
            <h4 style="margin: 0 0 12px 0; color: #333;">Translation Result</h4>
            <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 12px; line-height: 1.5;">
                ${translatedText}
            </div>
            <button id="copy-translation" style="
                padding: 8px 16px;
                background: #4285f4;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Copy Translation</button>
        </div>
    `;

    document.getElementById('copy-translation').addEventListener('click', () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(translatedText).then(() => {
                showTemporaryNotification('Translation copied to clipboard');
                hideAllUI();
            });
        }
    });
}

// Show error message
function showError(message) {
    if (activeAlternativesWindow) {
        activeAlternativesWindow.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc3545;">
                ❌ ${message}
            </div>
        `;

        setTimeout(() => {
            hideAllUI();
        }, 3000);
    } else {
        showTemporaryNotification(message);
    }
}

// Show temporary notification
function showTemporaryNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4285f4;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 999999;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    notification.textContent = message;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 3000);
}

// Core function: Replace selected text
function replaceSelectedText(newText) {
    if (!currentSelection) {
        console.error('AI Assistant: No current selection');
        return false;
    }

    console.log('AI Assistant: Replacing text:', currentSelection.text.substring(0, 30), '→', newText.substring(0, 30));

    try {
        // Re-focus on original element
        if (currentSelection.element && currentSelection.element.focus) {
            currentSelection.element.focus();
        }

        // Method 1: Try using saved range
        const selection = window.getSelection();
        selection.removeAllRanges();

        try {
            selection.addRange(currentSelection.range);

            // Verify selection is still valid
            const currentSelectedText = selection.toString().trim();
            if (currentSelectedText === currentSelection.text) {
                if (document.execCommand('insertText', false, newText)) {
                    console.log('AI Assistant: Text replaced using saved range');
                    return true;
                }
            }
        } catch (error) {
            console.log('AI Assistant: Saved range invalid, trying alternative methods');
        }

        // Method 2: For input/textarea elements
        if (currentSelection.element &&
            (currentSelection.element.tagName === 'TEXTAREA' || currentSelection.element.tagName === 'INPUT')) {

            const element = currentSelection.element;
            const currentValue = element.value;
            const textIndex = currentValue.indexOf(currentSelection.text);

            if (textIndex !== -1) {
                // Set selection range
                element.setSelectionRange(textIndex, textIndex + currentSelection.text.length);

                // Try using execCommand
                if (document.execCommand('insertText', false, newText)) {
                    console.log('AI Assistant: Text replaced in input element');
                    return true;
                }

                // Direct value manipulation
                element.value = currentValue.substring(0, textIndex) + newText +
                    currentValue.substring(textIndex + currentSelection.text.length);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('AI Assistant: Text replaced using value manipulation');
                return true;
            }
        }

        // Method 3: For contenteditable elements
        if (currentSelection.element && currentSelection.element.isContentEditable) {
            const element = currentSelection.element;
            const innerHTML = element.innerHTML;
            const newHTML = innerHTML.replace(currentSelection.text, newText);

            if (newHTML !== innerHTML) {
                element.innerHTML = newHTML;
                console.log('AI Assistant: Text replaced using innerHTML');
                return true;
            }
        }

        // Method 4: Use clipboard as last resort
        if (navigator.clipboard) {
            navigator.clipboard.writeText(newText).then(() => {
                showTemporaryNotification('Text copied to clipboard, please paste manually (Ctrl+V)');
            });
            return true;
        }

        return false;

    } catch (error) {
        console.error('AI Assistant: Error replacing text:', error);
        return false;
    }
}

// Enhanced function: Replace selected text in place (works for both editable and read-only text)
function replaceSelectedTextInPlace(newText) {
    if (!currentSelection) {
        console.error('AI Assistant: No current selection');
        return false;
    }

    console.log('AI Assistant: Replacing text in place:', currentSelection.text.substring(0, 30), '→', newText.substring(0, 30));

    try {
        // Method 1: Try using saved range (works for most cases including read-only)
        const selection = window.getSelection();
        selection.removeAllRanges();

        try {
            selection.addRange(currentSelection.range);

            // Verify selection is still valid
            const currentSelectedText = selection.toString().trim();
            if (currentSelectedText === currentSelection.text) {
                if (document.execCommand('insertText', false, newText)) {
                    console.log('AI Assistant: Text replaced in place using saved range');
                    return true;
                }
            }
        } catch (error) {
            console.log('AI Assistant: Saved range invalid, trying alternative methods');
        }

        // Method 2: For input/textarea elements
        if (currentSelection.element &&
            (currentSelection.element.tagName === 'TEXTAREA' || currentSelection.element.tagName === 'INPUT')) {

            const element = currentSelection.element;
            const currentValue = element.value;
            const textIndex = currentValue.indexOf(currentSelection.text);

            if (textIndex !== -1) {
                element.setSelectionRange(textIndex, textIndex + currentSelection.text.length);

                if (document.execCommand('insertText', false, newText)) {
                    console.log('AI Assistant: Text replaced in input element');
                    return true;
                }

                // Direct value manipulation
                element.value = currentValue.substring(0, textIndex) + newText +
                    currentValue.substring(textIndex + currentSelection.text.length);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('AI Assistant: Text replaced using value manipulation');
                return true;
            }
        }

        // Method 3: For contenteditable elements
        if (currentSelection.element && currentSelection.element.isContentEditable) {
            const element = currentSelection.element;
            const innerHTML = element.innerHTML;
            const newHTML = innerHTML.replace(currentSelection.text, newText);

            if (newHTML !== innerHTML) {
                element.innerHTML = newHTML;
                console.log('AI Assistant: Text replaced using innerHTML');
                return true;
            }
        }

        // Method 4: Direct DOM text node replacement (for read-only text)
        try {
            const range = currentSelection.range;
            const startContainer = range.startContainer;
            const endContainer = range.endContainer;

            // If selection is within a single text node
            if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
                const textNode = startContainer;
                const originalText = textNode.textContent;
                const startOffset = range.startOffset;
                const endOffset = range.endOffset;

                // Replace the text content
                const newTextContent = originalText.substring(0, startOffset) + newText + originalText.substring(endOffset);
                textNode.textContent = newTextContent;

                console.log('AI Assistant: Text replaced using direct text node manipulation');
                return true;
            }

            // If selection spans multiple nodes, try range replacement
            if (range.deleteContents) {
                range.deleteContents();
                const textNode = document.createTextNode(newText);
                range.insertNode(textNode);

                console.log('AI Assistant: Text replaced using range deleteContents and insertNode');
                return true;
            }
        } catch (error) {
            console.log('AI Assistant: DOM manipulation method failed:', error);
        }

        // Method 5: Try to find and replace in parent element's innerHTML
        if (currentSelection.startContainer && currentSelection.startContainer.parentElement) {
            const parentElement = currentSelection.startContainer.parentElement;
            const originalHTML = parentElement.innerHTML;

            // Simple text replacement in HTML
            if (originalHTML.includes(currentSelection.text)) {
                const newHTML = originalHTML.replace(currentSelection.text, newText);
                if (newHTML !== originalHTML) {
                    parentElement.innerHTML = newHTML;
                    console.log('AI Assistant: Text replaced using parent innerHTML replacement');
                    return true;
                }
            }
        }

        console.log('AI Assistant: All in-place replacement methods failed');
        return false;

    } catch (error) {
        console.error('AI Assistant: Error in replaceSelectedTextInPlace:', error);
        return false;
    }
}

// Hide all UI elements
function hideAllUI() {
    if (activeIcon) {
        activeIcon.remove();
        activeIcon = null;
    }
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
    if (activeSubMenu) {
        activeSubMenu.remove();
        activeSubMenu = null;
    }
    if (activeAlternativesWindow) {
        activeAlternativesWindow.remove();
        activeAlternativesWindow = null;
    }
}


// Initialize script
init();

// ---- Page Translation: receive command from popup ----
try {
    chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
        if (request?.type === 'page_translate') {
            performPageTranslation(request.sourceLang, request.targetLang);
        }
    });
} catch (e) {
    // ignore in non-extension environments
}

function performPageTranslation(sourceLang, targetLang) {
    const container = findMainContentContainer();
    if (!container) return;

    const paragraphs = Array.from(container.querySelectorAll('p, li'))
        .filter(el => el.innerText && el.innerText.trim().length > 0);

    if (paragraphs.length === 0) return;

    const batchSize = 6; // translate a few at a time
    let index = 0;

    const processNextBatch = () => {
        if (index >= paragraphs.length) return;
        const batch = paragraphs.slice(index, index + batchSize);
        index += batchSize;

        const textToTranslate = batch.map(el => el.innerText.trim()).join('\n\n---\n\n');

        chrome.runtime.sendMessage({
            type: 'translate',
            text: textToTranslate,
            sourceLang: sourceLang,
            targetLang: targetLang
        }, (response) => {
            if (!response || response.error || !response.text) {
                return;
            }

            const parts = response.text.split(/\n\s*---\s*\n/);
            batch.forEach((el, i) => {
                const translated = parts[i] || '';
                insertTranslationAfter(el, translated);
            });

            // small delay to keep UI responsive
            setTimeout(processNextBatch, 150);
        });
    };

    processNextBatch();
}

function findMainContentContainer() {
    // common article containers
    const selectors = [
        'article', '#main', '.main', '.content', '.post', '.entry-content',
        '[role="main"]', '.read__content', '.RichText', '.Post', '.story-content'
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return document.body;
}

function insertTranslationAfter(originalEl, translatedText) {
    // avoid duplicate insertion
    const next = originalEl.nextElementSibling;
    if (next && next.classList && next.classList.contains('ai-page-translation')) {
        next.innerText = translatedText;
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'ai-page-translation';
    wrapper.style.cssText = 'margin: 6px 0 14px 0; padding: 10px 12px; background:#f8f9ff; border-left: 3px solid #4285f4; color:#222; line-height:1.6; border-radius:6px;';
    wrapper.innerText = translatedText;
    originalEl.parentNode.insertBefore(wrapper, originalEl.nextSibling);
}