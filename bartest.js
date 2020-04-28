const Alpaca = require('@alpacahq/alpaca-trade-api')
//const mongojs = require("mongojs");

const alpaca = new Alpaca({
  //keyId: 'AK0ER7ELLB72ZRL4CIIS',
  //secretKey: '6xwI1yk2bpr9DlhKxzcURdhrVs8f8Wn7sjQUxOIl',
  keyId: 'PKDGCKN4NOXHJT8V4Z4V',
  secretKey: 'Y3DRAh1ikTxJiUnp7y2uOu0RtFZjUlx2w1L5VVt1',
  paper: true,
})

function start(stocks){
    console.log("start");
    console.log(stocks);
    // getbars on all stocks
    for (let i = 0; i<stocks.length; i++){
        getBars(stocks[i]);
    }
}

function getBars (symbol) {
    // Get daily price data for MESO over the last 5 trading minutes.
    alpaca.getBars(
        'minute',
        symbol,
        {
            limit: 5
        }
    ).then((barset) => {
        const symbol_bars = barset[symbol]
        const week_open = symbol_bars[0].o     
        const week_close = symbol_bars.slice(-1)[0].c
        const percent_change = (week_close - week_open) / week_open * 100

        console.log(`${symbol} moved ${percent_change}% over the last 5 minutes`)

        getLatest(symbol, percent_change)
    })
};

function getLatest(symbol, percent_change){
    alpaca.getPosition(symbol)
        .then((position) => {
            order(symbol,percent_change, position)
        })
        .catch((e) => {
            order(symbol,percent_change, {qty:1})
        })
}

function order(symbol, percent_change, position){
    //what to do
    let order;
    let orderAmount;
    let totalHeld = position.qty;

    if (percent_change < 3){
        order='buy';
        orderAmount = totalHeld * 2;
    }
    else if (percent_change < 1){
        order='buy';
        orderAmount = 2;
    }
    else if (percent_change > 3){
        order='sell';
        orderAmount = totalHeld;
    }
    else if (percent_change > 1){
        order='sell';
        orderAmount = totalHeld > 1 ? 2 : totalHeld;
    }
    else{
        console.log("No Action with " + symbol)
    }

    console.log(order,orderAmount);

    alpaca.createOrder({
        symbol: symbol,
        qty: orderAmount,
        side: order,
        type: 'market',
        time_in_force: 'day'
    }).then((order) => {
        console.log("order", order)
    })
}

const stocks = [
    "ITUB",
    "AYTU",
    "VSTM"
]

setInterval(function(){ 
    alpaca.getClock().then((clock) => {
        if (clock.is_open){
            start(stocks);
        }
    });
}, 5000);





