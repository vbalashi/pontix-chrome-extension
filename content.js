// Ensure script only runs once (for multiple injection cases)
if (window.translatorExtensionLoaded) {
    console.log("Translator extension content script already loaded, skipping");
} else {
    window.translatorExtensionLoaded = true;
    
    // Track sidebar state
    let sidebarEnabled = false;
    let sidebarVisible = false;
    let isEdgeImmersiveMode = false;
    
    // Check if we're in Edge immersive reader mode
    function checkEdgeImmersiveMode() {
        // Edge immersive reader typically adds these classes or elements
        return (
            document.documentElement.classList.contains('immersive-reader-view') ||
            document.querySelector('.immersive-reader-content') !== null ||
            window.location.href.includes('read.microsoft.com') ||
            document.querySelector('immersive-reader-app') !== null ||
            window.location.href.includes('immersive-reader.microsoft') ||
            window.location.href.includes('edge://read') ||
            // Check for typical immersive reader DOM structure
            (document.querySelector('div[class*="ImmersiveReader"]') !== null) ||
            (document.querySelector('div[role="document"][aria-label*="Immersive"]') !== null)
        );
    }
    
    // Initialize and check for Edge immersive reader
    function initializeExtension() {
        isEdgeImmersiveMode = checkEdgeImmersiveMode();
        
        // If in immersive mode, we need a different approach
        if (isEdgeImmersiveMode) {
            console.log("Edge immersive reader mode detected");
            // We'll use MutationObserver to detect when content is loaded in immersive mode
            setupImmersiveModeObserver();
            
            // Check for sidebar loading issues after a delay
            setTimeout(() => {
                if (sidebarEnabled && document.getElementById("translator-sidebar")) {
                    ensureSidebarLoaded();
                }
            }, 2000);
        }
        
        // Notify background script that content script is loaded
        try {
            chrome.runtime.sendMessage({ action: "contentScriptLoaded", isImmersiveMode: isEdgeImmersiveMode });
        } catch (e) {
            console.log("Error sending contentScriptLoaded message:", e);
        }
    }
    
    // Setup observer for immersive mode content changes
    function setupImmersiveModeObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // If content is added and sidebar is enabled, make sure it's visible
                    if (sidebarEnabled && !document.getElementById("translator-sidebar")) {
        createSidebar();
                        sidebarVisible = true;
                        
                        // In immersive mode, we need to adjust differently
                        adjustPageForImmersiveMode();
                    }
                }
            }
        });
        
        // Observe changes to the immersive reader container
        const targetNode = document.body;
        observer.observe(targetNode, { childList: true, subtree: true });
    }
    
    // Special adjustment for immersive mode
    function adjustPageForImmersiveMode() {
        // Find the main content container in immersive mode
        const contentContainer = document.querySelector('.immersive-reader-content') || 
                                document.querySelector('.content') || 
                                document.body;
        
        if (contentContainer) {
            // Adjust the width to make room for sidebar
            contentContainer.style.maxWidth = "calc(100% - 300px)";
            contentContainer.style.marginRight = "300px";
        }
    }
    
    // Reset immersive mode adjustments
    function resetImmersiveModeAdjustments() {
        const contentContainer = document.querySelector('.immersive-reader-content') || 
                                document.querySelector('.content') || 
                                document.body;
        
        if (contentContainer) {
            contentContainer.style.maxWidth = "";
            contentContainer.style.marginRight = "";
        }
    }
    
    // Listen for messages from background script with improved error handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Content script received message:", message);
        
        if (message.action === "toggleSidebar") {
            sidebarEnabled = message.enabled;
            
            // If background script detected immersive mode, set the flag
            if (message.isImmersiveMode) {
                isEdgeImmersiveMode = true;
            }
            
            // If we're in immersive mode but it wasn't detected yet, check again
            if (!isEdgeImmersiveMode) {
                isEdgeImmersiveMode = checkEdgeImmersiveMode();
            }
            
            handleSidebarToggle();
            
            // Send a response to let the background script know the message was received
            sendResponse({ success: true });
            return true; // Keep the message channel open for async response
        }
    });
    
    // Handle sidebar toggling logic
    function handleSidebarToggle() {
        if (sidebarEnabled) {
            if (!document.getElementById("translator-sidebar") && !document.getElementById("translator-sidebar-container")) {
                if (isEdgeImmersiveMode) {
                    // Try alternative approach first for immersive mode
                    createImmersiveModeIframe();
                } else {
                    createSidebar();
                }
                sidebarVisible = true;
            } else {
                showSidebar();
            }
            
            // Apply different adjustments based on mode
            if (isEdgeImmersiveMode) {
                adjustPageForImmersiveMode();
            } else {
                // Regular adjustment
                document.body.style.marginRight = "300px";
            }
        } else {
            hideSidebar();
            
            // Reset based on mode
            if (isEdgeImmersiveMode) {
                resetImmersiveModeAdjustments();
            } else {
                // Regular reset
                document.body.style.marginRight = "0";
            }
        }
    }
    
    // Function to create sidebar
