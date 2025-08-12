const express = require('express')
const next = require('next')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000

console.log(`Starting Next.js server...`)
console.log(`Environment: ${dev ? 'development' : 'production'}`)
console.log(`Port: ${port}`)
console.log(`Current directory: ${process.cwd()}`)

// Initialize Next.js
const app = next({ 
  dev, 
  dir: path.join(__dirname),
  quiet: false 
})

const handle = app.getRequestHandler()

// Create Express server
const server = express()

// Health check endpoint
server.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  })
})

// Prepare Next.js and start server
app.prepare()
  .then(() => {
    console.log('Next.js prepared successfully')
    
    // Handle all requests with Next.js
    server.all('*', (req, res) => {
      return handle(req, res)
    })
    
    // Start the server
    server.listen(port, (err) => {
      if (err) {
        console.error('Server failed to start:', err)
        process.exit(1)
      }
      console.log(`> Server ready on port ${port}`)
    })
  })
  .catch((ex) => {
    console.error('Failed to prepare Next.js:', ex)
    process.exit(1)
  })
