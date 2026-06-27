# Deployment

Como implantar o frontend e (futuramente) o backend Node.js do MK Flow WhatsApp.

---

## Frontend

### Opção 1 — Lovable (mais simples)

Clique em **Publish** no editor Lovable. App vai para `https://<projeto>.lovable.app`. Domínio próprio em Project Settings → Domains (depois do primeiro publish).

### Opção 2 — Vercel / Netlify

1. Conecte o repositório GitHub.
2. Configurações de build:
   - Build command: `npm run build`
   - Output: `dist`
   - Node: 20.x
3. Variáveis de ambiente (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_WHATSAPP_BACKEND_URL` (quando houver backend)
4. SPA fallback já é tratado nativamente pelos dois provedores.

### Opção 3 — VPS própria (Nginx)

```bash
npm run build
# copia dist/ para /var/www/mkflow/
```

`/etc/nginx/sites-available/mkflow`:

```nginx
server {
  listen 443 ssl http2;
  server_name app.seudominio.com;

  root /var/www/mkflow;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache agressivo nos assets versionados
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  ssl_certificate     /etc/letsencrypt/live/app.seudominio.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.seudominio.com/privkey.pem;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mkflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.seudominio.com
```

---

## Backend Node.js (Baileys)

### Variáveis de ambiente do backend

```bash
# .env do backend (NUNCA commitar)
PORT=4000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # secreta — só o servidor tem
INTERNAL_API_TOKEN=<gerar aleatório>  # validar em todas as rotas
SESSIONS_PATH=/var/lib/mkflow/sessions
LOG_LEVEL=info
```

### PM2

```bash
npm install -g pm2

# Build (se TypeScript)
npm run build

pm2 start dist/index.js --name mkflow-backend \
  --max-memory-restart 800M \
  --time

pm2 save
pm2 startup   # gera comando para iniciar no boot
```

Logs: `pm2 logs mkflow-backend`.

### Docker (alternativa)

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
VOLUME ["/app/sessions"]
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
services:
  backend:
    build: .
    restart: unless-stopped
    env_file: .env
    ports: ["127.0.0.1:4000:4000"]
    volumes:
      - ./sessions:/app/sessions
```

### Nginx — proxy reverso para o backend

```nginx
server {
  listen 443 ssl http2;
  server_name api.seudominio.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;

    # SSE / WebSocket para eventos do Baileys
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 3600s;
  }

  ssl_certificate     /etc/letsencrypt/live/api.seudominio.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.seudominio.com/privkey.pem;
}
```

Depois disso, no frontend defina `VITE_WHATSAPP_BACKEND_URL=https://api.seudominio.com` e rebuilde.

---

## Backups

- **Postgres:** Lovable Cloud faz backup automático. Em Supabase próprio, configure em Database → Backups.
- **Sessões Baileys:** snapshot diário da pasta `sessions/` (rsync ou borg) — perder essa pasta força novo QR em todas as instâncias.
- **Código:** GitHub é a fonte de verdade.

---

## Monitoramento (recomendado em produção)

- **Uptime:** UptimeRobot ou Better Uptime no `https://api.seudominio.com/health`.
- **Logs:** PM2 + `pm2-logrotate` ou Docker logs + Loki.
- **Erros frontend:** Sentry (free tier dá conta de SaaS pequeno).
- **Métricas Baileys:** contar `messages.upsert` por minuto, `connection.update` para detectar quedas.
