# Debug Selection Feature Implementation

## Summary
Added a "Show debug selection" checkbox to the global settings that controls the visibility of the selected text and sentence block.

## Changes Made

### 1. HTML Changes (sidebar.html)
- Added checkbox in the general settings section:
  ```html
  <div class="setting-row">
      <div class="checkbox-container">
          <input type="checkbox" id="debug-selection">
          <label for="debug-selection">Show debug selection</label>
      </div>
      <span class="input-help">Display selected text and context sentence for debugging</span>
  </div>
  ```

### 2. JavaScript Changes (sidebar.js)
- Added `debugSelection: false` to default settings
- Created `updateDebugSelectionVisibility()` function to show/hide the selection container
- Updated `updateSettingsUI()` to handle the checkbox state and call visibility function
- Updated save settings logic to include the checkbox value
- Updated `getCurrentSettings()` to include debugSelection for profile management
- Updated `syncFromSupabase()` to handle debugSelection from cloud sync

### 3. CSS Changes (sidebar.css)
- Added styles for `.checkbox-container` and related elements
- Improved existing checkbox styling consistency

## Behavior
- By default, the selected text and sentence block is hidden (`debugSelection: false`)
- When the "Show debug selection" checkbox is enabled, the block becomes visible
- The setting is saved locally and synced to profiles and cloud storage
- Changes take effect immediately when saving settings

## Technical Details
- The visibility is controlled by setting `display: block` or `display: none` on `.selected-word-container`
- The setting is included in profile data and cloud sync operations
- The checkbox state is properly restored when loading profiles or syncing from cloud 