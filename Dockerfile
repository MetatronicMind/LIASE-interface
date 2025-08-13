# Use the official Node.js image (alpine version)
FROM node:20.11.1-alpine

# Set environment variables
ENV PORT 8000
# Expose port
EXPOSE 8000

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if available
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variables (replace with your actual values or use Docker secrets)
# ENV DATABASE_URL='mongodb://test_user:test123@192.168.11.191:27017,192.168.11.134:27017,192.168.11.192:27017/iservices?authSource=admin&replicaSet=replicasetTest&readPreference=secondaryPreferred&readConcernLevel=local&maxStalenessSeconds=120&w=1&wtimeoutMS=5000&journal=true'

# Run tests
# RUN node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles tests/migration.test.js --forceExit

# Start the application
CMD ["npm", "start"]