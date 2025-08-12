const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.WEBSITE_HOSTNAME || 'localhost'
const port = process.env.PORT || 3000

console.log(`Starting Next.js server in ${dev ? 'development' : 'production'} mode`)
console.log(`Server will listen on ${hostname}:${port}`)

// When using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port, dir: path.join(__dirname) })
const handle = app.getRequestHandler()

console.log('Preparing Next.js application...')

app.prepare()
  .then(() => {
    console.log('Next.js application prepared successfully')
    
    const server = createServer(async (req, res) => {
      try {
        console.log(`Incoming request: ${req.method} ${req.url}`)
        
        // Parse the request URL
        const parsedUrl = parse(req.url, true)
        
        // Let Next.js handle the request
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('Internal server error')
      }
    })

    server.once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })

    server.listen(port, (err) => {
      if (err) {
        console.error('Failed to start server:', err)
        process.exit(1)
      }
      console.log(`> Ready on http://${hostname}:${port}`)
    })
  })
  .catch((ex) => {
    console.error('Failed to prepare Next.js application:', ex)
    process.exit(1)
  })
