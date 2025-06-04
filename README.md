# Chrome Translator Extension

A sidebar translator extension with multiple translation service providers.

## Recent Changes

### Improved Text Selection Behavior

The extension now properly handles text selection by waiting for the user to finish selecting before processing the text for translation.

#### Key Improvements:

1. **Selection Change Detection**: Uses `selectionchange` event to detect when the user is actively selecting text
2. **Debounced Processing**: Waits 500ms after selection stops changing before processing
3. **Duplicate Prevention**: Prevents processing the same selection multiple times
4. **Extended Phrase Support**: Increased word limit from 5 to 10 words for longer phrases
5. **Persistent Layout**: Translation boxes and their settings are now saved and restored when the extension is reopened

#### New Debug Feature:

- **Selection Display**: The sidebar now shows the exact selected text in a red-bordered box for debugging purposes
- **Simplified Display**:
  - Selected text (exact selection in red box)
  - Context sentence (containing sentence)
- **Enhanced Logging**: Added comprehensive logging for DeepL API debugging

#### How It Works:

1. **Double-click + Drag**: When you double-click a word and then drag to extend the selection, the extension waits until you release the mouse and stop changing the selection
2. **Selection Finalization**: Only after 500ms of no selection changes does the extension process the final selection
3. **Context Extraction**: The extension finds the complete sentence(s) containing the selected text for better translation context

## Persistent Layout

The extension now remembers your translation setup:

- **Saved Providers**: Which translation services you've added (Google, DeepL, etc.)
- **Target Languages**: The target language setting for each provider
- **Automatic Restore**: Your layout is restored when you reopen the browser or reload the extension
- **Smart Filtering**: Disabled providers are automatically filtered out when restoring

## Testing

1. Load the extension in Chrome (Developer mode)
2. Open any webpage with selectable text
3. Click the extension icon to enable the sidebar
4. Test different selection scenarios:
   - Single words
   - Short phrases
   - Complete sentences
   - Text with links and formatting

## Files Modified

- `content.js`: Updated selection detection logic
- `sidebar.html`: Added selection display element
- `sidebar.js`: Updated message handling for selection data
- `sidebar.css`: Added styling for selection display

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (including Immersive Reader mode) 