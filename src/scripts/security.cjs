const PONTIX_MESSAGE_VERSION = 1;
const PONTIX_SELECTION_TTL_MS = 5 * 60 * 1000;
const PONTIX_SECRET_STORAGE_KEYS = [
    'translatorSecrets',
    'pontix2000nlConnectSession',
    'encrypted_user_password',
];

const SECRET_FIELD_PATTERN = /(api[-_]?key|token|password|authorization|secret|refresh)/i;
const CONTENT_FIELD_PATTERN = /(selectedText|sentence|text|prompt|request|response)/i;

function redactForLog(value) {
    if (Array.isArray(value)) return value.map((item) => redactForLog(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
            if (SECRET_FIELD_PATTERN.test(key)) return [key, '[redacted-secret]'];
            if (CONTENT_FIELD_PATTERN.test(key)) return [key, '[redacted-content]'];
            return [key, redactForLog(entry)];
        })
    );
}

function sanitizeSettingsForSync(settings = {}) {
    const sanitized = { ...settings };
    delete sanitized.apiKeys;
    return sanitized;
}

function extractLocalSecrets(settings = {}) {
    return {
        apiKeys: { ...(settings.apiKeys || {}) },
        updatedAt: Date.now(),
    };
}

function boundedSelectionSnapshot(payload = {}, sender = {}, now = Date.now()) {
    const selectedText = boundText(payload.selectedText, 2000);
    const sentence = boundText(payload.sentence, 4000);
    return {
        version: PONTIX_MESSAGE_VERSION,
        action: 'textSelected',
        selectedText,
        sentence,
        error: boundText(payload.error, 500),
        requestId: boundText(payload.requestId, 120) || `selection-${now}`,
        tabId: Number.isInteger(sender.tab?.id) ? sender.tab.id : null,
        frameId: Number.isInteger(sender.frameId) ? sender.frameId : 0,
        url: boundText(sender.url || sender.tab?.url || '', 2048),
        createdAt: now,
        expiresAt: now + PONTIX_SELECTION_TTL_MS,
        source: 'pontix-service-worker',
    };
}

function isSelectionFresh(snapshot, now = Date.now()) {
    return Boolean(snapshot?.expiresAt && snapshot.expiresAt > now);
}

function validateInternalMessage(message = {}, sender = {}, runtimeId = '') {
    if (runtimeId && sender.id && sender.id !== runtimeId) return { ok: false, error: 'invalid_sender' };
    const action = message.action || message.type;
    const allowed = new Set([
        'contentScriptLoaded',
        'textSelected',
        'translate',
        'updateSettings',
        'consumeSelectionSnapshot',
        'connect2000nl',
        'disconnect2000nl',
        'get2000nlSession',
        'platformLookup',
        'platformAction',
    ]);
    if (!allowed.has(action)) return { ok: false, error: 'unsupported_action' };
    if (action === 'textSelected') {
        if (!Number.isInteger(sender.tab?.id)) return { ok: false, error: 'missing_tab_context' };
        if (sender.frameId !== undefined && sender.frameId !== 0) return { ok: false, error: 'unsupported_frame_context' };
    }
    return { ok: true, action };
}

function shouldAttach2000NlBearer(url) {
    try {
        const parsed = new URL(url);
        if (parsed.origin !== 'https://2000.dilum.io') return false;
        return parsed.pathname.startsWith('/api/platform/v1/') ||
            parsed.pathname.startsWith('/api/connect/');
    } catch (_error) {
        return false;
    }
}

function boundText(value, maxLength) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? text.slice(0, maxLength) : text;
}

module.exports = {
    PONTIX_MESSAGE_VERSION,
    PONTIX_SELECTION_TTL_MS,
    PONTIX_SECRET_STORAGE_KEYS,
    boundedSelectionSnapshot,
    extractLocalSecrets,
    isSelectionFresh,
    redactForLog,
    sanitizeSettingsForSync,
    shouldAttach2000NlBearer,
    validateInternalMessage,
};
