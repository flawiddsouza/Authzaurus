const path = require('path')
const express = require('express')
const http = require('http')
const fs = require('fs')
const session = require('express-session')

function getAbsolutePath(pathToFile) {
    return path.join(__dirname, pathToFile)
}

const app = express()
const server = http.createServer(app)

app.use(express.urlencoded({ extended: true }))

app.use(session({
    key: 'my_session',
    secret: 'pocket monster',
    resave: false,
    saveUninitialized: true
}))

var isAuthenticated = (req, res, next) => {
    if(req.session.authenticated) {
        next()
    } else {
        res.sendFile(getAbsolutePath('login.html'))
    }
}

app.post('/', (req, res) => {
    const credentials = JSON.parse(fs.readFileSync(getAbsolutePath('credentials.json'), 'utf8'))
    if(req.body.username === credentials.username && req.body.password === credentials.password) {
        req.session.authenticated = true
    }

    res.redirect(req.body.redirectBackTo)
})

let availableApps = fs.readdirSync(getAbsolutePath('/apps')).filter(item => item !== '.gitignore')

app.get('/', isAuthenticated, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Authzaurus - Home</title>
                <style>
                ul {
                    padding-left: 2em;
                }

                ul li {
                    margin-top: 0.5em;
                }
                </style>
            <body>
                You are logged in<br>

                <ul>
                    ${
                        availableApps.map(availableApp => {
                            return `<li><a href="apps/${availableApp}">${availableApp}</a></li>`
                        }).join('\n')
                    }
                <ul>
            </body>
        </html>
    `)
})

app.get('/logout', isAuthenticated, (req, res) => {
    res.clearCookie('my_session')
    res.redirect('/')
})


availableApps.forEach(availableApp => {
    if(fs.existsSync(getAbsolutePath(`apps/${availableApp}/app.js`))) {
        app.use(`/apps/${availableApp}`, isAuthenticated, require(`./apps/${availableApp}/app.js`)(server))
    } else {
        app.use(`/apps/${availableApp}`, isAuthenticated, express.static(getAbsolutePath(`apps/${availableApp}/public`)))
    }
})

server.listen(9901)
