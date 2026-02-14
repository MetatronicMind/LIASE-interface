# LIASE Test Application 🚀

A simple Node.js boilerplate application for testing Azure deployment.

## 🎯 Purpose

This is a minimal Express.js application designed to test Azure Web App deployment workflows. It provides basic endpoints for health checking and testing functionality.

## 📁 Test Files Created

- `test-server.js` - Main application server
- `test-package.json` - Package configuration for test app
- `test.env` - Environment variables
- `test-web.config` - Azure IIS configuration
- `test-server.test.js` - Basic tests
- `.github/workflows/test-deploy.yml` - Test deployment workflow

## 🔗 Available Endpoints

- `GET /` - Welcome message with app info
- `GET /health` - Health check endpoint
- `GET /test` - Basic test endpoint
- `POST /test` - Test POST requests
- `GET /api/info` - API information and available endpoints

## 🚀 Quick Start (Local Development)

1. Copy the test package.json:

   ```bash
   cp test-package.json package.json
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the test server:

   ```bash
   node test-server.js
   ```

4. Test the endpoints:
   ```bash
   curl http://localhost:3000/health
   ```

## 🧪 Running Tests

```bash
npm test -- test-server.test.js
```

## 🌐 Azure Deployment

### Option 1: Using GitHub Actions (Recommended)

1. Create a `test` branch:

   ```bash
   git checkout -b test
   ```

2. Commit and push the test files:

   ```bash
   git add .
   git commit -m "Add Node.js test application"
   git push origin test
   ```

3. The workflow will automatically deploy to Azure

### Option 2: Manual Deployment

1. Prepare deployment files:

   ```bash
   mkdir deploy
   cp test-server.js deploy/server.js
   cp test-package.json deploy/package.json
   cp test-web.config deploy/web.config
   cp test.env deploy/.env
   ```

2. Deploy using Azure CLI or portal

## 📊 Testing the Deployment

After deployment, test these URLs:

- `https://liase.azurewebsites.net/` - Main page
- `https://liase.azurewebsites.net/health` - Health check
- `https://liase.azurewebsites.net/api/info` - API information

## 🔧 Configuration

### Environment Variables (test.env)

```env
NODE_ENV=production
PORT=3000
APP_NAME=LIASE-Test-App
```

### Azure Web.config

The `test-web.config` file configures IIS to run the Node.js application properly on Azure.

## 📝 Features

✅ Express.js server with JSON responses  
✅ Health check endpoint  
✅ Error handling middleware  
✅ CORS ready  
✅ Azure-optimized configuration  
✅ Basic test suite  
✅ GitHub Actions workflow  
✅ Graceful shutdown handling

## 🐛 Troubleshooting

1. **App not starting**: Check Azure logs for startup errors
2. **404 errors**: Verify web.config is deployed correctly
3. **Module errors**: Ensure all dependencies are in package.json
4. **Port issues**: Azure automatically sets PORT environment variable

## 📈 Next Steps

Once this test app deploys successfully:

1. Verify all endpoints work
2. Check Azure application logs
3. Test auto-scaling if configured
4. Apply learnings to your main application

---

_This is a test application for validating Azure deployment processes._
