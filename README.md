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
npm install ejs
npm install node-fetch@2
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
### Extra steps for getting Oauth2 working
There is an extra set of steps to get the Oauth2 library to work properly, as the developers of the library had some oversights... (insert more documentation for this)

## OAuth 2 Workflow
### Getting a Token
First, a token can be generated with a given client secret and ID from Google's API Credentials. This is put into Base64 as follows:
```
Base64(client_id:client_secret)
```

The token can be obtained in one of two ways: client/device authentication and user authentication.

For client authentication, such as the Raspberry Pi, use the following request:
```
curl --location 'https://safepi.org/login' \
--header 'Authorization: Basic [insert Base64 string from before of client id and secret]' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode 'scope=read '
```

For user authentication, this request would be used (which adds a needed email and password to find a user in the database):
```
curl --location 'https://safepi.org/login' \
--header 'Authorization: Basic [insert Base64 string from before of client id and secret]' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'email=[insert email]' \
--data-urlencode 'password=[insert password]' \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode 'scope=read '
```

Once the user or device is authenticated, a token is generated as a responce:
```
{
    "access_token": "[token generated here]",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": true
}
```

## Using the OAuth token
The token can now be used in a lot of rquests from creating and reseting users to chaning the door lock. The following are some request examples:

### Creating users (POST)
```
curl --location 'https://localhost:443/create_user' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [insert token]' \
--data-raw '{
    "email":"[insert email]",
    "password":"[insert password]"
}'
```

### Reseting user passwords (POST)
```
curl --location 'https://localhost/reset_account' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [insert token]' \
--data-raw '{
    "email":"[insert email]",
    "password":"[insert new password]"
}'
```

### Change Door Lock (POST)
```
curl --location 'https://localhost:443/api/postDoor' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [insert token]' \
--data '{
    "isLocked":"true"
}'
```

## References:
[OAuth2 node express module](https://github.com/node-oauth/node-oauth2-server?tab=readme-ov-file)