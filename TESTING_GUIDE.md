# Testing Guide for Configurable Word Limits

## Issue Description
**Previous Problems:**
1. Extension wasn't detecting complete sentence selections properly
2. Extension was making too many API calls with incomplete/incorrect data while users were still selecting text
3. Premature processing before users confirmed their selection
4. **NEW**: Hard-coded word limits didn't suit all users' needs

## What Was Fixed in v4.0
1. **Selection Completion Wait**: Extension now waits for mouse release or keyboard selection completion before processing
2. **Reduced API Calls**: No more processing during text selection - only when selection is finalized
3. **Better Complete Sentence Detection**: Improved logic to detect when entire sentences are selected
4. **Enhanced Mouse/Keyboard Handling**: Separate handling for mouse and keyboard selections with proper state tracking
5. **Comprehensive Logging**: Detailed console output to track exactly when and why selections are processed
6. **🆕 Configurable Word Limits**: Users can now set their own maximum word count for translations in the settings

## Key Behavioral Changes
- **🖱️ Mouse Selections**: Only processed after `mouseup` event (when you release the mouse)
- **⌨️ Keyboard Selections**: Only processed after keyboard selection keys are released
- **🚫 No Intermediate Processing**: No API calls while you're still selecting text
- **✅ Complete Sentence Recognition**: Better detection of full sentence selections
- **⚙️ Customizable Limits**: Word count limits can be adjusted per user preference

## Testing Steps

### 1. Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this extension folder
4. Navigate to `http://localhost:8000/test.html`

### 2. Test the New Word Count Settings
1. Click the extension icon to enable the sidebar
2. Open Developer Console (F12) to see debug output
3. Look for the version message: "Translator Extension v4.0 - Configurable Word Limits Loaded"
4. **Click the settings gear icon** in the sidebar (bottom right)
5. You should see "General Settings" section with "Maximum words to translate" field

#### Scenario A: Test Default Word Limit (25 words)
- **Text**: "The quick brown fox jumps over the lazy dog and continues running through the forest with great speed and agility."
- **Count**: This text has about 20 words, should be processed
- **Expected**: Should work normally since it's under 25 words

#### Scenario B: Test Word Limit Enforcement
- **Text**: Select a long paragraph (30+ words that's NOT a complete sentence)
- **Expected**: 
  - Console shows "Selection too long (X words) and not a complete sentence. Limit: 25 words. Skipping."
  - No translation happens

#### Scenario C: Complete Sentence Override
- **Text**: Select a complete sentence that starts with capital and ends with punctuation, even if over 25 words
- **Expected**: Should still be processed because complete sentences override the word limit

### 3. Test Configurable Limits
#### Scenario D: Change Word Limit Setting
1. Open sidebar settings (gear icon)
2. Change "Maximum words to translate" from 25 to 10
3. Click "Save Settings"
4. Try selecting 15-word phrases (not complete sentences)
5. **Expected**: Should now be rejected at 10+ words instead of 25+

#### Scenario E: Increase Word Limit
1. Open sidebar settings 
2. Change "Maximum words to translate" to 50
3. Click "Save Settings"
4. Try selecting 30-word phrases
5. **Expected**: Should now accept longer selections up to 50 words

### 4. What to Check in Console
**On Page Load:**
- "Translator Extension v4.0 - Configurable Word Limits Loaded"
- "📊 New feature: Configurable word count limits in settings"
- "📋 Loaded maxWordCount setting: X" or "📋 Using default maxWordCount: 25"

**During Selection Processing:**
- "📏 Selection length check passed:" showing current maxWordCount
- "📋 Updated maxWordCount setting from sidebar: X" (when changing settings)

**For Rejected Selections:**
- "⚠️ Selection too long (X words) and not a complete sentence. Limit: Y words. Skipping."

### 5. Edge Cases to Test
1. **Settings Persistence**: Change word limit, reload page, should remember setting
2. **Very Long Complete Sentences**: Even 50+ word complete sentences should work
3. **Extremely Long Text**: Selections over 100 words should be rejected regardless
4. **Invalid Settings**: Try setting negative numbers or very high numbers in the input

### 6. UI Testing
- Settings panel should have a number input for word count
- Input should accept values 1-100
- Help text should explain complete sentences are always allowed
- Settings should save and persist across browser sessions

## Success Criteria
✅ Complete sentences are detected properly  
✅ Only one API call per selection  
✅ No processing during text selection  
✅ **NEW**: Configurable word count limits in settings  
✅ **NEW**: Settings persist across browser sessions  
✅ **NEW**: Complete sentences override word limits  
✅ **NEW**: Console shows current word limit in processing logs  
✅ Clear console logging shows when/why processing occurs  
✅ Both mouse and keyboard selections work  
✅ No duplicate processing of same selection  

## If Issues Persist
1. Check console for any error messages
2. Verify version shows "v4.0 - Configurable Word Limits"
3. Check that settings panel opens and shows word count input
4. Ensure sidebar is enabled (extension icon active)
5. Try refreshing page and re-enabling extension
6. Test with both simple text and text with links 