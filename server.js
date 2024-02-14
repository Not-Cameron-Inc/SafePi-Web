const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const OAuthServer = require('@node-oauth/express-oauth-server');
const bodyParser = require('body-parser'); // Required for parsing POST request body

const app = express();
const port = 443;

app.oauth = new OAuthServer({
    model: {}, // See https://github.com/node-oauth/node-oauth2-server for specification
  });

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(app.oauth.authorize());

app.use(function(req, res) {
    res.send('Secret area');
  });


// HTTPS options
const options = {
    key: fs.readFileSync('../keys/key.pem'),
    cert: fs.readFileSync('../keys/cert.pem')
};

// Create an HTTPS server
const server = https.createServer(options, app);

// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server is listening at https://localhost:${port}`);
});
