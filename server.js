const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser'); // Required for parsing POST request body

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));

// const fetch = require('node-fetch');

const port = 443;



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
app.get('/get', (req, res) => {
  res.render('get');
});

// app.post("/postToken", authenticated, (req,res) => )

// Start the HTTPS server
server.listen(port, () => {
  console.log(`Server is listening at https://localhost:${port}`);
});