function createSidebar() {
    const sidebar = document.createElement("iframe");
    sidebar.id = "translator-sidebar";
    sidebar.src = chrome.runtime.getURL("sidebar.html");
    sidebar.style.position = "fixed";
    sidebar.style.right = "0";
    sidebar.style.top = "0";
    sidebar.style.width = "300px";
    sidebar.style.height = "100vh";
    sidebar.style.border = "none";
        sidebar.style.zIndex = "99999"; // Higher z-index to ensure it's visible
    sidebar.style.background = "white";
        sidebar.style.boxShadow = "-2px 0 5px rgba(0, 0, 0, 0.2)";
        sidebar.style.transition = "transform 0.3s ease-in-out";
        
        // Special handling for Edge immersive reader mode
        if (isEdgeImmersiveMode) {
            // Ensure the sidebar is placed above Edge's immersive reader content
            sidebar.style.zIndex = "2147483647"; // Maximum z-index value
            
            // Target where to insert the sidebar in immersive reader mode
            const immersiveContainer = document.querySelector('.immersive-reader-content') || 
                                      document.body;
            
            // Add special class for identifying in immersive mode
            sidebar.classList.add('translator-immersive-mode');
        }

    document.body.appendChild(sidebar);
        
        // For Edge immersive reader, we need to ensure the iframe loads properly
        if (isEdgeImmersiveMode) {
            // Set a timer to check if the iframe is properly loaded
            setTimeout(() => {
                const iframeWindow = sidebar.contentWindow;
                if (!iframeWindow) {
                    console.log("Iframe not properly loaded, recreating...");
                    document.body.removeChild(sidebar);
                    createSidebar();
                }
            }, 500);
        }
    }
    
    // Function to update data in sidebar
