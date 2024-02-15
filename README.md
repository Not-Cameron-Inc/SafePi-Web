# SafePi Web
This is the repo for the SafePi dynamic webserver running on Node.js. 

## Setup
### Install:
First, you'll need to install nodejs. There are various ways of doing that, including different commands per OS being used. 

Run these commands to install and set up the necessary environment from the repo directory:
```
npm init -y
npm install express
npm install @node-oauth/express-oauth-server
npm install nodemon --save-dev
npm install ejs
npm install node-fetch@2
```
### Self-signed Certificates for HTTPS:
Since we do not own a domain name associated with out site, we have to self-sign a certificate in order to use https for encryption. To do this install the latest openssl and run these commands from the repo directory:
```
mkdir ../keys
openssl genrsa -out ../keys/key.pem 2048
openssl req -new -key ../keys/key.pem -out ../keys/csr.pem
openssl x509 -req -days 365 -in ../keys/csr.pem -signkey ../keys/key.pem -out ../keys/cert.pem
```

To test the configuration, start the server and make a request from a different machine like this:
```
curl https://<your server's ipaddr>
```
### OAuth2:
If you haven't done so already, install this server library for using OAuth2 within express and nodejs:
```
npm install @node-oauth/express-oauth-server
```
Here is an example of a curl request done from the cli:
```
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "username=user@example.com" \
  -d "password=user_password" \
  https://184.72.19.36/oauth/token

```

## References:
[OAuth2 node express module](https://github.com/node-oauth/node-oauth2-server?tab=readme-ov-file)