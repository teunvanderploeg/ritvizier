import httpx
from fastapi.testclient import TestClient

from app.main import app, requests
from app.providers.rdw import RdwProvider
from app.services.vehicles import VehicleService


def test_api_contract_and_validation():
    requests.clear()
    with TestClient(app) as client:
        app.state.vehicle_service = VehicleService(
            RdwProvider(
                httpx.AsyncClient(
                    transport=httpx.MockTransport(lambda _: httpx.Response(200, json=[]))
                )
            )
        )
        assert client.get("/health").status_code == 200
        assert client.get("/api/vehicles/BAD").status_code == 422
        assert client.get("/api/vehicles/AB-123-C").status_code == 404
        response = client.post(
            "/api/costs",
            json={
                "annualKm": 12000,
                "consumption": 6,
                "energyPrice": 2,
                "insuranceMonthly": 60,
                "maintenanceMonthly": 40,
                "roadTaxMonthly": 50,
            },
        )
        assert response.json()["monthly"] == 270
        assert response.headers["x-content-type-options"] == "nosniff"
        assert client.post("/api/costs", json={"annualKm": -1}).status_code == 422


def test_rate_limit():
    requests.clear()
    with TestClient(app) as client:
        statuses = [client.get("/api/vehicles/BAD").status_code for _ in range(31)]
        assert statuses[-1] == 429
    requests.clear()
