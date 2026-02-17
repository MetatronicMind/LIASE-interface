# LIASE SaaS Backend - Local Development Setup

## 🚀 Quick Start Guide

Follow these steps to run the backend locally on your machine.

### Prerequisites

- **Node.js 18+** installed
- **Azure Cosmos DB Emulator** (recommended) OR Azure Cosmos DB account
- **Git** for version control

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Cosmos DB

#### Option A: Local Cosmos DB Emulator (Recommended)

1. Download and install [Azure Cosmos DB Emulator](https://docs.microsoft.com/en-us/azure/cosmos-db/local-emulator)
2. Start the emulator (it will run on https://localhost:8081)
3. The `.env.local` file is already configured for the emulator

#### Option B: Use Azure Cosmos DB

1. Update `.env.local` with your Azure Cosmos DB credentials
2. Get credentials from Azure Portal
3. (Windows PowerShell) You can export credentials for the current session instead of storing in file:

```powershell
setx COSMOS_DB_ENDPOINT "https://<your-account>.documents.azure.com:443/"
setx COSMOS_DB_KEY "<your-primary-key>"
setx COSMOS_DB_DATABASE_ID "liase-saas"
# Restart your shell or VS Code terminal after setx
```

Or temporary for current PowerShell session only:

```powershell
$env:COSMOS_DB_ENDPOINT="https://<your-account>.documents.azure.com:443/"
$env:COSMOS_DB_KEY="<your-primary-key>"
$env:COSMOS_DB_DATABASE_ID="liase-saas"
```

4. Ensure your local IP is allowed in the Cosmos DB networking/firewall settings (or use Private Endpoint / VNet if configured)
5. Run the connection test (see below) before starting the server

> IMPORTANT: Never commit real keys. `.env.local` is git-ignored. Rotate the key in Azure if it is ever exposed.

### 3. Initialize Database

```bash
# Create database and containers
npm run setup-local-db
```

### 4. Start Development Server

```bash
# Start backend server with file watching
npm run dev

# Backend will be available at: http://localhost:3001
```

### 5. Seed Test Data (Optional)

```bash
# Create test organization and users
npm run seed-data
```

## 🧪 Test Your Setup

### Health Check

```bash
curl http://localhost:3001/api/health
```

### Test API Endpoints

```bash
# Login with test admin account
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "TestAdmin123!"
  }'
```

## 📋 Available Scripts

| Script                   | Description                                   |
| ------------------------ | --------------------------------------------- |
| `npm run dev`            | Start development server with file watching   |
| `npm run setup-local-db` | Initialize local database and containers      |
| `npm run seed-data`      | Create test data (organization, users, drugs) |
| `npm run test`           | Run all tests                                 |
| `npm run lint`           | Check code style                              |
| `npm run local-setup`    | Setup database and start server               |
| `npm run reset-local`    | Reset database with fresh test data           |

## 🎯 Test Accounts

After running `npm run seed-data`, these accounts will be available:

| Role              | Username             | Password          | Description                |
| ----------------- | -------------------- | ----------------- | -------------------------- |
| Admin             | `admin`              | `TestAdmin123!`   | Organization administrator |
| Pharmacovigilance | `pharmacovigilance1` | `TestPV123!`      | Drug safety officer        |
| Sponsor-Auditor   | `auditor1`           | `TestAuditor123!` | Study compliance auditor   |

## 🔧 Development Tools

### VS Code Debugging

- Press F5 to launch the backend with debugger attached
- Breakpoints will work in your source code
- View Debug Console for detailed logs

### API Testing

Use any REST client to test endpoints:

- **Thunder Client** (VS Code extension)
- **Postman**
- **curl** commands

### Environment Variables

The `.env.local` file contains all necessary configuration for local development:

- Cosmos DB connection (emulator)
- JWT secrets
- CORS settings
- Logging configuration

## 🚨 Troubleshooting

### Cosmos DB Connection Issues

```bash
# Check if emulator is running
curl -k https://localhost:8081/_explorer/index.html

# Restart the emulator if needed
```

#### Test direct connection to Azure Cosmos (Node REPL)

```bash
node - <<'EOF'
const { CosmosClient } = require('@azure/cosmos');
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
console.log('Testing Cosmos connection to', endpoint);
const client = new CosmosClient({ endpoint, key });
client.databases.readAll().fetchAll()
  .then(r => { console.log('Databases:', r.resources.map(d=>d.id)); process.exit(0); })
  .catch(e => { console.error('Connection failed:', e.code, e.message); process.exit(1); });
EOF
```

If you see `COSMOS_INIT_FAILED` responses (HTTP 503) from the API:

1. Verify env vars: `echo $env:COSMOS_DB_ENDPOINT` (PowerShell) or `echo $COSMOS_DB_ENDPOINT` (bash)
2. Confirm firewall/network access
3. Check key validity (try regenerating primary key in Azure Portal)
4. Inspect server logs for `Error initializing Cosmos DB:` details

### Port Already in Use

```bash
# Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <process_id> /F
```

### Permission Issues

```bash
# Run as administrator if needed
# Or change port in .env.local
```

## 🔄 Development Workflow

1. **Make code changes** in `/src` directory
2. **Server auto-restarts** via nodemon
3. **Test your changes** using API calls
4. **Run tests** with `npm test`
5. **Check code style** with `npm run lint`

## 📡 API Endpoints

Base URL: `http://localhost:3001/api`

| Endpoint         | Method   | Description             |
| ---------------- | -------- | ----------------------- |
| `/health`        | GET      | Server health check     |
| `/auth/login`    | POST     | User authentication     |
| `/auth/register` | POST     | User registration       |
| `/users`         | GET/POST | User management         |
| `/drugs`         | GET/POST | Drug information        |
| `/studies`       | GET/POST | Clinical studies        |
| `/audit`         | GET      | Audit trail logs        |
| `/organizations` | GET/POST | Organization management |

## 🎉 Success!

Your backend is now running locally! Next steps:

1. Start the frontend development server
2. Test the complete application flow
3. Begin feature development

For production deployment, follow the main `DEPLOYMENT.md` guide.
