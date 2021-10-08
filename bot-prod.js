// Because I like Python
const print = console.log;

// Change to 'false' for production
const TESTNET = false;
const chain = TESTNET ? 'bombay-12' : 'columbus-5';
const url = TESTNET ? 'https://bombay-lcd.terra.dev' : 'https://lcd.terra.dev';

// To make things easier
const DIVISOR = 1000000;
const DENOM = {
    'LUNA': 'uluna',
    'UST': 'uusd'
}

// Create LCD object
const terra = new Terra.LCDClient({
    URL: url,
    chainID: chain,
});

// Initialize objects and variables
var wallet = null;
var mk = null;
var orderIDs = new Set();
var orders = {};

// TODO: Use a connected wallet (walletConnect / Chrome extension) instead !!!
function loadWallet() {
    mk = new Terra.MnemonicKey({
        // You have to set it in the console
        mnemonic: MNEMONIC
    });
    wallet = terra.wallet(mk);
}

// Get the current user account balances for LUNA and UST
async function balance() {
    const obj = await wallet.lcd.bank.balance(mk.accAddress);
    const out = {}
    for (const c of obj.toData()) {
    	out[c.denom] = c.amount;
    }
    return out;
}

// Get the current LUNA price in UST
async function price() {
    const obj = await wallet.lcd.market.swapRate(new Terra.Coin('uluna', '1000000'), 'uusd');
    return parseFloat(obj.toData().amount) / DIVISOR;
}

// Market swap function
function swap(amount, from, to) {
    const coin = new Terra.Coin(DENOM[from.toUpperCase()], amount * DIVISOR);
    const msg = new Terra.MsgSwap(mk.accAddress, coin, DENOM[to.toUpperCase()]);

    wallet.createAndSignTx({
        msgs: [msg],
        memo: 'this works!',
    })
    .then(tx => terra.tx.broadcast(tx))
    .then(result => {
        print(`https://finder.terra.money/${chain}/tx/${result.txhash}`);
    });
}

// Create swap order
async function swapAt(order) {
    const p = await price();
    order.from = order.from.toUpperCase();
    order.to = order.to.toUpperCase();
    order.timestamp = Date.now();
    const expr = order.target > p ? '>=' : '<=';
    async function _swapAt(order) {
        const p = await price();
        print(`[ ${orderID} ] Swap ${desc} (Now: $${p})`);
        if (eval(`${p} ${expr} ${order.target}`)) {
            cancel(orderID);
            print(`Swapping ${order.amount} ${order.from} for ${order.to} at $${p} per LUNA`);
            swap(order.amount, order.from, order.to);
        }
    }
    var orderID = setInterval(_swapAt, 2000, order);
    var desc = `${order.amount} ${order.from} for ${order.to} at $${order.target} per LUNA`
    print(`Creating swap order of ${desc}`);
    print(`Trigger: price ${expr} ${order.target}`);
    print(`Order id: ${orderID}`);
    orders[orderID] = order;
    orderIDs.add(orderID);
    return orderID;
}

// Cancel the last order (or any given one)
function cancel(orderID) {
    if (!orderID) orderID = Array.from(orderIDs).pop();
    print(`Cancelling order ${orderID}`);
    clearInterval(orderID);
    orderIDs.delete(orderID);
    delete orders[orderID];
}

// Cancel all orders
function cancelAll() {
    print(`Cancelling all orders`);
    for (const id of orderIDs) {
        clearInterval(id);
    }
    orderIDs.clear();
    orders = {};
}

// Start the bot
async function start() {
    loadWallet();
    var b = await balance();
    print('Balances:', b.uluna / DIVISOR, 'LUNA /', b.uusd / DIVISOR, 'UST');
    print('1 LUNA =', await price(), 'UST');
}
