# ADT Hub V2 - Backend

FastAPI backend for ADT Hub V2.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Poetry](https://python-poetry.org/docs/#installation) (optional, for local development without Docker)
- Python 3.12+ (if running without Docker)

## Getting Started (Docker Compose)

The easiest way to run the backend and its dependencies (PostgreSQL) is using Docker Compose.

1.  **Configure Environment Variables**:
    Copy the example environment file and fill in the values:
    ```bash
    cp .env.example .env
    ```
    *Note: For local development, `ENVIRONMENT=local` and `DEBUG=true` are recommended to enable hot-reload and dev seeding.*

2.  **Start the Services**:
    ```bash
    docker compose up -d
    ```
    This will start:
    -   **API**: `http://localhost:3001`
    -   **PostgreSQL**: `localhost:5434` (external port)

3.  **Check Logs**:
    ```bash
    docker compose logs -f api
    ```

## Local Development (Native)

If you prefer to run the API directly on your host machine:

1.  **Install Dependencies**:
    ```bash
    poetry install
    ```

2.  **Start the Database**:
    You can still use Docker to run just the database:
    ```bash
    docker compose up -d db
    ```

3.  **Run Migrations**:
    ```bash
    poetry run alembic upgrade head
    ```

4.  **Start the Server**:
    ```bash
    poetry run uvicorn src.adthub.main:app --host 0.0.0.0 --port 3001 --reload
    ```

## API Documentation

Once the server is running, you can access the interactive Swagger documentation at:
-   [http://localhost:3001/docs](http://localhost:3001/docs)

## Database Migrations

This project uses **Alembic** for database migrations.

-   **Create a new migration**:
    ```bash
    docker compose exec api alembic revision --autogenerate -m "description_of_change"
    ```
-   **Apply migrations**:
    Migrations are automatically applied on container startup via `entrypoint.sh`. To apply them manually:
    ```bash
    docker compose exec api alembic upgrade head
    ```

## Seeding Data

To seed the database with initial data (e.g., skill catalog):

```bash
docker compose exec api python scripts/seed_skills.py
```

## Testing

Run the test suite using `pytest`:

```bash
# Inside docker
docker compose exec api pytest

# Locally
cd backend
pytest
```

## Hot Reload

Hot reload is enabled by default when:
1.  `DEBUG=true` is set in your `.env`.
2.  The `src/` directory is mounted as a volume in `docker-compose.yml` (default configuration).
