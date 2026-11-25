import os
import time
from threading import Lock

import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_SECONDS = 10
CACHE_TTL_SECONDS = 300
_cache = {}
_cache_lock = Lock()


def cached_get(url, params):
    """GET JSON from an external API with a small in-memory cache."""
    key = (url, tuple(sorted(params.items())))
    now = time.time()

    with _cache_lock:
        cached = _cache.get(key)
        if cached and now - cached["created"] < CACHE_TTL_SECONDS:
            return cached["data"]

    response = requests.get(url, params=params, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    data = response.json()

    with _cache_lock:
        _cache[key] = {"created": now, "data": data}
    return data


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "rwanda-weather-dashboard",
        "server": os.getenv("SERVER_NAME", "local")
    })


@app.get("/api/search")
def search_city():
    city = request.args.get("city", "").strip()

    if len(city) < 2 or len(city) > 80:
        return jsonify({"error": "Enter a city name between 2 and 80 characters."}), 400

    try:
        data = cached_get(
            GEOCODING_URL,
            {"name": city, "count": 8, "language": "en", "format": "json"}
        )
    except requests.RequestException:
        return jsonify({"error": "The location service is temporarily unavailable. Try again shortly."}), 502
    except ValueError:
        return jsonify({"error": "The location service returned an unreadable response."}), 502

    results = data.get("results", [])
    if not results:
        return jsonify({"error": "No matching locations found. Try another spelling."}), 404

    locations = []
    for item in results:
        locations.append({
            "name": item.get("name"),
            "admin1": item.get("admin1"),
            "country": item.get("country"),
            "latitude": item.get("latitude"),
            "longitude": item.get("longitude"),
            "timezone": item.get("timezone", "auto")
        })

    return jsonify({"results": locations})


@app.get("/api/weather")
def weather():
    try:
        latitude = float(request.args.get("latitude", ""))
        longitude = float(request.args.get("longitude", ""))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid latitude and longitude are required."}), 400

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return jsonify({"error": "Coordinates are outside the valid range."}), 400

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "forecast_days": 7,
        "timezone": "auto"
    }

    try:
        data = cached_get(FORECAST_URL, params)
    except requests.RequestException:
        return jsonify({"error": "The weather service is temporarily unavailable. Try again shortly."}), 502
    except ValueError:
        return jsonify({"error": "The weather service returned an unreadable response."}), 502

    if "current" not in data or "daily" not in data:
        return jsonify({"error": "The weather service returned incomplete data."}), 502

    return jsonify(data)


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "The requested resource was not found."}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
