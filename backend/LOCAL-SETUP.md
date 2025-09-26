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
