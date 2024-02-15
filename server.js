const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const OAuthServer = require('@node-oauth/express-oauth-server');
const Request = OAuthServer.Request;
const Response = OAuthServer.Response;
const bodyParser = require('body-parser'); // Required for parsing POST request body

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));

// const fetch = require('node-fetch');

const port = 443;

//* OAUTH BOILERPLATE

// app.oauth = new OAuthServer({
//   model: require('./model') // See https://github.com/node-oauth/node-oauth2-server for specification
// });

// let request = new Request({
//   method: 'GET',
//   query: {},
//   headers: { Authorization: 'Bearer foobar' }
// });

// let response = new Response({
//   headers: {}
// });

// oauth.authenticate(request, response)
//   .then((token) => {
//     // The request was successfully authenticated.
//   })
//   .catch((err) => {
//     // The request failed authentication.
//   });
//*

// Serve static files from the public directory
// app.use(express.static(path.join(__dirname, 'public')));

// app.use(app.oauth.authorize());

// app.use(function (req, res) {
//   res.send('Secret area');
// });


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
app.get('/get', oauth.authenticate(), (req, res) => {
  res.render('get');
});

//post route
app.post('oauth/token', async (req, res) => {
  //TODO: this is where the pi will call to authenticate
  const tokenBodyParams = new URLSearchParams();
  tokenBodyParams.append('grant_type', 'client_credentials');
  tokenBodyParams.append('scope', 'read');

  const response = await fetch('http://localhost:8080/token', {
    method: 'post',
    body: tokenBodyParams,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'authorization': 'Basic ' + Buffer.from(`${client.id}:${client.secret}`).toString('base64'),
    }
  })
  const token = await response.json()
  const accessToken = token.access_token
  const tokenType = token.token_type

  res.render('get', {"token":token});
});

// app.post("/postToken", authenticated, (req,res) => )

// Start the HTTPS server
server.listen(port, () => {
  console.log(`Server is listening at https://localhost:${port}`);
});
