# Mock API

This folder contains the JSON Server database used during local development. It provides sample directory users and Circle membership records without requiring a separate backend service.

## Start the API

From the project root, run:

```sh
npm run api
```

The API listens on `http://localhost:3001`. JSON Server reads and writes `db.json`, so successful mutations are persisted in this file.

The React development server proxies requests from `/api` to this API. Start
`npm run dev` in a second terminal; the app uses `/api` by default. For another
environment, set `VITE_API_BASE_URL` to that environment's API base URL before
building the app (see `.env.example`).

## Data model

- `users` are directory profiles with a stable numeric `id`.
- `circle` records represent a membership. Each has its own `id`, a `userId` referencing `users.id`, and an `addedAt` timestamp.

Keeping membership as a separate record lets the API store Circle-specific fields independently of the user profile.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/users` | List directory users |
| `GET` | `/users/:id` | Read one user |
| `GET` | `/circle` | List Circle membership records |
| `GET` | `/circle?_expand=user` | List memberships with their user records |
| `POST` | `/circle` | Add a membership, for example `{ "userId": 3, "addedAt": "2026-11-18T10:00:00.000Z" }` |
| `DELETE` | `/circle/:id` | Remove a membership |

JSON Server supplies the standard CRUD routes for both collections. It is a development mock, so it does not enforce application rules such as preventing duplicate membership records; the client will enforce those rules when we connect the API.
