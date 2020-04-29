const Alpaca = require('@alpacahq/alpaca-trade-api');
require('dotenv').config();
//const mongojs = require("mongojs");

console.log(process.env.DEV_KEY_ID)
const alpaca = new Alpaca({
  // keyId: process.env.PROD_KEY_ID,
  // secretKey: process.env.PROD_SECRET,
  keyId: process.env.DEV_KEY_ID,
  secretKey: process.env.DEV_SECRET,
  paper: true,
})

const timing = 5 * 60000; //5 minutes

const baselineqty = 100;

const stocks = [
    {
        symbol : "NAT"
    },
    {
        symbol : "GE"
    },
    {
        symbol : "F"
    },
    {
        symbol : "M"
    },
    {
        symbol : "GPOR"
    },
    {
        symbol : "OPK"
    },
    {
        symbol : "ABEV"
    }     
];

function start(stocks){
    console.log("start");
    console.log(stocks);
    // getbars on all stocks
    for (let i = 0; i<stocks.length; i++){
        getBars(stocks[i]);
    }
}

function getBars (stock) {
    // Get daily price data for MESO over the last 5 trading minutes.
    alpaca.getBars(
        'minute',
        stock.symbol,
        {
            limit: 5
        }
    ).then((barset) => {
        const symbol_bars = barset[stock.symbol]
        const week_open = symbol_bars[0].o     
        const week_close = symbol_bars.slice(-1)[0].c
        const percent_change = (week_close - week_open) / week_open * 100

        console.log(`${stock.symbol} moved ${percent_change}% over the last 5 minutes`)

        getLatest(stock, percent_change)
    })
};

function getLatest(stock, percent_change){
    alpaca.getPosition(stock.symbol)
        .then((position) => {
            order(stock, percent_change, position, true)
        })
        .catch((e) => {
            order(stock, percent_change, {qty:baselineqty}, false)
        })
}

function order(stock, percent_change, position, exists){
    //what to do
    let order;
    let orderAmount;
    let totalHeld = position.qty;

    if (percent_change > 3 && exists){
        //sell
        order='sell';
        orderAmount = totalHeld;
    }
    else if (percent_change > 1  && exists){
        order='sell';
        orderAmount = parseInt(totalHeld / 2);
    }
    else if (percent_change < -1){
        order='buy';
        orderAmount = baselineqty;
    }
    else if (percent_change < -3){
        order='buy';
        orderAmount = totalHeld * 2;
    }
    else{
        console.log("No Action with " + stock.symbol)
    }

    if (order){
        alpaca.createOrder({
            symbol: stock.symbol,
            qty: orderAmount,
            side: order,
            type: 'market',
            time_in_force: 'day'
        }).then((order) => {
            console.log("order", order)
        })
    }
}

function checkOpenAndStart(){
     alpaca.getClock().then((clock) => {
        if (clock.is_open){
           start(stocks);
        }
    });
}


setInterval(function(){ 
    checkOpenAndStart();
}, timing);

checkOpenAndStart();



