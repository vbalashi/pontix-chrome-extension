const {
    buildConnectAuthorizeUrl,
    createPlatformActionRequest,
    disconnect2000Nl,
    exchangeAuthorizationCode,
    get2000NlSessionState,
    performPlatformLookup,
    performPlatformAction,
    refresh2000NlSession,
    start2000NlConnect,
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

function memoryStorage(initial = {}) {
    const store = { ...initial };
    return {
        store,
        async get(key) {
            return { [key]: store[key] };
        },
        async set(value) {
            Object.assign(store, value);
        },
        async remove(key) {
            delete store[key];
        },
    };
}

test('connect authorize URL uses PKCE and requested connected-client scopes', async () => {
    const url = new URL(await buildConnectAuthorizeUrl({
        baseUrl: 'https://2000.dilum.io/',
        clientId: 'pontix_chrome_dev',
        redirectUri: 'https://extension.chromiumapp.org/',
        scopes: ['platform:read', 'platform:write', 'offline_access'],
        state: 'state-1',
        codeVerifier: 'verifier-1',
    }));

    expect(url.origin + url.pathname).toBe('https://2000.dilum.io/connect/authorize');
    expect(url.searchParams.get('client_id')).toBe('pontix_chrome_dev');
    expect(url.searchParams.get('redirect_uri')).toBe('https://extension.chromiumapp.org/');
    expect(url.searchParams.get('scope')).toBe('platform:read platform:write offline_access');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]+$/);
});

test('connect flow exchanges code and stores only opaque 2000nl session in local storage', async () => {
    const storage = memoryStorage();
    const calls = [];
    const identity = {
        getRedirectURL: () => 'https://extension.chromiumapp.org/',
        launchWebAuthFlow: async ({ url }) => {
            const state = new URL(url).searchParams.get('state');
            return `https://extension.chromiumapp.org/?code=code-1&state=${state}`;
        },
    };

    const result = await start2000NlConnect({
        identity,
        storage,
        clientId: 'pontix_chrome_dev',
        state: 'state-1',
        codeVerifier: 'verifier-1',
        fetchImpl: async (url, init) => {
            calls.push({ url, init });
            return {
                ok: true,
                json: async () => ({
                    access_token: 'access-1',
                    refresh_token: 'refresh-1',
                    expires_at: 1781620000,
                    scope: 'platform:read platform:write offline_access',
                    user: { id: 'user-1', email: 'user@example.com' },
                }),
            };
        },
    });

    expect(result).toMatchObject({
        success: true,
        session: { connected: true, clientId: 'pontix_chrome_dev' },
    });
    expect(calls[0].url).toBe('https://2000.dilum.io/api/connect/token');
    expect(JSON.parse(calls[0].init.body)).toMatchObject({
        grant_type: 'authorization_code',
        client_id: 'pontix_chrome_dev',
        code: 'code-1',
        code_verifier: 'verifier-1',
    });
    expect(storage.store.pontix2000nlConnectSession.access_token).toBe('access-1');
    expect(storage.store.pontix2000nlPendingConnect).toBeUndefined();
});

test('refresh rotates stored 2000nl tokens', async () => {
    const storage = memoryStorage({
        pontix2000nlConnectSession: {
            access_token: 'old-access',
            refresh_token: 'old-refresh',
            client_id: 'pontix_chrome_dev',
            expires_at: 1,
        },
    });

    const result = await refresh2000NlSession({
        storage,
        fetchImpl: async (url, init) => {
            expect(url).toBe('https://2000.dilum.io/api/connect/token');
            expect(JSON.parse(init.body)).toMatchObject({
                grant_type: 'refresh_token',
                client_id: 'pontix_chrome_dev',
                refresh_token: 'old-refresh',
            });
            return {
                ok: true,
                json: async () => ({
                    access_token: 'new-access',
                    refresh_token: 'new-refresh',
                    expires_at: 1781620000,
                    scope: 'platform:read platform:write offline_access',
                }),
            };
        },
    });

    expect(result.success).toBe(true);
    expect(storage.store.pontix2000nlConnectSession.access_token).toBe('new-access');
    expect(storage.store.pontix2000nlConnectSession.refresh_token).toBe('new-refresh');
});

