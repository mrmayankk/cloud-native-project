# Cloud Native Task Manager

An end-to-end task manager with a React interface, Java 21 / Spring Boot REST API, and PostgreSQL persistence. Docker Compose runs the database, API, and frontend together.

## Run with Docker

Install Docker Desktop, then from the repository root run:

```powershell
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The API and database are available to the frontend over the Compose network. Data is persisted in the `postgres_data` volume.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_PORT` | `8080` | Host port for the web app |
| `POSTGRES_DB` | `taskdb` | PostgreSQL database |
| `POSTGRES_USER` | `taskuser` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `taskpass` | PostgreSQL password |

Set a non-default database password before using this setup beyond local development.

## Run services locally

The API uses an in-memory H2 database by default for local development. Start the API and frontend in different terminals:

```powershell
cd backend
mvn spring-boot:run
```

```powershell
cd frontend
npm ci
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:8080`. Local H2 data resets when the backend stops. To use PostgreSQL locally, configure `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and `SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver`.

## REST API

All task endpoints use JSON:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/tasks` | List tasks, most recently updated first |
| `GET` | `/api/tasks/{id}` | Get one task |
| `POST` | `/api/tasks` | Create a task |
| `PUT` | `/api/tasks/{id}` | Update a task |
| `DELETE` | `/api/tasks/{id}` | Delete a task |
| `GET` | `/api/health` | Container health check |

Example request:

```json
{
  "title": "Ship the first release",
  "description": "Review the deployment checklist",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "dueDate": "2026-12-01"
}
```

Statuses are `TODO`, `IN_PROGRESS`, and `DONE`; priorities are `LOW`, `NORMAL`, and `HIGH`. Omitted status and priority default to `TODO` and `NORMAL`.

## Verify

```powershell
cd backend
mvn test
```

```powershell
cd frontend
npm ci
npm run build
```

GitHub Actions runs the backend tests and frontend production build on pushes and pull requests.

## Architecture

- `backend/` — Spring Boot REST API, validation, service/repository layers, and PostgreSQL/JPA persistence.
- `frontend/` — React task board with create, edit, complete, filter, and delete workflows.
- `docker-compose.yml` — PostgreSQL, API, and Nginx-served frontend with health checks and persistent database storage.
