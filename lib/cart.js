module.exports = function(options) {
    var seneca = this;
    var plugin = 'cart';

    seneca.add({ role: plugin, cmd: 'get' }, get);
    seneca.add({ role: plugin, cmd: 'add' }, add);
    seneca.add({ role: plugin, cmd: 'remove' }, remove);
    seneca.add({ role: plugin, cmd: 'clear' }, clear);

    function get(args, done) {
        return done(null, getCart(args.userId));
    }

    function add(args, done) {
        var cart = getCart(args.userId);

        if (!cart) {
            cart = createCart(args.userId);
        }

        cart.items.push({
            itemId: args.itemId.itemId,
            restaurantId: args.restaurantId,
            restaurantName: args.restaurantName,
            itemName: args.itemName,
            itemPrice: args.itemPrice
        });

        cart.total += +args.itemPrice;
        cart.total.toFixed(2);

        return done(null, cart);
    }

    function remove(args, done) {
        var cart = getCart(args.userId);

        var item = cart.items.filter(function (obj, idx) {
            return (
                obj.itemId === args.itemId && obj.restaurantId === args.restaurantId
            )
        })[0];

        var idx = cart.item.indexOf(item);

        if (item) cart.items.splice(idx, 1);
        cart.total -= item.itemPrice;

        return done(null, cart);
    }

    function clear(args, done) {
        var cart = getCart(args.userId);

        if (!cart) {
            cart = createCart(args.userId);
        }

        cart.items = [];
        cart.total = 0.00;

        done(null, cart);
    }

    function getCart(userId) {
        var cart = carts.filter(function(obj, idx) {
            return obj.userId === userId;
        })[0];

        if (!cart) cart = createCart(userId);

        return cart;
    }

    function createCart(userId) {
        var cart = {
            userId: userId,
            total: 0.0,
            items: [],
        }

        carts.push(cart);

        return cart;
    }

    return { name: plugin };
}

var carts = [];