test('lookup is read-only and refreshes expired sessions before calling platform lookup', async () => {
    const storage = memoryStorage({
        pontix2000nlConnectSession: {
            access_token: 'expired-access',
            refresh_token: 'refresh-1',
            client_id: 'pontix_chrome_dev',
            expires_at: 1,
        },
    });
    const calls = [];

    const result = await performPlatformLookup({
        storage,
        query: 'huis',
        languageCode: 'nl',
        contextText: 'Het huis staat daar.',
        fetchImpl: async (url, init) => {
            calls.push({ url, init });
            if (url.endsWith('/api/connect/token')) {
                return {
                    ok: true,
                    json: async () => ({
                        access_token: 'fresh-access',
                        refresh_token: 'fresh-refresh',
                        expires_at: 1781620000,
                        scope: 'platform:read platform:write offline_access',
                    }),
                };
            }
            return {
                ok: true,
                json: async () => ({ query: 'huis', items: [] }),
            };
        },
    });

    expect(result).toEqual({ success: true, result: { query: 'huis', items: [] } });
    expect(calls.map((call) => call.url)).toEqual([
        'https://2000.dilum.io/api/connect/token',
        'https://2000.dilum.io/api/platform/v1/lookup',
    ]);
    expect(JSON.parse(calls[1].init.body)).toMatchObject({
        query: 'huis',
        languageCode: 'nl',
        intent: 'pontix-selection',
        includeUserState: true,
        includeTranslations: true,
    });
    expect(calls[1].init.headers.Authorization).toBe('Bearer fresh-access');
});

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

test('disconnect revokes refresh token and clears local session', async () => {
    const storage = memoryStorage({
        pontix2000nlConnectSession: {
            refresh_token: 'refresh-1',
            client_id: 'pontix_chrome_dev',
        },
    });
    const result = await disconnect2000Nl({
        storage,
        fetchImpl: async (url, init) => {
            expect(url).toBe('https://2000.dilum.io/api/connect/revoke');
            expect(JSON.parse(init.body)).toEqual({
                client_id: 'pontix_chrome_dev',
                refresh_token: 'refresh-1',
            });
            return { ok: true, json: async () => ({}) };
        },
    });

    expect(result).toEqual({ success: true, disconnected: true });
    expect(storage.store.pontix2000nlConnectSession).toBeUndefined();
    await expect(get2000NlSessionState({ storage })).resolves.toEqual({
        success: true,
        session: { connected: false },
    });
});

