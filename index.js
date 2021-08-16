const Web3 = require("web3");
const TonWeb = require("tonweb");
const fs = require("fs");

async function init() {
    const nacl = TonWeb.utils.nacl;
    const web3 = new Web3();

    const FILE_NAME = 'keys.json';

    let tonSecretKey, ethAccount;
    let needSave = false;

    if (fs.existsSync(FILE_NAME)) {
        console.log(`Getting keys from ${FILE_NAME}..`);
        const json = JSON.parse(fs.readFileSync(FILE_NAME).toString('utf-8'));

        if (!json.tonPrivateKey) throw new Error('invalid ' + FILE_NAME);
        if (!json.ethPrivateKey) throw new Error('invalid ' + FILE_NAME);

        tonSecretKey = json.tonPrivateKey;
        ethAccount = web3.eth.accounts.privateKeyToAccount(json.ethPrivateKey);

    } else {
        console.log('Generating TON and ETH keys..');
        const newKeyPair = nacl.box.keyPair();

        tonSecretKey = TonWeb.utils.bytesToHex(newKeyPair.secretKey);
        ethAccount = web3.eth.accounts.create();
        needSave = true;
    }

    // TON

    const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.hexToBytes(tonSecretKey));
    const tonweb = new TonWeb(new TonWeb.HttpProvider());
    const walletClass = tonweb.wallet.all['v3R2'];
    const wallet = new walletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
        wc: -1
    });

    console.log('TON Public Key = ' + TonWeb.utils.bytesToHex(keyPair.publicKey));
    console.log('TON Public Key Base64 = ' + TonWeb.utils.bytesToBase64(keyPair.publicKey));

    const myAddress = (await wallet.getAddress()).toString(false);
    console.log('TON Address = ' + myAddress);

    // ETH

    console.log('ETH Address = ' + ethAccount.address);

    const data = {
        tonPrivateKey: tonSecretKey,
        ethPrivateKey: ethAccount.privateKey
    };

    if (needSave) {
        fs.writeFile(FILE_NAME, JSON.stringify(data), (err, data) => {
            if (err) {
                return console.error('Write file error', err);
            }
            console.log('Done');
        });
    } else {
        console.log('Done');
    }
}

init();