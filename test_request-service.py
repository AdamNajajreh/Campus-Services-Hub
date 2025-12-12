import requests

def test_health():
    response = requests.get("http://localhost:5002/health")
    assert response.status_code == 200
    assert response.json().get("status") == "ok"

