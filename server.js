const express = require('express');
const https = require('https');
const fs = require('fs');
const bcrypt = require('bcrypt');

const Firestore = require('@google-cloud/firestore');

const OAuthServer = require('@node-oauth/express-oauth-server');
const createModel = require('./model');
const DB = require('./db');

const path = require('path');
const bodyParser = require('body-parser'); // Required for parsing POST request body

// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })


//* Database ***************************************/
var firestore_client = new Firestore({ projectId:'hello-world-rest-4dd02', keyFilename: './hello-world-rest-4dd02-d43397478c6a.json'});
//**************************************************/


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
    grants: ['client_credentials'],
    scope: ["read","write"]
});

app.post('/token', urlencodedParser, oauth.token(), function (res) {
    res.send(db.findAccessToken());
});
//**************************************************/


//root route
app.get('/', async (req, res) => {
    res.render('home');
});

var num = 0;

function findUserByEmail(user_docs, req_email){
    for(let id = 0; id < user_docs.length; id++){
        let user_doc = user_docs[id];
        let email = user_doc._fieldsProto.email.stringValue;
        let document_name = user_doc._ref._path.segments[1];
        if (email == req_email) {
            let data = {}
            data['document'] = user_docs[id];
            data['document_name'] = document_name;
            return data;
        }
    }
    return null;
}

app.post('/reset_account', jsonParser, oauth.authorize(), async (req, res) => {

    let user_collection = await firestore_client.collection('user').get();
    let user_docs = user_collection.docs;
    
    let req_email = req.body.email;
    let user_document = findUserByEmail(user_docs, req_email);
    if(user_document != null){

        hash = bcrypt.hashSync(`${req.body.email}:${req.body.password}`, 10);
    
        var update_account = {
            email: req_email,
            token: hash
        }
        await firestore_client.collection('user').doc(`${user_document['document_name']}`).set(update_account);

        res.send(`reset ${req_email} user in document email_auth`);    
    } else {
        res.send(`${req_email} does not have an account. try /create_user to make an account`);    
    }
});

// create oauth user
app.post('/create_user', jsonParser, oauth.authenticate(), async (req, res) => {

    let user_collection = await firestore_client.collection('user').get();
    let user_docs = user_collection.docs;

    let req_email = req.body.email;
    let foundEmail = findUserByEmail(user_docs, req_email);
    let flag2 = (foundEmail != null) ? true : false;

    if(flag2 == false){
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
        
        
        hash = bcrypt.hashSync(`${req.body.email}:${req.body.password}`, 10);
        
        var new_account = {
            email: req_email,
            token: hash
        }
        await firestore_client.collection('user').doc(`email_auth_${small_hash}`).set(new_account);
        res.send(`created user in document email_auth_${small_hash}`);
    } else {
        res.send(`${req_email} user already exists. Try /reset_account to change your account information.`);    
    }
});


//signin oauth user
app.post('/sign_in', jsonParser, oauth.authenticate(), async (req, res) => {

    let user_collection = await firestore_client.collection('user').get();
    let user_docs = user_collection.docs;
    
    let req_email = req.body.email;
    let req_pass = req.body.password;
    let user_document = findUserByEmail(user_docs, req_email);
    if(user_document != null){
        let reqToken = req_email+":"+req_pass;
        let token = user_document['document']._fieldsProto.token.stringValue;
        const match = await bcrypt.compare(reqToken,token);
        if (match) {
        // if (match) {
            
            res.send(`Signed in ${req_email}!`);
            
        } else {
            res.send(`Incorrect email and/or password.`);    
        }

    } else {
        res.send(`${req_email} does not have an account. try /create_user to make an account`);    
    }
});

app.get('/denied', (req, res) => {
    res.render('denied');
});

app.get("/api/getDoor", async (req, res) => {

    let document = firestore_client.doc('door/isLockedDoc');
    res.send(document);
});

app.post("/api/postDoor", jsonParser, oauth.authenticate(), async (req, res) => {
    let document = firestore_client.doc('door/isLockedDoc');
    let outputStatement = "";
    if (req.body.isLocked == "true") {
        isLocked = true;
        outputStatement = "Locked the door!";
    } else {
        isLocked = false;
        outputStatement = "Unlocked the door!";
    }
    await document.update({
        isLocked: isLocked,
    });
    res.send(outputStatement);
});


// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server is listening at https://localhost:${port}`);
});
