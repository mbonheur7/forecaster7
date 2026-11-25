import app as weather_app


def test_home_page():
    client = weather_app.app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    assert b"Find your" in response.data


def test_health_endpoint():
    client = weather_app.app.test_client()
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_search_rejects_short_city():
    client = weather_app.app.test_client()
    response = client.get("/api/search?city=a")
    assert response.status_code == 400


def test_weather_rejects_invalid_coordinates():
    client = weather_app.app.test_client()
    response = client.get("/api/weather?latitude=200&longitude=20")
    assert response.status_code == 400

def test_search_returns_location(monkeypatch):
    def faked_cached_get(url, params):
        return {
            "results": [
                {
                    "name": "Kigali",
                    "admin1": "Kigali",
                    "country": "Rwanda",
                    "latitude": -1.9441,
                    "longitude": 30.0619,
                    "timezone": "Africa/kigali"
                }
            ]
        }

    monkeypatch.setattr(weather_app, "cached_get", faked_cached_get)

    client = weather_app.app.test_client()
    response = client.get("/api/search?city=Kigali")

    assert response.status_code == 200
    assert response.get_json()["results"][0]["name"] == "kigali"