test('connected client command flow covers connect lookup action refresh and disconnect', async () => {
    const storage = memoryStorage();
    const calls = [];
    const identity = {
        getRedirectURL: () => 'https://extension.chromiumapp.org/',
        launchWebAuthFlow: async ({ url }) => {
            calls.push({ url, init: { method: 'CHROME_IDENTITY' } });
            const state = new URL(url).searchParams.get('state');
            return `https://extension.chromiumapp.org/?code=code-1&state=${state}`;
        },
    };
    let tokenCounter = 0;

    const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        if (url.endsWith('/api/connect/token')) {
            tokenCounter += 1;
            return {
                ok: true,
                json: async () => ({
                    access_token: `access-${tokenCounter}`,
                    refresh_token: `refresh-${tokenCounter}`,
                    expires_at: tokenCounter === 1
                        ? Math.floor(Date.now() / 1000) + 3600
                        : 1781620000,
                    scope: 'platform:read platform:write offline_access',
                    user: { id: 'user-1', email: 'user@example.com' },
                }),
            };
        }
        if (url.endsWith('/api/platform/v1/lookup')) {
            return { ok: true, json: async () => ({ query: 'woord', items: [{ entry: { id: 'entry-1' } }] }) };
        }
        if (url.endsWith('/api/platform/v1/actions')) {
            return { ok: true, json: async () => ({ status: 'accepted', eventId: 'event-1' }) };
        }
        if (url.endsWith('/api/connect/revoke')) {
            return { ok: true, json: async () => ({ revoked: true }) };
        }
        throw new Error(`unexpected url ${url}`);
    };

    await expect(start2000NlConnect({
        identity,
        storage,
        clientId: 'pontix_chrome_dev',
        state: 'state-1',
        codeVerifier: 'verifier-1',
        fetchImpl,
    })).resolves.toMatchObject({
        success: true,
        session: { connected: true, clientId: 'pontix_chrome_dev' },
    });

    await expect(performPlatformLookup({
        storage,
        query: 'woord',
        languageCode: 'nl',
        fetchImpl,
    })).resolves.toMatchObject({
        success: true,
        result: { query: 'woord' },
    });

    await expect(performPlatformAction({
        storage,
        request: {
            sourceBinding: sourceBinding(),
            clientEventId: '55555555-5555-4555-8555-555555555555',
            platformAction: 'start-learning',
            entryId: 'entry-1',
            cardTypeId: 'word-to-definition',
        },
        fetchImpl,
    })).resolves.toMatchObject({
        success: true,
        result: { status: 'accepted' },
    });

    storage.store.pontix2000nlConnectSession.expires_at = 1;
    await expect(performPlatformLookup({
        storage,
        query: 'woord',
        fetchImpl,
    })).resolves.toMatchObject({ success: true });

    await expect(disconnect2000Nl({ storage, fetchImpl })).resolves.toEqual({
        success: true,
        disconnected: true,
    });

    expect(calls.map((call) => call.url)).toEqual([
        expect.stringContaining('/connect/authorize'),
        'https://2000.dilum.io/api/connect/token',
        'https://2000.dilum.io/api/platform/v1/lookup',
        'https://2000.dilum.io/api/platform/v1/actions',
        'https://2000.dilum.io/api/connect/token',
        'https://2000.dilum.io/api/platform/v1/lookup',
        'https://2000.dilum.io/api/connect/revoke',
    ]);
    expect(storage.store.pontix2000nlConnectSession).toBeUndefined();
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

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}
function expiredSession() {
    return { access_token: 'nlc_a_old', refresh_token: 'nlc_r_old', expires_at: 1, client_id: 'pontix_chrome' };
}
function tokenResponse(access = 'nlc_a_new', refresh = 'nlc_r_new') {
    return { ok: true, json: async () => ({ access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + 3600 }) };
}
async function untilCalled(mock) {
    for (let i = 0; i < 40 && !mock.mock.calls.length; i += 1) await Promise.resolve();
    expect(mock).toHaveBeenCalled();
}

test('concurrent expired lookups share one refresh and both use the rotated opaque token', async () => {
    const storage = memoryStorage({ pontix2000nlConnectSession: expiredSession() });
    const gate = deferred();
    const refresh = jest.fn(() => gate.promise);
    const bearers = [];
    const fetchImpl = async (url, init) => {
        if (url.endsWith('/api/connect/token')) return refresh();
        bearers.push(init.headers.Authorization);
        return { ok: true, json: async () => ({ items: [] }) };
    };
    const first = performPlatformLookup({ storage, fetchImpl, query: 'a' });
    const second = performPlatformLookup({ storage, fetchImpl, query: 'b' });
    await untilCalled(refresh);
    gate.resolve(tokenResponse());
    expect((await Promise.all([first, second])).every((result) => result.success)).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(bearers).toEqual(['Bearer nlc_a_new', 'Bearer nlc_a_new']);
});

test('late expired snapshot and recreated client read the persisted opaque rotation', async () => {
    const old = expiredSession();
    const storage = memoryStorage({ pontix2000nlConnectSession: old });
    const fetchImpl = jest.fn(async () => tokenResponse());
    await refresh2000NlSession({ storage, fetchImpl, session: old });
    await refresh2000NlSession({ storage, fetchImpl, session: old });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    let restored;
    jest.isolateModules(() => { restored = require('../src/scripts/platformClient.cjs'); });
    const lookup = jest.fn(async (_url, init) => {
        expect(init.headers.Authorization).toBe('Bearer nlc_a_new');
        return { ok: true, json: async () => ({ items: [] }) };
    });
    expect((await restored.performPlatformLookup({ storage, fetchImpl: lookup })).success).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(1);
});

test.each(['success', 'failure'])('late refresh %s cannot resurrect logout or authorize a lookup', async (outcome) => {
    const storage = memoryStorage({ pontix2000nlConnectSession: expiredSession() });
    const gate = deferred();
    const refresh = jest.fn(() => gate.promise);
    const fetchImpl = jest.fn(async (url) => url.endsWith('/api/connect/token') ? refresh() : { ok: true, json: async () => ({ revoked: true }) });
    const pending = performPlatformLookup({ storage, fetchImpl });
    await untilCalled(refresh);
    await disconnect2000Nl({ storage, fetchImpl });
    gate.resolve(outcome === 'success' ? tokenResponse() : { ok: false, status: 401, json: async () => ({ error: 'invalid_refresh_token' }) });
    expect((await pending).success).toBe(false);
    expect(storage.store.pontix2000nlConnectSession).toBeUndefined();
    expect(fetchImpl.mock.calls.some(([url]) => url.endsWith('/lookup'))).toBe(false);
});

