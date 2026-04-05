const API_BASE = "";

type FetchOptions = Omit<RequestInit, "credentials">;

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the refresh cookie.
 * Returns true if refresh succeeded, false otherwise.
 */
async function tryRefresh(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }
    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });
            return res.ok;
        } catch {
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();
    return refreshPromise;
}

/**
 * Core API fetch function.
 * - Uses credentials: 'include' to send httpOnly cookies automatically
 * - Auto-refreshes on 401 responses (transparent to callers)
 */
async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    const { headers, ...rest } = opts;

    const doFetch = () =>
        fetch(`${API_BASE}${path}`, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            ...rest,
        });

    let res = await doFetch();

    // Auto-refresh on 401 (token expired)
    if (res.status === 401 && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            res = await doFetch(); // Retry with new token
        }
    }

    const text = await res.text();
    let body: unknown;
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        if (!res.ok) {
            throw new Error(text.trim().slice(0, 200) || "Request failed");
        }
        throw new Error("Invalid response from server");
    }

    if (!res.ok) {
        const o = body as { message?: unknown; error?: unknown };
        const msg =
            (o.message != null && String(o.message)) ||
            (o.error != null && String(o.error)) ||
            "Request failed";
        throw new Error(msg);
    }

    return body as T;
}

// ── Auth ────────────────────────────────────────────

export interface AuthResponse {
    user: { id: string; email: string; name: string };
}

export function register(data: { email: string; password: string; name: string }) {
    return apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function login(data: { email: string; password: string }) {
    return apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function getMe() {
    return apiFetch<{ id: string; email: string; name: string; createdAt: string }>(
        "/api/auth/me"
    );
}

export function refreshAuth() {
    return apiFetch<AuthResponse>("/api/auth/refresh", {
        method: "POST",
    });
}

export function logoutApi() {
    return apiFetch<{ message: string }>("/api/auth/logout", {
        method: "POST",
    });
}

// ── Projects ────────────────────────────────────────

export interface Project {
    id: string;
    name: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    cloudAccounts: {
        id: string;
        provider: string;
        accountLabel: string;
        isActive: boolean;
    }[];
    _count: { costRecords: number; alertRules: number };
}

export function listProjects() {
    return apiFetch<Project[]>("/api/projects");
}

export function getProject(id: string) {
    return apiFetch<Project>(`/api/projects/${id}`);
}

export function createProject(data: { name: string; timezone?: string }) {
    return apiFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function updateProject(id: string, data: { name?: string; timezone?: string }) {
    return apiFetch<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export function deleteProject(id: string) {
    return apiFetch<{ deleted: boolean }>(`/api/projects/${id}`, {
        method: "DELETE",
    });
}

// ── Cloud Accounts ──────────────────────────────────

export interface CloudAccount {
    id: string;
    provider: string;
    accountLabel: string;
    externalAccountId: string;
    isActive: boolean;
    createdAt: string;
}

export function listCloudAccounts(projectId: string) {
    return apiFetch<CloudAccount[]>(`/api/cloud-accounts?projectId=${projectId}`);
}

export function createCloudAccount(
    data: {
        projectId: string;
        provider?: string;
        accountLabel: string;
        externalAccountId: string;
        // AWS
        roleArn?: string;
        accessKey?: string;
        secretKey?: string;
        // GCP
        gcpKeyJson?: string;
        // Azure
        azureTenantId?: string;
        azureClientId?: string;
        azureClientSecret?: string;
        azureSubscriptionId?: string;
    }
) {
    return apiFetch<CloudAccount>("/api/cloud-accounts", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function deleteCloudAccount(id: string) {
    return apiFetch<{ deleted: boolean }>(`/api/cloud-accounts/${id}`, {
        method: "DELETE",
    });
}

// ── Costs ───────────────────────────────────────────

export interface CostRecord {
    id: string;
    serviceName: string;
    amount: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
    granularity: string;
}

export interface CostSummary {
    todaySpend: number;
    monthSpend: number;
    monthForecast: number;
    /** Present when the API includes per-project service cardinality */
    serviceCount?: number;
}

export function fetchCosts(cloudAccountId: string, startDate: string, endDate: string) {
    return apiFetch<{ recordsUpserted: number }>("/api/costs/fetch", {
        method: "POST",
        body: JSON.stringify({ cloudAccountId, startDate, endDate }),
    });
}

export function getCostRecords(cloudAccountId: string, startDate?: string, endDate?: string) {
    let url = `/api/costs?cloudAccountId=${cloudAccountId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return apiFetch<CostRecord[]>(url);
}

export function getProjectCostSummary(projectId: string) {
    return apiFetch<CostSummary>(`/api/costs/summary/${projectId}`);
}

// ── Alert Rules ─────────────────────────────────────

export interface AlertRule {
    id: string;
    projectId: string;
    dailyBudget: number | null;
    monthlyBudget: number | null;
    spikeThresholdPct: number | null;
    emailEnabled: boolean;
    slackWebhookUrl: string | null;
    createdAt: string;
    updatedAt: string;
    _count: { alertsSent: number };
}

export interface AlertSent {
    id: string;
    channel: string;
    reason: string;
    payload: any;
    sentAt: string;
}

export function listAlertRules(projectId: string) {
    return apiFetch<AlertRule[]>(`/api/alerts?projectId=${projectId}`);
}

export function createAlertRule(
    data: {
        projectId: string;
        dailyBudget?: number;
        monthlyBudget?: number;
        spikeThresholdPct?: number;
        emailEnabled?: boolean;
        slackWebhookUrl?: string;
    }
) {
    return apiFetch<AlertRule>("/api/alerts", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function updateAlertRule(
    ruleId: string,
    data: Partial<Omit<AlertRule, "id" | "projectId" | "createdAt" | "updatedAt" | "_count">>
) {
    return apiFetch<AlertRule>(`/api/alerts/${ruleId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export function deleteAlertRule(ruleId: string) {
    return apiFetch<{ deleted: boolean }>(`/api/alerts/${ruleId}`, {
        method: "DELETE",
    });
}

export function getAlertHistory(projectId: string) {
    return apiFetch<AlertSent[]>(`/api/alerts/history?projectId=${projectId}`);
}

// ── Billing & Subscriptions ─────────────────────────

export interface Subscription {
    plan: "FREE" | "PRO";
    status: "ACTIVE" | "PAST_DUE" | "CANCELLED";
    currentPeriodEnd: string | null;
    hasStripeSubscription: boolean;
}

export function getSubscription() {
    return apiFetch<Subscription>("/api/stripe/subscription");
}

export function createCheckoutSession() {
    return apiFetch<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
    });
}

export function createPortalSession() {
    return apiFetch<{ url: string }>("/api/stripe/portal", {
        method: "POST",
    });
}

// ── User Profile ────────────────────────────────────

export function updateProfile(data: { name?: string; email?: string }) {
    return apiFetch<{ id: string; email: string; name: string }>("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export function changePassword(data: { currentPassword: string; newPassword: string }) {
    return apiFetch<{ message: string }>("/api/auth/me/password", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

// ── Activity Log ────────────────────────────────────

export interface ActivityLogEntry {
    id: string;
    action: string;
    details: Record<string, any>;
    createdAt: string;
}

export function getActivityLog(limit = 50) {
    return apiFetch<ActivityLogEntry[]>(`/api/activity?limit=${limit}`);
}

// ── Password Reset ──────────────────────────────────

export function forgotPassword(email: string) {
    return apiFetch<{ message: string; resetToken?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export function resetPasswordApi(token: string, newPassword: string) {
    return apiFetch<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
    });
}

