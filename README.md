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
The token can be obtained by authentication of user credentials.

For authentication, this request would be used (which adds a needed email and password to find a user in the database):
```
curl --location 'https://safepi.org/login' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'email=[insert email]' \
--data-urlencode 'password=[insert password]' \
```

Once the user or device is authenticated, a token is generated as a response:
```
{
    "access_token": "[token generated here]",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": true
}
```

## Using the OAuth token
The token can now be used in a lot of requests from creating and resetting users to changing the door lock. The following are some request examples:

### Creating users (POST)
```
curl --location 'https://safepi.org/create_user' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [insert oauth token]' \
--data-raw '{
    "email":"[insert email]",
    "password":"[insert password]"
}'
```

### Reseting user passwords (POST)
```
curl --location 'https://localhost/reset_account' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [insert oauth token]' \
--data-raw '{
    "email":"[insert email]",
    "password":"[insert new password]"
}'
```

### Change Door Lock (POST)
```
curl --location 'https://safepi.org/api/postDoor' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [insert oauth token]' \
--data '{
    "isLocked":"true"
}'
```

### Provisioning Pi From A Logged In User (POST)
````
curl --location 'https://safepi.org/provision_pi' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Bearer [insert oauth token]' \
--data-urlencode 'email=test@test.com'
````

## JWT Workflow

### Getting a JWT Token
To get a JWT token, it can be done by having an Oauth token from a logged in user with the following request:
```
curl --location 'https://safepi.org/provision_pi' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Bearer [insert oauth token]' \
--data-urlencode 'email=test@test.com'
```

The response of the tokens being generated has a best case of the following (denied response if invalid oauth token):
```
{
    "access_token": "[insert access token]",
    "refresh_token": "[insert refresh token]"
}
```

### Renew JWT Token by Reprovisioning Device
When both the access and refresh tokens are expired (usually discovered by code 2 in some response), going to ```/provision``` is required to get a new set of tokens as the following request demonstrates:
```
curl --location 'https://safepi.org/provision' \
--header 'Content-Type: application/json' \
--data '{
    "access_token": "[insert access token]",
    "refresh_token": "[insert refresh token]"
}'
```

The response of the tokens being generated has a best case of the following (response code 1 if invalid JWT token by signature):
```
{
    "access_token": "[insert access token]",
    "refresh_token": "[insert refresh token]"
}
```

When renewing with a token that has no expired refresh token, it will return code 3 of a renewed access token:
```
{
    "code": 3,
    "status": "renewed_access_token",
    "access_token": "[insert access token]",
    "refresh_token": "[insert refresh token]"
}
```

### Response Codes
There are mutiple response codes depending on the following cases:
#### Code 0: Valid Token (usually not seen at all and is a placeholder code)
```
{
    'code': 0
}
```

#### Code 1: Invalid/Unauthorized Token
```
{
    "code": 1,
    "err": "invalid_token"
}
```

#### Code 2: Refresh Token Expired (along with access token being expired)
```
{
    "code": 2,
    "status": "refresh_token_expired"
}
```

#### Code 3: Renewed Acess Token
```
{
    "code": 3,
    "status": "renewed_access_token",
    "access_token": "[insert access token]",
    "refresh_token": "[insert refresh token]"
}
```
## References:
[OAuth2 node express module](https://github.com/node-oauth/node-oauth2-server?tab=readme-ov-file)

[JWT Checker](https://jwt.io)