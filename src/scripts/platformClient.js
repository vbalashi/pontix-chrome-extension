import { shouldAttach2000NlBearer } from './security.js';
import { freezeActionEnvelope } from './sourceBinding.js';

export const PONTIX_2000NL_SESSION_KEY = 'pontix2000nlConnectSession';
export const DEFAULT_2000NL_BASE_URL = 'https://2000.dilum.io';

const PLATFORM_ACTIONS_PATH = '/api/platform/v1/actions';
const MUTATION_ACTIONS = new Set([
    'start-learning',
    'mark-known',
    'mark-unknown',
    'review-card',
]);

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
    const session = params.session || await load2000NlSession(params.storage);
    if (!session?.access_token) {
        return { success: false, error: 'missing_2000nl_session' };
    }

    const built = createPlatformActionRequest(params.request || {});
    if (!built.ok) {
        return { success: false, error: built.error };
    }

    const baseUrl = normalizeBaseUrl(params.baseUrl || DEFAULT_2000NL_BASE_URL);
    const url = `${baseUrl}${PLATFORM_ACTIONS_PATH}`;
    const headers = { 'Content-Type': 'application/json' };
    if (shouldAttach2000NlBearer(url)) {
        headers.Authorization = `Bearer ${session.access_token}`;
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

async function load2000NlSession(storage) {
    if (!storage?.get) return null;
    const result = await storage.get(PONTIX_2000NL_SESSION_KEY);
    return result?.[PONTIX_2000NL_SESSION_KEY] || null;
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