function reconnect(storage, fetchImpl) {
    return start2000NlConnect({ storage, fetchImpl, state: 'state', codeVerifier: 'verifier', identity: {
        getRedirectURL: () => 'https://extension.chromiumapp.org/',
        launchWebAuthFlow: async () => 'https://extension.chromiumapp.org/?state=state&code=new-code',
    } });
}
test.each(['success', 'failure'])('late refresh %s cannot overwrite or invalidate a newer reconnect', async (outcome) => {
    const storage = memoryStorage({ pontix2000nlConnectSession: expiredSession() });
    const gate = deferred();
    const refresh = jest.fn(() => gate.promise);
    const fetchImpl = async (_url, init) => JSON.parse(init.body).grant_type === 'refresh_token' ? refresh() : tokenResponse('nlc_a_reconnect', 'nlc_r_reconnect');
    const pending = refresh2000NlSession({ storage, fetchImpl });
    await untilCalled(refresh);
    expect((await reconnect(storage, fetchImpl)).success).toBe(true);
    gate.resolve(outcome === 'success' ? tokenResponse() : { ok: false, status: 401, json: async () => ({ error: 'invalid_refresh_token' }) });
    await pending;
    expect(storage.store.pontix2000nlConnectSession.access_token).toBe('nlc_a_reconnect');
});

test('slow revoke cannot remove a reconnect and logout invalidates pending connect exchange', async () => {
    const storage = memoryStorage({ pontix2000nlConnectSession: expiredSession() });
    const revoke = deferred();
    const started = jest.fn(() => revoke.promise);
    const logout = disconnect2000Nl({ storage, fetchImpl: started });
    await untilCalled(started);
    expect((await reconnect(storage, async () => tokenResponse('nlc_a_reconnect'))).success).toBe(true);
    revoke.resolve({ ok: true });
    await logout;
    expect(storage.store.pontix2000nlConnectSession.access_token).toBe('nlc_a_reconnect');
    const code = deferred();
    const exchange = jest.fn(() => code.promise);
    const connecting = reconnect(storage, exchange);
    await untilCalled(exchange);
    await disconnect2000Nl({ storage, fetchImpl: async () => ({ ok: true }) });
    code.resolve(tokenResponse());
    expect((await connecting).success).toBe(false);
    expect(storage.store.pontix2000nlConnectSession).toBeUndefined();
});

