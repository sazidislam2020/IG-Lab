# Code Execution Setup

## Current: Judge0 CE (Free, No Setup Needed)

The code sandbox uses **Judge0 CE** — a free, hosted code execution API. No server setup required!

### Supported Languages

| Language | Version | ID |
|----------|---------|-----|
| Python | 3.12.5 | 100 |
| Java | JDK 17.0.6 | 91 |
| C | GCC 14.1.0 | 103 |
| C++ | GCC 14.1.0 | 105 |
| JavaScript | Node.js (local) | — |

### How It Works

- **JavaScript** → Runs locally in the browser (fast, no server needed)
- **Python, Java, C, C++** → Sent to Judge0 CE API (`https://ce.judge0.com`)
- **HTML/CSS** → Preview mode (no execution needed)

### Rate Limits

Judge0 CE has fair-use rate limits. For production, consider:
1. **Self-hosting Judge0 CE** — Docker Compose setup (see below)
2. **Upgrading to Judge0 Extra** — paid SaaS with higher limits

### Self-Hosting Judge0 CE (Optional)

If you need higher rate limits or privacy:

```bash
# Clone Judge0
git clone https://github.com/judge0/judge0.git
cd judge0

# Start with Docker Compose
docker-compose up -d

# Your API will be at http://localhost:2358
```

Then update `src/pages/CodeSandbox.jsx`:
```javascript
const JUDGE0_API = "http://localhost:2358";  // or your server URL
```

### API Reference

Judge0 CE API: https://ce.judge0.com
- `GET /languages` — list available languages
- `POST /submissions?base64_encoded=false&wait=true` — execute code
- Docs: https://ce.judge0.com/apidocs