function updateSidebar(word, sentence) {
    // Clean HTML entities from sentence before sending
    sentence = decodeHtmlEntities(sentence);
        
    // Try updating iframe first
    const sidebar = document.getElementById("translator-sidebar");
    if (sidebar) {
        try {
            sidebar.contentWindow.postMessage({ word, sentence }, "*");
        } catch (e) {
            console.log("Error posting message to iframe:", e);
                
            // If posting to iframe fails, try the alternative approach
            updateSidebarAlternative(word, sentence);
                
            // Check if we need to recreate the sidebar
            ensureSidebarLoaded();
        }
    } else {
        // If iframe doesn't exist, check for alternative container
        updateSidebarAlternative(word, sentence);
    }
}
    
    // Function to hide sidebar
    function hideSidebar() {
        const sidebar = document.getElementById("translator-sidebar");
        if (sidebar) {
            sidebar.style.transform = "translateX(300px)";
            sidebarVisible = false;
        }
        
        // Also check for alternative container
        const altContainer = document.getElementById("translator-sidebar-container");
        if (altContainer) {
            altContainer.style.transform = "translateX(300px)";
            sidebarVisible = false;
        }
    }
    
    // Function to show sidebar
    function showSidebar() {
        const sidebar = document.getElementById("translator-sidebar");
        if (sidebar) {
            sidebar.style.transform = "translateX(0)";
            sidebarVisible = true;
        }
        
        // Also check for alternative container
        const altContainer = document.getElementById("translator-sidebar-container");
        if (altContainer) {
            altContainer.style.transform = "translateX(0)";
            sidebarVisible = true;
        }
    }
    
    // Function to ensure sidebar is properly loaded
    function ensureSidebarLoaded() {
        const sidebar = document.getElementById("translator-sidebar");
        
        if (!sidebar) return;
        
        // Try to access the contentWindow to see if it's properly loaded
        try {
            const iframeWindow = sidebar.contentWindow;
            
            // If we can't access contentWindow or it's null, the iframe didn't load properly
            if (!iframeWindow) {
                console.log("Sidebar iframe not properly loaded, recreating...");
                
                // Remove the problematic iframe
                document.body.removeChild(sidebar);
                
                // Create a new one with different technique for immersive reader
                if (isEdgeImmersiveMode) {
                    createImmersiveModeIframe();
                } else {
                    // Regular creation
                    createSidebar();
                }
            }
        } catch (e) {
            console.log("Error accessing iframe contentWindow:", e);
            
            // Fallback creation for immersive reader
            if (isEdgeImmersiveMode) {
                createImmersiveModeIframe();
            }
        }
    }
    
    // Create sidebar with alternative method for immersive reader
    function createImmersiveModeIframe() {
        // Try an alternative approach - directly injecting HTML
        const sidebarContainer = document.createElement("div");
        sidebarContainer.id = "translator-sidebar-container";
        sidebarContainer.style.position = "fixed";
        sidebarContainer.style.right = "0";
        sidebarContainer.style.top = "0";
        sidebarContainer.style.width = "300px";
        sidebarContainer.style.height = "100vh";
        sidebarContainer.style.zIndex = "2147483647";
        sidebarContainer.style.background = "white";
        sidebarContainer.style.boxShadow = "-2px 0 5px rgba(0, 0, 0, 0.2)";
        sidebarContainer.style.transition = "transform 0.3s ease-in-out";
        
        // Fetch sidebar HTML and inject directly
        fetch(chrome.runtime.getURL("sidebar.html"))
            .then(response => response.text())
            .then(html => {
                sidebarContainer.innerHTML = html;
                document.body.appendChild(sidebarContainer);
                
                // We need to manually load the CSS and JS
                const head = sidebarContainer.querySelector('head');
                
                // Add CSS
                const style = document.createElement('link');
                style.rel = 'stylesheet';
                style.href = chrome.runtime.getURL('sidebar.css');
                head.appendChild(style);
                
                // Add JS
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('sidebar.js');
                sidebarContainer.appendChild(script);
            })
            .catch(error => {
                console.error("Failed to load sidebar HTML:", error);
            });
    }
    
    // Function to update data when using direct HTML injection approach
    function updateSidebarAlternative(word, sentence) {
        const container = document.getElementById("translator-sidebar-container");
        
        if (container) {
            const wordElement = container.querySelector("#word");
            const sentenceElement = container.querySelector("#sentence");
            
            if (wordElement) wordElement.textContent = word;
            if (sentenceElement) sentenceElement.textContent = sentence;
        }
    }
    
    // Debounce function to avoid too many selection updates
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }

    // Handle text selection to get words and context
    document.addEventListener("mouseup", debounce((event) => {
        // Only process selection if sidebar is enabled
        if (!sidebarEnabled) return;
        
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === "") return;
        
        // Get the selected word and clean it to avoid punctuation
        let word = selection.toString().trim();
        // Remove trailing punctuation if any
        word = word.replace(/[.,;:!?)"'\]]+$/, '').replace(/^[("'\[]+/, '');
        
        // Don't process if selection is too long to be a word or short phrase
        if (word.split(/\s+/).length > 5) return;
        
        // Get just the sentence containing the selection
        const sentence = extractSentence(selection);
        
        // Create sidebar if it doesn't exist
        let needsCreation = true;
        
        if (document.getElementById("translator-sidebar")) {
            needsCreation = false;
        } else if (document.getElementById("translator-sidebar-container")) {
            needsCreation = false;
        }
        
        if (needsCreation) {
            if (isEdgeImmersiveMode) {
                createImmersiveModeIframe();
            } else {
                createSidebar();
            }
            sidebarVisible = true;
            
            // Apply layout adjustments based on mode
            if (isEdgeImmersiveMode) {
                adjustPageForImmersiveMode();
            } else {
                document.body.style.marginRight = "300px";
            }
        }
        
        // Send data to sidebar
        updateSidebar(word, sentence);
    }, 300));
    
    // Helper function to get normalized text from DOM elements, handling links better
    function getTextFromContainer(container) {
        // Special case handling for paragraph with links
        if (container.tagName === 'P' && container.querySelector('a')) {
            // Clone the node to avoid modifying the original
            const clone = container.cloneNode(true);
            
            // Process all links to ensure they don't break sentence extraction
            const links = clone.querySelectorAll('a');
            links.forEach(link => {
                // Replace link with just its text content
                const textContent = link.textContent;
                // Create a text node to replace the link
                const textNode = document.createTextNode(textContent);
                link.parentNode.replaceChild(textNode, link);
            });
            
            // Return the normalized text
            return decodeHtmlEntities(clone.textContent);
        }
        
        // For other elements, use the tree walker approach
        const textNodes = [];
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        
        let currentNode;
        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }
        
        // Build the full text by concatenating all text nodes
        let fullText = "";
        for (const node of textNodes) {
            fullText += node.textContent + " ";
        }
        
        return decodeHtmlEntities(fullText.trim());
    }
    
    // Helper function to decode HTML entities
    function decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        // Get the decoded content
        const decoded = textarea.value;
        return decoded;
    }

    // Extract just the sentence containing the selected text
    function extractSentence(selection) {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        // Get the start and end nodes
        const startNode = range.startContainer;
        
        // A simpler approach: find the paragraph and then extract the sentence containing our selection
        
        // 1. Find the nearest paragraph or block element
        let paragraph = startNode;
        while (paragraph && 
               (paragraph.nodeType === Node.TEXT_NODE ||
                !['P', 'DIV', 'ARTICLE', 'SECTION', 'LI', 'BLOCKQUOTE', 'TD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(paragraph.tagName))) {
            paragraph = paragraph.parentNode;
            if (!paragraph || paragraph === document.body) break;
        }
        
        // 2. If we found a paragraph, extract its text content
        if (paragraph && paragraph !== document.body) {
            // Special handling for paragraphs with links
            const hasLinks = paragraph.querySelector('a') !== null;
            
            if (hasLinks) {
                // Find all sentences in the paragraph, preserving inline elements
                const sentences = getSentencesFromMixedContent(paragraph);
                
                // Find the sentence that contains our selected text
                for (const sentence of sentences) {
                    if (sentence.includes(selectedText)) {
                        return sentence.trim();
                    }
                }
                
                // If not found directly, try a more precise approach by looking at DOM proximity
                // Get the closest ancestor element that contains the whole selection
                let selectionContainer = startNode;
                if (selectionContainer.nodeType === Node.TEXT_NODE) {
                    selectionContainer = selectionContainer.parentNode;
                }
                
                // Get the text of this container and find the sentence there
                const containerText = selectionContainer.textContent;
                const containerSentences = splitTextIntoSentences(containerText);
                
                for (const sentence of containerSentences) {
                    if (sentence.includes(selectedText)) {
                        return sentence.trim();
                    }
                }
            } else {
                // No links in paragraph, simpler case
                const paragraphText = paragraph.textContent;
                const sentences = splitTextIntoSentences(paragraphText);
                
                for (const sentence of sentences) {
                    if (sentence.includes(selectedText)) {
                        return sentence.trim();
                    }
                }
            }
        }
        
        // Fallback: use the direct context around the selection
        // Get the parent element of the selection
        let parent = startNode;
        if (parent.nodeType === Node.TEXT_NODE) {
            parent = parent.parentNode;
        }
        
        // Get whole text from parent
        const parentText = parent.textContent;
        
        // Try to find the sentence containing the selection
        const sentences = splitTextIntoSentences(parentText);
        for (const sentence of sentences) {
            if (sentence.includes(selectedText)) {
                return sentence.trim();
            }
        }
        
        // Last resort: try to extract a reasonable context around the selection
        // Get the position of the selection in the parent text
        const selectionPos = parentText.indexOf(selectedText);
        if (selectionPos !== -1) {
            // Find the beginning of the sentence
            let sentenceStart = 0;
            for (let i = selectionPos; i > 0; i--) {
                if (parentText[i-1] === '.' || parentText[i-1] === '!' || parentText[i-1] === '?') {
                    sentenceStart = i;
                    break;
                }
            }
            
            // Find the end of the sentence
            let sentenceEnd = parentText.length;
            for (let i = selectionPos + selectedText.length; i < parentText.length; i++) {
                if (parentText[i] === '.' || parentText[i] === '!' || parentText[i] === '?') {
                    sentenceEnd = i + 1;
                    break;
                }
            }
            
            return parentText.substring(sentenceStart, sentenceEnd).trim();
        }
        
        // Ultimate fallback - just return the parent text
        return parentText.trim();
    }
    
    // Helper function to split text into sentences
    function splitTextIntoSentences(text) {
        // First, try regex split on sentence boundaries
        const sentences = text.split(/(?<=[.!?])\s+/);
        
        // If that produces only one result but there are clearly multiple sentences,
        // try a simpler split on punctuation
        if (sentences.length === 1 && (text.includes('. ') || text.includes('! ') || text.includes('? '))) {
            const simpleSplit = [];
            let currentSentence = '';
            
            for (let i = 0; i < text.length; i++) {
                currentSentence += text[i];
                
                if ((text[i] === '.' || text[i] === '!' || text[i] === '?') && 
                    (i === text.length - 1 || text[i+1] === ' ')) {
                    simpleSplit.push(currentSentence.trim());
                    currentSentence = '';
                    i++; // Skip the space
                }
            }
            
            if (currentSentence.trim()) {
                simpleSplit.push(currentSentence.trim());
            }
            
            return simpleSplit;
        }
        
        return sentences;
    }

    // Function to extract sentences from mixed content (text nodes and elements like links)
    function getSentencesFromMixedContent(element) {
        // Create a normalized version of the content that preserves sentence structure
        // but merges text across different nodes
        let fullText = '';
        const textNodes = [];
        
        // Get all text nodes in the element
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
            fullText += node.textContent + ' ';
        }
        
        fullText = decodeHtmlEntities(fullText.trim());
        
        // If the element contains link elements, we need special handling
        if (element.querySelector('a')) {
            // Get the raw HTML as a string
            const html = element.innerHTML;
            
            // Simple parsing approach: build the text without HTML tags
            let plainText = '';
            let inTag = false;
            
            for (let i = 0; i < html.length; i++) {
                if (html[i] === '<') {
                    inTag = true;
                    continue;
                }
                
                if (html[i] === '>') {
                    inTag = false;
                    continue;
                }
                
                if (!inTag) {
                    plainText += html[i];
                }
            }
            
            // Decode HTML entities in the plain text
            plainText = decodeHtmlEntities(plainText);
            
            // Split the plainText into sentences
            return splitTextIntoSentences(plainText);
        }
        
        // Regular case - just split the full text
        return splitTextIntoSentences(fullText);
    }
    
    // Initialize on page load
    initializeExtension();
    
    // Re-check after a delay in case the page changes after initial load (for immersive reader)
    setTimeout(() => {
        if (!isEdgeImmersiveMode && checkEdgeImmersiveMode()) {
            isEdgeImmersiveMode = true;
            console.log("Edge immersive reader detected on delayed check");
            setupImmersiveModeObserver();
        }
    }, 2500);
}
