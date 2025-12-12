import requests

def test_health():
    response = requests.get("http://localhost:5003/health")
    assert response.status_code == 200
    assert response.json().get("status") == "ok"

