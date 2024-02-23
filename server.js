const express = require('express');
const https = require('https');
const fs = require('fs');
const bcrypt = require('bcrypt');

const OAuthServer = require('@node-oauth/express-oauth-server');
const createModel = require('./model');
const DB = require('./db');

const path = require('path');
const bodyParser = require('body-parser'); // Required for parsing POST request body

// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

//* App and HTTPS settings and usages **************/
const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));

const fetch = require('node-fetch');

const port = 443;

// HTTPS options
const options = {
    key: fs.readFileSync('../keys/key.pem'),
    cert: fs.readFileSync('../keys/cert.pem')
};

// Create an HTTPS server
const server = https.createServer(options, app);
//**************************************************/

//* OAUTH 2 Server Boilerplate *********************/
const db = new DB();
const oauth = new OAuthServer({
    model: createModel(db)
});

db.saveClient({
    id: process.env.CLIENT_ID,
    secret: process.env.CLIENT_SECRET,
    grants: ['client_credentials']
});


// app.use('/token', oauth.token(), () => {
//     console.log("created token!");
// });
//**************************************************/

//root route
app.get('/', (req, res) => {
    res.render('home');
});

// create oauth user
app.post('/create_user', jsonParser, async (req, res) => {

    let email = req.body.email;
    hash = bcrypt.hashSync(`${req.body.email}:${req.body.password}`, 10);

    let url = "https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/user/email_auth";

    let response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "fields": {
                "email": {
                    "stringValue": email
                },
                "token": {
                    "stringValue": hash
                }
            },
        })
    });


    let data = await response.json();

    res.send(`created user ${email} and data ${data}`);
});

//signin oauth user
app.get('/sign_in', async (req, res) => {
    res.send("signed in!");
});

//get route
app.get('/get', (req, res) => {
    res.render('get');
});

app.get("/api/getDoor", async (req, res) => {

    let url = "https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/door/isLockedDoc";

    let response = await fetch(url);
    let data = await response.json();
    res.send(data);
});

// app.get("/api/postDoor/:isLocked", oauth.authenticate(), async (req, res) => {
app.post("/api/postDoor", async (req, res) => {

    const match = await bcrypt.compare(password, passwordHash);


    //TODO: need to get email verification with get req
    if (match) {
        if (req.body.isLocked == "true") {
            isLocked = true;
        } else {
            isLocked = false;
        }

        let url = "https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/door/isLockedDoc";

        let response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "fields": {
                    "isLocked": {
                        "booleanValue": isLocked
                    }
                },
            })
        });


        let data = await response.json();
        res.send(data);
    }
    else {
        res.send("Wrong Credentials!");
    }
});

app.post("/api/email_auth", async (req, res) => {

    res.send("Not ready yet.");
});

// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server is listening at https://localhost:${port}`);
});
