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

const timing = 3 * 60000; //5 minutes

const baselineqty = 100;

const stocks = [
    {
        symbol : "CAPR",
        lastmove : -1
    },
    {
        symbol : "GPOR",
        lastmove : -1
    },
    {
        symbol : "AR",
        lastmove : -1
    },
    {
        symbol : "THMO",
        lastmove : -1
    },
    {
        symbol : "SM",
        lastmove : -1
    },
    {
        symbol : "APA",
        lastmove : -1
    },
    {
        symbol : "MTDR",
        lastmove : -1
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
            limit: 3
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
    let lastmove = stock.lastmove;

    if (percent_change > 2 && exists){
        //sell
        move = 1;
        order='sell';
        orderAmount = totalHeld;
    }
    else if (percent_change > 1  && exists){
        move = 2;
        order='sell';
        orderAmount = (stock.lastmove == 2) ? totalHeld : parseInt(totalHeld / 2);
    }
    else if (percent_change < -1){
        move = 3;
        order='buy';
        orderAmount = baselineqty;
    }
    else if (percent_change < -2){
        move = 4;
        order='buy';
        orderAmount = totalHeld * 2;
    }
    else{
        move = -1;
        console.log("No Action with " + stock.symbol)
    }

    stock.lastmove = move;

    if (order){
        try{
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
        catch(e){
            console.log("Cant place order", e);
        }
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



