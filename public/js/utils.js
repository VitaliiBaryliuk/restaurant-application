function updateCart(cart) {
    var count = cart.item.length;
    $('#cart-button').text(count);
}

function removeFromCart(restaurantId, itemId, rowNumber) {
    var data = {
        restaurantId: restaurantId,
        itemId: itemId
    };

    $.ajax({
        type: 'DELETE',
        url: 'cart',
        data: data,
        success: function(cart) {
            if (cart.items.length == 0) {
                window.location.href = 'cart';
            }

            updateCart(cart);
            $('#row' + rowNumber).remove();
            $('#total-price').text('Total Price $ ' + cart.total);
        }
    });
}

function addToCart(restaurantId, itemId) {
    var data = {
        restaurantId: restaurantId,
        itemId: itemId
    };

    $.ajax({
        type: 'POST',
        url: 'cart',
        data: data,
        success: function(cart) {
            updateCart(cart);
        }
    });
}