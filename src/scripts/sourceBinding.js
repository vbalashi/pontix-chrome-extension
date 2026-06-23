export const PONTIX_BINDING_VERSION = 'pontix-selection-v1';
export const PONTIX_ACTION_ENVELOPE_VERSION = 'pontix-action-envelope-v1';

const TRACKING_PARAMS = new Set([
    'fbclid',
    'gclid',
    'mc_cid',
    'mc_eid',
    'utm_campaign',
    'utm_content',
    'utm_medium',
    'utm_source',
    'utm_term',
]);

export function normalizeWebPageSource(input = {}) {
    const parsed = safeUrl(input.url);
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, error: 'unsupported_url_scheme' };
    }
    parsed.username = '';
    parsed.password = '';
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    if ((parsed.protocol === 'https:' && parsed.port === '443') ||
        (parsed.protocol === 'http:' && parsed.port === '80')) {
        parsed.port = '';
    }
    for (const key of Array.from(parsed.searchParams.keys())) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
            parsed.searchParams.delete(key);
        }
    }
    parsed.searchParams.sort();

    return {
        ok: true,
        source: {
            kind: 'web_page',
            provider: 'web',
            canonicalUrl: parsed.toString(),
            privateByDefault: true,
            titleObservation: boundText(input.title, 200),
            languageCode: normalizeLanguage(input.languageCode),
        },
    };
}

export function classifySource(input = {}) {
    if (input.ebook?.provider && input.ebook?.bookId) {
        return {
            ok: true,
            sourceKind: 'ebook',
            source: {
                kind: 'ebook',
                provider: boundText(input.ebook.provider, 80),
                externalId: boundText(input.ebook.bookId, 160),
                isbn: boundText(input.ebook.isbn, 40),
                languageCode: normalizeLanguage(input.ebook.languageCode || input.languageCode),
                privateByDefault: true,
            },
        };
    }

    if (input.documentText !== undefined || input.forceTextDocument) {
        const normalizedText = normalizeDocumentText(input.documentText || input.selectedText || '');
        return {
            ok: true,
            sourceKind: 'text_document',
            source: {
                kind: 'text_document',
                documentInstanceId: input.documentInstanceId || `pontix-doc-${hashText(`${Date.now()}:${normalizedText}`)}`,
                documentRevision: hashText(normalizedText),
                titleObservation: boundText(input.title, 200),
                languageCode: normalizeLanguage(input.languageCode),
                privateByDefault: true,
            },
        };
    }

    const web = normalizeWebPageSource(input);
    if (web.ok) return { ok: true, sourceKind: 'web_page', source: web.source };
    return {
        ok: true,
        sourceKind: 'text_document',
        source: {
            kind: 'text_document',
            documentInstanceId: input.documentInstanceId || `pontix-doc-${hashText(String(input.selectedText || ''))}`,
            documentRevision: hashText(normalizeDocumentText(input.selectedText || '')),
            privateByDefault: true,
        },
    };
}

export function captureRangeLocator(params = {}) {
    const selectedText = boundText(params.selectedText, 2000);
    const containerText = normalizeWhitespace(params.containerText || '');
    const explicitStart = Number.isInteger(params.rangeStart) ? params.rangeStart : -1;
    const explicitEnd = Number.isInteger(params.rangeEnd) ? params.rangeEnd : -1;
    const inferredStart = explicitStart >= 0 ? explicitStart : containerText.indexOf(selectedText);
    const inferredEnd = explicitEnd >= 0 ? explicitEnd : inferredStart + selectedText.length;

    if (!selectedText || inferredStart < 0 || inferredEnd < inferredStart) {
        return { ok: false, error: 'selection_locator_unavailable' };
    }

    const contextStart = Math.max(0, inferredStart - 500);
    const contextEnd = Math.min(containerText.length, inferredEnd + 500);
    const contextText = boundText(containerText.slice(contextStart, contextEnd), 1000);
    return {
        ok: true,
        locator: {
            selectedText,
            selectionHash: hashText(selectedText),
            contextHash: hashText(contextText),
            charStart: inferredStart - contextStart,
            charEnd: inferredEnd - contextStart,
        },
    };
}

export function createSelectionSourceBinding(params = {}) {
    const classified = classifySource(params);
    const locator = captureRangeLocator(params);
    if (!classified.ok) return classified;
    if (!locator.ok) return locator;

    return {
        ok: true,
        binding: {
            bindingVersion: PONTIX_BINDING_VERSION,
            sourceKind: classified.sourceKind,
            navigationId: params.navigationId || '',
            tabId: Number.isInteger(params.tabId) ? params.tabId : null,
            frameId: Number.isInteger(params.frameId) ? params.frameId : 0,
            source: classified.source,
            ...locator.locator,
            capturedAt: params.capturedAt || new Date().toISOString(),
        },
    };
}

export function bindingAppliesToContext(binding = {}, context = {}) {
    return Boolean(
        binding.navigationId &&
        binding.navigationId === context.navigationId &&
        binding.tabId === context.tabId &&
        binding.frameId === context.frameId,
    );
}

export function freezeActionEnvelope(binding, action = {}) {
    const clientEventId = action.clientEventId || cryptoRandomUuid();
    return Object.freeze({
        envelopeVersion: PONTIX_ACTION_ENVELOPE_VERSION,
        clientEventId,
        action: action.action,
        result: action.result || null,
        entryId: action.entryId,
        cardTypeId: action.cardTypeId,
        sourceContext: buildSourceContextV2(binding),
    });
}

export function buildSourceContextV2(binding = {}) {
    return {
        contractVersion: 'source-context-v2',
        source: binding.source,
        location: {
            kind: 'text_selection',
            navigationId: binding.navigationId,
            charStart: binding.charStart,
            charEnd: binding.charEnd,
        },
        selection: {
            clickedForm: binding.selectedText,
            contextTextHash: binding.contextHash,
            selectionHash: binding.selectionHash,
        },
    };
}

function safeUrl(value) {
    try {
        return new URL(String(value || ''));
    } catch (_error) {
        return null;
    }
}

function normalizeDocumentText(value) {
    return normalizeWhitespace(value).slice(0, 100_000);
}

function normalizeWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function boundText(value, maxLength) {
    const text = normalizeWhitespace(value);
    return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeLanguage(value) {
    const normalized = String(value || '').trim().toLowerCase().replace('_', '-');
    return normalized === 'auto' ? '' : normalized;
}

function hashText(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `pontix-fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function cryptoRandomUuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `00000000-0000-4000-8000-${hashText(String(Date.now())).slice(-12)}`;
}
