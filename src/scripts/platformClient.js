import { shouldAttach2000NlBearer } from './security.js';
import { freezeActionEnvelope } from './sourceBinding.js';

export const PONTIX_2000NL_SESSION_KEY = 'pontix2000nlConnectSession';
export const PONTIX_2000NL_PENDING_CONNECT_KEY = 'pontix2000nlPendingConnect';
export const DEFAULT_2000NL_BASE_URL = 'https://2000.dilum.io';
export const DEFAULT_2000NL_CLIENT_ID = 'pontix_chrome';

const PLATFORM_ACTIONS_PATH = '/api/platform/v1/actions';
const PLATFORM_LOOKUP_PATH = '/api/platform/v1/lookup';
const CONNECT_TOKEN_PATH = '/api/connect/token';
const CONNECT_REVOKE_PATH = '/api/connect/revoke';
const CONNECT_AUTHORIZE_PATH = '/connect/authorize';
const DEFAULT_SCOPES = ['platform:read', 'platform:write', 'offline_access'];
const ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 60;
const MUTATION_ACTIONS = new Set([
    'start-learning',
    'mark-known',
    'mark-unknown',
    'review-card',
]);

export async function start2000NlConnect(params = {}) {
    const identity = params.identity;
    if (!identity?.launchWebAuthFlow || !identity?.getRedirectURL) {
        return { success: false, error: 'identity_api_unavailable' };
    }
    const storage = params.storage;
    const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_2000NL_BASE_URL);
    const clientId = params.clientId || DEFAULT_2000NL_CLIENT_ID;
    const redirectUri = params.redirectUri || identity.getRedirectURL();
    const scopes = normalizeScopes(params.scopes);
    const state = params.state || cryptoRandomString(24);
    const codeVerifier = params.codeVerifier || cryptoRandomString(64);
    const authorizeUrl = await buildConnectAuthorizeUrl({
        baseUrl,
        clientId,
        redirectUri,
        scopes,
        state,
        codeVerifier,
    });

    if (storage?.set) {
        await storage.set({
            [PONTIX_2000NL_PENDING_CONNECT_KEY]: {
                baseUrl,
                clientId,
                redirectUri,
                scopes,
                state,
                codeVerifier,
                createdAt: Date.now(),
            },
        });
    }

    const redirectedTo = await identity.launchWebAuthFlow({
        url: authorizeUrl,
        interactive: params.interactive !== false,
    });
    const redirect = new URL(redirectedTo);
    const error = redirect.searchParams.get('error');
    if (error) return { success: false, error };
    if (redirect.searchParams.get('state') !== state) {
        return { success: false, error: 'connect_state_mismatch' };
    }
    const code = redirect.searchParams.get('code');
    if (!code) return { success: false, error: 'missing_authorization_code' };

    const sessionResult = await exchangeAuthorizationCode({
        baseUrl,
        clientId,
        redirectUri,
        code,
        codeVerifier,
        fetchImpl: params.fetchImpl,
    });
    if (!sessionResult.success) return sessionResult;

    await store2000NlSession(storage, sessionResult.session);
    if (storage?.remove) await storage.remove(PONTIX_2000NL_PENDING_CONNECT_KEY);
    return { success: true, session: publicSessionState(sessionResult.session) };
}

export async function exchangeAuthorizationCode(params = {}) {
    return connectTokenRequest({
        baseUrl: params.baseUrl,
        fetchImpl: params.fetchImpl,
        body: {
            grant_type: 'authorization_code',
            client_id: params.clientId || DEFAULT_2000NL_CLIENT_ID,
            code: params.code,
            redirect_uri: params.redirectUri,
            code_verifier: params.codeVerifier,
        },
    });
}

export async function refresh2000NlSession(params = {}) {
    const session = params.session || await load2000NlSession(params.storage);
    if (!session?.refresh_token) return { success: false, error: 'missing_refresh_token' };
    const refreshed = await connectTokenRequest({
        baseUrl: params.baseUrl,
        fetchImpl: params.fetchImpl,
        body: {
            grant_type: 'refresh_token',
            client_id: params.clientId || session.client_id || DEFAULT_2000NL_CLIENT_ID,
            refresh_token: session.refresh_token,
        },
    });
    if (!refreshed.success) return refreshed;
    await store2000NlSession(params.storage, refreshed.session);
    return { success: true, session: refreshed.session };
}

