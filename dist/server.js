const path = require('path')
var express = require('express')
var expressStaticGzip = require('express-static-gzip')
const helmet = require('helmet')
const timeout = require('connect-timeout')
const morgan = require('morgan')
const httpProxy = require('http-proxy')
const healthcheck = require('express-healthcheck')

const CONSTANTS = {
  PORTAL_PORT: parseInt(process.env.PORTAL_PORT || '3002', 10),
  LA_HOST_PROXY: process.env.LA_HOST_PROXY || 'http://localhost',
  WEB_HOST_PROXY: process.env.WEB_HOST_PROXY || 'http://localhost:3007',
  FRAME_ANCESTORS: process.env.FRAME_ANCESTORS || "'self'",
}

var app = express()
var proxy = httpProxy.createProxyServer({
  timeout: 10000,
})
app.use(timeout('100s'))

app.use('/healthcheck', healthcheck({
  healthy() {
    return { everything: 'is ok' }
  },
}))

app.engine('html', require('ejs').renderFile);

// Add required helmet configurations
app.use(
  helmet({
    frameguard: {
      action: 'sameorigin',
    },
    noCache: false,
    hidePoweredBy: true,
    ieNoOpen: true,
    dnsPrefetchControl: {
      allow: true,
    },
    noSniff: true,
    contentSecurityPolicy: {
      directives: {
        frameAncestors: CONSTANTS.FRAME_ANCESTORS.split(','),
      },
    },
  }),
)
app.use('/LA', proxyCreator(express.Router(), CONSTANTS.LA_HOST_PROXY))
app.use(morgan('combined'))
app.use(haltOnTimedOut)
app.use('/ScormCoursePlayer', proxyCreator(express.Router(), 'http://localhost/ScormCoursePlayer'))
app.disable('etag')
app.set('etag', false)

serveAssets('')
serveAssets('/ar')
serveAssets('/de')
serveAssets('/es')
serveAssets('/fr')
serveAssets('/fr-ca')
serveAssets('/nl')
serveAssets('/zh-CN')
serveAssets('/ja')

function serveAssets(hostPath) {
  app.use(
    `${hostPath}/assets`,
    // proxyCreator(express.Router(), CONSTANTS.WEB_HOST_PROXY + '/web-hosted/client-assets/dist'),
     express.static(path.join(__dirname, `${hostPath}`, `assets`)) //  "public" off of current is root
  )
}

uiHostCreator('/ar', 'ar')
uiHostCreator('/de', 'de')
uiHostCreator('/es', 'es')
uiHostCreator('/fr', 'fr')
uiHostCreator('/fr-ca', 'fr-ca')
uiHostCreator('/nl', 'nl')
uiHostCreator('/zh-CN', 'zh-CN')
uiHostCreator('/ja', 'ja')
uiHostCreator('', 'en')
app.use(haltOnTimedOut)

app.use((err, req, res, next) => {
  //check what error happened here ... 
  res.status(404).render(path.join(__dirname, `404.html`))
})

const port = CONSTANTS.PORTAL_PORT
app.listen(port, '0.0.0.0', err => {
  console.error(err || 'No Error', `Server started at ${port}`)
})

function proxyCreator(route, baseUrl) {
  route.all('/*', (req, res) => {
    proxy.web(req, res, {
      target: baseUrl,
    })
  })
  return route
}

// Content-hashed build output (main-3AE6P54I.js, chunk-543WEO7T.js, libraries-SAUM5B55.css, ...).
// A new deploy produces new filenames, so these can be cached forever.
const IMMUTABLE_ASSET = /^\/(?:media\/)?[^/]+-[A-Z0-9]{8,}\.(?:js|mjs|css|woff2?|ttf|eot|svg|png|jpe?g|gif|webp)$/
// Entry points that must never be pinned: a stale copy points at chunks that no longer exist.
const ALWAYS_REVALIDATE = /^\/(?:index\.html|ngsw\.json|ngsw-worker\.js|safety-worker\.js|worker-basic\.min\.js)$/
// Requests for a build artifact. If it is not on disk it is genuinely gone.
const STATIC_ASSET = /\.(?:js|mjs|css|map|json|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|ico|txt)$/

function cacheControl(req, res, next) {
  if (ALWAYS_REVALIDATE.test(req.path)) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate')
  } else if (IMMUTABLE_ASSET.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
  next()
}

function uiHostCreator(hostPath, hostFolderName) {
  app.use(`${hostPath}`, cacheControl)
  app.use(
    `${hostPath}`,
    expressStaticGzip(path.join(__dirname, `www/${hostFolderName}`), {
      enableBrotli: true,
      orderPreference: ['br', 'gz'],
    }),
  )
app.get(`${hostPath}/*`, (req, res) => {
if (req.url.startsWith('/assets/')) {
res.sendFile(path.join(__dirname, `www/${hostFolderName}/${req.url}`))

} else if (req.url.startsWith('/.well-known/')) {
res.sendFile(path.join(__dirname, `${req.url}`))

} else if (STATIC_ASSET.test(req.path)) {
// Falling through to index.html here hands the browser HTML with a 200 and a
// text/html content type for what it requested as a module, which surfaces as
// ChunkLoadError / "Failed to fetch dynamically imported module" instead of a
// cache miss. Answer honestly so the client can recover.
//
// Drop the Cache-Control that cacheControl() set on the way in. It runs before the
// static handler knows whether the file exists, so a request for a deleted chunk
// (chunk-TEZ73SP4.js still matches IMMUTABLE_ASSET) would otherwise return a 404
// carrying `max-age=31536000, immutable` - pinning "this asset does not exist" in
// the browser and every intermediary cache for a year.
res.removeHeader('Cache-Control')
res.status(404).type('txt').send('Not found')

} else {
res.sendFile(path.join(__dirname, `www/${hostFolderName}/index.html`))
}
})
}

function haltOnTimedOut(req, _res, next) {
  if (!req.timedout) next()
}
