const session = require('express-session');
const express = require('express');
const https = require('https');
const fs = require('fs');
const bcrypt = require('bcrypt');

const crypto = require('crypto');

const Firestore = require('@google-cloud/firestore');

const OAuthServer = require('@node-oauth/express-oauth-server');
const createModel = require('./model');
const DB = require('./db');

const path = require('path');
const bodyParser = require('body-parser'); // Required for parsing POST request body
const url_pass = require('url');

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
// create a database object that holds the client data
// this does not actually connect to a database, this just creates a data object
const db = new DB();
// create the oauth server object with the database object as a model to follow 
const oauth = new OAuthServer({
    model: createModel(db)
});

// save the client data into the database object
db.saveClient({
    id: process.env.CLIENT_ID,
    secret: process.env.CLIENT_SECRET,
    grants: ['client_credentials'],
    scope: ["read","write"]
});
//************************************************* */
//* JWT Token Boilerplate ***************************/
// secrets that are random and are used to add to the HMAC with tokens
var secret = process.env.SECRET;
var longer_secret = process.env.LONGER_SECRET;

/**
 * Function will take in the id of the Firebase document and determine if it exists in the database
 * @param {String} id_document 
 * @returns {Boolean} hasDocument 
 */
async function hasDocumentById(id_document){
    // default is false
    let hasDocument = false;

    let user_collection = await firestore_client.collection('user').get();
    let user_docs = user_collection.docs;

    for(let id = 0; id < user_docs.length; id++){
        let user_doc = user_docs[id];
        // get the document name by the path
        let document_name = user_doc._ref._path.segments[1];
        // if the document is the same as what we are searching for, set true
        if (document_name == id_document) {
            hasDocument = true;
            break;
        }
    }
    return hasDocument;
}

/**
 * Function will get a token and extract the header (including identifier which is the database doc), payload, and signature
 * @param {String} token 
 * @returns {Array} result
 */
function extractTokenJWT(token){
    // declare empty list and split the JWT token by periods
    let result = [];
    let tokenSplit = token.split(".");
    
    // decode the Base64 string and get the header of the token
    let bufferObj_header = Buffer.from(tokenSplit[0], "base64"); 
    let decodedString_header = bufferObj_header.toString("utf8");
    let token_header = JSON.parse(decodedString_header); 

    result.push(token_header); // push the header to the result

    // decode the Base64 string and get the payload of the token
    let bufferObj_payload = Buffer.from(tokenSplit[1], "base64"); 
    let decodedString_payload = bufferObj_payload.toString("utf8");
    let token_payload = JSON.parse(decodedString_payload);

    result.push(token_payload); // push the token payload to the result

    // get the document id (JWT identifier) and push it to the result
    let id_document = token_payload['id']; 
    result.push(id_document);

    // get the signature and push it to the result
    let signature = tokenSplit[2];
    result.push(signature);
    
    return result;

}

/**
 * Function will get the information related to the token information passed in to determine if it is a legit signature
 * @param {String} local_secret 
 * @param {String} token_header 
 * @param {String} token_payload 
 * @param {String} comparedHash 
 * @returns {Boolean} hashMatch
 */
function matchHash(local_secret,token_header,token_payload,comparedHash){
    // encode the header of the token
    let header_buffer = Buffer.from(JSON.stringify(token_header), "utf8"); 
    let base64_header = header_buffer.toString("base64"); 
    let base64_split_header = base64_header.split("=");

    // encode the payload of the token
    let payload_buffer = Buffer.from(JSON.stringify(token_payload), "utf8"); 
    let base64_payload = payload_buffer.toString("base64");
    let base64_split_payload = base64_payload.split("="); 
    
    // encode the secret
    let secret_buffer = Buffer.from(JSON.stringify(local_secret), "utf8"); 
    let base64_secret = secret_buffer.toString("base64"); 
    let base64_split_secret = base64_secret.split("=");

    // create a hash with the encoded information
    var hashed_secret_base64 = crypto.createHmac('sha256', `${base64_split_secret[0]}`).update(`${base64_split_header[0]}.${base64_split_payload[0]}`).digest("base64url");

    // if the new hash is the same as what was passed in, then true, else false (fake token)
    let hashMatch = (hashed_secret_base64 == comparedHash) ? true : false;
    return hashMatch;
}

