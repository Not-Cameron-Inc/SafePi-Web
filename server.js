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

//************************************************* */

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

var num = 0;

app.post('/reset_admin', jsonParser, async (req, res) => {
    let code = req.body.code;
    if (code == "$2b$10$zra92Z98Zd1yDezfdAgoMupXjyUSTN") {

        let email = req.body.email;
        hash = bcrypt.hashSync(`${req.body.email}:${req.body.password}`, 10);

        let url = `https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/user/email_auth`;

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

        res.send(`reset admin user in document email_auth`);
    } else {
        res.redirect("/denied");
    }
});

// create oauth user
app.post('/create_user', jsonParser, async (req, res) => {

    let code = req.body.code;
    if (code == "$2b$10$zra92Z98Zd1yDezfdAgoMupXjyUSTN") {

        let url_users = "https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/user";

        let response_users = await fetch(url_users);
        let data_users = await response_users.json();
        let flag2 = false;
        for(let id = 0; id < data_users.documents.length; id++){
            let email = data_users.documents[id].fields.email.stringValue;
             
            // if (email == reqEmail && match) {
            if (email == req.body.email) {
                flag2 = true;
                break;
            }
        }
        if(flag2 == false){
            let email = req.body.email;
            let flag = true;
            let small_hash;
            while(flag){
                let hash_doc = bcrypt.hashSync(`${req.body.email}:${req.body.password}:${num}`, 10);
                small_hash = hash_doc.substring(10,20);
                let splitHash = small_hash.split("/");
                if(splitHash.length == 1){
                    flag = false;
                }
                
                num++;
            }
            
    
            let url = `https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/user/email_auth_${small_hash}`;
            
            
            hash = bcrypt.hashSync(`${req.body.email}:${req.body.password}`, 10);
    
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
    
            res.send(`created user in document email_auth_${small_hash}`);
        } else {
            res.redirect("/denied");    
        }
    } else {
        res.redirect("/denied");
    }
});


//signin oauth user
app.post('/sign_in', jsonParser, async (req, res) => {
    let url_users = "https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/user";

    let response_users = await fetch(url_users);
    let data_users = await response_users.json();
    let reqEmail = req.body.email;
    let reqPass = req.body.password;
    let reqToken = reqEmail+":"+reqPass;
    let flag = false;
    for(let id = 0; id < data_users.documents.length; id++){
        let email = data_users.documents[id].fields.email.stringValue;
        let token = data_users.documents[id].fields.token.stringValue;
        
        const match = await bcrypt.compare(reqToken,token);
        if (email == reqEmail && match) {
        // if (match) {
            res.send(`Signed in ${email}! Your code is: $2b$10$zra92Z98Zd1yDezfdAgoMupXjyUSTN`);
            flag = true;
            break;
        }
    }
    if(flag == false){
        res.send("Incorrect credentials. Is this user in the database or are you a H4CK0R...?");
    }
    
});

//get route
app.get('/get', (req, res) => {
    res.render('get');
});

app.get('/denied', (req, res) => {
    res.render('denied');
});

app.get("/api/getDoor", async (req, res) => {

    let url = "https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/door/isLockedDoc";

    let response = await fetch(url);
    let data = await response.json();
    res.send(data);
});

app.get("/api/getEmail", async (req, res) => {

    let url = "https://firestore.googleapis.com/v1/projects/hello-world-rest-4dd02/databases/(default)/documents/door/isLockedDoc";

    let response = await fetch(url);
    let data = await response.json();
    res.send(data);
});

// app.get("/api/postDoor/:isLocked", oauth.authenticate(), async (req, res) => {
app.post("/api/postDoor", jsonParser, async (req, res) => {
    let code = req.body.code;
    if (code == "$2b$10$zra92Z98Zd1yDezfdAgoMupXjyUSTN") {
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
    } else {
        res.redirect("/denied");
    }
});


// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server is listening at https://localhost:${port}`);
});
