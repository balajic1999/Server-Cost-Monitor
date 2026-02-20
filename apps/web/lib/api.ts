const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type FetchOptions = RequestInit & { token?: string };

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    const { token, headers, ...rest } = opts;

    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        ...rest,
    });

    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.message ?? "Request failed");
    }

    return body as T;
}

// ── Auth ────────────────────────────────────────────

export interface AuthResponse {
    token: string;
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

export function getMe(token: string) {
    return apiFetch<{ id: string; email: string; name: string; createdAt: string }>(
        "/api/auth/me",
        { token }
    );
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

export function listProjects(token: string) {
    return apiFetch<Project[]>("/api/projects", { token });
}

export function getProject(token: string, id: string) {
    return apiFetch<Project>(`/api/projects/${id}`, { token });
}

export function createProject(token: string, data: { name: string; timezone?: string }) {
    return apiFetch<Project>("/api/projects", {
        method: "POST",
        token,
        body: JSON.stringify(data),
    });
}

export function updateProject(token: string, id: string, data: { name?: string; timezone?: string }) {
    return apiFetch<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(data),
    });
}

export function deleteProject(token: string, id: string) {
    return apiFetch<{ deleted: boolean }>(`/api/projects/${id}`, {
        method: "DELETE",
        token,
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

export function listCloudAccounts(token: string, projectId: string) {
    return apiFetch<CloudAccount[]>(`/api/cloud-accounts?projectId=${projectId}`, { token });
}

export function createCloudAccount(
    token: string,
    data: {
        projectId: string;
        provider?: string;
        accountLabel: string;
        externalAccountId: string;
        roleArn?: string;
        accessKey?: string;
        secretKey?: string;
    }
) {
    return apiFetch<CloudAccount>("/api/cloud-accounts", {
        method: "POST",
        token,
        body: JSON.stringify(data),
    });
}

export function deleteCloudAccount(token: string, id: string) {
    return apiFetch<{ deleted: boolean }>(`/api/cloud-accounts/${id}`, {
        method: "DELETE",
        token,
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
}

export function fetchCosts(token: string, cloudAccountId: string, startDate: string, endDate: string) {
    return apiFetch<{ recordsUpserted: number }>("/api/costs/fetch", {
        method: "POST",
        token,
        body: JSON.stringify({ cloudAccountId, startDate, endDate }),
    });
}

export function getCostRecords(token: string, cloudAccountId: string, startDate?: string, endDate?: string) {
    let url = `/api/costs?cloudAccountId=${cloudAccountId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return apiFetch<CostRecord[]>(url, { token });
}

export function getProjectCostSummary(token: string, projectId: string) {
    return apiFetch<CostSummary>(`/api/costs/summary/${projectId}`, { token });
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

export function listAlertRules(token: string, projectId: string) {
    return apiFetch<AlertRule[]>(`/api/alerts?projectId=${projectId}`, { token });
}

export function createAlertRule(
    token: string,
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
        token,
        body: JSON.stringify(data),
    });
}

export function updateAlertRule(
    token: string,
    ruleId: string,
    data: Partial<Omit<AlertRule, "id" | "projectId" | "createdAt" | "updatedAt" | "_count">>
) {
    return apiFetch<AlertRule>(`/api/alerts/${ruleId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(data),
    });
}

export function deleteAlertRule(token: string, ruleId: string) {
    return apiFetch<{ deleted: boolean }>(`/api/alerts/${ruleId}`, {
        method: "DELETE",
        token,
    });
}

export function getAlertHistory(token: string, projectId: string) {
    return apiFetch<AlertSent[]>(`/api/alerts/history?projectId=${projectId}`, { token });
}

// ── Billing & Subscriptions ─────────────────────────

export interface Subscription {
    plan: "FREE" | "PRO";
    status: "ACTIVE" | "PAST_DUE" | "CANCELLED";
    currentPeriodEnd: string | null;
    hasStripeSubscription: boolean;
}

export function getSubscription(token: string) {
    return apiFetch<Subscription>("/api/stripe/subscription", { token });
}

export function createCheckoutSession(token: string) {
    return apiFetch<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        token,
    });
}

export function createPortalSession(token: string) {
    return apiFetch<{ url: string }>("/api/stripe/portal", {
        method: "POST",
        token,
    });
}

// ── User Profile ────────────────────────────────────

export function updateProfile(token: string, data: { name?: string; email?: string }) {
    return apiFetch<{ id: string; email: string; name: string }>("/api/auth/me", {
        method: "PUT",
        token,
        body: JSON.stringify(data),
    });
}

export function changePassword(token: string, data: { currentPassword: string; newPassword: string }) {
    return apiFetch<{ message: string }>("/api/auth/me/password", {
        method: "PUT",
        token,
        body: JSON.stringify(data),
    });
}
