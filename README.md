# SafePi Web
This is the repo for the SafePi dynamic webserver running on Node.js. 

## Setup
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