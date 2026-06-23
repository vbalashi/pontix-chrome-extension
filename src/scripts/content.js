// Ensure script only runs once
if (window.translatorExtensionLoaded) {
    console.log("Pontix content script already loaded, skipping");
} else {
    window.translatorExtensionLoaded = true;

    console.log("🔄 Pontix v4.0 - Native Side Panel Loaded on:", window.location.hostname);

    // Configuration
    let maxWordCount = 25; // Default maximum word count for translation

    // Selection tracking variables
    let lastSelection = "";
    let selectionTimeout = null;
    let isMouseDown = false; // Track mouse state
    let mouseUpTimeout = null; // Additional timeout for mouse release
    let doubleClickTimeout = null; // Track double-click events
    let lastClickTime = 0; // Track timing between clicks
    let lastMouseUpTime = 0; // Track mouse up timing
    let lastProcessedTime = 0; // Track when we last processed a selection
    const DOUBLE_CLICK_DELAY = 400; // Maximum time between clicks to consider it a double-click
    const SELECTION_DELAY = 500; // Delay after mouse release to allow for selection expansion
    const MIN_PROCESS_INTERVAL = 100; // Minimum time between processing selections

    // Initialize extension
    function initializeExtension() {
        console.log("🚀 Initializing Pontix content script...");

        try {
            loadExtensionSettings();
            setupSelectionHandlers();

            // Test if chrome.runtime is available
            if (chrome && chrome.runtime) {
                // Notify background script
                chrome.runtime.sendMessage({
                    action: "contentScriptLoaded",
                    hostname: window.location.hostname,
                    url: window.location.href
                }).catch(e => {
                    console.log("Note: Could not notify background script (extension might be reloading):", e.message);
                });
            }

            console.log("✅ Pontix content script initialized successfully");
        } catch (error) {
            console.error("❌ Error initializing Pontix content script:", error);
        }
    }

    // Load extension settings from storage
    function loadExtensionSettings() {
        try {
            if (chrome && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.get("translatorSettings", (result) => {
                    if (chrome.runtime.lastError) {
                        console.log("Storage error:", chrome.runtime.lastError);
                        return;
                    }

                    if (result.translatorSettings) {
                        if (result.translatorSettings.maxWordCount) {
                            maxWordCount = result.translatorSettings.maxWordCount;
                            console.log("📋 Loaded maxWordCount setting:", maxWordCount);
                        }
                    } else {
                        console.log("📋 Using default settings");
                    }
                });
            }
        } catch (e) {
            console.log("Note: Could not load settings:", e.message);
        }
    }

    // Setup selection handlers
    function setupSelectionHandlers() {
        console.log("🎯 Setting up selection handlers for side panel");

        try {
            // Track mouse state to ensure we wait for button release
            document.addEventListener('mousedown', () => {
                isMouseDown = true;
                console.log("🖱️ Mouse down detected");
            }, { passive: true });

            document.addEventListener('mouseup', (event) => {
                isMouseDown = false;
                const currentTime = Date.now();

                console.log("🖱️ Mouse up detected");

                // Check if this is potentially part of a double-click
                const timeSinceLastClick = currentTime - lastClickTime;
                const isDoubleClick = timeSinceLastClick < DOUBLE_CLICK_DELAY;

                lastClickTime = currentTime;
                lastMouseUpTime = currentTime;

                if (isDoubleClick) {
                    console.log("🖱️ Double-click detected, extending delay to allow for selection expansion");
                    // Clear any existing timeouts
                    if (mouseUpTimeout) clearTimeout(mouseUpTimeout);
                    if (doubleClickTimeout) clearTimeout(doubleClickTimeout);

                    // Set a longer timeout for double-clicks to allow user to expand selection
                    doubleClickTimeout = setTimeout(() => {
                        handleSelectionChange();
                        doubleClickTimeout = null;
                    }, SELECTION_DELAY);
                } else {
                    // Single click - use shorter delay
                    if (mouseUpTimeout) clearTimeout(mouseUpTimeout);
                    mouseUpTimeout = setTimeout(() => {
                        // Check if enough time has passed since last mouse up
                        // This prevents rapid fire selections during text expansion
                        const timeSinceMouseUp = Date.now() - lastMouseUpTime;
                        if (timeSinceMouseUp >= 200) {
                            handleSelectionChange();
                        }
                    }, 200);
                }
            }, { passive: true });

            // Remove the duplicate mouseup listener to avoid double processing
            // document.addEventListener('mouseup', handleSelectionChange, { passive: true });

            // Keep other event types for compatibility
            document.addEventListener('touchend', handleSelectionChange, { passive: true });
            document.addEventListener('keyup', handleSelectionChange, { passive: true });

            // Use passive listener for selectionchange with longer debounce to work well with our new logic
            document.addEventListener('selectionchange', debounce(handleSelectionChange, 400), { passive: true });

            // Add specific handling for sites that use shadow DOM or custom selection
            // Check for Shadow DOM elements
            if (document.querySelector('[data-reactroot]') ||
                document.querySelector('[data-testid]') ||
                window.location.hostname.includes('amazon.com')) {
                console.log("🔍 Detected special site, adding enhanced selection detection");

                // Add capture phase listeners for better compatibility with React/Amazon sites
                // But avoid duplicate mouseup handling by using a flag
                document.addEventListener('mouseup', (event) => {
                    // Only handle if the main mouseup handler hasn't processed this in the last 50ms
                    if (Date.now() - lastMouseUpTime > 50) {
                        handleSelectionChange();
                    }
                }, { capture: true, passive: true });

                document.addEventListener('selectionchange', debounce(handleSelectionChange, 300), { capture: true, passive: true });

                // Also listen on document body for sites that intercept events
                if (document.body) {
                    document.body.addEventListener('touchend', handleSelectionChange, { passive: true });
                }
            }

            console.log("✅ Selection event listeners added");
        } catch (error) {
            console.error("❌ Error setting up selection handlers:", error);
        }

        // Listen for settings updates
        if (chrome && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                try {
                    if (request.action === "updateSettings") {
                        if (request.settings && request.settings.maxWordCount) {
                            maxWordCount = request.settings.maxWordCount;
                            console.log("📋 Updated maxWordCount setting:", maxWordCount);
                        }
                        sendResponse({ success: true });
                    }
                } catch (error) {
                    console.error("Error handling settings update:", error);
                    sendResponse({ success: false, error: error.message });
                }
                return true;
            });
        }
    }

    // Handle selection changes
    function handleSelectionChange() {
        try {
            // Don't process selections while mouse is still down (user is still selecting)
            if (isMouseDown) {
                console.log("⏸️ Mouse still down, waiting for release...");
                return;
            }

            // Clear any existing timeout to prevent multiple rapid calls
            if (selectionTimeout) {
                clearTimeout(selectionTimeout);
            }

            // Use a shorter timeout since we now have better upstream timing control
            selectionTimeout = setTimeout(() => {
                processSelection();
            }, 150); // Reduced from 300ms since we have better control upstream
        } catch (error) {
            console.error("Error in handleSelectionChange:", error);
        }
    }

    // Process the current selection
    function processSelection() {
        try {
            // Prevent rapid duplicate processing
            const currentTime = Date.now();
            if (currentTime - lastProcessedTime < MIN_PROCESS_INTERVAL) {
                console.log("⏸️ Skipping duplicate selection processing (too soon after last processing)");
                return;
            }

            const selection = window.getSelection();
            if (!selection) {
                console.log("No selection object available");
                return;
            }

            let selectedText = selection.toString().trim();

            // Fallback for sites that don't properly expose selection
            if (!selectedText && selection.rangeCount > 0) {
                try {
                    const range = selection.getRangeAt(0);
                    selectedText = range.toString().trim();
                } catch (e) {
                    console.log("Range selection extraction failed:", e);
                }
            }

            // Additional fallback for Amazon and similar sites
            if (!selectedText) {
                // Try to get selected text from any focused element
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    const start = activeElement.selectionStart;
                    const end = activeElement.selectionEnd;
                    if (start !== end) {
                        selectedText = activeElement.value.substring(start, end).trim();
                    }
                }
            }

            // Expand selection to include complete words
            if (selectedText && selection.rangeCount > 0) {
                try {
                    const expandedText = expandToCompleteWords(selection, selectedText);
                    if (expandedText && expandedText !== selectedText) {
                        console.log("🔍 Expanded selection from:", selectedText, "to:", expandedText);
                        selectedText = expandedText;
                    }
                } catch (e) {
                    console.log("Word expansion failed, using original selection:", e);
                }
            }

            // Skip if no selection or same as last selection
            if (!selectedText || selectedText === lastSelection) {
                if (!selectedText && lastSelection) {
                    // Selection was cleared
                    sendToSidePanel("", "");
                    lastSelection = "";
                }
                return;
            }

            // Update tracking variables
            lastSelection = selectedText;
            lastProcessedTime = currentTime;

            // Check word count limit
            const wordCount = selectedText.split(/\s+/).length;
            if (wordCount > maxWordCount) {
                console.log(`⚠️ Selection exceeds word limit: ${wordCount}/${maxWordCount} words`);
                sendToSidePanel("", "", `Selection too long (${wordCount}/${maxWordCount} words)`);
                return;
            }

            // Extract sentence context
            const sentence = extractSentence(selectedText, selection);
            const locator = captureSelectionLocator(selection, selectedText);

            console.log("📝 Text selected:", {
                selectedTextLength: selectedText.length,
                wordCount: wordCount,
                sentenceLength: sentence ? sentence.length : 0,
                hostname: window.location.hostname
            });

            // Send to side panel
            sendToSidePanel(selectedText, sentence, null, locator);
        } catch (error) {
            console.error("Error processing selection:", error);
        }
    }

    // Expand partial word selections to include complete words
    function expandToCompleteWords(selection, originalText) {
        try {
            if (!selection || selection.rangeCount === 0) {
                return originalText;
            }

            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;

            // Get the full text content
            let fullText = '';
            let textNode = null;

            if (container.nodeType === Node.TEXT_NODE) {
                fullText = container.textContent || '';
                textNode = container;
            } else {
                // Find the text node containing our selection
                const walker = document.createTreeWalker(
                    container,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let node;
                while (node = walker.nextNode()) {
                    const nodeText = node.textContent || '';
                    if (nodeText.includes(originalText)) {
                        fullText = nodeText;
                        textNode = node;
                        break;
                    }
                }

                // Fallback: use container's text content
                if (!fullText) {
                    fullText = container.textContent || '';
                }
            }

            if (!fullText || !originalText) {
                return originalText;
            }

            // Find the position of the original selection in the full text
            const selectionIndex = fullText.indexOf(originalText);
            if (selectionIndex === -1) {
                return originalText;
            }

            // Define word boundary characters (non-word characters)
            const wordBoundaryRegex = /[^\w\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u0100-\u017F]/;

            // Find the start of the word by going backwards
            let wordStart = selectionIndex;
            while (wordStart > 0 && !wordBoundaryRegex.test(fullText[wordStart - 1])) {
                wordStart--;
            }

            // Find the end of the word by going forwards
            let wordEnd = selectionIndex + originalText.length;
            while (wordEnd < fullText.length && !wordBoundaryRegex.test(fullText[wordEnd])) {
                wordEnd++;
            }

            // Extract the expanded text
            const expandedText = fullText.substring(wordStart, wordEnd).trim();

            // Only return expanded text if it's actually different and reasonable
            if (expandedText &&
                expandedText !== originalText &&
                expandedText.length > originalText.length &&
                expandedText.length <= originalText.length + 50) { // Prevent excessive expansion

                return expandedText;
            }

            return originalText;
        } catch (error) {
            console.error("Error expanding to complete words:", error);
            return originalText;
        }
    }

    // Send selection data to side panel via background script
    function captureSelectionLocator(selection, selectedText) {
        try {
            if (!selection || selection.rangeCount === 0) return {};
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const root = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
            const containerText = (root?.textContent || container.textContent || '').replace(/\s+/g, ' ').trim();
            if (!containerText) return {};

            const preRange = range.cloneRange();
            preRange.selectNodeContents(root);
            preRange.setEnd(range.startContainer, range.startOffset);
            const rawStart = preRange.toString().replace(/\s+/g, ' ').trim().length;
            const normalizedSelection = String(selectedText || '').replace(/\s+/g, ' ').trim();
            let rangeStart = rawStart;
            if (normalizedSelection && containerText.slice(rawStart, rawStart + normalizedSelection.length) !== normalizedSelection) {
                const nearbyStart = Math.max(0, rawStart - 80);
                const nearby = containerText.indexOf(normalizedSelection, nearbyStart);
                rangeStart = nearby >= 0 ? nearby : containerText.indexOf(normalizedSelection);
            }
            if (rangeStart < 0) return { containerText };
            return {
                containerText,
                rangeStart,
                rangeEnd: rangeStart + normalizedSelection.length,
            };
        } catch (error) {
            console.error("Error capturing selection locator:", error);
            return {};
        }
    }

    function sendToSidePanel(selectedText, sentence, error = null, locator = {}) {
        try {
            if (!chrome || !chrome.runtime) {
                console.error("Chrome runtime not available");
                return;
            }

            console.log('🚀 Content script sending to background:', {
                selectedTextLength: selectedText ? selectedText.length : 0,
                sentenceLength: sentence ? sentence.length : 0,
                error: error,
                hostname: window.location.hostname
            });

            chrome.runtime.sendMessage({
                action: 'textSelected',
                selectedText: selectedText,
                sentence: sentence,
                error: error,
                hostname: window.location.hostname,
                pageUrl: window.location.href,
                pageTitle: document.title || '',
                languageCode: document.documentElement.lang || '',
                navigationId: `${window.location.origin}${window.location.pathname}:${performance.timeOrigin || Date.now()}`,
                containerText: locator.containerText || '',
                rangeStart: locator.rangeStart,
                rangeEnd: locator.rangeEnd,
                source: 'translatorContentScript'
            }).catch(e => {
                console.error("Error sending message to background script:", e);
            });
        } catch (e) {
            console.error("Error sending message to side panel:", e);
        }
    }

    // Extract sentence context from selection
    function extractSentence(selectedText, selection) {
        try {
            if (!selection || selection.rangeCount === 0) {
                return selectedText;
            }

            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;

            // Get the text content of the container
            let containerText = '';
            if (container.nodeType === Node.TEXT_NODE) {
                containerText = container.parentElement?.textContent || container.textContent || '';
            } else {
                containerText = container.textContent || '';
            }

            // Find the selected text within the container
            const selectedIndex = containerText.indexOf(selectedText);
            if (selectedIndex === -1) {
                return selectedText;
            }

            // Extract surrounding sentence
            return extractSentenceFromText(containerText, selectedText, selectedIndex);
        } catch (error) {
            console.error("Error extracting sentence:", error);
            return selectedText;
        }
    }

    // Extract sentence from full text
    function extractSentenceFromText(fullText, selectedText, selectionIndex) {
        try {
            // Define sentence-ending punctuation
            const sentenceEnders = /[.!?]+/g;

            // Find sentence boundaries
            let start = 0;
            let end = fullText.length;

            // Look backwards for sentence start
            for (let i = selectionIndex - 1; i >= 0; i--) {
                if (sentenceEnders.test(fullText[i])) {
                    start = i + 1;
                    break;
                }
            }

            // Look forwards for sentence end
            for (let i = selectionIndex + selectedText.length; i < fullText.length; i++) {
                if (sentenceEnders.test(fullText[i])) {
                    end = i + 1;
                    break;
                }
            }

            // Extract and clean the sentence
            let sentence = fullText.substring(start, end).trim();

            // Clean up extra whitespace
            sentence = sentence.replace(/\s+/g, ' ');

            // Limit sentence length
            if (sentence.length > 500) {
                sentence = sentence.substring(0, 500) + '...';
            }

            return sentence || selectedText;
        } catch (error) {
            console.error("Error extracting sentence from text:", error);
            return selectedText;
        }
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize when DOM is ready
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeExtension, { once: true });
        } else {
            // DOM already loaded, initialize immediately
            setTimeout(initializeExtension, 0);
        }
    } catch (error) {
        console.error("Error setting up initialization:", error);
        // Fallback - try to initialize anyway
        setTimeout(initializeExtension, 100);
    }
}
