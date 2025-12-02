# Keeta BPO Scorecard

## Overview
The **Keeta BPO Scorecard** is a modern web application designed for Regional Training Managers to evaluate and track the performance of BPO vendors. It features a dynamic scoring engine, visual dashboards, and a comprehensive audit management system.

## Features
*   **Scorecard Dashboard**: Visual summary of overall performance with RAG status.
*   **Audit Management**: Detailed audit entry for multiple categories (Training, Readiness, etc.).
*   **Configuration Engine**: Fully customizable Categories and KPIs with auto-weight balancing.
*   **Lifecycle Management**: Draft, Finalize, and Appeal workflows.
*   **Vendor Comparison**: Side-by-side performance analysis.
*   **PDF Export**: Professional, print-ready reports.

## Tech Stack
*   **Framework**: React 18 + TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **State Management**: React Context API
*   **Icons**: Lucide React
*   **Charts**: Recharts
*   **PDF Generation**: html2canvas + jspdf

## Getting Started

### Prerequisites
*   Node.js (v16 or higher)
*   npm (v7 or higher)

### Installation
1.  Clone or download this repository.
2.  Open a terminal in the project folder.
3.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally
To start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### Building for Production
To create a production-ready build:
```bash
npm run build
```
This will generate a `dist` folder containing the compiled static files.

## Deployment
For instructions on how to deploy this application to your corporate network and connect it to SharePoint for data storage, please refer to **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**.