/**
 * Middleware: this will verify the token being passed into a request
 * 
 * There are codes embedded in the response depending on the token state, see README.md documentation for more information.
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
async function verifyJWT(req,res,next){
    // get the access and refresh tokens in the request
    let token = req.body.access_token;
    let refr_token = req.body.refresh_token;

    // get the extractions of the tokens
    let result = extractTokenJWT(token);
    let result_refresh = extractTokenJWT(refr_token);

    // set the token header, payload, and identifier of the access token
    let token_header = result[0]; 
    let token_payload = result[1];
    let id_document = result[2];

    // if the access token expired (TTL difference is greater than 3600 seconds (60 minutes, or 1 hour)), it's expired (true), else not expired (false)
    let isExpired_ttl = (Math.floor(new Date().getTime() / 1000) - token_payload['ttl']) > 3600;

    //check to see if the access token is legit
    let hashMatch = matchHash(secret,token_header,token_payload,result[3]);

    // check to see if the refresh token is legit
    let refresh_hashMatch = matchHash(longer_secret,token_header,token_payload,result_refresh[3]);

    // get the document assoicated to the identifier
    let hasDocument = await hasDocumentById(id_document);

    // if the access token expired, and the access and refresh tokens are legit 
    if(isExpired_ttl && hashMatch && refresh_hashMatch){
        // declare empty strings for new tokens
        var JWT_TOKEN_LONG = "";
        var JWT_TOKEN_SMALL = "";

        // get the refresh token again
        var refresh_token = req.body.refresh_token;
        // default code, code 0 is no problem occured
        res.body = {
            'code': 0
        };

        // get the extracted information from token
        result = extractTokenJWT(refresh_token);
    
        // set the payload and identifier
        token_payload = result[1];
        id_document = result[2];
        
        // if the refresh token expired (TTL is greater than 86400 seconds (24 hours)), this is true, else false
        let refresh_isExpired_ttl = (Math.floor(new Date().getTime() / 1000) - token_payload['ttl']) > 86400;

        // get the document of the idenfier document
        let hasDocument = await hasDocumentById(id_document);

        // if the refresh token expired 
        if(refresh_isExpired_ttl){
            // if the request is not directed to provision
            if(req.url != "/provision") {
                // create the body of the response as code 2, refresh token needs to be renewed
                res.body = {
                    'code': 2,
                    'status':"refresh_token_expired"
                };
            }
        } else if (hasDocument){
            // otherwise, if the document does exist, create a new access token with code 3
            JWT_TOKEN_SMALL = await createToken(id_document, secret);
            JWT_TOKEN_LONG = refresh_token;

            JWT_RENEW_RES = {}
            JWT_RENEW_RES['code'] = 3;
            JWT_RENEW_RES['status'] = "renewed_access_token";
            JWT_RENEW_RES['access_token'] = JWT_TOKEN_SMALL;
            JWT_RENEW_RES['refresh_token'] = JWT_TOKEN_LONG;

            res.body = JWT_RENEW_RES; // set it to the response body
        }
    }

    // if either token is fake, or there is no document in the DB for the identifier
    if(!hashMatch || !refresh_hashMatch || !hasDocument){
        // spit back a denied code response (code 1)
        let denied_res = {};
        denied_res['code'] = 1;
        denied_res['err'] = "unauthorized_token";
        res.body = denied_res;
    }

    next(); // move on from middleware
}

/**
 * Function will create a JWT token given an identifier and secret
 * @param {String} id 
 * @param {String} secret 
 * @returns String JWT_TOKEN 
 */
async function createToken(id, secret){
    // user DB collection from Firebase
    let user_collection = await firestore_client.collection('user').get();
    let user_docs = user_collection.docs;
    
    // header info and encoding to Base64
    let header = {}
    header['alg'] = "HS256"
    header['typ'] = "JWT_CUSTOM_NCI"

    let header_buffer = Buffer.from(JSON.stringify(header), "utf8"); 
    let base64_header = header_buffer.toString("base64"); 
    let base64_split_header = base64_header.split("=");
    
    
    // payload info and encoding to Base64
    let payload = {}
    payload['id'] = id;
    payload['ttl'] = Math.floor(new Date().getTime() / 1000);
    let payload_buffer = Buffer.from(JSON.stringify(payload), "utf8"); 
    let base64_payload = payload_buffer.toString("base64");
    let base64_split_payload = base64_payload.split("="); 
    
    // secret being encoded to Base64
    let secret_buffer_short = Buffer.from(JSON.stringify(secret), "utf8"); 
    let base64_secret_short = secret_buffer_short.toString("base64"); 
    let base64_split_secret_short = base64_secret_short.split("=");

    // create signature of token
    var hashed_secret_short_base64 = crypto.createHmac('sha256', `${base64_split_secret_short[0]}`).update(`${base64_split_header[0]}.${base64_split_payload[0]}`).digest("base64url");

    // append the base64 header, payload, and signature
    JWT_TOKEN = `${base64_split_header[0]}.${base64_split_payload[0]}.${hashed_secret_short_base64}`;
    return JWT_TOKEN
}

