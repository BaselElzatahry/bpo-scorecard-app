# Keeta BPO Scorecard - SharePoint Deployment Guide

## Overview
This document outlines the steps required to deploy the **Keeta BPO Scorecard** application to the corporate network and configure it to store data in **SharePoint Online** instead of the user's local browser.

## Architecture
*   **Frontend**: React Single Page Application (SPA) built with Vite.
*   **Backend/Database**: SharePoint Online Lists (accessed via Microsoft Graph API).
*   **Authentication**: Azure Active Directory (Entra ID) via MSAL.js.

---

## Part 1: SharePoint Configuration (Data Storage)
The IT team needs to create the following **SharePoint Lists** in a dedicated SharePoint Site.

### 1. List Name: `Keeta_Config`
Stores the JSON configuration for Categories and KPIs.
*   **Columns**:
    *   `Title` (Text): "CurrentConfig"
    *   `JSONContent` (Multiple lines of text, plain text): Stores the full JSON object of categories and KPIs.

### 2. List Name: `Keeta_Audits`
Stores individual audit records.
*   **Columns**:
    *   `Title` (Text): VendorID_Period_KPIID (Unique Key)
    *   `VendorID` (Text)
    *   `Period` (Text)
    *   `KPIID` (Text)
    *   `Done` (Number)
    *   `Met` (Number)
    *   `Comments` (Multiple lines of text)

### 3. List Name: `Keeta_Users`
Stores user roles and access.
*   **Columns**:
    *   `Title` (Text): Email Address
    *   `FullName` (Text)
    *   `Role` (Choice): Admin, Editor, Viewer
    *   `PasswordHash` (Text): *Note: Ideally use Azure AD groups for roles instead of storing passwords here.*

---

## Part 2: Azure AD App Registration (Authentication)
To allow the React app to talk to SharePoint, register an application in **Azure Entra ID**.

1.  Go to **Azure Portal** > **App registrations** > **New registration**.
2.  **Name**: "Keeta BPO Scorecard".
3.  **Supported account types**: "Accounts in this organizational directory only".
4.  **Redirect URI**:
    *   SPA: `https://your-internal-server/keeta-scorecard` (The URL where you will host the app).
    *   *For testing*: `http://localhost:5173`.
5.  **API Permissions**:
    *   Add `Microsoft Graph` permissions.
    *   `Sites.ReadWrite.All` (To read/write list items).
    *   `User.Read` (To sign in).
    *   **Grant Admin Consent** for these permissions.
6.  Copy the **Application (client) ID** and **Directory (tenant) ID**.

---

## Part 3: Code Integration (Developer Tasks)
The current application uses `localStorage`. A developer needs to swap this for `Microsoft Graph` calls.

### 1. Install Dependencies
```bash
npm install @azure/msal-browser @azure/msal-react @microsoft/microsoft-graph-client
```

### 2. Configure MSAL
Create `src/authConfig.ts`:
```typescript
export const msalConfig = {
    auth: {
        clientId: "YOUR_CLIENT_ID",
        authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
        redirectUri: "https://your-internal-server/keeta-scorecard"
    }
};
```

### 3. Update `AppContext.tsx`
Replace `localStorage.getItem` and `setItem` with Graph API calls.
*   **On Load**: Call `graphClient.api('/sites/{site-id}/lists/Keeta_Config/items').get()` to load config.
*   **On Save**: Call `graphClient.api('/sites/{site-id}/lists/Keeta_Config/items').post(...)` to save changes.

*See `src/utils/sharepoint_example.ts` for a code reference.*

---

## Part 4: Hosting (Deployment)
Once the code changes are made:

1.  **Build the Application**:
    ```bash
    npm run build
    ```
    This creates a `dist` folder containing static HTML/CSS/JS files.

2.  **Host the Files**:
    *   **Option A (IIS / Web Server)**: Copy the contents of `dist` to a folder on your internal IIS server.
    *   **Option B (SharePoint)**: Upload the contents of `dist` to a SharePoint Document Library and rename `index.html` to `index.aspx`.
    *   **Option C (Azure)**: Deploy to an Azure Static Web App.

3.  **Verify**: Navigate to the URL. Users should be prompted to log in with their Microsoft 365 credentials.
