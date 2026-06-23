const {
    createPlatformActionRequest,
    performPlatformAction,
} = require('../src/scripts/platformClient.cjs');
const { createSelectionSourceBinding } = require('../src/scripts/sourceBinding.cjs');

function sourceBinding() {
    const created = createSelectionSourceBinding({
        url: 'https://example.com/article?utm_source=newsletter',
        selectedText: 'woord',
        containerText: 'Een woord in context.',
        rangeStart: 4,
        rangeEnd: 9,
        navigationId: 'nav-1',
        tabId: 1,
        frameId: 0,
    });
    expect(created.ok).toBe(true);
    return created.binding;
}

test('platform action request is built from frozen source binding without raw context', () => {
    const result = createPlatformActionRequest({
        sourceBinding: sourceBinding(),
        clientEventId: '33333333-3333-4333-8333-333333333333',
        platformAction: 'start-learning',
        entryId: 'entry-1',
        cardTypeId: 'word-to-definition',
    });

    expect(result.ok).toBe(true);
    expect(Object.isFrozen(result.request)).toBe(true);
    expect(result.request).toMatchObject({
        clientEventId: '33333333-3333-4333-8333-333333333333',
        action: 'start-learning',
        entryId: 'entry-1',
        cardTypeId: 'word-to-definition',
        sourceContext: {
            contractVersion: 'source-context-v2',
            source: { kind: 'web_page' },
            location: { kind: 'text_selection', navigationId: 'nav-1' },
        },
    });
    expect(JSON.stringify(result.request)).not.toContain('Een woord in context');
});

test('platform action posting attaches bearer only to allowlisted 2000nl route', async () => {
    const calls = [];
    const response = await performPlatformAction({
        session: { access_token: 'token-1' },
        request: {
            sourceBinding: sourceBinding(),
            clientEventId: '44444444-4444-4444-8444-444444444444',
            platformAction: 'mark-known',
            entryId: 'entry-1',
            cardTypeId: 'word-to-definition',
        },
        fetchImpl: async (url, init) => {
            calls.push({ url, init });
            return {
                ok: true,
                json: async () => ({ status: 'accepted', eventId: 'event-1' }),
            };
        },
    });

    expect(response.success).toBe(true);
    expect(calls[0].url).toBe('https://2000.dilum.io/api/platform/v1/actions');
    expect(calls[0].init.headers.Authorization).toBe('Bearer token-1');
    expect(JSON.parse(calls[0].init.body).sourceContext.contractVersion).toBe('source-context-v2');
});

test('platform action rejects unsupported actions and missing sessions', async () => {
    expect(createPlatformActionRequest({
        sourceBinding: sourceBinding(),
        platformAction: 'translate',
        entryId: 'entry-1',
        cardTypeId: 'word-to-definition',
    })).toEqual({ ok: false, error: 'unsupported_platform_action' });

    await expect(performPlatformAction({
        request: {
            sourceBinding: sourceBinding(),
            platformAction: 'start-learning',
            entryId: 'entry-1',
            cardTypeId: 'word-to-definition',
        },
        fetchImpl: async () => { throw new Error('should not fetch'); },
    })).resolves.toEqual({ success: false, error: 'missing_2000nl_session' });
});