//************************************************* */

// endpoint to get a JWT token for pi (used only for the Android App)
app.post('/provision_pi', urlencodedParser, oauth.authenticate(), async function (req, res) {
    
    // declarations
    var JWT_TOKEN_LONG = "";
    var JWT_TOKEN_SMALL = "";

    // get email of user
    let email = req.body.email;
    
    // user DB docs from Firebase
    let user_collection = await firestore_client.collection('user').get();
    let user_docs = user_collection.docs;
    
    // get the user data based on DB docs and email
    let data = findUserByEmail(user_docs, email);
    
    // get the document name of the user data to be an identifier
    let document_name = data['document_name'];

    // create tokens (small is TTL 1 hour, long is 24 hours)
    JWT_TOKEN_SMALL = await createToken(document_name, secret);
    JWT_TOKEN_LONG = await createToken(document_name, longer_secret);
    
    //create the JSON object, load it, and send it
    let JWT_TOKENS = {}
    JWT_TOKENS['access_token'] = JWT_TOKEN_SMALL;
    JWT_TOKENS['refresh_token'] = JWT_TOKEN_LONG;
    res.send(JWT_TOKENS);
});

// this is used for the pi to reprovision itself
app.post('/provision', jsonParser, verifyJWT, async function (req, res) {
    // if the modified body from the middleware has been modified (not undefined)
    if(res.body != undefined){
        // get the body and return it as JSON in the response (closes connection)
        let body = res.body;
        return res.json(body);
    } else {
        // otherwise, we are clear to make new access and refresh tokens
        var JWT_TOKEN_LONG = "";
        var JWT_TOKEN_SMALL = "";
        
        // get refresh token and extracted data from token
        var refresh_token = req.body.refresh_token;
        result = extractTokenJWT(refresh_token);
        id_document = result[2];
        
        // create new tokens from existing information, but this will change the TTL
        JWT_TOKEN_SMALL = await createToken(id_document, secret);
        JWT_TOKEN_LONG = await createToken(id_document, longer_secret);
        
        // load the JSOn object and send it back in a json response (closes connection)
        let JWT_TOKENS = {}
        JWT_TOKENS['access_token'] = JWT_TOKEN_SMALL;
        JWT_TOKENS['refresh_token'] = JWT_TOKEN_LONG;
        return res.json(JWT_TOKENS);
    }
        
});

//**************************************************/
//* FUNCTIONS **************************************/
/**
 * function to get a user by email from the firestore database with a docs collection
 * @param {Array} user_docs 
 * @param {String} req_email 
 * @returns JSON Object | null
 */
function findUserByEmail(user_docs, req_email){
    // search through each of the documents by an id...
    for(let id = 0; id < user_docs.length; id++){
        //... and a doc at that id
        let user_doc = user_docs[id];
        // get the email from the document
        let email = user_doc._fieldsProto.email.stringValue;
        // get the document name by the path
        let document_name = user_doc._ref._path.segments[1];
        // if the email in the doc is the same as the email we are trying to find
        if (email == req_email) {
            // we found the email, create a JSON object, load it, and return it
            let data = {}
            data['document'] = user_docs[id];
            data['document_name'] = document_name;
            return data;
        }
    }
    // occurs when an email was not found in the users document collection
    return null;
}

//**************************************************/
//* ENDPOINTS **************************************/
//root route
app.get('/', async (req, res) => {
    res.render('home');
});

// login route to authenticate device, this uses the token
app.post('/login', urlencodedParser, oauth.token(), async (req,res) => {

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
            
            res.send(`${db.findAccessToken()}`);
            
        } else {
            res.send(`Incorrect email and/or password.`);    
        }

    } else {
        res.send(`${req_email} does not have an account. try /create_user to make an account`);    
    }

});

app.post('/reset_account', jsonParser, oauth.authenticate(), async (req, res) => {

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


// num is used to 
var num = 0;

// create user
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


app.get('/denied', (req, res) => {
    res.render('denied');
});

//* APIS
app.get("/api/getDoor", async (req, res) => {

    let document = firestore_client.doc('door/isLockedDoc');
    res.send(document);
});

app.post("/api/postDoor", jsonParser, verifyJWT, async (req, res) => {
    // if the modified body from the middleware is modified (which makes this not undefined)
    if(res.body != undefined){
        // get the body and send it in a JSON response (closes connection)
        let body = res.body;
        return res.json(body);
    }

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
//**************************************************/

// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server is listening at https://localhost:${port}`);
});
