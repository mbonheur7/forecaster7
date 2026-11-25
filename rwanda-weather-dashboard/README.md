# Skyline Weather Dashboard

A responsive weather dashboard built with Flask, HTML, CSS and JavaScript. It uses the Open-Meteo Geocoding and Forecast APIs to search locations and display current conditions and a seven-day forecast.

## Features

- Search for cities and choose the matching location.
- Display current temperature, feels-like temperature, humidity, wind and precipitation.
- Display a seven-day forecast.
- Filter forecast days by weather condition.
- Sort by date, warmest day, coldest day or highest precipitation probability.
- Switch between Celsius and Fahrenheit.
- Handle invalid input and upstream API errors.
- Cache successful external API responses in memory for five minutes.
- Health endpoint at `/health` for deployment checks.

## Requirements

- Python 3.10 or newer
- pip

## Run locally on Windows

Open PowerShell in this project directory:

```powershell
py -m venv .venv
.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000 in your browser.

If PowerShell blocks activation, use:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\\Scripts\\Activate.ps1
```

## Tests

```powershell
pytest
```

## API credits

This project uses Open-Meteo:
- Geocoding API: https://open-meteo.com/en/docs/geocoding-api
- Forecast API: https://open-meteo.com/en/docs

Review Open-Meteo's current terms and attribution requirements before public deployment.

## Deployment notes

The intended topology is one Nginx load balancer (Lb01) forwarding requests to two application servers (Web01 and Web02). Run the Flask application behind Gunicorn on each application server. Set `SERVER_NAME=Web01` on the first server and `SERVER_NAME=Web02` on the second server so the `/health` response can identify which server answered.

Example application process on each Linux web server:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
SERVER_NAME=Web01 gunicorn --workers 2 --bind 0.0.0.0:5000 app:app
```

Change `SERVER_NAME` to `Web02` on the second server. Configure the service to run under systemd in production.

Example Nginx load-balancer upstream (replace the example addresses with the actual private IP addresses supplied for your servers):

```nginx
upstream skyline_backend {
    server WEB01_PRIVATE_IP:5000;
    server WEB02_PRIVATE_IP:5000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://skyline_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Do not copy the placeholder IP addresses literally. Use the actual server addresses and the deployment requirements provided by your instructor. Restrict port 5000 with the server firewall so only Lb01 (and authorized administration sources) can reach it. Do not expose the Gunicorn port publicly.

## Verification checklist

- Open the app locally and search for Kigali.
- Try a city that does not exist and confirm a useful error appears.
- Test the temperature unit selector, forecast filter and sort controls.
- Check `/health` on each application server.
- Access the app through the load balancer.
- Refresh or make repeated requests and inspect server logs or `/health` responses to verify both backends receive traffic.
- Stop one backend temporarily (only if permitted) and confirm the load balancer continues serving through the remaining backend.

## Important

Complete the deployment section with the actual server IPs, commands, service configuration, tests, screenshots and challenges from your own deployment. Do not claim a step succeeded unless you performed and verified it.