export async function disconnect2000Nl(params = {}) {
    const storage = params.storage;
    const session = params.session || await load2000NlSession(storage);
    if (!session?.refresh_token) {
        if (storage?.remove) await storage.remove(PONTIX_2000NL_SESSION_KEY);
        return { success: true, disconnected: true };
    }
    const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_2000NL_BASE_URL);
    const response = await params.fetchImpl(`${baseUrl}${CONNECT_REVOKE_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: params.clientId || session.client_id || DEFAULT_2000NL_CLIENT_ID,
            refresh_token: session.refresh_token,
        }),
    });
    if (storage?.remove) await storage.remove(PONTIX_2000NL_SESSION_KEY);
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return { success: false, error: payload?.error || 'disconnect_failed', status: response.status };
    }
    return { success: true, disconnected: true };
}

export async function get2000NlSessionState(params = {}) {
    const session = await load2000NlSession(params.storage);
    return { success: true, session: publicSessionState(session) };
}

export async function performPlatformLookup(params = {}) {
    const sessionResult = await getValid2000NlSession(params);
    if (!sessionResult.success) return sessionResult;
    const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_2000NL_BASE_URL);
    const url = `${baseUrl}${PLATFORM_LOOKUP_PATH}`;
    const headers = { 'Content-Type': 'application/json' };
    if (!shouldAttach2000NlBearer(url)) {
        return { success: false, error: 'platform_route_not_allowlisted' };
    }
    headers.Authorization = `Bearer ${sessionResult.session.access_token}`;

    const response = await params.fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            query: params.query,
            languageCode: params.languageCode || 'nl',
            contextText: params.contextText || '',
            intent: params.intent || 'pontix-selection',
            includeUserState: true,
            includeTranslations: true,
        }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        return {
            success: false,
            error: payload?.error || 'platform_lookup_failed',
            status: response.status,
            detail: payload?.detail,
        };
    }
    return { success: true, result: payload };
}

export function createPlatformActionRequest(params = {}) {
    const binding = params.sourceBinding;
    if (!binding || typeof binding !== 'object') {
        return { ok: false, error: 'missing_source_binding' };
    }

    const action = normalizeAction(params);
    if (!MUTATION_ACTIONS.has(action.action)) {
        return { ok: false, error: 'unsupported_platform_action' };
    }
    if (!action.entryId || !action.cardTypeId) {
        return { ok: false, error: 'missing_card_reference' };
    }

    const envelope = freezeActionEnvelope(binding, action);
    return {
        ok: true,
        request: Object.freeze({
            clientEventId: envelope.clientEventId,
            action: envelope.action,
            result: envelope.result,
            entryId: envelope.entryId,
            cardTypeId: envelope.cardTypeId,
            sourceContext: envelope.sourceContext,
        }),
    };
}

export async function performPlatformAction(params = {}) {
    const sessionResult = await getValid2000NlSession(params);
    if (!sessionResult.success) return sessionResult;
    const built = createPlatformActionRequest(params.request || {});
    if (!built.ok) {
        return { success: false, error: built.error };
    }

    const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_2000NL_BASE_URL);
    const url = `${baseUrl}${PLATFORM_ACTIONS_PATH}`;
    const headers = { 'Content-Type': 'application/json' };
    if (shouldAttach2000NlBearer(url)) {
        headers.Authorization = `Bearer ${sessionResult.session.access_token}`;
    } else {
        return { success: false, error: 'platform_route_not_allowlisted' };
    }

    const response = await params.fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(built.request),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        return {
            success: false,
            error: payload?.error || 'platform_action_failed',
            status: response.status,
            detail: payload?.detail,
        };
    }
    return { success: true, result: payload, request: built.request };
}

export async function buildConnectAuthorizeUrl(params = {}) {
    const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_2000NL_BASE_URL);
    const redirectUri = params.redirectUri;
    const state = params.state;
    const codeVerifier = params.codeVerifier;
    if (!redirectUri || !state || !codeVerifier) {
        throw new Error('missing_connect_authorize_params');
    }
    const codeChallenge = params.codeChallenge || await pkceChallenge(codeVerifier);
    const url = new URL(`${baseUrl}${CONNECT_AUTHORIZE_PATH}`);
    url.searchParams.set('client_id', params.clientId || DEFAULT_2000NL_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', normalizeScopes(params.scopes).join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
}

async function getValid2000NlSession(params = {}) {
    const session = params.session || await load2000NlSession(params.storage);
    if (!session?.access_token) return { success: false, error: 'missing_2000nl_session' };
    if (!shouldRefresh(session)) return { success: true, session };
    if (!session.refresh_token) return { success: false, error: 'missing_refresh_token' };
    return refresh2000NlSession(params);
}

async function connectTokenRequest(params = {}) {
    const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_2000NL_BASE_URL);
    const response = await params.fetchImpl(`${baseUrl}${CONNECT_TOKEN_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        return { success: false, error: payload?.error || 'connect_token_failed', status: response.status };
    }
    return {
        success: true,
        session: {
            ...payload,
            client_id: params.body.client_id,
            connected_at: new Date().toISOString(),
        },
    };
}

async function load2000NlSession(storage) {
    if (!storage?.get) return null;
    const result = await storage.get(PONTIX_2000NL_SESSION_KEY);
    return result?.[PONTIX_2000NL_SESSION_KEY] || null;
}

async function store2000NlSession(storage, session) {
    if (!storage?.set || !session) return;
    await storage.set({ [PONTIX_2000NL_SESSION_KEY]: session });
}

function publicSessionState(session) {
    if (!session?.access_token) return { connected: false };
    return {
        connected: true,
        expiresAt: session.expires_at || null,
        scope: session.scope || '',
        user: session.user || null,
        clientId: session.client_id || DEFAULT_2000NL_CLIENT_ID,
    };
}

function shouldRefresh(session) {
    if (!session?.expires_at) return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Number(session.expires_at) - nowSeconds <= ACCESS_TOKEN_REFRESH_SKEW_SECONDS;
}

function normalizeAction(params = {}) {
    return {
        clientEventId: params.clientEventId,
        action: params.platformAction || params.learningAction || params.action,
        result: params.result || null,
        entryId: params.entryId,
        cardTypeId: params.cardTypeId,
    };
}

function normalizeBaseUrl(value) {
    return String(value || DEFAULT_2000NL_BASE_URL).replace(/\/+$/, '');
}

function normalizeScopes(value) {
    const scopes = Array.isArray(value) ? value : DEFAULT_SCOPES;
    return scopes.filter((scope) => DEFAULT_SCOPES.includes(scope));
}

async function pkceChallenge(verifier) {
    const bytes = new TextEncoder().encode(verifier);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return base64Url(new Uint8Array(digest));
}

function base64Url(bytes) {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function cryptoRandomString(length) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
