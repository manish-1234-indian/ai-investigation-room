# The Mystery Room

An interactive detective story built with React, Vite, Express, MongoDB/Mongoose, and Gemini. Start a fresh case, inspect evidence, request limited hints, choose a suspect, and see your result.

## Run locally

Install Node.js 20 or later, then from this folder:

```sh
npm install
npm install --prefix client
npm install --prefix server
Copy-Item server/.env.example server/.env
npm run dev
```

The client runs at `http://localhost:5173`; the API runs at `http://localhost:4000`. Without `GEMINI_API_KEY`, the app uses its built-in playable case. Without `MONGODB_URI`, case data is kept in memory and resets when the API restarts. For persistence, set `MONGODB_URI` in `server/.env`. Set `GEMINI_API_KEY` to enable fresh AI generated mysteries. Never put server credentials in the client environment.

## Production

Deploy `server` as a Node service and `client` as a Vite static site. Configure `CLIENT_URL`, `MONGODB_URI`, and `GEMINI_API_KEY` on the server. Set `VITE_API_URL` on the client build to the deployed API base ending in `/api`. The client build command is `npm run build --prefix client`; publish `client/dist`.

## Gameplay rules

| Difficulty | Suspects | Clues | Hints | Correct accusation |
|---|---:|---:|---:|---:|
| Easy | 3 | 5 | 2 | 100 pts |
| Medium | 4 | 7 | 3 | 150 pts |
| Hard | 5 | 9 | 3 | 200 pts |

Each discovered clue adds 5 points; each hint costs 10 points. An incorrect accusation earns no base points. Final score cannot fall below zero. The case solution is stored on the server and omitted from active-case API responses.
