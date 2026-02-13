# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project layout

- `frontend/`: React + Vite single-page app for the Zoom-like video calling UI.
- `backend/`: Node.js/Express API and Socket.IO signaling server backed by MongoDB via Mongoose.

The frontend talks to the backend over:
- REST API at `http://localhost:3000/api/v1/user` for auth and meeting history (see `frontend/src/contexts/AuthContext.jsx`).
- Socket.IO at `http://localhost:3000` for WebRTC signaling and chat (see `frontend/src/pages/VideoMeet.jsx` and `backend/src/controllers/socketManager.js`).

User authentication is implemented with a random token stored in MongoDB (`backend/src/models/user.js`) and in `localStorage` on the client. Protected routes are wrapped with the `withAuth` HOC (`frontend/src/utils/withAuth.jsx`), which redirects unauthenticated users to `/auth`.

Meeting history is modeled via the `Meeting` collection (`backend/src/models/meeting.js`), keyed by `user.username` and a `meetingCode`. The `home` and `history` pages in the frontend create and display these records.

## Backend: running and environment

**Location:** `backend/`

### Commands

From `backend/`:
- Start in watch mode (development): `npm run dev`
- Start once with Node: `npm start`
- Start with PM2 (requires PM2 installed globally): `npm run prod`

There are no test or lint scripts defined for the backend at this time.

### Environment

Backend configuration is driven by environment variables (see `backend/app.js`):
- `ATLASDB_URL` (required): MongoDB connection string used by Mongoose.
- `PORT` (optional): HTTP port. Defaults to `3000` when unset; the frontend is hardcoded to call `http://localhost:3000`.

The Express app:
- Mounts the user routes under `/api/v1/user` (`backend/src/routes/user.js`).
- Uses `socketManager.connectToSocket(server)` to attach a Socket.IO server to the same HTTP server instance.

### HTTP API and auth

Key pieces:
- Routes: `backend/src/routes/user.js` exposes `/login`, `/register`, `/addToActivity`, `/getAllActivity` as POST endpoints.
- Controllers: `backend/src/controllers/user.js` implements login/registration, token issuance (`crypto.randomBytes`), and meeting history CRUD.
- Models: `backend/src/models/user.js` and `backend/src/models/meeting.js` define Mongo schemas.

The auth model is:
1. `POST /login` verifies username + bcrypt-hashed password and issues a random token.
2. The token is stored on the `User` document and returned to the client.
3. Client stores the token in `localStorage` under `"token"` and sends it in the body of history-related requests.

### Socket.IO signaling

`backend/src/controllers/socketManager.js` manages all signaling concerns:
- Maintains in-memory maps of active connections per "room" (keyed by the URL string the client passes on `join-call`), chat history per room, and a simple time-online tracker.
- On `"join-call"`, adds the client to a room, notifies existing peers via `"user-connected"`, and replays any stored messages.
- On `"signal"`, forwards WebRTC SDP/ICE messages between peers.
- On `"chat-message"`, finds the room for the sender, persists the message in `messages[room]`, and broadcasts to all room participants.
- On `"disconnect"`, informs remaining peers via `"user-disconnected"` and cleans up room state when the last client leaves.

## Frontend: running, linting, and structure

**Location:** `frontend/`

### Commands

From `frontend/`:
- Start dev server with HMR: `npm run dev`
- Build for production: `npm run build`
- Preview built app: `npm run preview`
- Lint all JS/JSX files: `npm run lint`

There are currently no test scripts configured in `frontend/package.json`.

### Linting configuration

ESLint is configured in `frontend/eslint.config.js`:
- Extends `@eslint/js` recommended rules plus `react-hooks` and `react-refresh` plugins for React/Vite.
- Targets `**/*.{js,jsx}` and treats `dist` as ignored output.
- Enforces `no-unused-vars` but ignores variables matching `^[A-Z_]`.

When updating lint rules, prefer editing `eslint.config.js` rather than adding per-file overrides.

### Application structure

Entry and routing:
- `frontend/src/main.jsx` bootstraps React (`createRoot`) and renders `<App />` into `#root`.
- `frontend/src/App.jsx` sets up `react-router-dom` with routes:
  - `/` → landing page (`landing.jsx`)
  - `/auth` → login/register (`authentication.jsx`)
  - `/home` → main meeting-join page (`home.jsx`, wrapped in `AuthProvider` and `withAuth`)
  - `/history` → past meetings (`history.jsx`)
  - `/:url` → video meeting room (`VideoMeet.jsx`)

Global auth context:
- `frontend/src/contexts/AuthContext.jsx` exports `AuthProvider` and `AuthContext`.
- It wraps the router in `App.jsx` and provides:
  - `handleRegister`, `handleLogin`: wrap axios calls to `http://localhost:3000/api/v1/user/register` and `/login`.
  - `getUserHistory`, `addToHistory`: call `/getAllActivity` and `/addToActivity` with the `token` from `localStorage`.
- Successful login stores `token` in `localStorage` and redirects to `/home`.

Route protection and navigation:
- `withAuth` (`frontend/src/utils/withAuth.jsx`) is a higher-order component that:
  - On mount, checks `localStorage.getItem("token")`.
  - Redirects to `/auth` if missing.
  - Otherwise renders the wrapped component.
- `HomeComponent` (`home.jsx`) and the history page rely on `AuthContext` and `withAuth` to ensure only logged-in users can access meeting functionality.

Pages and user flows:
- `landing.jsx`:
  - Checks `localStorage` to determine if the user is logged in.
  - Shows Register/Login links (to `/auth`) or a Sign Out action that clears the token.
  - Primary CTA links to `/home`.
- `authentication.jsx`:
  - Toggle between Sign In and Sign Up modes using `formState`.
  - On submit, calls `handleLogin` or `handleRegister` from `AuthContext`.
  - Displays backend error messages and a success `Snackbar` on registration.
- `home.jsx`:
  - Lets the user enter a `meetingCode` and join a call at `/:meetingCode`.
  - Calls `addToHistory(meetingCode)` before navigation.
  - Provides links to meeting history and logout.
- `history.jsx`:
  - On mount, calls `getUserHistory()` from `AuthContext` and renders meeting cards with codes and timestamps.
  - Each card has a "Join Meeting" button that navigates back into `/:meetingCode`.

### Video meeting implementation

`frontend/src/pages/VideoMeet.jsx` contains the WebRTC + Socket.IO client logic:
- Connects to the Socket.IO server at `http://localhost:3000`.
- Uses a global `connections` map of `RTCPeerConnection` instances keyed by peer socket IDs.
- Handles media permissions and local stream setup via `navigator.mediaDevices.getUserMedia`.
- Negotiates offers/answers and ICE candidates over `"signal"` events.
- Supports:
  - Toggling camera and microphone.
  - Screen sharing via `navigator.mediaDevices.getDisplayMedia` when available.
  - In-call chat using `"chat-message"` events.

The meeting "room" identifier is the full `window.location.href` passed to `"join-call"`, while the user-facing code passed from `/home`/`/history` becomes the `/:url` segment in the URL.

## Getting started for new changes

1. Ensure MongoDB is reachable and set `ATLASDB_URL` in a `.env` file or environment variables for the backend.
2. In `backend/`, run `npm install` and then `npm run dev` to start the API and Socket.IO server on port 3000.
3. In `frontend/`, run `npm install` and then `npm run dev` to start the Vite dev server.
4. Access the app via the Vite dev URL (typically `http://localhost:5173/`), register a user on `/auth`, then use `/home` and `/history` to exercise meeting flows.
