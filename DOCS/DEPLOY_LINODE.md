# Deploy Thallus on a single Linode VM

Both frontend and backend run on one Ubuntu VM behind nginx, with Cloudflare proxying `thallus.staticalabs.com`.

---

## Prerequisites

- A Linode created with Ubuntu 22.04 LTS. SSH key attached.
- Access to the `staticalabs.com` zone in Cloudflare.

---

## 1. Create the Linode Cloud Firewall (UI — do this first)

Do this **before** you create the Linode so you can attach it at creation time.

1. In the Linode dashboard go to **Networking → Firewalls → Create Firewall**.
2. Fill in the form:
    - **Label**: `thallus-fw`
    - **Default Inbound Policy**: `Drop`
    - **Default Outbound Policy**: `Accept`
    - Leave **Additional Linodes** empty for now (you'll assign the VM after creating it).
3. Click **Create Firewall**.
4. Open the new firewall, go to the **Rules** tab, and add these inbound rules:

    | Label | Protocol | Port(s) | Sources                                       |
    | ----- | -------- | ------- | --------------------------------------------- |
    | SSH   | TCP      | 22      | Any (or restrict to your IP for extra safety) |
    | HTTP  | TCP      | 80      | Any                                           |
    | HTTPS | TCP      | 443     | Any                                           |

5. Click **Save Changes**.

> Port 8000 (uvicorn) is intentionally **not** opened — the backend only listens on `127.0.0.1` and nginx proxies to it.

---

## 2. Create the server & SSH in

When creating the Linode, under **Add-ons → Firewall** select `thallus-fw`.

Spin up a Linode (Nanode 1 GB or bigger). Grab the IP from the Linode dashboard.

```bash
ssh root@YOUR_LINODE_IP
```

---

## 3. Basic hardening & packages

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
apt install -y curl git ufw python3.11 python3.11-venv python3-pip nodejs npm nginx
```

Firewall — allow only SSH, HTTP, and HTTPS:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

**Do not** open port 8000 publicly — UFW is a secondary safety net; the Linode Cloud Firewall set up in step 1 is the primary wall.

---

## 4. Cloudflare DNS

In the Cloudflare dashboard for `staticalabs.com`:

1. **DNS → Add record**
    - Type: `A`
    - Name: `thallus`
    - IPv4: `YOUR_LINODE_IP`
    - Proxy status: **Proxied** (orange cloud ON)

2. **SSL/TLS → Overview** → set mode to **Full (strict)**

3. **SSL/TLS → Origin Server → Create Certificate**
    - Leave defaults (RSA 2048, 15-year validity, hostname `thallus.staticalabs.com`)
    - Click **Create**
    - Copy the **Origin Certificate** (the PEM block) and the **Private Key**

Back on the server, save both:

```bash
mkdir -p /etc/ssl/cloudflare

# paste the Origin Certificate PEM when prompted
cat > /etc/ssl/cloudflare/thallus.crt <<'EOF'
-----BEGIN CERTIFICATE-----
<paste Cloudflare origin cert here>
-----END CERTIFICATE-----
EOF

# paste the Private Key PEM when prompted
cat > /etc/ssl/cloudflare/thallus.key <<'EOF'
-----BEGIN PRIVATE KEY-----
<paste private key here>
-----END PRIVATE KEY-----
EOF

chmod 600 /etc/ssl/cloudflare/thallus.key
```

---

## 5. Clone the repo

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/your-org/your-repo.git thallus
cd thallus
chown -R deploy:deploy /opt/thallus
```

---

## 6. Environment variables

Create `/opt/thallus/.env` — this file is loaded by the backend on startup:

```bash
cat > /opt/thallus/.env <<'EOF'
SECRET_KEY=<run: openssl rand -hex 32>
GEMINI_API_KEY=<your Gemini API key>
RESEND_API_KEY=<your Resend API key>
SERVER=PROD
ALLOWED_ORIGINS=https://thallus.staticalabs.com
EOF

chmod 600 /opt/thallus/.env
chown deploy:deploy /opt/thallus/.env
```

Generate the `SECRET_KEY` value with:

```bash
openssl rand -hex 32
```

---

## 7. Backend — Python venv + systemd

```bash
cd /opt/thallus
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

Create the systemd unit:

```bash
cat > /etc/systemd/system/thallus-backend.service <<'EOF'
[Unit]
Description=Thallus backend (uvicorn)
After=network.target

[Service]
User=deploy
WorkingDirectory=/opt/thallus
EnvironmentFile=/opt/thallus/.env
Environment=PATH=/opt/thallus/venv/bin
ExecStart=/opt/thallus/venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now thallus-backend.service
systemctl status thallus-backend --no-pager
```

---

## 8. Frontend — build & serve via nginx

```bash
cd /opt/thallus/frontend
npm ci
VITE_API_URL=https://thallus.staticalabs.com/api npm run build
```

The built static files land in `/opt/thallus/frontend/dist`.

---

## 9. nginx configuration

```bash
cat > /etc/nginx/sites-available/thallus <<'EOF'
server {
    listen 80;
    server_name thallus.staticalabs.com;
    # Cloudflare handles the public HTTPS; hard-redirect HTTP->HTTPS at the edge.
    # This block only handles Cloudflare-to-origin traffic on port 80 if you
    # ever grey-cloud DNS temporarily. For full strict mode, also bind 443.
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name thallus.staticalabs.com;

    ssl_certificate     /etc/ssl/cloudflare/thallus.crt;
    ssl_certificate_key /etc/ssl/cloudflare/thallus.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root  /opt/thallus/frontend/dist;
    index index.html;

    # API — proxy to uvicorn; preserve full path (backend routes include /api/)
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Remove the default site and enable thallus
rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/thallus /etc/nginx/sites-enabled/thallus

nginx -t && systemctl restart nginx
```

> **Note on `proxy_pass`**: no trailing slash. Because the FastAPI routers already use the `/api/` prefix in their paths, nginx must forward the full path unchanged.

---

## 10. Verify everything is running

```bash
systemctl status thallus-backend --no-pager
systemctl status nginx --no-pager
ss -ltnp | grep -E '80|443|8000'
```

Open `https://thallus.staticalabs.com` — you should see the frontend. Check the network tab to confirm `/api/` calls return 200.

---

## 11. Updating code

```bash
cd /opt/thallus
git pull

# backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
systemctl restart thallus-backend

# frontend
cd frontend
npm ci
VITE_API_URL=https://thallus.staticalabs.com/api npm run build
systemctl restart nginx
```

---

## 12. Rollback

```bash
cd /opt/thallus
git log --oneline -10            # find the last good commit
git checkout <GOOD_COMMIT>
# re-run the update steps above
```

---

## Troubleshooting

| Symptom              | Command                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Backend crashing     | `journalctl -u thallus-backend -f`                                                           |
| nginx errors         | `tail -f /var/log/nginx/error.log`                                                           |
| Port not listening   | `ss -ltnp`                                                                                   |
| API 502 from browser | backend not running; check `systemctl status thallus-backend`                                |
| SSL handshake error  | confirm Cloudflare SSL mode is **Full (strict)** and cert/key paths are correct              |
| CORS errors          | check `ALLOWED_ORIGINS` in `.env` matches the exact origin `https://thallus.staticalabs.com` |
