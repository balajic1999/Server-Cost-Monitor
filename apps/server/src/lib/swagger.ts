import { Router } from "express";

const spec = {
    openapi: "3.0.3",
    info: {
        title: "CloudPulse API",
        version: "0.1.0",
        description: "API for monitoring cloud infrastructure costs across AWS accounts.",
    },
    servers: [{ url: "/api", description: "API base" }],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        schemas: {
            Error: {
                type: "object",
                properties: {
                    message: { type: "string" },
                    requestId: { type: "string" },
                },
            },
            Project: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    timezone: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            CloudAccount: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    provider: { type: "string", enum: ["AWS", "GCP"] },
                    accountLabel: { type: "string" },
                    externalAccountId: { type: "string" },
                    isActive: { type: "boolean" },
                },
            },
            CostRecord: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    serviceName: { type: "string" },
                    amount: { type: "number" },
                    currency: { type: "string" },
                    periodStart: { type: "string", format: "date-time" },
                    periodEnd: { type: "string", format: "date-time" },
                },
            },
            AlertRule: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    dailyBudget: { type: "number" },
                    monthlyBudget: { type: "number" },
                    spikeThresholdPct: { type: "number" },
                },
            },
        },
    },
    security: [{ bearerAuth: [] }],
    paths: {
        "/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Register a new user",
                security: [],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } }, required: ["name", "email", "password"] } } },
                },
                responses: { "201": { description: "User created, returns JWT token" }, "409": { description: "Email already exists" } },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Login with email and password",
                security: [],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] } } },
                },
                responses: { "200": { description: "Returns JWT token" }, "401": { description: "Invalid credentials" } },
            },
        },
        "/auth/profile": {
            patch: {
                tags: ["Auth"],
                summary: "Update user profile (name)",
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } } },
                responses: { "200": { description: "Updated user" } },
            },
        },
        "/auth/change-password": {
            post: {
                tags: ["Auth"],
                summary: "Change password",
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { currentPassword: { type: "string" }, newPassword: { type: "string" } }, required: ["currentPassword", "newPassword"] } } } },
                responses: { "200": { description: "Password changed" }, "401": { description: "Current password incorrect" } },
            },
        },
        "/projects": {
            get: { tags: ["Projects"], summary: "List user projects", responses: { "200": { description: "Array of projects" } } },
            post: {
                tags: ["Projects"],
                summary: "Create a project",
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, timezone: { type: "string" } }, required: ["name"] } } } },
                responses: { "201": { description: "Created project" } },
            },
        },
        "/projects/{id}": {
            get: { tags: ["Projects"], summary: "Get project by ID", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Project" } } },
            patch: { tags: ["Projects"], summary: "Update project", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated project" } } },
            delete: { tags: ["Projects"], summary: "Delete project", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
        },
        "/cloud-accounts": {
            get: { tags: ["Cloud Accounts"], summary: "List cloud accounts for a project", parameters: [{ name: "projectId", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Array of accounts" } } },
            post: { tags: ["Cloud Accounts"], summary: "Connect a cloud account", responses: { "201": { description: "Created account" } } },
        },
        "/cloud-accounts/{id}": {
            delete: { tags: ["Cloud Accounts"], summary: "Disconnect cloud account", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Removed" } } },
        },
        "/costs": {
            get: { tags: ["Costs"], summary: "Get cost records", parameters: [{ name: "cloudAccountId", in: "query", required: true, schema: { type: "string" } }, { name: "startDate", in: "query", schema: { type: "string", format: "date" } }, { name: "endDate", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Array of cost records" } } },
        },
        "/costs/fetch": {
            post: { tags: ["Costs"], summary: "Trigger cost fetch from AWS", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { cloudAccountId: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" } }, required: ["cloudAccountId", "startDate", "endDate"] } } } }, responses: { "200": { description: "Fetch result with recordsUpserted" } } },
        },
        "/costs/summary/{projectId}": {
            get: { tags: ["Costs"], summary: "Project cost summary", parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Cost summary" } } },
        },
        "/alerts": {
            get: { tags: ["Alerts"], summary: "List alert rules", parameters: [{ name: "projectId", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Array of alert rules" } } },
            post: { tags: ["Alerts"], summary: "Create alert rule", responses: { "201": { description: "Created rule" } } },
        },
        "/alerts/{id}": {
            delete: { tags: ["Alerts"], summary: "Delete alert rule", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
        },
        "/alerts/history/{projectId}": {
            get: { tags: ["Alerts"], summary: "Alert history", parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Array of sent alerts" } } },
        },
        "/activity": {
            get: { tags: ["Activity"], summary: "Get activity log", parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "Array of activity entries" } } },
        },
    },
};

// Minimal Swagger UI HTML (no dependency needed)
const swaggerHtml = `<!DOCTYPE html>
<html><head>
<title>CloudPulse API Docs</title>
<meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/docs/spec.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis], layout: 'BaseLayout' })</script>
</body></html>`;

export const docsRouter = Router();

docsRouter.get("/", (_req, res) => {
    res.type("html").send(swaggerHtml);
});

docsRouter.get("/spec.json", (_req, res) => {
    res.json(spec);
});
