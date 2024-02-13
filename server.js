// server.js
const express = require('express');
const https = require('https');
const fs = require('fs');

const app = express();
const port = 443;

// Define a route
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// HTTPS options
const options = {
    key: fs.readFileSync('keys/key.pem'),
    cert: fs.readFileSync('keys/cert.pem')
};

// Create an HTTPS server
const server = https.createServer(options, app);

// Start the HTTPS server
server.listen(port, () => {
    console.log(`Server is listening at https://localhost:${port}`);
});
