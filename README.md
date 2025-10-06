# CONOTE
# Collaborative Note Editor — Backend
 
 Backend service for a real-time collaborative notes/editor app.
 
 ## Tech Stack
 - **Runtime**: Node.js (ES Modules)
 - **Framework**: Express
 - **Database**: MongoDB (Mongoose)
 - **Real-time**: Socket.IO
 - **Auth**: JWT (access/refresh), Passport (local + Google OAuth 2.0)
 - **Misc**: Multer (uploads), PDFKit/Puppeteer (PDF), Morgan (logging), CORS, Sessions
 
 ## Project Scripts
 
 - **dev**: `nodemon src/server.js`
 - **start**: `node src/server.js`
 
 From `backend/`:
 
 ```bash
 npm install
 npm run dev   # starts the API with nodemon
 # or
 npm start     # starts the API with node
 ```
 
 ## Environment Variables
 
 Copy `.env.example` to `.env` and adjust values:
 
 ```dotenv
 PORT=3000
 API_URL=http://localhost:3000
 FRONTEND_URL=http://localhost:5173
 MONGO_URI=mongodb://127.0.0.1:27017/collaborative_editor
 
 ACCESS_TOKEN_SECRET=your-strong-access-secret-here
 REFRESH_TOKEN_SECRET=your-strong-refresh-secret-here
 
 # Google OAuth 2.0
 GOOGLE_CLIENT_ID=your-google-client-id-here
 GOOGLE_CLIENT_SECRET=your-google-client-secret-here
 ```
 
 - `PORT`: API port.
 - `FRONTEND_URL`: allowed CORS origin for the SPA.
 - `MONGO_URI`: local/remote MongoDB connection string.
 - `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`: long, random strings.
 - Google OAuth keys are obtained from Google Cloud Console.
 
 ## Directory Structure (key parts)
 
 - `src/`
   - `server.js`: app entry point, HTTP + Socket.IO server
   - `config/`: environment/config setup
   - `controllers/`: route handlers
   - `middlewares/`: auth/validation/misc middlewares
   - `models/`: Mongoose schemas
   - `routes/`: Express routers
   - `services/` required services like auth service
   - `utils/`: reusable jwt and ApiError
   - `uploads/avatars/`: uploaded avatar files
 
 ## Running Locally
 
 1. Ensure MongoDB is running and accessible at `MONGO_URI`.
 2. Create `.env` based on `.env.example`.
 3. Install deps: `npm install`.
 4. Start dev server: `npm run dev`.
 
 The API will be available at `http://localhost:<PORT>` (default `3000`).
 
 ## Real-time Collaboration
 
 Socket.IO powers real-time events (document/notes editing, presence, etc.). The frontend connects via `socket.io-client` to the same origin as the API or a configured Socket.IO endpoint.
 
 ## Authentication
 
 - Local login/registration via Passport Local and JWT issuance.
 - Optional Google OAuth 2.0 via Passport Google strategy.
 - Refresh token flow protected with `REFRESH_TOKEN_SECRET`.
 
 ## PDF Generation
 
 - `pdfkit` is used to generate PDFs programmatically.
 - `puppeteer` can render HTML-to-PDF when needed.
 
 ## License
 
 ISC — © Ayman F. Ali
 
---

# Comprehensive API Documentation

## Base URL on Localhost

- Development: `http://localhost:3000`
- Base path for REST API: `http://localhost:3000/api/v1`

## Auth Model

- Access Token (JWT): short-lived (30m). Can be sent as:
  - Bearer header: `Authorization: Bearer <accessToken>`
  - Or HttpOnly cookie `accessToken` (set by the server on auth endpoints)
- Refresh Token (JWT): 7 days, rotated and single-use, stored server-side in `Token` collection. Sent via:
  - HttpOnly cookie `refreshToken` (preferred) or request body.

## Standard Response Shape

On success (typical):

```json
{ "success": true, "data": { /* resource */ } }
```

On validation or server error:

```json
{ "success": false, "message": "Error message", "errors": [ {"field":"email","message":"Invalid email"} ] }
```

Global error handler is defined in `src/middlewares/error.middleware.js`.

## Authentication Endpoints

Base: `/api/v1/auth`

- POST `/register`
  - Body: `{ "name": "John Doe", "email": "john@example.com", "password": "secret123" }`
  - Sets HttpOnly cookies: `accessToken`, `refreshToken`.
  - Response: `{ success, data: { accessToken, refreshToken } }`
  - Example:
    ```bash
    curl -X POST "$BASE/api/v1/auth/register" \
      -H "Content-Type: application/json" \
      -d '{"name":"John","email":"john@example.com","password":"secret123"}' -i
    ```

