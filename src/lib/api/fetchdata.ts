import { getSession } from "$lib/api/supabaseClient";
import { logOut } from "$lib/api/auth";
import { addToast } from "$store/toast";

async function getAuthHeaders(requireAuth = true): Promise<Record<string, string>> {
    const session = await getSession();
    if (!session) {
        if (requireAuth) {
            throw new Error('User session not found');
        }
        return {};
    }

    return {
        Authorization: `Bearer ${session.access_token}`
    };
}

export async function apiFetch(endpoint, method = 'GET', body: unknown = null, isFormData = false, requireAuth = true) {
    const authHeaders = await getAuthHeaders(requireAuth);
    const headers: Record<string, string> = { ...authHeaders };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (isFormData && !(body instanceof FormData)) {
        throw new Error('Form data body is required');
    }

    const url = import.meta.env.VITE_API_URL + endpoint;

    const response = await fetch(url, {
        method,
        headers,
        body: isFormData && body instanceof FormData ? body : body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
        // Handle token expiration (401 Unauthorized)
        if (response.status === 401) {
            console.error('Token expired. Logging out user.');
            addToast({
                message: 'Your session has expired. Please log in again.',
                type: 'error',
                duration: 5000
            });
            await logOut();
        }

        console.error('API Request failed:', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            url
        });
        throw new Error(`${method} ${endpoint} failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
}