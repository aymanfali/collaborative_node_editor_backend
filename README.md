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
