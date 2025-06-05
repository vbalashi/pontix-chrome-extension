// Ensure script only runs once (for multiple injection cases)
if (window.translatorExtensionLoaded) {
    console.log("Pontix content script already loaded, skipping");
} else {
    window.translatorExtensionLoaded = true;
    
    // Version identification for debugging
    console.log("🔄 Pontix v4.0 - Configurable Word Limits Loaded");
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
            contentContainer.style.maxWidth = "calc(100% - 400px)";
            contentContainer.style.marginRight = "400px";
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
                        lastSelection = selectedText;
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
        console.log("📐 Adjusting page layout for reader view");
        
        // Check if we've already adjusted the layout
        if (document.body.hasAttribute('data-translator-layout-adjusted')) {
            console.log("📐 Layout already adjusted, skipping");
            return;
        }
        
        // Instead of adding margin to body, just ensure sidebar positioning works
        // Only add minimal margin to prevent content overlap
        document.body.style.marginRight = "20px"; // Just a small buffer
        document.body.style.transition = "margin-right 0.3s ease-in-out";
        document.body.setAttribute('data-translator-layout-adjusted', 'true');
        
        console.log("📐 Page layout adjusted: minimal margin applied");
        
        // Don't adjust individual containers - let them use natural width
        // The sidebar will overlay on top with high z-index
        
        layoutAdjusted = true;
    }
    
    // Reset page layout adjustments
    function resetPageLayoutAdjustments() {
        console.log("🔄 Resetting page layout");
        
        // Reset body margin and remove flag
        if (document.body.hasAttribute('data-translator-layout-adjusted')) {
            document.body.style.marginRight = "";
            document.body.style.transition = "";
            document.body.removeAttribute('data-translator-layout-adjusted');
            console.log("📐 Reset body margin");
        }
        
        layoutAdjusted = false;
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
        
        // Track mouse state for better selection handling
        document.addEventListener("mousedown", (event) => {
            // Reset selection state when starting a new selection
            if (selectionTimeout) {
                clearTimeout(selectionTimeout);
            }
            isSelecting = false;
            isMouseDown = true;
            console.log("🖱️ Mouse down - starting selection");
            
            // Clear any pending processing since user is starting a new selection
            lastSelection = "";
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
                    text: currentSelection.substring(0, 50) + "...",
                    isDifferentFromLast: currentSelection !== lastProcessedSelection
                });
                
                // Process selection if we have valid content
                if (selection && currentSelection && 
                    selection.rangeCount > 0 && 
                    !selection.isCollapsed &&
                    currentSelection.length >= 2) { // Minimum length
                    
                    console.log("✅ Mouse processing selection:", currentSelection.substring(0, 50) + "...");
                    processSelection(selection);
                    lastSelection = currentSelection;
                } else if (!currentSelection) {
                    console.log("📝 No selection after mouse up");
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
                        text: currentSelection.substring(0, 50) + "...",
                        isDifferentFromLast: currentSelection !== lastProcessedSelection
                    });
                    
                    // Process keyboard selections only if they're complete and valid
                    if (selection && currentSelection && 
                        selection.rangeCount > 0 && 
                        !selection.isCollapsed &&
                        !isMouseDown) {
                        
                        console.log("✅ Keyboard processing selection:", currentSelection.substring(0, 50) + "...");
                        processSelection(selection);
                        lastSelection = currentSelection;
                    }
                }, 100); // Small delay for keyboard selections
            }
        });
        
        // Enhanced double-click handler for word selection
        document.addEventListener("dblclick", (event) => {
            if (!sidebarEnabled) return;
            
            console.log("🖱️ Double-click detected, processing selection");
            
            setTimeout(() => {
                const selection = window.getSelection();
                const currentSelection = selection.toString().trim();
                
                console.log("🖱️ Double-click selection:", { 
                    hasSelection: !!currentSelection,
                    selectionLength: currentSelection.length,
                    text: currentSelection.substring(0, 50) + "...",
                    isDifferentFromLast: currentSelection !== lastProcessedSelection
                });
                
                if (selection && currentSelection && 
                    selection.rangeCount > 0 && 
                    !selection.isCollapsed) {
                    
                    console.log("✅ Double-click processing selection:", currentSelection.substring(0, 50) + "...");
                    processSelection(selection);
                    lastSelection = currentSelection;
                }
            }, 50);
        });
        
        hasSelectionHandlers = true;
        console.log("✅ Enhanced selection handlers set up successfully for Angular");
    }
    
    // Listen for messages from background script with improved error handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Content script received message:", message);
        
        // Handle ping for content script detection
        if (message.action === "ping") {
            sendResponse({ pong: true });
            return true;
        }
        
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
        console.log("🔄 Handling sidebar toggle - enabled:", sidebarEnabled, "visible:", sidebarVisible);
        
        if (sidebarEnabled) {
            const existingSidebar = document.getElementById("translator-sidebar");
            const existingContainer = document.getElementById("translator-sidebar-container");
            
            if (!existingSidebar && !existingContainer) {
                console.log("🎨 Creating new sidebar");
                if (isEdgeImmersiveMode) {
                    createImmersiveModeIframe();
                } else {
                    createSidebar();
                }
                sidebarVisible = true;
            } else {
                console.log("📱 Showing existing sidebar");
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
            console.log("🙈 Hiding/removing sidebar");
            hideSidebar();
            
            // Reset layout adjustments
            if (isEdgeImmersiveMode) {
                resetImmersiveModeAdjustments();
            } else {
                resetPageLayoutAdjustments();
            }
        }
    }
    
    // Function to create sidebar
    function createSidebar() {
        console.log("🎨 Creating sidebar iframe...");
        
        const sidebar = document.createElement("iframe");
        sidebar.id = "translator-sidebar";
        sidebar.src = chrome.runtime.getURL("sidebar.html");
        sidebar.style.position = "fixed";
        sidebar.style.right = "0";
        sidebar.style.top = "0";
        sidebar.style.width = "400px";
        sidebar.style.height = "100vh";
        sidebar.style.border = "none";
        sidebar.style.zIndex = "2147483647"; // Maximum z-index to ensure it's on top
        sidebar.style.background = "white";
        sidebar.style.boxShadow = "-2px 0 10px rgba(0, 0, 0, 0.3)";
        sidebar.style.transition = "transform 0.3s ease-in-out";
        sidebar.style.transform = "translateX(0)"; // Start visible
        sidebar.style.borderLeft = "1px solid #e0e0e0";
        
        console.log("🔧 Sidebar src set to:", sidebar.src);
        
        // Add load/error event listeners
        sidebar.addEventListener('load', () => {
            console.log("✅ Sidebar iframe loaded successfully");
            console.log("📄 Iframe document ready state:", sidebar.contentDocument?.readyState);
            console.log("🌍 Iframe content window available:", !!sidebar.contentWindow);
            
            // Try to access iframe content after a short delay
            setTimeout(() => {
                try {
                    if (sidebar.contentDocument) {
                        console.log("📝 Iframe document title:", sidebar.contentDocument.title);
                        console.log("📝 Iframe body exists:", !!sidebar.contentDocument.body);
                        console.log("📝 Selection element in iframe:", !!sidebar.contentDocument.getElementById('selection'));
                    } else {
                        console.log("❌ Cannot access iframe contentDocument");
                    }
                } catch (error) {
                    console.log("❌ Error accessing iframe content:", error.message);
                }
            }, 500);
        });
        
        sidebar.addEventListener('error', (error) => {
            console.error("❌ Sidebar iframe failed to load:", error);
        });
        
        // Special handling for Edge immersive reader mode
        if (isEdgeImmersiveMode) {
            // Add special class for identifying in immersive mode
            sidebar.classList.add('translator-immersive-mode');
        }

        document.body.appendChild(sidebar);
        console.log("📌 Sidebar iframe appended to body");
        
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
        
        console.log("✅ Sidebar created with overlay positioning");
    }
    
    // Function to update sidebar with new selection
    function updateSidebar(word, sentence, selectedText = "") {
        console.log("🎯 updateSidebar called with:", { word, sentence: sentence.substring(0, 50) + "...", selectedText });
        
        const sidebar = document.getElementById("translator-sidebar");
        console.log("🔍 Sidebar element found:", !!sidebar);
        
        if (sidebar) {
            console.log("🔍 Sidebar contentWindow:", !!sidebar.contentWindow);
            console.log("🔍 Sidebar src:", sidebar.src);
            console.log("🔍 Sidebar ready state:", sidebar.contentDocument?.readyState);
        }
        
        if (sidebar && sidebar.contentWindow) {
            try {
                console.log("📤 Attempting to send postMessage...");
                
                // Use postMessage for iframe communication
                sidebar.contentWindow.postMessage({
                    type: "textSelected",
                    selectedText: word,
                    sentence: sentence,
                    source: "translatorContentScript"
                }, "*");
                
                console.log("📤 Sent translation request to sidebar:", { word, sentence: sentence.substring(0, 50) + "..." });
                return true;
            } catch (error) {
                console.error("❌ Error sending message to sidebar:", error);
                console.error("❌ Error details:", error.message, error.stack);
                
                // Fallback: try alternative method
                updateSidebarAlternative(word, sentence, selectedText);
                return false;
            }
        } else {
            console.log("⚠️ Sidebar iframe not found or not ready, details:");
            console.log("  - sidebar element exists:", !!sidebar);
            if (sidebar) {
                console.log("  - contentWindow exists:", !!sidebar.contentWindow);
                console.log("  - src:", sidebar.src);
            }
            console.log("⚠️ Trying alternative update method...");
            updateSidebarAlternative(word, sentence, selectedText);
            return false;
        }
    }
    
    // Function to hide sidebar
    function hideSidebar() {
        const sidebar = document.getElementById("translator-sidebar");
        if (sidebar) {
            sidebar.style.transform = "translateX(400px)";
            sidebarVisible = false;
        }
        
        // Also check for alternative container
        const altContainer = document.getElementById("translator-sidebar-container");
        if (altContainer) {
            altContainer.style.transform = "translateX(400px)";
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
        
        console.log("✅ Processing selection attempt:", selectedText.substring(0, 50) + "...");
        console.log("🔍 Previous processed selection:", (lastProcessedSelection || "none").substring(0, 50) + "...");
        
        // Check if mouse is still down - if so, user is still selecting
        if (isMouseDown) {
            console.log("🖱️ Mouse still down, user still selecting - not processing yet");
            return;
        }
        
        // Improved duplicate detection - only skip if EXACTLY the same and processed recently
        const now = Date.now();
        const timeSinceLastProcessing = now - (window.lastProcessingTime || 0);
        
        if (selectedText === lastProcessedSelection && timeSinceLastProcessing < 1000) {
            console.log("🚫 Skipping duplicate selection (same text within 1 second)");
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
        
        // Update sidebar with the selection - include mouse state info
        console.log("📤 Updating sidebar with selection:", word);
        const updateResult = updateSidebar(word, sentence, selectedText);
        console.log("📤 Sent to sidebar - Word:", word, "Sentence length:", sentence.length);
        
        // Only mark as processed after successful update attempt
        lastProcessedSelection = selectedText;
        window.lastProcessingTime = now;
        console.log("✅ Marked selection as processed:", selectedText.substring(0, 30) + "...");
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
        
        // Clear any pending processing since user is starting a new selection
        lastSelection = "";
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
                text: currentSelection.substring(0, 50) + "...",
                isDifferentFromLast: currentSelection !== lastProcessedSelection
            });
            
            // Process selection if we have valid content
            if (selection && currentSelection && 
                selection.rangeCount > 0 && 
                !selection.isCollapsed &&
                currentSelection.length >= 2) { // Minimum length
                
                console.log("✅ Mouse processing selection:", currentSelection.substring(0, 50) + "...");
                processSelection(selection);
                lastSelection = currentSelection;
            } else if (!currentSelection) {
                console.log("📝 No selection after mouse up");
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
                    text: currentSelection.substring(0, 50) + "...",
                    isDifferentFromLast: currentSelection !== lastProcessedSelection
                });
                
                // Process keyboard selections only if they're complete and valid
                if (selection && currentSelection && 
                    selection.rangeCount > 0 && 
                    !selection.isCollapsed &&
                    !isMouseDown) {
                    
                    console.log("✅ Keyboard processing selection:", currentSelection.substring(0, 50) + "...");
                    processSelection(selection);
                    lastSelection = currentSelection;
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
        
        // Get the text node containing the selection
        const startNode = range.startContainer;
        let textNode = startNode;
        
        // If we're in an element node, find the text node
        if (textNode.nodeType !== Node.TEXT_NODE) {
            // Try to find the text node within this element
            const walker = document.createTreeWalker(
                textNode,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            textNode = walker.nextNode();
            if (!textNode) {
                console.log("⚠️ Could not find text node, using selection directly");
                return selectedText;
            }
        }
        
        // Get the full text content of this text node
        const nodeText = textNode.textContent || '';
        console.log("📄 Text node content length:", nodeText.length, "characters");
        
        // Find where our selection starts in this text node
        const selectionIndex = nodeText.indexOf(selectedText);
        if (selectionIndex === -1) {
            console.log("⚠️ Selection not found in text node, trying parent");
            // Try the parent element's text
            const parentText = textNode.parentNode.textContent || '';
            const parentIndex = parentText.indexOf(selectedText);
            
            if (parentIndex === -1) {
                console.log("⚠️ Selection not found in parent either, using selection directly");
                return selectedText;
            }
            
            return extractSentenceFromText(parentText, selectedText, parentIndex);
        }
        
        return extractSentenceFromText(nodeText, selectedText, selectionIndex);
    }
    
    // Extract sentence from a given text string
    function extractSentenceFromText(fullText, selectedText, selectionIndex) {
        console.log("🔧 Extracting sentence from text of length:", fullText.length);
        
        // Conservative approach: limit how far we look for sentence boundaries
        const maxLookBack = 150;  // Maximum characters to look backwards
        const maxLookForward = 150; // Maximum characters to look forwards
        
        let sentenceStart = Math.max(0, selectionIndex - maxLookBack);
        let sentenceEnd = Math.min(fullText.length, selectionIndex + selectedText.length + maxLookForward);
        
        // Look backwards for sentence start (period, exclamation, question mark)
        let foundStart = false;
        for (let i = selectionIndex - 1; i >= sentenceStart; i--) {
            const char = fullText[i];
            
            if (char === '.' || char === '!' || char === '?') {
                // Found potential sentence end, check if it's followed by space/newline
                if (i + 1 < fullText.length) {
                    const nextChar = fullText[i + 1];
                    if (nextChar === ' ' || nextChar === '\n' || nextChar === '\t') {
                        // Skip the punctuation and whitespace
                        let j = i + 1;
                        while (j < fullText.length && /\s/.test(fullText[j])) {
                            j++;
                        }
                        
                        // If we find a capital letter or we're at the start, this is sentence start
                        if (j < fullText.length && (/[A-Z]/.test(fullText[j]) || /[0-9]/.test(fullText[j]))) {
                            sentenceStart = j;
                            foundStart = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // Look forwards for sentence end
        let foundEnd = false;
        for (let i = selectionIndex + selectedText.length; i < sentenceEnd; i++) {
            const char = fullText[i];
            
            if (char === '.' || char === '!' || char === '?') {
                // Check if this looks like end of sentence
                const isEndOfText = (i === fullText.length - 1);
                const isFollowedBySpace = (i + 1 < fullText.length && /\s/.test(fullText[i + 1]));
                
                if (isEndOfText || isFollowedBySpace) {
                    // Check what comes after the space (if any)
                    if (isEndOfText) {
                        sentenceEnd = i + 1;
                        foundEnd = true;
                        break;
                    } else {
                        // Look ahead to see what follows
                        let j = i + 1;
                        while (j < fullText.length && /\s/.test(fullText[j])) {
                            j++;
                        }
                        
                        // If next non-space char is capital letter, number, or end of text, this is sentence end
                        if (j >= fullText.length || /[A-Z0-9]/.test(fullText[j])) {
                            sentenceEnd = i + 1;
                            foundEnd = true;
                            break;
                        }
                    }
                }
            }
        }
        
        console.log("📏 Sentence boundaries found:", { 
            start: sentenceStart, 
            end: sentenceEnd, 
            foundStart, 
            foundEnd,
            originalIndex: selectionIndex
        });
        
        let extractedSentence = fullText.substring(sentenceStart, sentenceEnd).trim();
        
        // Safety check: if extracted sentence is too long or doesn't contain selection, use fallback
        if (extractedSentence.length > 300 || !extractedSentence.includes(selectedText)) {
            console.log("⚠️ Extracted sentence too long or doesn't contain selection, using conservative fallback");
            extractedSentence = extractConservativeSentence(fullText, selectedText, selectionIndex);
        }
        
        console.log("✅ Final extracted sentence:", extractedSentence.substring(0, 100) + "...");
        return extractedSentence;
    }
    
    // Very conservative fallback - just expand around selection until we hit punctuation
    function extractConservativeSentence(fullText, selectedText, selectionIndex) {
        console.log("🛡️ Using conservative sentence extraction");
        
        const maxExpansion = 100; // Don't expand more than 100 chars in each direction
        
        let start = selectionIndex;
        let end = selectionIndex + selectedText.length;
        
        // Expand backwards, but stop at punctuation or max expansion
        while (start > 0 && (selectionIndex - start) < maxExpansion) {
            const prevChar = fullText[start - 1];
            if (prevChar === '.' || prevChar === '!' || prevChar === '?') {
                break;
            }
            start--;
        }
        
        // Expand forwards, but stop at punctuation or max expansion  
        while (end < fullText.length && (end - (selectionIndex + selectedText.length)) < maxExpansion) {
            const currentChar = fullText[end];
            if (currentChar === '.' || currentChar === '!' || currentChar === '?') {
                end++; // Include the punctuation
                break;
            }
            end++;
        }
        
        const result = fullText.substring(start, end).trim();
        console.log("🛡️ Conservative result:", result.substring(0, 100) + "...");
        return result;
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
