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

let closedalert = true;

const timing = 2 * 60000; //5 minutes

const baselineqty = 1000;

const stocks = [
    {
        symbol : "IGC",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "NTN",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "SQQQ",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "SRNE",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "SNDL",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "HX",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "HEXO",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "ZOM",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "NIO",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
    },
    {
        symbol : "GE",
        lastmove : -1,
        lastlow: 1000,
        lasthigh: -1
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

        const week_vol_open = symbol_bars[0].v     
        const week_vol_close = symbol_bars.slice(-1)[0].v //current
        const percent_vol_change = (week_vol_open - week_vol_close) / week_vol_open * 100

        console.log(`${stock.symbol} moved ${percent_change}% over the last ${timing/60000} minutes`);
        console.log(`${stock.symbol} volume moved ${percent_vol_change}% over the last ${timing/60000} minutes`);
        getLatest(stock, percent_change, week_vol_close)
    })
};

function getLatest(stock, percent_change, close_price){
    alpaca.getPosition(stock.symbol)
        .then((position) => {
            order(stock, percent_change, position, true, close_price)
        })
        .catch((e) => {
            order(stock, percent_change, {qty:baselineqty}, false, close_price)
        })
}

function order(stock, percent_change, position, exists, close_price){
    //what to do
    let order;
    let orderAmount;
    let totalHeld = position.qty;
    let lastmove = stock.lastmove;
    let sellable = close_price > stock.lasthigh;

    console.log("---", stock, "change", percent_change, "exists", exists, "sellable", sellable, "---");

    if (percent_change > 3 && exists){
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
    else if (percent_change < -3){
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
                console.log("order", order.symbol,order.side,order.qty)
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
           closedalert=true;
        }
        else if (closedalert==true){
            console.log("Market Closed...");
            closedalert=false;
        }
    });
}


setInterval(function(){ 
    checkOpenAndStart();
}, timing);

checkOpenAndStart();



