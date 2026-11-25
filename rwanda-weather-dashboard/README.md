# Skyline Weather Dashboard

A responsive weather dashboard built with Flask, HTML, CSS and JavaScript. Skyline uses the Open-Meteo Geocoding and Forecast APIs to search for locations and display current weather conditions and a seven-day forecast.

## 1. Features

- Search for cities and select matching locations.
- Display current temperature, feels-like temperature, humidity, wind and precipitation.
- Display a seven-day forecast.
- Filter forecast days by weather condition.
- Sort by date, warmest day, coldest day or highest precipitation probability.
- Switch between Celsius and Fahrenheit.
- Handle invalid input and external API errors.
- Cache successful external API responses for five minutes.
- Health endpoint at `/health` for deployment checks.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Backend | Python and Flask |
| Frontend | HTML, CSS and JavaScript |
| External APIs | Open-Meteo |
| Application server | Gunicorn |
| Load balancer | Nginx |
| Operating system | Ubuntu 20.04.6 LTS |
| Python deployment version | 3.12.16 |
| Process management | systemd |
| Infrastructure | Three Ubuntu servers on AWS |

## 3. Project Structure

```text
rwanda-weather-dashboard/
├── app.py
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── static/
│   ├── app.js
│   └── style.css
├── templates/
│   └── index.html
└── tests/
    └── test_app.py
```

## 4. Run Locally

Requirements:
- Python 3.10 or newer
- pip

On Windows PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open:

http://127.0.0.1:5000

If PowerShell blocks virtual-environment activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

## 5. Automated Testing

Run the test suite:

```bash
python -m pytest -v
```

The five tests cover:

1. Home page availability.
2. Health endpoint response.
3. Rejection of short city names.
4. Rejection of invalid weather coordinates.
5. Successful location search using a mocked API response.

**Verified result: 5 passed, 0 failed.**

The tests were also executed successfully on both Web01 and Web02.

## 6. External API Integration

Skyline uses two Open-Meteo services:

- Geocoding API: https://open-meteo.com/en/docs/geocoding-api
- Forecast API: https://open-meteo.com/en/docs

The geocoding API provides location search results. The forecast API provides current weather conditions and daily forecast data.

The application caches successful external API responses in memory for five minutes.

Review Open-Meteo's current terms and attribution requirements before public deployment.

## 7. Deployment Architecture

Skyline is deployed across three Ubuntu application infrastructure servers.

```text
                 Internet Users
                       |
                       |
                Public HTTP :80
                       |
                       v
               Lb01 - Nginx
              10.30.27.228
              Public IP: 3.8.134.96
                       |
               Round-robin routing
                   /       \
                  /         \
                 v           v
             Web01          Web02
          10.30.20.91    10.30.21.71
             :5000          :5000
                |             |
                v             v
             Gunicorn      Gunicorn
                |             |
                v             v
             Flask         Flask
```

### Server information

| Server | Role | Private IP | Public IP |
|---|---|---|---|
| Web01 | Flask application server | 10.30.20.91 | 35.177.172.36 |
| Web02 | Flask application server | 10.30.21.71 | 35.176.25.102 |
| Lb01 | Nginx load balancer | 10.30.27.228 | 3.8.134.96 |

### Application server configuration

Both application servers use:

- Ubuntu 20.04.6 LTS.
- ARM64 architecture.
- Python 3.12.16 installed using uv.
- A dedicated Python virtual environment.
- Gunicorn with two workers.
- systemd for automatic service management.

The system Python installation was left unchanged.

### Gunicorn and systemd

Each application server runs the Flask application through Gunicorn.

The Web01 service uses:

```bash
SERVER_NAME=Web01
```

The Web02 service uses:

```bash
SERVER_NAME=Web02
```

Both services bind to their respective private IP addresses on port 5000.

Web01:

```text
10.30.20.91:5000
```

Web02:

```text
10.30.21.71:5000
```

The services are managed using:

```bash
sudo systemctl status skyline
sudo systemctl restart skyline
sudo systemctl start skyline
sudo systemctl stop skyline
```

The systemd service is enabled to start automatically after server reboots.

## 8. Nginx Load Balancer Configuration

Nginx runs on Lb01 and distributes HTTP requests between Web01 and Web02.

The configured upstream is:

```nginx
upstream skyline_backend {
    server 10.30.20.91:5000;
    server 10.30.21.71:5000;
}
```

The Nginx server block forwards requests to the upstream:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://skyline_backend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
```

Nginx uses round-robin distribution by default.

To validate and reload the configuration:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Deployment Verification

The following checks were performed during deployment.

### Local application verification

- Successfully launched the Flask application locally.
- Verified the `/health` endpoint.
- Successfully searched for Kigali using the live Open-Meteo Geocoding API.
- Successfully retrieved a live seven-day weather forecast.
- Verified search, temperature conversion, filtering and sorting through the browser.

### Application server verification

Both application servers returned successful health responses.

Web01:

```json
{
  "server": "Web01",
  "service": "rwanda-weather-dashboard",
  "status": "ok"
}
```

Web02:

```json
{
  "server": "Web02",
  "service": "rwanda-weather-dashboard",
  "status": "ok"
}
```

### Load balancing verification

Six consecutive requests were sent through Nginx.

Observed responses:

```text
Web01
Web02
Web01
Web02
Web01
Web02
```

This verified that requests were distributed between both application servers.

### Failover verification

Web01 was temporarily stopped while Web02 remained operational.

Six requests were sent through Lb01.

Results:

- Six successful HTTP responses.
- All six requests were handled by Web02.
- No failed responses were observed.

Web01 was subsequently restarted. Both application servers resumed serving requests through Nginx.

### Public access verification

The application was successfully accessed through:

http://3.8.134.96

The public `/health` endpoint also returned a successful response.

## 10. Important Deployment Considerations

- The Gunicorn services must remain accessible to Lb01 through the private network.
- Backend port 5000 should only be accessible from authorized internal sources, particularly Lb01.
- Public HTTP access should be directed through Lb01.
- SSH access should use authorized public-key authentication.
- Do not commit private SSH keys, AWS credentials, passwords or environment secrets to GitHub.
- Configure HTTPS and a domain name if required for a public production deployment.

## 11. Challenges and Solutions

| Challenge | Solution |
|---|---|
| Ubuntu servers initially provided Python 3.8 | Installed Python 3.12 using uv without replacing system Python |
| Git was unavailable on Web02 | Installed Git using apt |
| SSH authentication initially failed | Identified and used the RSA school key registered in the ALU Intranet |
| Gunicorn initially listened on localhost | Configured Gunicorn to bind to each application's private IP |
| Nginx initially served only its default page | Configured a reverse proxy and upstream backend group |
| One application server became unavailable | Verified continued service through the remaining backend |

## 12. Final Project Status

The Skyline Weather Dashboard has been deployed across two Flask application servers behind an Nginx load balancer.

The application, backend communication, request distribution, public access and tested failover behaviour were verified.

**Project repository:** https://github.com/mbonheur7/forecaster7

**Public application:** http://3.8.134.96

**Deployment architecture:** One Nginx load balancer and two Flask application servers.