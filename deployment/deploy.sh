# Azure Deployment Script
# This script can be used with Azure DevOps or GitHub Actions

# Build the application
npm ci --production

# Create deployment package
zip -r deployment.zip . -x "node_modules/.*" "*.git*" "*.env*" "deployment/*"

# The actual deployment will be handled by Azure App Service
