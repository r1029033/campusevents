# Campus Events

Campus Events is a Vue 3 frontend with an Express 5 REST API for browsing campus events and registering participants.

## Submission links

- GitHub: https://github.com/r1029033/campusevents
- Running project: https://campusevents-ayqs.onrender.com/
- Health check: https://campusevents-ayqs.onrender.com/api/health

## Assignment improvements

### Clean architecture

The API is split into focused layers:

```text
route -> controller -> service -> repository -> Sequelize model
```

Routes define URLs and validation, controllers translate HTTP requests and responses, services contain business rules, and repositories are the only layer that reads or writes Sequelize models. Configuration is centralized in `api/src/config/env.mjs`.

### Reliable confirmation mail

After a registration is stored, the API publishes a durable RabbitMQ job. A separate worker consumes that job and sends the confirmation through Nodemailer. The database write happens before queue publishing and publishing is fail-open, so registration still returns `201` and remains stored if RabbitMQ or the mail provider is offline.

Local development uses RabbitMQ and Mailpit:

```powershell
docker compose up -d rabbitmq mailpit
npm run worker:mail -w api
```

Mailpit is available at http://localhost:8025 and RabbitMQ management at http://localhost:15672 (`guest` / `guest`).

### Redis caching

All GET endpoints except `/api/health` use cache-aside Redis caching with a 60-second TTL. A cache miss reads SQLite and stores the result. Event changes and registrations delete every affected list, detail, registration, and statistics key. Redis errors are logged and requests fall back to SQLite, so caching is an optimization rather than a requirement for correctness.

Start Redis locally with:

```powershell
docker compose up -d redis
```

### Online deployment

`render.yaml` contains the Render web-service blueprint. The production Express process serves both the built Vue application and `/api`, including the Vue Router history fallback. Optional `AMQP_URL` and `REDIS_URL` values can be configured in Render; the application remains functional when either service is absent.

## Stack Overflow references used

- https://stackoverflow.com/questions/30166321/cache-invalidation-strategy — used to choose cache-aside behavior: delete related keys after database writes and use a TTL so temporary invalidation failures self-repair.
- https://stackoverflow.com/questions/70595192/bull-js-blocks-express-api-requests-until-jobs-finish — used for the principle of moving background work into a separate worker process so email delivery does not block or determine the registration response.
- https://stackoverflow.com/questions/52327143/serving-vuejs-builds-via-express-js-using-history-mode — used to serve the Vue `dist` directory from Express and return `index.html` for client-side routes in production.

## Local setup

Requirements: Node.js 22.12 or newer, npm, and Docker Desktop for RabbitMQ, Redis, and Mailpit.

```powershell
git clone https://github.com/r1029033/campusevents.git
cd campusevents
npm install
Copy-Item api/.env.example api/.env
docker compose up -d rabbitmq redis mailpit
npm run dev
```

In a second terminal, start the mail worker:

```powershell
npm run worker:mail -w api
```

Open http://localhost:5173.

## Verification

Run the same check used by CI:

```powershell
npm run check
npm run build
```

The API integration suite verifies the REST behavior, including that registration succeeds with no AMQP configuration, and the frontend suite tests the API client and Vue components.

## Main environment variables

| Variable | Purpose | Local example |
|---|---|---|
| `DB_STORAGE` | SQLite database file | `./data/events.sqlite` |
| `AMQP_URL` | RabbitMQ connection | `amqp://guest:guest@localhost:5672` |
| `SMTP_URL` | Mail provider connection | `smtp://127.0.0.1:1025` |
| `MAIL_FROM` | Sender displayed in email | `Campus Events <no-reply@example.com>` |
| `REDIS_URL` | Redis connection | `redis://127.0.0.1:6379` |
