# BPO Scorecard Project Transfer Instructions

This package contains the complete source code and deliverables for the BPO Scorecard Tool.

## 📂 Package Contents

- **src/**: Source code for the React application.
- **deliverables/**: Contains the standalone artifacts:
    - `USER_GUIDE_PORTABLE.html`: Self-contained user guide with embedded images.
    - `TOOL_OVERVIEW_PORTABLE.html`: Executive summary and tool overview.
    - `DIRECTORS_CUT.webp`: Promotional video.
- **public/**: Static assets.
- **package.json**: Project dependencies.

## 🚀 Setup on New PC

1.  **Unzip** this folder to your desired location.
2.  **Install Node.js**: Ensure Node.js is installed (v16 or higher recommended).
3.  **Open Terminal**: Navigate to this folder in your terminal.
4.  **Install Dependencies**:
    ```bash
    npm install
    ```
5.  **Start the App**:
    ```bash
    npm run dev
    ```
6.  **Open Browser**: Go to `http://localhost:5173` (or the port shown in the terminal).

## 📄 Documentation

You can open the files in the `deliverables/` folder directly in any web browser without running the app.

- **User Guide**: Double-click `deliverables/USER_GUIDE_PORTABLE.html`
- **Tool Overview**: Double-click `deliverables/TOOL_OVERVIEW_PORTABLE.html`
- **Video**: Open `deliverables/DIRECTORS_CUT.webp` in a browser or media player.

## 🛠 Troubleshooting

- If `npm install` fails, try deleting `package-lock.json` and running it again.
- If the port 5173 is busy, Vite will automatically try the next available port.