test('a delayed storage snapshot is re-read after another caller commits rotation', async () => {
    const old = expiredSession();
    const storage = memoryStorage({ pontix2000nlConnectSession: old });
    const read = deferred();
    const get = storage.get.bind(storage);
    let first = true;
    storage.get = async (key) => {
        if (first) { first = false; await read.promise; return { [key]: old }; }
        return get(key);
    };
    const fetchImpl = jest.fn(async () => tokenResponse());
    const late = refresh2000NlSession({ storage, fetchImpl });
    await refresh2000NlSession({ storage, fetchImpl });
    read.resolve();
    expect((await late).session.access_token).toBe('nlc_a_new');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('new reconnect refresh is not joined to the previous generation flight', async () => {
    const storage = memoryStorage({ pontix2000nlConnectSession: expiredSession() });
    const gate = deferred();
    const oldRequest = jest.fn(() => gate.promise);
    const previous = refresh2000NlSession({ storage, fetchImpl: oldRequest });
    await untilCalled(oldRequest);
    await reconnect(storage, async () => tokenResponse('nlc_a_reconnect', 'nlc_r_reconnect'));
    const nextRequest = jest.fn(async (_url, init) => {
        expect(JSON.parse(init.body).refresh_token).toBe('nlc_r_reconnect');
        return tokenResponse('nlc_a_latest', 'nlc_r_latest');
    });
    expect((await refresh2000NlSession({ storage, fetchImpl: nextRequest })).success).toBe(true);
    gate.resolve(tokenResponse());
    expect((await previous).success).toBe(false);
    expect(storage.store.pontix2000nlConnectSession.access_token).toBe('nlc_a_latest');
});

test('changed production ESM lifecycle matches the tested CommonJS entry', () => {
    const fs = require('fs');
    const esm = fs.readFileSync(require.resolve('../src/scripts/platformClient.js'), 'utf8');
    const commonjs = fs.readFileSync(require.resolve('../src/scripts/platformClient.cjs'), 'utf8');
    const section = (text, from, to) => text.slice(text.indexOf(from), text.indexOf(to));
    expect(section(esm, '// The service worker owns Connect.', 'const MUTATION_ACTIONS'))
        .toBe(section(commonjs, '// The service worker owns Connect.', 'const MUTATION_ACTIONS'));
    for (const [name, next] of [['start2000NlConnect', 'exchangeAuthorizationCode'], ['refresh2000NlSession', 'disconnect2000Nl'], ['disconnect2000Nl', 'get2000NlSessionState']]) {
        const normalize = (text) => text.replace(/export async function/g, 'async function');
        expect(section(normalize(esm), `async function ${name}`, `async function ${next}`))
            .toBe(section(commonjs, `async function ${name}`, `async function ${next}`));
    }
    expect(section(esm, 'async function getValid2000NlSession', 'async function connectTokenRequest'))
        .toBe(section(commonjs, 'async function getValid2000NlSession', 'async function connectTokenRequest'));
});

test('a stale transport rejection after reconnect is fenced without changing the newer session', async () => {
    const storage = memoryStorage({ pontix2000nlConnectSession: expiredSession() });
    let reject;
    const transport = jest.fn(() => new Promise((_resolve, fail) => { reject = fail; }));
    const pending = refresh2000NlSession({ storage, fetchImpl: transport });
    await untilCalled(transport);
    await reconnect(storage, async () => tokenResponse('nlc_a_reconnect'));
    reject(new TypeError('offline'));
    await expect(pending).resolves.toEqual({ success: false, error: '2000nl_session_changed' });
    expect(storage.store.pontix2000nlConnectSession.access_token).toBe('nlc_a_reconnect');
});

test('a delayed old connect commit cannot erase the newer pending Connect flow', async () => {
    const storage = memoryStorage();
    const write = deferred();
    const commit = jest.fn();
    const set = storage.set.bind(storage);
    let first = true;
    storage.set = async (value) => {
        if (value.pontix2000nlConnectSession && first) {
            first = false; commit(); await write.promise;
        }
        await set(value);
    };
    const previous = reconnect(storage, async () => tokenResponse('nlc_a_previous'));
    await untilCalled(commit);
    const webFlow = deferred();
    const launch = jest.fn(() => webFlow.promise);
    const next = start2000NlConnect({ storage, fetchImpl: async () => tokenResponse('nlc_a_latest'), state: 'new-state', codeVerifier: 'new-verifier', identity: {
        getRedirectURL: () => 'https://extension.chromiumapp.org/', launchWebAuthFlow: launch,
    } });
    write.resolve();
    expect((await previous).success).toBe(false);
    await untilCalled(launch);
    expect(storage.store.pontix2000nlPendingConnect.state).toBe('new-state');
    webFlow.resolve('https://extension.chromiumapp.org/?state=new-state&code=latest');
    expect((await next).success).toBe(true);
    expect(storage.store.pontix2000nlConnectSession.access_token).toBe('nlc_a_latest');
});

test('a delayed logout storage read cannot revoke the newly reconnected refresh token', async () => {
    const storage = memoryStorage({ pontix2000nlConnectSession: expiredSession() });
    const read = deferred();
    const get = storage.get.bind(storage);
    let first = true;
    storage.get = async (key) => {
        if (first) { first = false; await read.promise; }
        return get(key);
    };
    const revoke = jest.fn(async () => ({ ok: true }));
    const logout = disconnect2000Nl({ storage, fetchImpl: revoke });
    expect((await reconnect(storage, async () => tokenResponse('nlc_a_reconnect', 'nlc_r_reconnect'))).success).toBe(true);
    read.resolve();
    expect((await logout).success).toBe(false);
    expect(revoke).not.toHaveBeenCalled();
    expect(storage.store.pontix2000nlConnectSession.refresh_token).toBe('nlc_r_reconnect');
});
