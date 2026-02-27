# ☁️ AWS Testing Guide – CloudPulse

This guide walks you through setting up your own AWS account to test CloudPulse's cost monitoring features end-to-end.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create an IAM User for CloudPulse](#2-create-an-iam-user-for-cloudpulse)
3. [Enable Cost Explorer in AWS](#3-enable-cost-explorer-in-aws)
4. [Alternative: Cross-Account IAM Role (Optional)](#4-alternative-cross-account-iam-role-optional)
5. [Run the Project Locally](#5-run-the-project-locally)
6. [Connect Your AWS Account via the App](#6-connect-your-aws-account-via-the-app)
7. [Fetch & View Cost Data](#7-fetch--view-cost-data)
8. [Testing with cURL (API-only)](#8-testing-with-curl-api-only)
9. [Cost & Safety Notes](#9-cost--safety-notes)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement           | Details                                        |
| --------------------- | ---------------------------------------------- |
| **AWS Account**       | Free-tier eligible account works                |
| **Docker Desktop**    | For PostgreSQL and Redis containers             |
| **Node.js ≥ 18**     | Needed to run the monorepo                      |
| **npm**               | Comes with Node.js                             |
| **Git**               | To clone the repository                         |

---

## 2. Create an IAM User for CloudPulse

This is the **easiest** method — create a dedicated IAM user with read-only Cost Explorer access.

### Step 2.1 — Open the IAM Console

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **IAM** → **Users** → **Create user**.

### Step 2.2 — Create the User

1. **User name**: `cloudpulse-test`
2. **Access type**: Check **"Provide user access to the AWS Management Console"** → select **"I want to create an IAM user"**.
3. Click **Next**.

### Step 2.3 — Attach Permissions

1. Select **"Attach policies directly"**.
2. Search for and check these policies:
   - ✅ `AWSCostExplorerReadOnlyAccess` — **(required)** allows reading cost & usage data
   - ✅ `AWSBillingReadOnlyAccess` — *(optional)* allows reading billing details
3. Click **Next** → **Create user**.

### Step 2.4 — Create Access Keys

1. Click on your new user `cloudpulse-test`.
2. Go to the **Security Credentials** tab.
3. Under **Access keys**, click **Create access key**.
4. Select **"Application running outside AWS"** → click **Next**.
5. (Optional) Add a tag like `cloudpulse-testing`.
6. Click **Create access key**.

> [!CAUTION]
> **Copy both keys immediately.** You won't be able to see the Secret Access Key again.

| Key                     | Example Value                            |
| ----------------------- | ---------------------------------------- |
| **Access Key ID**       | `AKIAIOSFODNN7EXAMPLE`                   |
| **Secret Access Key**   | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### Step 2.5 — Note Your AWS Account ID

1. Click on your **account name** in the top-right of the AWS Console.
2. Your **12-digit Account ID** is displayed (e.g., `123456789012`).
3. Save this — you'll need it when connecting the cloud account in CloudPulse.

---

## 3. Enable Cost Explorer in AWS

> [!IMPORTANT]
> AWS Cost Explorer must be enabled **before** CloudPulse can fetch any cost data. After enabling, it takes **up to 24 hours** for data to become available.

1. Go to **AWS Console** → **Billing and Cost Management** → [**Cost Explorer**](https://console.aws.amazon.com/cost-management/home#/cost-explorer).
2. If it's your first time, click **"Launch Cost Explorer"** or **"Enable Cost Explorer"**.
3. Wait 24 hours for historical data to populate.

> [!TIP]
> If your AWS account is brand new (free tier, no usage yet), Cost Explorer may return **empty results**. That's normal — it means there are no costs to report yet. To generate cost data, use some AWS services (even free-tier eligible ones like S3, Lambda, or EC2 micro instances).

---

## 4. Alternative: Cross-Account IAM Role (Optional)

If you prefer not to use long-lived access keys, you can set up an **IAM Role** that CloudPulse assumes.

### Step 4.1 — Create the IAM Role

1. Go to **IAM** → **Roles** → **Create role**.
2. **Trusted entity type**: Select **"AWS account"**.
3. Choose **"Another AWS account"** and enter your **own AWS Account ID**.
4. (Optional) Check **"Require external ID"** and set a value.
5. Click **Next**.

### Step 4.2 — Attach Permissions

1. Search and check: **`AWSCostExplorerReadOnlyAccess`**
2. Click **Next**.
3. **Role name**: `CloudPulseReadCosts`
4. Click **Create role**.

### Step 4.3 — Copy the Role ARN

1. Open the role you just created.
2. Copy the **Role ARN** (e.g., `arn:aws:iam::123456789012:role/CloudPulseReadCosts`).
3. You'll paste this into CloudPulse when connecting the account.

> [!NOTE]
> When using Role ARN, you still need an IAM user with `sts:AssumeRole` permissions to assume the role. The Access Key + Secret Key of that user are passed along with the Role ARN.

---

## 5. Run the Project Locally

### Step 5.1 — Start Docker Containers

```bash
docker compose up -d
```

This starts **PostgreSQL** (port 5432) and **Redis** (port 6379).

### Step 5.2 — Install Dependencies

```bash
npm install
```

### Step 5.3 — Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file and set the required values:

```dotenv
# Database (default Docker values — keep as-is)
DATABASE_URL="postgresql://cloudpulse:cloudpulse@localhost:5432/cloudpulse"

# Auth — CHANGE THIS to a random 32+ char string
JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars"
JWT_EXPIRES_IN="1d"

# API Port
PORT=4000

# Encryption key for AWS credentials storage
# Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="paste-your-generated-hex-here"

# Redis
REDIS_URL="redis://localhost:6379"

# Frontend URL
FRONTEND_URL="http://localhost:3000"
```

> [!IMPORTANT]
> The `ENCRYPTION_KEY` is critical — it encrypts your AWS Access Keys before storing them in the database. Generate it with the command above.

### Step 5.4 — Setup the Database

```bash
npm run prisma:generate --workspace @cloudpulse/db
npm run prisma:migrate --workspace @cloudpulse/db
```

### Step 5.5 — Start the Application

```bash
npm run dev
```

The app will be available at:
- **API**: http://localhost:4000
- **Web Dashboard**: http://localhost:3000

---

## 6. Connect Your AWS Account via the App

### Step 6.1 — Register & Log In

1. Open http://localhost:3000/register
2. Create an account (email + name + password).
3. You'll be redirected to the dashboard.

### Step 6.2 — Create a Project

1. On the dashboard, create a new project (e.g., `"My AWS Test"`).
2. Click into the project to open the detail view.

### Step 6.3 — Connect a Cloud Account

1. Go to the **Cloud Accounts** tab in your project.
2. Click **"Connect Account"** (or similar button).
3. Fill in the form:

| Field                  | Value                                               |
| ---------------------- | --------------------------------------------------- |
| **Account Label**      | `My AWS Account`                                    |
| **AWS Account ID**     | Your 12-digit account ID (e.g., `123456789012`)     |
| **Provider**           | `AWS` (default)                                     |

Then provide **one of**:

**Option A — Access Keys (simpler):**

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| **Access Key ID**  | `AKIA...` from Step 2.4              |
| **Secret Key**     | `wJalr...` from Step 2.4             |

**Option B — IAM Role:**

| Field         | Value                                                    |
| ------------- | -------------------------------------------------------- |
| **Role ARN**  | `arn:aws:iam::123456789012:role/CloudPulseReadCosts`     |

4. Submit the form. Your account will appear in the list.

### Step 6.4 — Fetch Costs

1. Click the **"Fetch Costs"** button next to your connected cloud account.
2. This triggers `POST /api/costs/fetch` and pulls cost data from AWS Cost Explorer.
3. Switch to the **Overview** tab to see your cost summary and charts.

---

## 7. Fetch & View Cost Data

Once a cloud account is connected, there are **two ways** costs are fetched:

### Manual Fetch
- Click **"Fetch Costs"** in the dashboard, or use the API endpoint (see Section 8).

### Automatic (Cron/Worker)
- The server runs a **scheduled job every 6 hours** that fetches costs for all active cloud accounts.
- Powered by BullMQ + Redis.

### What Data You'll See

| Metric             | Description                                           |
| ------------------ | ----------------------------------------------------- |
| **Today's Spend**  | Sum of cost records from today                        |
| **Month Spend**    | Sum of cost records from the 1st of the current month |
| **Month Forecast** | Linear projection to end of month                     |
| **By Service**     | Breakdown by AWS service (EC2, S3, Lambda, etc.)      |

---

## 8. Testing with cURL (API-only)

If you prefer testing via the API directly, here's the complete flow:

### 8.1 — Register

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "MySecureP@ss123"
  }'
```

### 8.2 — Login (get JWT token)

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "MySecureP@ss123"
  }'
```

Save the returned `token` value.

### 8.3 — Create a Project

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My AWS Test"
  }'
```

Save the returned project `id`.

### 8.4 — Connect AWS Cloud Account

```bash
curl -X POST http://localhost:4000/api/cloud-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "provider": "AWS",
    "accountLabel": "My AWS Account",
    "externalAccountId": "123456789012",
    "accessKey": "AKIAIOSFODNN7EXAMPLE",
    "secretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }'
```

Save the returned cloud account `id`.

### 8.5 — Fetch AWS Costs

```bash
curl -X POST http://localhost:4000/api/costs/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "cloudAccountId": "YOUR_CLOUD_ACCOUNT_ID",
    "startDate": "2026-02-01",
    "endDate": "2026-02-25"
  }'
```

### 8.6 — View Cost Records

```bash
curl "http://localhost:4000/api/costs?cloudAccountId=YOUR_CLOUD_ACCOUNT_ID&startDate=2026-02-01&endDate=2026-02-25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8.7 — View Cost Summary

```bash
curl http://localhost:4000/api/costs/summary/YOUR_PROJECT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 9. Cost & Safety Notes

> [!WARNING]
> **AWS Cost Explorer API has its own costs:**
> - Each `GetCostAndUsage` API call costs **$0.01**.
> - The automated cron job runs **every 6 hours** (4 calls/day per cloud account).
> - Estimated cost: **~$1.20/month** per connected cloud account.

### Safety Best Practices

| Practice                              | Why                                                    |
| ------------------------------------- | ------------------------------------------------------ |
| Use **read-only** IAM policies        | Prevents accidental resource modification              |
| Create a **dedicated IAM user**       | Don't use your root account                            |
| **Rotate keys** regularly             | Minimizes risk if keys are compromised                 |
| **Delete the IAM user** after testing | Remove access when you no longer need it               |
| Never commit `.env` to Git            | `.gitignore` already excludes it                       |

---

## 10. Troubleshooting

| Problem                                          | Solution                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `No valid AWS credentials provided`              | Ensure you passed either `accessKey`+`secretKey` or `roleArn` when connecting the cloud account.   |
| `Failed to assume IAM role`                      | Check that the Role ARN is correct and the trust policy allows your account to assume it.          |
| Cost Explorer returns **empty data**              | Enable Cost Explorer in AWS Console and wait 24 hours. Also ensure your account has actual usage.  |
| `AccessDeniedException`                           | Your IAM user/role is missing the `AWSCostExplorerReadOnlyAccess` policy.                          |
| `Unique constraint` error on cloud account        | You already connected this AWS account. Delete the existing one first.                             |
| Docker containers not starting                    | Run `docker compose down` then `docker compose up -d`. Ensure Docker Desktop is running.           |
| `ENCRYPTION_KEY` errors                           | Generate the key with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| Database migration fails                          | Ensure PostgreSQL is running (`docker compose ps`) and `DATABASE_URL` in `.env` is correct.        |

---

## Quick Reference — IAM Policy Summary

The minimum IAM policy JSON your user/role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudPulseCostReadAccess",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetTags"
      ],
      "Resource": "*"
    }
  ]
}
```

> [!TIP]
> You can use the managed policy `AWSCostExplorerReadOnlyAccess` instead of creating a custom one — it includes all of the above actions and more.
