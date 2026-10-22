"""
Pytest integration tests for FastAPI backend.
Covers:
- SSRF prevention
- Product URL extraction
- Virtual Try-On job lifecycle
- API validation
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.security import validate_url_ssrf_safe
from fastapi import HTTPException


client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "ssrf_protection" in data["features"]


def test_health_alias_check():
    """Verify that root /health endpoint functions identically for Render health checks."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "ssrf_protection" in data["features"]


def test_ssrf_rejects_localhost():
    with pytest.raises(HTTPException) as exc_info:
        validate_url_ssrf_safe("http://localhost:8080/admin")
    assert exc_info.value.status_code == 400
    assert "forbidden" in exc_info.value.detail.lower() or "restricted" in exc_info.value.detail.lower()


def test_ssrf_rejects_private_ips():
    dangerous_urls = [
        "http://127.0.0.1:3000/secret",
        "http://10.0.0.1/internal-api",
        "http://192.168.1.1/router-config",
        "http://169.254.169.254/latest/meta-data/",
    ]
    for url in dangerous_urls:
        with pytest.raises(HTTPException) as exc_info:
            validate_url_ssrf_safe(url)
        assert exc_info.value.status_code == 400


def test_ssrf_rejects_unsupported_scheme():
    with pytest.raises(HTTPException) as exc_info:
        validate_url_ssrf_safe("file:///etc/passwd")
    assert exc_info.value.status_code == 400


def test_product_extract_myntra_fixture():
    response = client.post("/api/products/extract", json={"url": "https://www.myntra.com/shirts/roadster-shirt/12345/buy"})
    assert response.status_code == 200
    data = response.json()
    assert "Roadster" in data["title"]
    assert data["category"] == "shirt"
    assert len(data["images"]) > 0
    assert data["retailer"] == "Myntra"


def test_product_extract_amazon_fixture():
    response = client.post("/api/products/extract", json={"url": "https://www.amazon.in/dp/B08XYZ1234"})
    assert response.status_code == 200
    data = response.json()
    assert "Amazon Essentials" in data["title"]
    assert data["category"] == "t-shirt"
    assert data["retailer"] == "Amazon India"


def test_product_extract_amazon_com_fixture():
    response = client.post("/api/products/extract", json={"url": "https://www.amazon.com/dp/B08XYZ1234"})
    assert response.status_code == 200
    data = response.json()
    assert "Amazon Essentials" in data["title"]
    assert len(data["images"]) >= 2


def test_product_extract_ajio_fixture():
    response = client.post("/api/products/extract", json={"url": "https://www.ajio.com/avaasa-kurti/p/461234567_navy"})
    assert response.status_code == 200
    data = response.json()
    assert "AVAASA" in data["title"]
    assert data["category"] == "kurti"
    assert data["retailer"] == "AJIO"


def test_product_extract_zara_fixture():
    response = client.post("/api/products/extract", json={"url": "https://www.zara.com/in/en/biker-jacket-p01234567.html"})
    assert response.status_code == 200
    data = response.json()
    assert "Biker Jacket" in data["title"]
    assert data["category"] == "jacket"
    assert data["retailer"] == "Zara"


def test_product_extract_hm_fixture():
    response = client.post("/api/products/extract", json={"url": "https://www2.hm.com/en_in/productpage.1234567.html"})
    assert response.status_code == 200
    data = response.json()
    assert "H&M" in data["title"]
    assert data["category"] == "shirt"
    assert len(data["images"]) >= 2


def test_product_extract_uniqlo_fixture():
    response = client.post("/api/products/extract", json={"url": "https://www.uniqlo.com/in/en/products/E456789"})
    assert response.status_code == 200
    data = response.json()
    assert "Uniqlo" in data["title"]
    assert data["category"] == "t-shirt"


def test_product_extract_ssrf_blocked_endpoint():
    response = client.post("/api/products/extract", json={"url": "http://127.0.0.1:8000/internal"})
    assert response.status_code == 400
    assert "forbidden" in response.json()["detail"].lower() or "restricted" in response.json()["detail"].lower()


def test_product_extract_invalid_url_empty():
    response = client.post("/api/products/extract", json={"url": ""})
    assert response.status_code == 400


def test_product_extract_unsupported_scheme():
    response = client.post("/api/products/extract", json={"url": "ftp://files.example.com/item.html"})
    assert response.status_code == 400


def test_selected_product_image_passed_to_vton_job():
    """Verify that the exact selected garment image URL is preserved and passed rather than a placeholder."""
    specific_garment_url = "https://assets.myntrastore.com/h_1440,q_90,w_1080/v1/assets/images/12345/specific_shirt_angle2.jpg"
    create_resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            "garment_image": specific_garment_url,
            "garment_name": "Roadster Casual Shirt",
            "category": "shirt",
            "model_name": "client-high-res",
        },
    )
    assert create_resp.status_code == 201
    job = create_resp.json()
    assert job["garment_image_url"] == specific_garment_url


def test_tryon_job_lifecycle():
    # 1. Create job
    create_resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            "garment_image": "/garments/shirt.svg",
            "garment_name": "Indigo Denim Shirt",
            "category": "shirt",
            "model_name": "client-high-res",
        },
    )
    assert create_resp.status_code == 201
    job = create_resp.json()
    assert "job_id" in job
    job_id = job["job_id"]
    assert job["status"] == "succeeded"

    # 2. Get status
    status_resp = client.get(f"/api/tryon/jobs/{job_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["job_id"] == job_id


def test_tryon_job_invalid_input():
    resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": "",
            "garment_image": "",
            "garment_name": "Tee",
        },
    )
    assert resp.status_code == 400


def test_tryon_job_ssrf_protection():
    resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": "http://169.254.169.254/latest/meta-data",
            "garment_image": "/garments/shirt.svg",
            "garment_name": "Tee",
        },
    )
    assert resp.status_code == 400
    assert "forbidden" in resp.json()["detail"].lower() or "restricted" in resp.json()["detail"].lower()

