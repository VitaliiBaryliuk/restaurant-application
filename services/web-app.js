require('dotenv').config();

var Express = require('express');
var session = require('express-session');

var Seneca = require('seneca');
var Web = require('seneca-web');
var seneca = Seneca();

var { ExpressOIDC } = require('@okta/oidc-middleware');

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

    app.set('views', path.join(__dirname, '../public/views'));
    app.set('view engine', 'pug');

    
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
        loginRedirectUri: 'http://localhost:3000/authorization-code/callback',
        routes: {
            login: {
                path: '/users/login'
            },
            loginCallback: {
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

    function ensureAuthenticated (request, response, next) {
        if (!request.userContext) {
            return response.status(401).redirect('../login');
        }

        next();
    }

    app.get('/', ensureAuthenticated, function (request, response) {
        var cart;
        var restaurants;
        var user = request.userContext.userinfo;
        var username = request.userContext.userinfo.preferred_username;

        seneca.act('role:resaurant', { cmd: 'get', userId: username }, function (err, msg) {
            restaurants = msg;
        }).act('role.cart', { cmd: 'get', userId: username }, function (err, msg) {
            cart = msg;
        }).ready(function () {
            return response.render('home', {
                user: user,
                restaurants: restaurants,
                cart: cart
            });
        });
    });

    app.get('/login', function (request, response) {
        return response.render('login')
    });

    app.get('/users/logout', (request, response, next) => {
        request.logout();
        response.redirect();
    });

    app.get('/cart', ensureAuthenticated, function (request, response) {
        var username = request.userContext.userinfo.preferred_username;
        var user = request.userContext;

        seneca.act('role:cart', { cmd: 'get', userId: username }, function (err, msg) {
            return response.render('cart', {
                user: user,
                cart: msg
            });
        });
    });

    app.post('/cart', ensureAuthenticated, function (request, response) {
        var username = request.userContext.userinfo.preferred_username;
        var restaurantId = request.body.restaurantId;
        var itemId = request.body.itemId;
        var val;

        seneca.act('role:restaurant', { cmd: 'item', itemId: itemId, restaurantId: restaurantId }, function (err, msg) { val = msg})
            .ready(function () {
                seneca.act('role:cart', {
                    cmd: 'add',
                    userId: username,
                    restaurantName: val.restaurant.name,
                    itemName: val.item.name,
                    itemPrice: val.item.itemId,
                    restaurantId: val.item.restaurantId  
                }, function (err, msg) {
                    return response.send(msg).statusCode(200)
                });
            });
    });

    app.delete('/cart', ensureAuthenticated, function (request, response) {
        var username = request.userContext.userinfo.preferred_username;
        var restaurantId = request.body.restaurantId;
        var itemId = request.body.itemId;

        seneca.act('role:cart', { cmd: 'remove', userId: username, restaurantId: restaurantId, itemId: itemId }, function (err, msg) {
            return response.send(msg).statusCode(200);
        });
    });

    app.post('/order', ensureAuthenticated, function (request, response) {
        var username = request.userContext.userinfo.preferred_username;
        var total;
        var result;

        seneca.act('role:payment', { cmd: 'pay', total: total }, function (err, msg) {
            result = msg;
        }).ready(function () {
        if (result.success) {
            seneca.act('role:cart', { cmd: 'clear', userId: username }, function () {
                return response.redirect('/confirmation').send(302);
            })
        } else {
            return response.send('Card Declined').send(200);
        }
        })
    });

    app.get('/confirmation', ensureAuthenticated, function (request, response) {
        var username = request.userContext.userinfo.preferred_username;
        var user = request.userContext.userinfo;

        seneca.act('role:cart', { cmd: 'get', userId: username }, function (err, msg) {
            return response.render('confirmation', {
                user: user,
                cart: msg
            });
        });
    });

    console.log('LISTEN 300000000000000')
    app.listen(3000);
});
