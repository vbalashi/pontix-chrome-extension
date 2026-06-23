const {
    bindingAppliesToContext,
    captureRangeLocator,
    classifySource,
    createSelectionSourceBinding,
    freezeActionEnvelope,
    normalizeWebPageSource,
} = require('../src/scripts/sourceBinding.cjs');

test('web page source removes credentials fragments and tracking params', () => {
    const result = normalizeWebPageSource({
        url: 'https://user:pass@Example.com:443/path?utm_source=x&b=2&a=1#section',
        title: 'Example',
        languageCode: 'EN_us',
    });

    expect(result.ok).toBe(true);
    expect(result.source).toMatchObject({
        kind: 'web_page',
        provider: 'web',
        canonicalUrl: 'https://example.com/path?a=1&b=2',
        privateByDefault: true,
        languageCode: 'en-us',
    });
});

test('duplicate selected text uses supplied range offsets instead of first index', () => {
    const text = 'term appears, then term appears again';
    const secondStart = text.lastIndexOf('term');
    const result = captureRangeLocator({
        selectedText: 'term',
        containerText: text,
        rangeStart: secondStart,
        rangeEnd: secondStart + 4,
    });

    expect(result.ok).toBe(true);
    expect(result.locator.charStart).toBe(secondStart);
    expect(result.locator.selectedText).toBe('term');
});

test('text document source revisions change with content', () => {
    const first = classifySource({
        forceTextDocument: true,
        documentInstanceId: 'doc-1',
        documentText: 'hello world',
    });
    const second = classifySource({
        forceTextDocument: true,
        documentInstanceId: 'doc-1',
        documentText: 'hello changed world',
    });

    expect(first.sourceKind).toBe('text_document');
    expect(first.source.documentRevision).not.toBe(second.source.documentRevision);
});

test('ebook requires stable provider identity', () => {
    expect(classifySource({
        ebook: { provider: 'google_books', bookId: 'volume-1', languageCode: 'nl' },
    })).toMatchObject({
        ok: true,
        sourceKind: 'ebook',
        source: { provider: 'google_books', externalId: 'volume-1' },
    });

    expect(classifySource({
        ebook: { provider: 'google_books' },
        selectedText: 'fallback',
    }).sourceKind).toBe('text_document');
});

test('bindings invalidate across navigation id tab or frame', () => {
    const binding = {
        navigationId: 'nav-1',
        tabId: 10,
        frameId: 0,
    };
    expect(bindingAppliesToContext(binding, { navigationId: 'nav-1', tabId: 10, frameId: 0 })).toBe(true);
    expect(bindingAppliesToContext(binding, { navigationId: 'nav-2', tabId: 10, frameId: 0 })).toBe(false);
    expect(bindingAppliesToContext(binding, { navigationId: 'nav-1', tabId: 11, frameId: 0 })).toBe(false);
    expect(bindingAppliesToContext(binding, { navigationId: 'nav-1', tabId: 10, frameId: 2 })).toBe(false);
});

test('frozen action envelope preserves id and excludes raw context text', () => {
    const created = createSelectionSourceBinding({
        url: 'https://example.com/article?utm_medium=x',
        selectedText: 'woord',
        containerText: 'Een woord in context.',
        rangeStart: 4,
        rangeEnd: 9,
        navigationId: 'nav-1',
        tabId: 1,
        frameId: 0,
        capturedAt: '2026-06-23T10:00:00.000Z',
    });
    const envelope = freezeActionEnvelope(created.binding, {
        clientEventId: '22222222-2222-4222-8222-222222222222',
        action: 'start-learning',
        entryId: 'entry-1',
        cardTypeId: 'word-to-definition',
    });

    expect(Object.isFrozen(envelope)).toBe(true);
    expect(envelope.clientEventId).toBe('22222222-2222-4222-8222-222222222222');
    expect(JSON.stringify(created.binding)).not.toContain('Een woord in context');
    expect(envelope.sourceContext.selection).toEqual({
        clickedForm: 'woord',
        contextTextHash: expect.stringMatching(/^pontix-fnv1a-/),
        selectionHash: expect.stringMatching(/^pontix-fnv1a-/),
    });
    expect(JSON.stringify(envelope)).not.toContain('Een woord in context');
});