- POST `/login`
  - Body: `{ "email": "john@example.com", "password": "secret123" }`
  - Sets HttpOnly cookies.
  - Response: `{ success, data: { accessToken, refreshToken } }`

- POST `/refresh`
  - Body: `{ "refreshToken": "<optional>" }` or uses cookie `refreshToken`.
  - Returns new rotated tokens and refreshes cookies.

- POST `/logout`
  - Body: `{ "refreshToken": "<optional>" }` or uses cookie.
  - Clears auth cookies and invalidates refresh token.

- GET `/me`
  - Auth: Access token (header or cookie).
  - Response: `{ success, data: { name, email, avatar, provider, role } }`

- PATCH `/me`
  - Auth: Access token.
  - Body (any): `{ name?: string(min 3), avatar?: string(url), password?: string(min 6, local only) }`
  - Response: updated public user info.

- GET `/google`
  - Redirects to Google OAuth.

- GET `/google/callback`
  - Handles OAuth callback, sets cookies, and redirects to `FRONTEND_URL`.

## Notes Endpoints

Base: `/api/v1/notes`

All note routes require authentication via `authMiddleware`.

- POST `/`
  - Create a note.
  - Body: `{ "title": "My Note", "content": "<html or text>" }`
  - Response: the created note document.

- GET `/`
  - List notes visible to the user (owner, collaborator, or all if admin).
  - Query: `q` optional full-text search across `title` and `content`.
  - Response: array of notes. When `q` used, results sorted by text score; otherwise by `createdAt` desc. Falls back to regex search if no text index.

- GET `/:id`
  - Get single note if user is owner, collaborator, or admin.
  - Response includes `__meta` with permissions: `{ canEdit, canManage, isCollaborator, permission }`.

- PUT `/:id`
  - Update `title` and/or `content`.
  - Requires: owner/admin or collaborator with `permission=edit`.

- DELETE `/:id`
  - Owner or admin only.

### Note Export

- GET `/:id/export.md`
- GET `/:id/export.html`
- GET `/:id/export.pdf`
  - All require authentication and access to the note.
  - PDF uses Headless Chrome via `puppeteer`.

### Collaborators

- GET `/:id/collaborators`
  - Owner/admin/collaborator can view list.

- POST `/:id/collaborators`
  - Body: `{ "email": "collab@example.com", "permission": "view|edit" }`
  - Owner/admin only. Adds or updates a collaborator.

- DELETE `/:id/collaborators/:userId`
  - Owner/admin only. Removes collaborator.

## Admin Endpoints

Base: `/api/v1/admin` — require `role=admin`.

- GET `/users`
  - Returns users list: `name, email, role, avatar, provider, createdAt`.

- GET `/stats`
  - Returns `{ users, notes, activeSessions }` where `activeSessions` mirrors active Socket.IO connections.

- DELETE `/users/:id`
  - Removes a user by id.

## File Uploads

- POST `/api/v1/auth/avatar`
  - Auth required.
  - `multipart/form-data` with field name `avatar` (image only, <= 3MB).
  - Stores file in `uploads/avatars/` and returns user with `avatar` URL.
  - Static files served under `/uploads` in `src/app.js`.

## Headers and CORS

- `CORS` enabled for `FRONTEND_URL` and credentials.
- When using cookies, ensure client sends `withCredentials: true` and server has `SameSite` and `Secure` flags according to environment.

## Socket.IO Events

Namespace: default. Server initialized in `src/server.js`.

- Client connects to `io(API_URL)`, then:
  - `join-note` — payload: `{ noteId: string, user: { id|_id, name|email, color? } }`
  - `leave-note` — payload: `{ noteId: string }`
  - `editor-changes` — payload: `{ noteId: string, delta: QuillDelta }` (broadcast to room)
  - `cursor-update` — payload: `{ noteId: string, cursor: { userId, name, color, index, length } }`
  - Server emits `presence` with an array of current users in the room.

Example (browser client):

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");
socket.emit("join-note", { noteId: "<id>", user: { id: "u1", name: "Alice" } });
socket.on("presence", (list) => console.log(list));
```

## Error Codes

- 400: Validation errors, bad input
- 401: Missing/invalid access token
- 403: Forbidden (role/permission check failed)
- 404: Resource not found
- 500: Unhandled server error

## Postman Collection

A ready-to-use Postman collection is provided at `backend/Conote.postman_collection.json` with variables:

- `baseUrl`: default `http://localhost:3000/api/v1`
- Collection includes folders: Auth, Notes, Notes Export, Collaborators, Admin, Uploads.

Import into Postman and set `baseUrl` accordingly. For cookie auth, enable “Send cookies” in the Postman settings or rely on header Bearer tokens placed manually.
