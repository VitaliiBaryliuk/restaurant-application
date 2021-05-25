require('dotenv').config();

var Express = require('express');
var session = require('express-session');

var Seneca = require('seneca');
var Web = require('seneca-web');
var seneca = Seneca();

var ExpressOIDC = require('@okta/oidc-middleware');

var path = require('path');
var bodyparser = require('body-parser');

var senecaWebConfig = {
    context: Express(),
    adapter: require('seneca-web-adapter-express'),
    options: { parseBody: false, includeRequest: true, includeResponse: true }
}

seneca.use(Web, senecaWebConfig)
    .client({ port: '10201', pin: 'role:restaurant' })
    .client({ port: '10202', pin: 'role:cart' })
    .client({ port: '10203', pin: 'role:payment' })
    .client({ port: '10204', pin: 'role:order' })

seneca.ready(() => {
    const app = seneca.export('web/context')();

    app.use(Express.static('public'));
    app.use(bodyparser.json());
    app.use(bodyparser.urlencoded());

    app.set('views', path,join(__dirname, '../public/views'));
    app.set('view engine', 'pug');
});

const oktaSettiongs = {
    clientId: process.env.OKTA_CLIENTID,
    clientSecret: process.env.OKTA_CLIENTSECRET,
    url: process.env.OKTA_URL_BASE,
    appBaseUrl: process.env.OKTA_APP_BASE_URL
};

const oidc = new ExpressOIDC({
    issuer: oktaSettiongs.url + '/oauth2/default',
    client_id: oktaSettiongs.clientId,
    client_secret: oktaSettiongs.clientSecret,
    appBaseUrl: oktaSettiongs.appBaseUrl,
    scope: 'openid profile',
    routes: {
        login: {
            path: '/users/login'
        },
        callback: {
            path: '/authorization-code/callback',
            defaultRedirect: '/'
        }
    }
});

app.use(
    session({
        secret: "ladhnsfolnjaerovklnoisag093q4jgpijbfimdposjg5904mbgomcpasjdg'pomp;m",
        resave: true,
        saveUninitialized: false
    })
);

app.use(oidc.router);