# Campus Events

Campus Events is a Vue 3 application with an Express 5 REST and MCP API. It includes persistent PostgreSQL storage, reliable email delivery, resilient Redis caching, and realtime browser notifications.

## Submission links

- GitHub: https://github.com/r1029033/campusevents
- Running project: https://campusevents-ayqs.onrender.com/
- Health check: https://campusevents-ayqs.onrender.com/api/health
- MCP endpoint: https://campusevents-ayqs.onrender.com/mcp

## Assignment improvements

### Clean architecture

The API is split into focused layers:

```text
route -> controller -> service -> repository -> Sequelize model
```

Routes define URLs and validation, controllers translate HTTP requests and responses, services contain business rules, and repositories are the only layer that reads or writes Sequelize models. Configuration is centralized in `api/src/config/env.mjs`.

### Persistent, reliable registration and email

Production data lives in Neon PostgreSQL, so restarting or redeploying Render does not remove events or registrations. Registration and its email and notification outbox rows are written in one database transaction. If RabbitMQ is offline, the committed rows remain pending and the outbox worker retries with exponential backoff. A mail worker consumes the durable RabbitMQ job and calls Brevo, which sends real email.

The registration transaction locks the event row. Concurrent requests for the final seat are serialized, so only one succeeds. A database unique constraint separately prevents one email address from registering twice for the same event.

After RabbitMQ confirms publication, the outbox payload is erased so participant details are not retained unnecessarily.

### Redis caching

All GET endpoints except `/api/health` use cache-aside Redis caching with a 60-second TTL. A cache miss reads PostgreSQL and stores the result. Event changes and registrations delete every affected list, detail, registration, and statistics key. Redis errors are logged and requests fall back to PostgreSQL, so caching is an optimization rather than a correctness requirement.

### Realtime browser notifications

Each API instance binds a private RabbitMQ queue to a fanout exchange. A notification published once reaches every instance, and each instance forwards it to all connected browsers through server-sent events. The frontend deduplicates notification IDs. Registration notifications contain the event ID and title, never the participant name or email.

### MCP API

The stateless Streamable HTTP endpoint is `POST /mcp`. It uses the official Model Context Protocol TypeScript SDK and requires `Authorization: Bearer <MCP_API_KEY>`.

It exposes three tools:

- `list_upcoming_events`
- `list_past_events`
- `register_for_event`

The registration tool accepts an event ID or exact title plus a name and email. It calls the same service as the REST endpoint, so it receives the same validation, database lock, outbox email, cache invalidation, and browser toast.

To inspect it locally, run `npx @modelcontextprotocol/inspector`. Choose Streamable HTTP, enter `http://localhost:3000/mcp`, and add the bearer authorization header.

### Online deployment

`render.yaml` contains the Render web-service blueprint. The production Express process serves the Vue build, REST API, MCP endpoint, outbox worker, email worker, and notification worker. Neon, CloudAMQP, and Brevo all have free plans and no Docker installation is required.

## Stack Overflow references used

- https://stackoverflow.com/questions/30166321/cache-invalidation-strategy — used to choose cache-aside behavior: delete related keys after database writes and use a TTL so temporary invalidation failures self-repair.
- https://stackoverflow.com/questions/70595192/bull-js-blocks-express-api-requests-until-jobs-finish — used for the principle of moving email delivery into background worker logic so it cannot block or determine whether registration is stored.
- https://stackoverflow.com/questions/52327143/serving-vuejs-builds-via-express-js-using-history-mode — used to serve the Vue `dist` directory from Express and return `index.html` for client-side routes in production.

## Local setup

Requirements: Node.js 22.22.2 or newer and npm. Use a RabbitMQ URL and Brevo account for real email. Neon and Redis are optional locally because SQLite and no-cache fallbacks are available.

```powershell
git clone https://github.com/r1029033/campusevents.git
cd campusevents
npm install
Copy-Item api/.env.example api/.env
npm run dev
```

Fill in `MCP_API_KEY`, `AMQP_URL`, `BREVO_API_KEY`, and `MAIL_FROM_ADDRESS` in `api/.env`. The API process hosts the workers itself. Open http://localhost:5173.

## Verification

Run the same check used by CI:

```powershell
npm run check
npm run test:postgres -w api
npm run build
```

The PostgreSQL suite verifies the concurrent final-seat case against the same database engine used in production. The API tests cover the REST and MCP behavior, and the frontend suite covers the API client and Vue components.

## Main environment variables

| Variable | Purpose | Local example |
|---|---|---|
| `DATABASE_URL` | Pooled Neon URL used by the app | Neon pooled URL |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL used by migrations | Neon direct URL |
| `MCP_API_KEY` | Bearer credential protecting `/mcp` | A long random value |
| `AMQP_URL` | RabbitMQ connection | CloudAMQP URL |
| `BREVO_API_KEY` | Brevo transactional email credential | Brevo API key |
| `MAIL_FROM_ADDRESS` | Verified real email sender | Your verified address |
| `REDIS_URL` | Optional Redis cache | Redis connection URL |
| `DB_STORAGE` | SQLite local fallback only | `./data/events.sqlite` |

## Security choices

- MCP checks its bearer key before executing tools and compares secrets in constant time.
- Zod validates REST and MCP input; Sequelize uses parameterized queries.
- Legacy PostgreSQL TLS modes are upgraded to `sslmode=verify-full`.
- Logs use registration and message IDs rather than participant details.
- Secrets remain in ignored environment files and Render environment variables.

`npm audit --omit=dev` currently reports Sequelize 6's transitive `uuid` 8 advisory. The affected v3/v5/v6 caller-buffer APIs are not used; this project uses Sequelize UUID v4 generation. npm's proposed fix is an unsafe downgrade to Sequelize 3, so the dependency is monitored until Sequelize provides a compatible upgrade path.
