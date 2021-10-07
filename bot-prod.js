const print = console.log;

const DIVISOR = 1000000;
const DENOM = {
    'LUNA': 'uluna',
    'UST': 'uusd'
}

//const chain = "bombay-12";
const chain = "columbus-5";

// connect to bombay testnet
const terra = new Terra.LCDClient({
    URL: 'https://lcd.terra.dev',
    chainID: chain,
});

var wallet = null;
var mk = null;

function loadWallet() {
    mk = new Terra.MnemonicKey({
        mnemonic: MNEMONIC
    });
    wallet = terra.wallet(mk);
}

async function balance() {
    const obj = await wallet.lcd.bank.balance(mk.accAddress);
    const out = {}
    for (const c of obj.toData()) {
    	out[c.denom] = c.amount;
    }
    return out;
}

async function price() {
    const obj = await wallet.lcd.market.swapRate(new Terra.Coin('uluna', '1000000'), 'uusd');
    return parseFloat(obj.toData().amount) / DIVISOR;
}

function swap(amount, from, to) {
    const coin = new Terra.Coin(DENOM[from.toUpperCase()], amount * DIVISOR);
    const msg = new Terra.MsgSwap(mk.accAddress, coin, DENOM[to.toUpperCase()]);

    wallet.createAndSignTx({
        msgs: [msg],
        memo: 'this works!',
    })
    .then(tx => terra.tx.broadcast(tx))
    .then(result => {
        print(`https://finder.terra.money/columbus-5/tx/${result.txhash}`);
    });
}

function sellAt(amountLuna, target) {
    async function _sell(amount, target) {
        const p = await price();
        print("Current LUNA price:", p);
        if (p >= target) {
            print("Selling", amount, "LUNA at", p, "UST");
            swap(amount, 'luna', 'ust')
            clearInterval(sellID);
        }
    }
    print('Creating sell order of', amountLuna, "LUNA at", target, "UST");
    var sellID = setInterval(_sell, 2000, amountLuna, target);
}

function buyAt(amountUST, target) {
    async function _buy(amount, target) {
        const p = await price();
        print("Current LUNA price:", p);
        if (p <= target) {
            print("Buying", amount, "LUNA at", p, "UST");
            swap(amount, 'ust', 'luna')
            clearInterval(buyID);
        }
    }
    print('Creating buy order of', (amountUST / target), "LUNA at", target, "UST");
    var buyID = setInterval(_buy, 2000, amountUST, target);
}

async function start() {
    loadWallet();
    var b = await balance();
    print('Balances:', b.uluna / DIVISOR, "LUNA /", b.uusd / DIVISOR, "UST");
    print('1 LUNA =', await price(), "UST");
}