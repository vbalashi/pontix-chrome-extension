// Ensure script only runs once (for multiple injection cases)
if (window.translatorExtensionLoaded) {
    console.log("Translator extension content script already loaded, skipping");
} else {
    window.translatorExtensionLoaded = true;
    
    // Version identification for debugging
    console.log("🔄 Translator Extension v4.0 - Configurable Word Limits Loaded");
    console.log("🐛 Debug mode enabled - selection events will be logged");
    console.log("⏰ New behavior: Waits for mouse release/keyboard completion before processing");
    console.log("📊 New feature: Configurable word count limits in settings");
    
    // Track sidebar state
    let sidebarEnabled = false;
    let sidebarVisible = false;
    let isEdgeImmersiveMode = false;
    let currentWord = "";
    let currentSentence = "";
    
    // Configuration
    let maxWordCount = 25; // Default maximum word count for translation
    
    // Flag to track if selection handlers are set up
    let hasSelectionHandlers = false;
    
    // Selection tracking variables
    let lastSelection = "";
    let lastProcessedSelection = "";
    let isSelecting = false;
    let isMouseDown = false;
    let selectionTimeout = null;
    
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
    
    // Enhanced detection for Angular readers and dynamic content
    function checkAngularReaderMode() {
        return (
            document.querySelector('[ng-app]') !== null ||
            document.querySelector('[data-ng-app]') !== null ||
            document.querySelector('body[ng-app]') !== null ||
            window.angular !== undefined ||
            // Check for common reader containers
            document.querySelector('.content') !== null ||
            document.querySelector('#content') !== null ||
            document.querySelector('[class*="reader"]') !== null ||
            document.querySelector('[class*="book"]') !== null ||
            document.querySelector('[ng-view]') !== null
        );
    }
    
    // Initialize and check for Edge immersive reader
    function initializeExtension() {
        isEdgeImmersiveMode = checkEdgeImmersiveMode();
        const isAngularReader = checkAngularReaderMode();
        
        console.log("🔍 Detected environments:", { 
            isEdgeImmersiveMode, 
            isAngularReader,
            hasAngular: typeof angular !== 'undefined',
            hasNgView: !!document.querySelector('[ng-view]')
        });
        
        // Load settings from storage
        loadExtensionSettings();
        
        // For Angular apps, we need to wait for content to load
        if (isAngularReader) {
            console.log("📚 Angular reader detected, setting up enhanced observers");
            setupAngularContentObserver();
            
            // Also wait for Angular to bootstrap
            if (typeof angular !== 'undefined') {
                // Wait for Angular to be ready
                setTimeout(() => {
                    setupSelectionHandlers();
                    monitorExistingIframes(); // Check for EPUB iframes
                }, 2000);
            } else {
                // If Angular isn't loaded yet, wait longer
                setTimeout(() => {
                    setupSelectionHandlers();
                    monitorExistingIframes(); // Check for EPUB iframes
                }, 5000);
            }
            
            // Set up aggressive monitoring as fallback for copy-protected content
            setTimeout(() => {
                setupAggressiveSelectionMonitoring();
            }, 3000);
        } else if (isEdgeImmersiveMode) {
            console.log("Edge immersive reader mode detected");
            // We'll use MutationObserver to detect when content is loaded in immersive mode
            setupImmersiveModeObserver();
            
            // Check for sidebar loading issues after a delay
            setTimeout(() => {
                if (sidebarEnabled && document.getElementById("translator-sidebar")) {
                    ensureSidebarLoaded();
                }
            }, 2000);
        } else {
            // Standard setup for regular pages
            setupSelectionHandlers();
        }
        
        // Notify background script
        try {
            chrome.runtime.sendMessage({ 
                action: "contentScriptLoaded", 
                isImmersiveMode: isEdgeImmersiveMode,
                isAngularReader: isAngularReader
            });
        } catch (e) {
            console.log("Error sending contentScriptLoaded message:", e);
        }
    }
    
    // Load extension settings from storage
    function loadExtensionSettings() {
        try {
            chrome.storage.sync.get("translatorSettings", (result) => {
                if (result.translatorSettings && result.translatorSettings.maxWordCount) {
                    maxWordCount = result.translatorSettings.maxWordCount;
                    console.log("📋 Loaded maxWordCount setting:", maxWordCount);
                } else {
                    console.log("📋 Using default maxWordCount:", maxWordCount);
                }
            });
        } catch (e) {
            console.log("Error loading settings:", e);
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
    
    // Enhanced observer for Angular content changes
    function setupAngularContentObserver() {
        let layoutAdjusted = false; // Prevent infinite loop
        let initialContentLoaded = false;
        let iframeMonitored = false;
        
        const observer = new MutationObserver((mutations) => {
            let significantContentChanged = false;
            
            // Only trigger on significant content changes, not style changes
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if meaningful text content was added (not just our own modifications)
                    for (const node of mutation.addedNodes) {
                        // Skip if this is our own sidebar
                        if (node.id === 'translator-sidebar' || node.id === 'translator-sidebar-container') {
                            continue;
                        }
                        
                        // Check for EPUB iframe content
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IFRAME' && 
                            (node.src.includes('xhtml') || node.src.includes('component') || node.src.includes('OEBPS') || node.src.includes('nubereader'))) {
                            console.log("📖 EPUB iframe detected:", node.src);
                            setupIframeMonitoring(node);
                            significantContentChanged = true;
                            break;
                        }
                        
                        // Look for text content that indicates reader content
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 20) {
                            significantContentChanged = true;
                            break;
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if this element contains substantial text content
                            const textContent = node.textContent || '';
                            if (textContent.trim().length > 50 && 
                                !node.classList.contains('translator-') && // Skip our own elements
                                !node.style.marginRight) { // Skip elements we've already modified
                                significantContentChanged = true;
                                break;
                            }
                            
                            // Check for iframes within this element
                            const iframes = node.querySelectorAll('iframe[src*="xhtml"], iframe[src*="component"], iframe[src*="OEBPS"], iframe[src*="nubereader"]');
                            if (iframes.length > 0 && !iframeMonitored) {
                                console.log("📖 Found EPUB iframes in element:", iframes.length);
                                iframes.forEach(iframe => setupIframeMonitoring(iframe));
                                iframeMonitored = true;
                                significantContentChanged = true;
                            }
                        }
                    }
                }
            }
            
            if (significantContentChanged && !layoutAdjusted) {
                console.log("📖 Significant reader content detected, setting up extension");
                layoutAdjusted = true;
                
                // Wait a bit for Angular to finish loading content
                setTimeout(() => {
                    // Set up selection handlers if needed and sidebar is enabled
                    if (sidebarEnabled && !hasSelectionHandlers) {
                        console.log("🎯 Setting up selection handlers for Angular content");
                        setupSelectionHandlers();
                    }
                    
                    // Adjust layout if sidebar is visible
                    if (sidebarEnabled && sidebarVisible) {
                        adjustPageLayoutForReader();
                    }
                    
                    // Also monitor existing iframes
                    monitorExistingIframes();
                    
                    initialContentLoaded = true;
                }, 1000);
            }
        });
        
        // Observe only specific changes to avoid infinite loops
        observer.observe(document.body, { 
            childList: true, 
            subtree: true
            // Removed characterData: true to reduce noise
        });
        
        // Set a timeout to enable layout adjustments again if needed
        setTimeout(() => {
            if (!initialContentLoaded) {
                console.log("📚 Angular content loading timeout, enabling layout adjustments");
                layoutAdjusted = false;
            }
        }, 10000);
    }
    
    // Monitor existing EPUB iframes
    function monitorExistingIframes() {
        console.log("🔍 === IFRAME DETECTION DEBUG START ===");
        console.log("🔍 Document readyState:", document.readyState);
        console.log("🔍 Document URL:", window.location.href);
        
        // Try multiple iframe selectors
        const selectors = [
            'iframe[src*="xhtml"]',
            'iframe[src*="component"]', 
            'iframe[src*="epub"]',
            'iframe[src*="OEBPS"]',
            'iframe[src^="/nubereader"]',  // Relative URLs starting with /nubereader
            'iframe[src*="nubereader"]',   // Any URL containing nubereader
            'iframe#epubContentIframe',    // Target by ID
            'iframe[id*="epub"]',          // IDs containing epub
            'iframe[id*="content"]',       // IDs containing content
            'iframe',  // All iframes
        ];
        
        selectors.forEach(selector => {
            const iframes = document.querySelectorAll(selector);
            console.log(`🔍 Selector "${selector}" found:`, iframes.length, 'iframes');
            
            iframes.forEach((iframe, index) => {
                console.log(`🔍 Iframe ${index}:`, {
                    src: iframe.src,
                    id: iframe.id,
                    className: iframe.className,
                    offsetParent: iframe.offsetParent,
                    style_display: iframe.style.display,
                    computed_display: window.getComputedStyle(iframe).display
                });
            });
        });
        
        // Check all elements that might contain iframes
        const containers = document.querySelectorAll('div, section, article, [ng-view]');
        console.log("🔍 Checking", containers.length, "potential iframe containers");
        
        let foundInContainers = 0;
        containers.forEach((container, index) => {
            const iframes = container.querySelectorAll('iframe');
            if (iframes.length > 0) {
                foundInContainers += iframes.length;
                console.log(`🔍 Container ${index} (${container.tagName}.${container.className}) has ${iframes.length} iframes`);
                iframes.forEach((iframe, iIndex) => {
                    console.log(`🔍   Iframe ${iIndex} src:`, iframe.src);
                });
            }
        });
        
        console.log("🔍 Total iframes found in containers:", foundInContainers);
        
        // Log all script tags and their content to see if iframe creation is happening via JS
        const scripts = document.querySelectorAll('script');
        console.log("🔍 Found", scripts.length, "script tags");
        scripts.forEach((script, index) => {
            if (script.textContent.includes('iframe') || script.textContent.includes('xhtml')) {
                console.log(`🔍 Script ${index} contains iframe references:`, script.textContent.substring(0, 200));
            }
        });
        
        console.log("🔍 === IFRAME DETECTION DEBUG END ===");
        
        // Setup periodic checking
        let checkCount = 0;
        const maxChecks = 10;
        const checkInterval = setInterval(() => {
            checkCount++;
            console.log(`🔍 Periodic iframe check #${checkCount}`);
            
            const allIframes = document.querySelectorAll('iframe');
            console.log(`🔍 Found ${allIframes.length} total iframes on check #${checkCount}`);
            
            allIframes.forEach((iframe, index) => {
                if (!iframe.dataset.translatorChecked) {
                    iframe.dataset.translatorChecked = 'true';
                    console.log(`🔍 NEW iframe found:`, {
                        index,
                        src: iframe.src,
                        id: iframe.id,
                        className: iframe.className
                    });
                    
                    // Enhanced detection for EPUB iframes
                    const isEpubIframe = 
                        (iframe.src && (iframe.src.includes('xhtml') || iframe.src.includes('component') || iframe.src.includes('OEBPS') || iframe.src.includes('nubereader'))) ||
                        (iframe.id && (iframe.id.includes('epub') || iframe.id.includes('content') || iframe.id === 'epubContentIframe')) ||
                        (!iframe.src && iframe.id); // Empty src with ID likely means dynamic content loading
                    
                    if (isEpubIframe) {
                        console.log("🎯 EPUB iframe detected during periodic check!");
                        setupIframeMonitoring(iframe);
                    }
                }
            });
            
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                console.log("🔍 Periodic iframe checking completed");
            }
        }, 1000);
        
        // Enhanced EPUB iframe detection - include ID-based selectors
        const iframes = document.querySelectorAll(`
            iframe[src*="xhtml"], 
            iframe[src*="component"], 
            iframe[src*="epub"], 
            iframe[src*="OEBPS"], 
            iframe[src*="nubereader"],
            iframe#epubContentIframe,
            iframe[id*="epub"],
            iframe[id*="content"]
        `);
        console.log("🔍 Found existing EPUB iframes:", iframes.length);
        
        iframes.forEach(iframe => {
            setupIframeMonitoring(iframe);
        });
        
        // Also check for iframes without src that might be content iframes
        const emptySrcIframes = document.querySelectorAll('iframe:not([src]), iframe[src=""]');
        console.log("🔍 Found iframes with empty src:", emptySrcIframes.length);
        
        emptySrcIframes.forEach(iframe => {
            if (iframe.id && (iframe.id.includes('epub') || iframe.id.includes('content') || iframe.id === 'epubContentIframe')) {
                console.log("🎯 Empty src EPUB iframe detected:", iframe.id);
                setupIframeMonitoring(iframe);
            }
        });
        
        // Also monitor for dynamically created iframes
        setTimeout(() => {
            const newIframes = document.querySelectorAll(`
                iframe[src*="xhtml"], 
                iframe[src*="component"], 
                iframe[src*="epub"], 
                iframe[src*="OEBPS"], 
                iframe[src*="nubereader"],
                iframe#epubContentIframe,
                iframe[id*="epub"],
                iframe[id*="content"]
            `);
            newIframes.forEach(iframe => {
                if (!iframe.dataset.translatorMonitored) {
                    setupIframeMonitoring(iframe);
                }
            });
        }, 2000);
    }

    // Setup monitoring for EPUB iframe content
    function setupIframeMonitoring(iframe) {
        if (iframe.dataset.translatorMonitored) {
            return; // Already monitoring this iframe
        }
        
        iframe.dataset.translatorMonitored = 'true';
        console.log("🔧 Setting up iframe monitoring for:", iframe.src || iframe.id || 'unnamed iframe');
        
        // Function to try accessing iframe content
        function tryAccessIframeContent() {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc && iframeDoc.body) {
                    console.log("✅ Successfully accessed iframe content");
                    
                    // Override selection blocking in iframe
                    const style = iframeDoc.createElement('style');
                    style.textContent = `
                        * {
                            -webkit-user-select: text !important;
                            -moz-user-select: text !important;
                            user-select: text !important;
                            -webkit-touch-callout: default !important;
                        }
                        body, div, p, span {
                            pointer-events: auto !important;
                            -webkit-user-select: text !important;
                            -moz-user-select: text !important;
                            user-select: text !important;
                        }
                    `;
                    iframeDoc.head.appendChild(style);
                    
                    // Add selection handlers to iframe
                    setupIframeSelectionHandlers(iframeDoc, iframe);
                    
                    return true;
                } else {
                    console.log("⚠️ Cannot access iframe content (cross-origin or not loaded)");
                    return false;
                }
            } catch (error) {
                console.log("⚠️ Iframe access error:", error.message);
                return false;
            }
        }
        
        // Try to access iframe content when loaded
        iframe.addEventListener('load', () => {
            console.log("🔄 Iframe load event fired");
            setTimeout(() => {
                if (!tryAccessIframeContent()) {
                    setupAggressiveSelectionMonitoring();
                }
            }, 100);
        });
        
        // For iframes with empty src, set up MutationObserver to watch for content changes
        if (!iframe.src || iframe.src === '') {
            console.log("📝 Setting up MutationObserver for empty src iframe:", iframe.id);
            
            // Check periodically if content gets loaded
            let retryCount = 0;
            const maxRetries = 20;
            const retryInterval = setInterval(() => {
                retryCount++;
                console.log(`🔄 Retry ${retryCount}: Checking if iframe content is loaded`);
                
                if (tryAccessIframeContent()) {
                    clearInterval(retryInterval);
                    console.log("✅ Iframe content successfully loaded and monitored");
                } else if (retryCount >= maxRetries) {
                    clearInterval(retryInterval);
                    console.log("⚠️ Max retries reached, falling back to aggressive monitoring");
                    setupAggressiveSelectionMonitoring();
                }
            }, 500);
        }
        
        // If iframe is already loaded
        if (iframe.contentDocument) {
            iframe.dispatchEvent(new Event('load'));
        }
    }

    // Setup selection handlers specifically for iframe content
    function setupIframeSelectionHandlers(iframeDoc, iframe) {
        console.log("🎯 Setting up iframe selection handlers");
        
        // Enhanced selection monitoring for iframe
        iframeDoc.addEventListener('selectionchange', () => {
            if (!sidebarEnabled) return;
            
            const selection = iframeDoc.getSelection();
            const currentSelection = selection.toString().trim();
            
            if (currentSelection && currentSelection.length > 0) {
                console.log("📝 Iframe selection detected:", currentSelection.substring(0, 30) + "...");
                
                // Process the selection
                setTimeout(() => {
                    if (selection && currentSelection && 
                        selection.rangeCount > 0 && 
                        !selection.isCollapsed &&
                        currentSelection !== lastProcessedSelection) {
                        
                        console.log("✅ Processing iframe selection");
                        processSelection(selection);
                        lastProcessedSelection = currentSelection;
                    }
                }, 100);
            }
        });
        
        // Mouse events on iframe
        iframeDoc.addEventListener('mouseup', () => {
            if (!sidebarEnabled) return;
            
            setTimeout(() => {
                const selection = iframeDoc.getSelection();
                const currentSelection = selection.toString().trim();
                
                if (selection && currentSelection && 
                    selection.rangeCount > 0 && 
                    !selection.isCollapsed &&
                    currentSelection !== lastProcessedSelection) {
                    
                    console.log("✅ Processing iframe mouse selection");
                    processSelection(selection);
                    lastProcessedSelection = currentSelection;
                }
            }, 150);
        });
    }

    // Aggressive selection monitoring as fallback
    function setupAggressiveSelectionMonitoring() {
        console.log("🚀 Setting up aggressive selection monitoring");
        
        // Monitor clipboard events as fallback
        document.addEventListener('copy', (event) => {
            console.log("📋 Copy event detected!");
            if (!sidebarEnabled) {
                console.log("📋 Copy event: sidebar not enabled");
                return;
            }
            
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            console.log("📋 Copy event selection:", {
                hasSelection: !!selectedText,
                length: selectedText.length,
                text: selectedText.substring(0, 50) + "...",
                rangeCount: selection.rangeCount
            });
            
            if (selectedText && selectedText !== lastProcessedSelection) {
                console.log("📋 Copy event detected, processing selection");
                processSelection(selection);
                lastProcessedSelection = selectedText;
            }
        });
        
        // Monitor keyboard shortcuts that might indicate selection
        document.addEventListener('keydown', (event) => {
            if (!sidebarEnabled) return;
            
            // Ctrl+C or Ctrl+A
            if (event.ctrlKey && (event.key === 'c' || event.key === 'a')) {
                console.log("⌨️ Keyboard shortcut detected:", event.key);
                setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    
                    console.log("⌨️ Keyboard shortcut selection check:", {
                        key: event.key,
                        hasSelection: !!selectedText,
                        length: selectedText.length,
                        text: selectedText.substring(0, 30) + "...",
                        rangeCount: selection.rangeCount
                    });
                    
                    if (selectedText && selectedText !== lastProcessedSelection) {
                        console.log("⌨️ Keyboard shortcut selection detected");
                        processSelection(selection);
                        lastProcessedSelection = selectedText;
                    }
                }, 100);
            }
        });
        
        // Periodic selection check as ultimate fallback
        let selectionCheckInterval = setInterval(() => {
            if (!sidebarEnabled) {
                clearInterval(selectionCheckInterval);
                return;
            }
            
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText && selectedText.length > 2 && selectedText !== lastProcessedSelection) {
                console.log("🔄 Periodic check found selection:", {
                    length: selectedText.length,
                    text: selectedText.substring(0, 30) + "...",
                    rangeCount: selection.rangeCount,
                    isCollapsed: selection.isCollapsed
                });
                processSelection(selection);
                lastProcessedSelection = selectedText;
            } else if (selectedText && selectedText.length > 2) {
                // Debug: selection exists but already processed
                console.log("🔄 Periodic check: selection exists but already processed:", selectedText.substring(0, 20) + "...");
            } else if (!selectedText) {
                // Debug: no selection found
                console.log("🔄 Periodic check: no selection found");
            }
        }, 2000); // Check every 2 seconds
        
        console.log("🚀 Aggressive selection monitoring setup complete");
    }
    
    // Enhanced page layout adjustment for readers
    function adjustPageLayoutForReader() {
        console.log("🎨 Adjusting page layout for reader");
        
        // Prevent recursive calls
        if (document.body.dataset.translatorLayoutAdjusted === 'true') {
            console.log("⚠️ Layout already adjusted, skipping");
            return;
        }
        
        // Create a CSS style element for more reliable styling
        let styleElement = document.getElementById('translator-layout-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'translator-layout-styles';
            document.head.appendChild(styleElement);
        }
        
        // CSS rules that will override Angular's styles
        const cssRules = `
            /* Main content containers */
            [ng-view] {
                margin-right: 320px !important;
                max-width: calc(100vw - 340px) !important;
                transition: margin-right 0.3s ease, max-width 0.3s ease !important;
            }
            
            /* Additional selectors for common reader layouts */
            .content,
            #content,
            main,
            .main-content,
            .page-content,
            .reader-content {
                margin-right: 320px !important;
                max-width: calc(100vw - 340px) !important;
                transition: margin-right 0.3s ease, max-width 0.3s ease !important;
            }
            
            /* Ensure body doesn't get too narrow */
            body {
                margin-right: 0 !important;
                transition: all 0.3s ease !important;
            }
            
            /* Handle any iframe content */
            iframe[src*="xhtml"] {
                margin-right: 0 !important;
                max-width: 100% !important;
            }
            
            /* Override text selection blocking */
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
                -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
            }
            
            /* Re-enable context menu and copy */
            body, div, p, span, iframe {
                pointer-events: auto !important;
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                user-select: text !important;
            }
            
            /* Ensure the translator sidebar has proper styling */
            #translator-sidebar,
            #translator-sidebar-container {
                position: fixed !important;
                right: 0 !important;
                top: 0 !important;
                width: 300px !important;
                height: 100vh !important;
                z-index: 2147483647 !important;
                background: white !important;
                box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2) !important;
                border: none !important;
            }
        `;
        
        styleElement.textContent = cssRules;
        console.log("✅ Applied CSS-based layout adjustments");
        
        // Try multiple selectors for reader content - but now just for logging
        const possibleContainers = [
            '[ng-view]',
            '.content',
            '#content',
            '[class*="reader"]',
            '[class*="book"]',
            '[class*="text"]',
            'main',
            '.main-content',
            '.page-content',
            '.reader-content'
        ];
        
        let contentContainer = null;
        
        for (const selector of possibleContainers) {
            contentContainer = document.querySelector(selector);
            if (contentContainer && !contentContainer.dataset.translatorModified) {
                console.log("📍 Found content container:", selector);
                
                // Store original styles for restoration and mark as modified
                if (!contentContainer.dataset.originalMargin) {
                    contentContainer.dataset.originalMargin = contentContainer.style.marginRight || '';
                    contentContainer.dataset.originalMaxWidth = contentContainer.style.maxWidth || '';
                    contentContainer.dataset.originalWidth = contentContainer.style.width || '';
                }
                contentContainer.dataset.translatorModified = 'true';
                break;
            }
        }
        
        // Also apply inline styles as backup (with !important via style attribute)
        if (contentContainer) {
            // Force the styles via setAttribute to ensure they stick
            const currentStyle = contentContainer.getAttribute('style') || '';
            const newStyle = currentStyle + 
                '; margin-right: 320px !important; max-width: calc(100vw - 340px) !important; transition: all 0.3s ease !important;';
            contentContainer.setAttribute('style', newStyle);
            console.log("✅ Applied inline style backup to container");
        }
        
        // Mark body as adjusted
        document.body.dataset.translatorLayoutAdjusted = 'true';
        console.log("✅ Layout adjustment completed with CSS injection");
    }
    
    // Reset page layout adjustments
    function resetPageLayoutAdjustments() {
        console.log("🔄 Resetting page layout");
        
        // Remove the CSS style element
        const styleElement = document.getElementById('translator-layout-styles');
        if (styleElement) {
            styleElement.remove();
            console.log("✅ Removed CSS-based layout styles");
        }
        
        // Reset all possible containers
        const possibleContainers = [
            '[ng-view]',
            '.content',
            '#content',
            '[class*="reader"]',
            '[class*="book"]',
            '[class*="text"]',
            'main',
            '.main-content',
            '.page-content',
            '.reader-content'
        ];
        
        possibleContainers.forEach(selector => {
            const container = document.querySelector(selector);
            if (container && container.dataset.originalMargin !== undefined) {
                // Restore original styles
                container.style.marginRight = container.dataset.originalMargin;
                container.style.maxWidth = container.dataset.originalMaxWidth;
                container.style.width = container.dataset.originalWidth;
                
                // Clean up any added inline styles
                const currentStyle = container.getAttribute('style') || '';
                const cleanedStyle = currentStyle
                    .replace(/;\s*margin-right:[^;]+!important/g, '')
                    .replace(/;\s*max-width:[^;]+!important/g, '')
                    .replace(/;\s*transition:[^;]+!important/g, '');
                
                if (cleanedStyle.trim()) {
                    container.setAttribute('style', cleanedStyle);
                } else {
                    container.removeAttribute('style');
                }
                
                // Clean up data attributes
                delete container.dataset.originalMargin;
                delete container.dataset.originalMaxWidth;
                delete container.dataset.originalWidth;
                delete container.dataset.translatorModified;
                
                console.log("✅ Reset container:", selector);
            }
        });
        
        // Reset body
        if (document.body.dataset.originalMargin !== undefined) {
            document.body.style.marginRight = document.body.dataset.originalMargin;
            delete document.body.dataset.originalMargin;
        }
        
        // Remove layout adjustment flag
        delete document.body.dataset.translatorLayoutAdjusted;
        console.log("✅ Page layout reset completed");
    }
    
    // Setup selection event handlers
    function setupSelectionHandlers() {
        if (hasSelectionHandlers) {
            console.log("⚠️ Selection handlers already set up");
            return;
        }
        
        console.log("🎯 Setting up enhanced selection handlers for Angular");
        
        // Enhanced selection change handler
        const enhancedSelectionChange = debounce(() => {
            if (!sidebarEnabled) return;
            
            const selection = window.getSelection();
            const currentSelection = selection.toString().trim();
            
            if (currentSelection && currentSelection.length > 0 && !isMouseDown) {
                console.log("📝 Selection detected:", currentSelection.substring(0, 30) + "...");
                lastSelection = currentSelection;
            }
        }, 100);
        
        // Listen for selection changes with debouncing
        document.addEventListener("selectionchange", enhancedSelectionChange);
        
        // Enhanced mouse handling for Angular apps
        let mouseDownTime = 0;
        
        document.addEventListener("mousedown", (event) => {
            mouseDownTime = Date.now();
            if (selectionTimeout) {
                clearTimeout(selectionTimeout);
            }
            isSelecting = false;
            isMouseDown = true;
            console.log("🖱️ Mouse down detected");
        });
        
        // Enhanced mouse up with better timing for Angular
        document.addEventListener("mouseup", (event) => {
            const mouseUpTime = Date.now();
            const selectionDuration = mouseUpTime - mouseDownTime;
            
            isMouseDown = false;
            
            if (!sidebarEnabled) {
                console.log("⚠️ Sidebar not enabled, skipping mouseup processing");
                return;
            }
            
            // Longer delay for Angular apps to ensure selection is stable
            setTimeout(() => {
                const selection = window.getSelection();
                const currentSelection = selection.toString().trim();
                
                console.log("🖱️ Mouse up analysis:", { 
                    hasSelection: !!currentSelection,
                    selectionLength: currentSelection.length,
                    duration: selectionDuration,
                    rangeCount: selection.rangeCount,
                    isCollapsed: selection.isCollapsed,
                    text: currentSelection.substring(0, 50) + "..."
                });
                
                // Process selection with additional validation for Angular
                if (selection && currentSelection && 
                    selection.rangeCount > 0 && 
                    !selection.isCollapsed &&
                    currentSelection !== lastProcessedSelection &&
                    currentSelection.length >= 2 && // Minimum length
                    selectionDuration > 50) { // Must be intentional selection
                    
                    console.log("✅ Processing valid Angular selection:", currentSelection.substring(0, 50) + "...");
                    processSelection(selection);
                    lastProcessedSelection = currentSelection;
                    lastSelection = currentSelection;
                }
            }, 150); // Longer delay for Angular apps
        });
        
        // Enhanced keyboard selection for Angular
        document.addEventListener("keyup", (event) => {
            if (!sidebarEnabled) return;
            
            // More comprehensive key detection for Angular apps
            const selectionKeys = [
                "Shift", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
                "Home", "End", "PageUp", "PageDown"
            ];
            
            const isSelectionKey = selectionKeys.includes(event.key) || 
                                 (event.ctrlKey && event.key === "a") ||
                                 (event.ctrlKey && event.key === "A");
            
            if (isSelectionKey) {
                // Longer timeout for Angular apps
                setTimeout(() => {
                    const selection = window.getSelection();
                    const currentSelection = selection.toString().trim();
                    
                    console.log("⌨️ Keyboard selection check:", { 
                        key: event.key,
                        hasSelection: !!currentSelection,
                        selectionLength: currentSelection.length,
                        text: currentSelection.substring(0, 30) + "..."
                    });
                    
                    if (selection && currentSelection && 
                        selection.rangeCount > 0 && 
                        !selection.isCollapsed &&
                        currentSelection !== lastProcessedSelection &&
                        !isMouseDown) {
                        
                        console.log("✅ Processing keyboard selection in Angular");
                        processSelection(selection);
                        lastProcessedSelection = currentSelection;
                    }
                }, 300); // Even longer delay for keyboard in Angular
            }
        });
        
        // Add double-click handler for quick word selection in Angular
        document.addEventListener("dblclick", (event) => {
            if (!sidebarEnabled) return;
            
            setTimeout(() => {
                const selection = window.getSelection();
                const currentSelection = selection.toString().trim();
                
                if (selection && currentSelection && 
                    selection.rangeCount > 0 && 
                    !selection.isCollapsed &&
                    currentSelection !== lastProcessedSelection) {
                    
                    console.log("🖱️ Processing double-click selection in Angular");
                    processSelection(selection);
                    lastProcessedSelection = currentSelection;
                }
            }, 100);
        });
        
        hasSelectionHandlers = true;
        console.log("✅ Enhanced selection handlers set up successfully for Angular");
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
        
        if (message.action === "updateSettings") {
            if (message.settings && message.settings.maxWordCount) {
                maxWordCount = message.settings.maxWordCount;
                console.log("📋 Updated maxWordCount setting from sidebar:", maxWordCount);
            }
            sendResponse({ success: true });
            return true;
        }
    });
    
    // Update the sidebar toggle handler
    function handleSidebarToggle() {
        if (sidebarEnabled) {
            if (!document.getElementById("translator-sidebar") && !document.getElementById("translator-sidebar-container")) {
                if (isEdgeImmersiveMode) {
                    createImmersiveModeIframe();
                } else {
                    createSidebar();
                }
                sidebarVisible = true;
            } else {
                showSidebar();
            }
            
            // Apply appropriate layout adjustments
            if (isEdgeImmersiveMode) {
                adjustPageForImmersiveMode();
            } else {
                adjustPageLayoutForReader();
            }
            
            // Set up selection handlers if not already done
            if (!hasSelectionHandlers) {
                setupSelectionHandlers();
            }
        } else {
            hideSidebar();
            
            if (isEdgeImmersiveMode) {
                resetImmersiveModeAdjustments();
            } else {
                resetPageLayoutAdjustments();
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
    
    // Function to update sidebar with new selection
    function updateSidebar(word, sentence, selectedText = "") {
        const sidebar = document.getElementById("translator-sidebar");
        if (sidebar && sidebar.contentWindow) {
            try {
                // Use postMessage for iframe communication
                sidebar.contentWindow.postMessage({
                    type: "translateWord",
                    word: word,
                    sentence: sentence,
                    selectedText: selectedText
                }, "*");
                console.log("📤 Sent translation request to sidebar:", { word, sentence: sentence.substring(0, 50) + "..." });
            } catch (error) {
                console.error("❌ Error sending message to sidebar:", error);
                // Fallback: try alternative method
                updateSidebarAlternative(word, sentence, selectedText);
            }
        } else {
            console.log("⚠️ Sidebar iframe not found or not ready, trying alternative update");
            updateSidebarAlternative(word, sentence, selectedText);
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
    
    // Function to ensure sidebar is properly loaded (improved error handling)
    function ensureSidebarLoaded() {
        const sidebar = document.getElementById("translator-sidebar");
        
        if (!sidebar) {
            console.log("🔄 Sidebar iframe not found, recreating...");
            createSidebar();
            return;
        }
        
        // Check if iframe is loaded and accessible
        try {
            if (sidebar.contentDocument && sidebar.contentDocument.readyState === 'complete') {
                console.log("✅ Sidebar iframe is loaded and ready");
                return;
            }
        } catch (error) {
            console.log("⚠️ Cannot access sidebar iframe content:", error.message);
        }
        
        // If iframe exists but isn't ready, wait and try again
        console.log("⏳ Sidebar iframe exists but not ready, waiting...");
        
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = setInterval(() => {
            attempts++;
            
            try {
                if (sidebar.contentDocument && sidebar.contentDocument.readyState === 'complete') {
                    console.log("✅ Sidebar iframe became ready after", attempts, "attempts");
                    clearInterval(checkInterval);
                    return;
                }
            } catch (error) {
                // Iframe still not accessible, continue waiting
            }
            
            if (attempts >= maxAttempts) {
                console.log("❌ Sidebar iframe failed to load after", maxAttempts, "attempts, recreating...");
                clearInterval(checkInterval);
                
                // Remove failed iframe and create new one
                sidebar.remove();
                setTimeout(() => createSidebar(), 100);
            }
        }, 200);
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
    function updateSidebarAlternative(word, sentence, selectedText = "") {
        const container = document.getElementById("translator-sidebar-container");
        
        if (container) {
            const sentenceElement = container.querySelector("#sentence");
            const selectionElement = container.querySelector("#selection");
            
            if (sentenceElement) sentenceElement.textContent = sentence;
            if (selectionElement) selectionElement.textContent = selectedText || "No selection";
        }
    }
    
    // Debounce function to avoid too many rapid events
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

    // Handle text selection changes - this fires during selection (for monitoring only)
    function handleSelectionChange() {
        if (!sidebarEnabled) return;
        
        const selection = window.getSelection();
        const currentSelection = selection.toString().trim();
        
        // Clear any existing timeout to prevent premature processing
        if (selectionTimeout) {
            clearTimeout(selectionTimeout);
        }
        
        // If there's no selection, clear everything
        if (!currentSelection) {
            lastSelection = "";
            isSelecting = false;
            return;
        }
        
        // Just track the selection state, don't process yet
        lastSelection = currentSelection;
        isSelecting = true;
        
        // Debug logging (reduced verbosity)
        console.log("Selection tracking:", { 
            length: currentSelection.length,
            rangeCount: selection.rangeCount,
            isCollapsed: selection.isCollapsed,
            isMouseDown: isMouseDown
        });
        
        // Only set a timeout if mouse is not down (keyboard selection)
        // and only as a fallback for keyboard selections that don't trigger keyup
        if (!isMouseDown) {
            selectionTimeout = setTimeout(() => {
                // Only process if we're not actively mouse selecting and have a valid selection
                if (!isMouseDown && currentSelection && currentSelection !== lastProcessedSelection) {
                    console.log("⌨️ Processing keyboard selection after timeout");
                    const freshSelection = window.getSelection();
                    if (freshSelection && freshSelection.toString().trim() === currentSelection) {
                        processSelection(freshSelection);
                        lastProcessedSelection = currentSelection;
                    }
                }
                isSelecting = false;
            }, 1000); // Longer timeout for keyboard-only selections
        }
    }

    // Process the final selection
    function processSelection(selection) {
        if (!selection || selection.toString().trim() === "") return;
        
        const selectedText = selection.toString().trim();
        
        // Prevent duplicate processing if the same text was just processed
        if (selectedText === lastProcessedSelection) {
            console.log("🚫 Skipping duplicate selection processing");
            return;
        }
        
        console.log("✅ Processing new selection:", selectedText.substring(0, 50) + "...");

        // Get the selected word and clean it to avoid punctuation
        let word = selectedText;
        // Remove trailing punctuation if any
        word = word.replace(/[.,;:!?)"'\]]+$/, '').replace(/^[("'\[]+/, '');
        
        // Check if it's a reasonable length selection
        const wordCount = word.split(/\s+/).length;
        const isCompleteSentence = /^[A-Z].*[.!?]$/.test(selectedText.trim());
        
        // Allow complete sentences even if longer, but limit very long selections
        if (wordCount > 100) {
            console.log("⚠️ Selection extremely long (" + wordCount + " words), skipping");
            return;
        }
        
        // For non-sentence selections, use the configurable limit
        if (wordCount > maxWordCount && !isCompleteSentence) {
            console.log(`⚠️ Selection too long (${wordCount} words) and not a complete sentence. Limit: ${maxWordCount} words. Skipping.`);
            return;
        }
        
        console.log("📏 Selection length check passed:", {
            wordCount: wordCount,
            maxWordCount: maxWordCount,
            isCompleteSentence: isCompleteSentence,
            decision: wordCount <= maxWordCount ? "within limit" : "complete sentence allowed"
        });
        
        // Get just the sentence containing the selection
        const sentence = extractSentence(selection);
        console.log("📝 Extracted sentence:", sentence.substring(0, 100) + "...");
        
        // Store for potential later use
        currentWord = word;
        currentSentence = sentence;
        
        // Create sidebar if it doesn't exist
        let needsCreation = true;
        
        if (document.getElementById("translator-sidebar")) {
            needsCreation = false;
        } else if (document.getElementById("translator-sidebar-container")) {
            needsCreation = false;
        }
        
        if (needsCreation) {
            console.log("🎨 Creating sidebar...");
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
                adjustPageLayoutForReader();
            }
        }
        
        // Update sidebar with the selection
        console.log("📤 Updating sidebar with selection:", word);
        updateSidebar(word, sentence, selectedText);
        console.log("📤 Sent to sidebar - Word:", word, "Sentence length:", sentence.length);
    }

    // Listen for selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    // Track mouse state for better selection handling
    document.addEventListener("mousedown", (event) => {
        // Reset selection state when starting a new selection
        if (selectionTimeout) {
            clearTimeout(selectionTimeout);
        }
        isSelecting = false;
        isMouseDown = true;
        console.log("🖱️ Mouse down - starting selection");
    });

    // Primary trigger for processing selections - when mouse is released
    document.addEventListener("mouseup", (event) => {
        isMouseDown = false;
        
        if (!sidebarEnabled) {
            console.log("⚠️ Sidebar not enabled, skipping mouseup processing");
            return;
        }
        
        // Small delay to ensure selection is finalized
        setTimeout(() => {
            const selection = window.getSelection();
            const currentSelection = selection.toString().trim();
            
            console.log("🖱️ Mouse up - checking selection:", { 
                hasSelection: !!currentSelection,
                selectionLength: currentSelection.length,
                rangeCount: selection.rangeCount,
                isCollapsed: selection.isCollapsed,
                text: currentSelection.substring(0, 50) + "..."
            });
            
            // Process selection if we have valid content that hasn't been processed
            if (selection && currentSelection && 
                selection.rangeCount > 0 && 
                !selection.isCollapsed &&
                currentSelection !== lastProcessedSelection) {
                
                console.log("✅ Mouse processing selection:", currentSelection.substring(0, 50) + "...");
                processSelection(selection);
                lastProcessedSelection = currentSelection;
                lastSelection = currentSelection;
            } else if (!currentSelection) {
                console.log("📝 No selection after mouse up");
            } else if (currentSelection === lastProcessedSelection) {
                console.log("🔄 Same selection already processed");
            }
        }, 50); // Small delay to ensure selection is stable
    });
    
    // Listen for keyboard events that might create selections
    document.addEventListener("keyup", (event) => {
        if (!sidebarEnabled) return;
        
        // Check for keys that typically end a selection
        if (event.key === "Shift" || 
            event.key === "ArrowLeft" || 
            event.key === "ArrowRight" || 
            event.key === "ArrowUp" || 
            event.key === "ArrowDown" ||
            event.key === "Home" ||
            event.key === "End" ||
            (event.ctrlKey && event.key === "a")) {
            
            // Small delay to ensure selection is finalized
            setTimeout(() => {
                const selection = window.getSelection();
                const currentSelection = selection.toString().trim();
                
                console.log("⌨️ Keyboard selection event:", { 
                    key: event.key,
                    hasSelection: !!currentSelection,
                    selectionLength: currentSelection.length,
                    rangeCount: selection.rangeCount,
                    isCollapsed: selection.isCollapsed,
                    text: currentSelection.substring(0, 50) + "..."
                });
                
                // Process keyboard selections only if they're complete and valid
                if (selection && currentSelection && 
                    selection.rangeCount > 0 && 
                    !selection.isCollapsed &&
                    currentSelection !== lastProcessedSelection) {
                    
                    console.log("✅ Keyboard processing selection:", currentSelection.substring(0, 50) + "...");
                    processSelection(selection);
                    lastProcessedSelection = currentSelection;
                    lastSelection = currentSelection;
                } else if (currentSelection === lastProcessedSelection) {
                    console.log("🔄 Same keyboard selection already processed");
                }
            }, 100); // Small delay for keyboard selections
        }
    });
    
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
        
        console.log("🔍 Extracting sentence for selection:", selectedText.substring(0, 50) + "...");
        
        // Check if the selected text looks like a complete sentence
        const endsWithPunctuation = /[.!?]$/.test(selectedText);
        const startsWithCapital = /^[A-Z]/.test(selectedText);
        
        if (endsWithPunctuation && startsWithCapital && selectedText.length > 10) {
            console.log("📝 Selected text appears to be a complete sentence");
            return selectedText;
        }
        
        // Get the start and end nodes
        const startNode = range.startContainer;
        
        // Find the nearest paragraph or block element
        let paragraph = startNode;
        while (paragraph && 
               (paragraph.nodeType === Node.TEXT_NODE ||
                !['P', 'DIV', 'ARTICLE', 'SECTION', 'LI', 'BLOCKQUOTE', 'TD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(paragraph.tagName))) {
            paragraph = paragraph.parentNode;
            if (!paragraph || paragraph === document.body) break;
        }
        
        // If we found a paragraph, extract its text content
        if (paragraph && paragraph !== document.body) {
            console.log("📄 Found paragraph container, extracting sentence from:", paragraph.tagName);
            
            // Special handling for paragraphs with links
            const hasLinks = paragraph.querySelector('a') !== null;
            
            if (hasLinks) {
                console.log("🔗 Paragraph has links, using mixed content extraction");
                // Find all sentences in the paragraph, preserving inline elements
                const sentences = getSentencesFromMixedContent(paragraph);
                
                // Find the sentence that contains our selected text
                for (const sentence of sentences) {
                    if (sentence.includes(selectedText)) {
                        console.log("✅ Found containing sentence in mixed content");
                        return sentence.trim();
                    }
                }
                
                // If not found directly, try a more precise approach by looking at DOM proximity
                let selectionContainer = startNode;
                if (selectionContainer.nodeType === Node.TEXT_NODE) {
                    selectionContainer = selectionContainer.parentNode;
                }
                
                const containerText = selectionContainer.textContent;
                const containerSentences = splitTextIntoSentences(containerText);
                
                for (const sentence of containerSentences) {
                    if (sentence.includes(selectedText)) {
                        console.log("✅ Found containing sentence in container");
                        return sentence.trim();
                    }
                }
            } else {
                console.log("📝 Paragraph has no links, using simple extraction");
                // No links in paragraph, simpler case
                const paragraphText = paragraph.textContent;
                const sentences = splitTextIntoSentences(paragraphText);
                
                for (const sentence of sentences) {
                    if (sentence.includes(selectedText)) {
                        console.log("✅ Found containing sentence in paragraph");
                        return sentence.trim();
                    }
                }
            }
        }
        
        console.log("⚠️ Using fallback sentence extraction");
        
        // Fallback: use the direct context around the selection
        let parent = startNode;
        if (parent.nodeType === Node.TEXT_NODE) {
            parent = parent.parentNode;
        }
        
        const parentText = parent.textContent;
        
        // Try to find the sentence containing the selection
        const sentences = splitTextIntoSentences(parentText);
        for (const sentence of sentences) {
            if (sentence.includes(selectedText)) {
                console.log("✅ Found containing sentence in parent");
                return sentence.trim();
            }
        }
        
        // Last resort: try to extract a reasonable context around the selection
        const selectionPos = parentText.indexOf(selectedText);
        if (selectionPos !== -1) {
            console.log("🔧 Using position-based extraction");
            
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
            
            const extractedSentence = parentText.substring(sentenceStart, sentenceEnd).trim();
            console.log("✅ Extracted sentence using position method");
            return extractedSentence;
        }
        
        // Ultimate fallback - just return the parent text
        console.log("🆘 Using ultimate fallback - parent text");
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
    
    // Listen for messages from the sidebar iframe
    window.addEventListener('message', (event) => {
        // Only handle messages from our sidebar
        if (event.data && event.data.source === 'translatorSidebar') {
            if (event.data.type === 'sidebarReady') {
                console.log("✅ Received sidebar ready notification");
                // If we have a pending selection, send it now
                if (currentWord && currentSentence) {
                    updateSidebar(currentWord, currentSentence, currentWord);
                }
            }
        }
    });

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
