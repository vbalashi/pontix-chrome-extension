const {
    PONTIX_SELECTION_TTL_MS,
    boundedSelectionSnapshot,
    isSelectionFresh,
    redactForLog,
    sanitizeSettingsForSync,
    shouldAttach2000NlBearer,
    validateInternalMessage,
} = require('../src/scripts/security.cjs');

test('selection snapshots are bounded and expire', () => {
    const now = 1_000;
    const snapshot = boundedSelectionSnapshot(
        { selectedText: 'x'.repeat(3000), sentence: 'hello' },
        { id: 'ext', frameId: 0, tab: { id: 12, url: 'https://example.test' } },
        now,
    );

    expect(snapshot.selectedText).toHaveLength(2000);
    expect(snapshot.tabId).toBe(12);
    expect(isSelectionFresh(snapshot, now + PONTIX_SELECTION_TTL_MS - 1)).toBe(true);
    expect(isSelectionFresh(snapshot, now + PONTIX_SELECTION_TTL_MS + 1)).toBe(false);
});

test('message validation rejects cross-frame selection capture', () => {
    expect(validateInternalMessage(
        { action: 'textSelected' },
        { id: 'ext', frameId: 7, tab: { id: 12 } },
        'ext',
    )).toEqual({ ok: false, error: 'unsupported_frame_context' });
});

test('sync settings remove provider api keys', () => {
    expect(sanitizeSettingsForSync({
        theme: 'dark',
        apiKeys: { openai: 'secret' },
    })).toEqual({ theme: 'dark' });
});

test('redaction hides secrets and selected text', () => {
    expect(redactForLog({
        apiKey: 'secret',
        selectedText: 'private text',
        nested: { refreshToken: 'token' },
    })).toEqual({
        apiKey: '[redacted-secret]',
        selectedText: '[redacted-content]',
        nested: { refreshToken: '[redacted-secret]' },
    });
});

test('2000nl bearer attachment is allowlisted', () => {
    expect(shouldAttach2000NlBearer('https://2000.dilum.io/api/platform/v1/session')).toBe(true);
    expect(shouldAttach2000NlBearer('https://audiofilms-api.dilum.io/api/platform/v1/session')).toBe(false);
    expect(shouldAttach2000NlBearer('https://2000.dilum.io/anything')).toBe(false);
});

test('2000nl service worker commands are explicit allowlisted messages', () => {
    for (const action of [
        'connect2000nl',
        'disconnect2000nl',
        'get2000nlSession',
        'platformLookup',
        'platformAction',
    ]) {
        expect(validateInternalMessage({ action }, { id: 'ext' }, 'ext')).toEqual({ ok: true, action });
    }
});
