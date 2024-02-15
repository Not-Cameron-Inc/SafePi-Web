const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser'); // Required for parsing POST request body

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

//root route
app.get('/', (req, res) => {
    res.render('home');
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

app.get("/api/postDoor", async (req, res) => {

    var isLocked = false;
    if(req.params.isLocked == "true"){
        isLocked = true;
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
    })});

    
    let data = await response.json();
    res.send(data);
});

// app.post("/postToken", authenticated, (req,res) => )

// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server is listening at https://localhost:${port}`);
});
