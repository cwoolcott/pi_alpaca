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

const timing = 2 * 60500; //2.25 minutes

const baselineqty = 1000;

// https://www.tradingview.com/markets/stocks-usa/market-movers-most-volatile/
//Strong Buy

const stocks = [
    {
        symbol : "BUFR",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "OSH",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "IBEX",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "ETACU",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "AFIB",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "RXT",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "CHIR",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "SREV",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "CONN",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
    },
    {
        symbol : "USXF",
        lastmove : -1,
        buyprice: 999,
        latestprice: 0
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
        const open_price = symbol_bars[0].o     
        const close_price = symbol_bars.slice(-1)[0].c
        const percent_change = ((close_price - open_price) / open_price * 100).toFixed(3);

        stock.latestprice = close_price;

        console.log(`${stock.symbol} moved ${percent_change}% over the last ${timing/60000} minutes`);
        getLatest(stock, percent_change);
    })
};

function getLatest(stock, percent_change){
    alpaca.getPosition(stock.symbol)
        .then((position) => {
            //if restart, set buy price to average entry price
            if (stock.buyprice == 999){
                console.log("set " + stock.symbol + " to avg entry: " + position.avg_entry_price);
                stock.buyprice = position.avg_entry_price;
            }
            stock.buyprice = (stock.buyprice == 999) ? position.avg_entry_price : stock.buyprice; 
            order(stock, percent_change, position, true)
        })
        .catch((e) => {
            order(stock, percent_change, {qty:baselineqty}, false)
        })
}

function order(stock, percent_change, position, exists){
    //what to do
    let order = false;
    let orderAmount = 0;
    let lastmove = stock.lastmove;
    let totalHeld = position ? position.qty : 0;
    let sellable = stock.buyprice < stock.latestprice;

    if (percent_change > 1.5 && exists && sellable){
        //sell
        move = 1;
        order='sell';
        orderAmount = totalHeld;
    }
    else if (percent_change > 0.5  && exists && sellable){
        move = 2;
        order='sell';
        orderAmount = (stock.lastmove == 2) ? totalHeld : parseInt(totalHeld / 2);
    }
    else if (percent_change < -0.5){
        move = 3;
        order='buy';
        orderAmount = baselineqty;
        stock.buyprice = stock.latestprice;
    }
    else if (percent_change < -1.5){
        move = 4;
        order='buy';
        orderAmount = totalHeld * 2;
        stock.buyprice = stock.latestprice;
    }
    else{
        move = -1;
        console.log("No Action with " + stock.symbol)
    }

    console.log("---", stock, "change", percent_change, "exists", exists);

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



