// load libraries
const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise')

// declare variables
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000
const SQL_FIND_BY_NAME = 'SELECT * FROM apps WHERE name LIKE ? LIMIT ? OFFSET ?'

// create instance of express
const app = express()

// configure handlebars
app.engine('hbs',
    handlebars({
        defaultLayout: 'template.hbs'
    })
)
app.set('view engine', 'hbs')

// Create database connection pool
const pool = mysql.createPool({
    host: process.env.SQL_HOST || 'localhost',
    port: parseInt(process.env.SQL_PORT || 3306),
    database: process.env.SQL_DB || 'playstore',
    user: process.env.SQL_USER,
    password: process.env.SQL_PASS,
    connectionLimit: parseInt(process.env.SQL_CONNECTION_LIMIT) || 4,
    timezone: '+08:00'
})

// Function to initalise the application
const startApp = async (app, pool) => {
    try {
        // Get a connection from the connection pool
        const conn = await pool.getConnection()
        console.info('Pinging database...')
        await conn.ping()

        // release connection
        conn.release()

        // listen for port
        app.listen(PORT, () => {
            console.info(`Application is listening on ${PORT} at ${new Date ()}`)
        })
    } catch (e) {
        console.error('Cannot ping database: ', e)
    }
}

// load resources
app.use(express.static(`${__dirname}/static`))

// ## GET routes ##

app.get('/search', 
    async (req, resp) => {
        const q = req.query.q
        let limit = 10
        let offset = parseInt(req.query.offset) || 0
        let conn;
        const page = (offset / limit) + 1
        
        try {
            conn = await pool.getConnection()
            const results = await conn.query(SQL_FIND_BY_NAME, [`%${q}%`, limit, offset])
            const data = results[0]
            resp.status(200)
            resp.type('text/html')
            resp.render('home',
                {
                    title : 'Search results',
                    q,
                    data,
                    prevOffset: Math.max(offset - limit),
                    nextOffset: offset + 10,
                    prevbtn: offset,
                    page
                }
            )
        } 
        catch (e) {
            console.error('Error retrieving database: ', e)
        } 
        finally {
            // release connection
            await conn.release()
        }
    }
)

app.get('/', (req, resp) => {
    resp.status(200)
    resp.type('text/html')
    resp.render('index',
        {
            title : 'Search for an app.'
        }
    )
})

// ## REDIRECT routes ##
app.use((req, resp) => {
    resp.redirect('/')
})

// Initalise application
startApp(app, pool)