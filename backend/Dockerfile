FROM python:3.12-slim
WORKDIR /app
COPY backend/pyproject.toml backend/alembic.ini ./
COPY backend/app/ app/
COPY backend/alembic/ alembic/
RUN pip install --no-cache-dir .
RUN useradd --system --uid 10001 --create-home appuser
USER appuser
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
