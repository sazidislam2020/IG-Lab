# Deploy Piston Code Execution Engine

Ignite Lab uses [Piston](https://github.com/engineer-man/piston) for server-side code execution (Python, Java, C, C++, etc.). The public API is now whitelist-only, so you need to self-host.

## Option A: Oracle Cloud Free Tier (Recommended)

Oracle Cloud offers **always-free ARM instances** — perfect for running Piston.

### 1. Create an Oracle Cloud Account

1. Go to https://cloud.oracle.com/free
2. Sign up for the **Always Free** tier
3. You get: 4 ARM OCPUs, 24GB RAM, 200GB storage — more than enough for Piston

### 2. Create a VM Instance

1. Go to **Compute → Instances → Create Instance**
2. Choose:
   - **Name**: `ignite-lab-piston`
   - **Image**: Ubuntu 22.04 or 24.04 (ARM64)
   - **Shape**: VM.Standard.A1.Flex (4 OCPUs, 24GB RAM)
   - **SSH Key**: Upload your public key
3. Click **Create** and wait ~2 minutes

### 3. Connect and Install Docker

```bash
ssh -i ~/.ssh/your_key ubuntu@YOUR_VM_IP

# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
newgrp docker
```

### 4. Deploy Piston

```bash
# Create piston directory
mkdir -p ~/piston && cd ~/piston

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: "3.8"
services:
  piston-api:
    image: ghcr.io/engineer-man/piston:latest
    ports:
      - "2000:2000"
    volumes:
      - piston-packages:/piston/packages
    environment:
      PISTON_REPO_URL: https://github.com/engineer-man/piston-packages
      PISTON_LANGUAGE_SOURCES: https://github.com/engineer-man/piston-packages
    restart: unless-stopped

volumes:
  piston-packages:
EOF

# Start Piston
docker-compose up -d

# Install language packages (this takes a few minutes)
docker exec piston-api_piston-api_1 piston-install python
docker exec piston-api_piston-api_1 piston-install java
docker exec piston-api_piston-api_1 piston-install c
docker exec piston-api_piston-api_1 piston-install c++
```

### 5. Open Firewall Port

In Oracle Cloud Console:
1. Go to your VCN → Security Lists
2. Add an Ingress Rule:
   - **Source CIDR**: 0.0.0.0/0
   - **Destination Port**: 2000
   - **Protocol**: TCP

### 6. Test Piston

```bash
curl http://YOUR_VM_IP:2000/api/v2/runtimes
curl -X POST http://YOUR_VM_IP:2000/api/v2/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","files":[{"content":"print(\"Hello!\")"}]}'
```

### 7. Connect to Ignite Lab

Deploy the Supabase Edge Function and set the PISTON_URL:

```bash
# In the ignite-lab-app-day3 directory
npx supabase functions deploy execute-code
npx supabase secrets set PISTON_URL=http://YOUR_VM_IP:2000
```

## Option B: Run Locally with Docker

If you just want to test locally:

```bash
docker run -d --name piston -p 2000:2000 \
  ghcr.io/engineer-man/piston:latest

# Install packages
docker exec piston piston-install python
docker exec piston piston-install java
docker exec piston piston-install c
docker exec piston piston-install c++

# Set local URL
npx supabase secrets set PISTON_URL=http://localhost:2000
```

## Troubleshooting

### "Connection refused" errors
- Make sure Piston is running: `docker ps`
- Check logs: `docker logs piston`

### "Rate limit exceeded"
- The Piston public API is whitelist-only. Use your self-hosted instance.

### Languages not found
- Install packages: `docker exec piston piston-install <language>`
- List installed: `curl http://localhost:2000/api/v2/runtimes`

### CORS errors in browser
- The Edge Function acts as a proxy, so CORS shouldn't be an issue
- If you see CORS errors, make sure the Edge Function is deployed and the PISTON_URL is set
