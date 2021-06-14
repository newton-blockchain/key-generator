const Web3 = require("web3");
const TonWeb = require("tonweb");
const fs = require("fs");

async function init() {
    const FILE_NAME = 'keys.json';

    if (fs.existsSync(FILE_NAME)) {
        console.log(`File ${FILE_NAME} already exists`);
        return;
    }

    console.log('Generating TON and ETH keys..');

    // TON

    const nacl = TonWeb.utils.nacl;
    const newKeyPair = nacl.box.keyPair();
    const newPublicKey = TonWeb.utils.bytesToHex(newKeyPair.publicKey);
    const newSecretKey = TonWeb.utils.bytesToHex(newKeyPair.secretKey);

    const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.hexToBytes(newSecretKey));
    const tonweb = new TonWeb(new TonWeb.HttpProvider());
    const walletClass = tonweb.wallet.all['v3R2'];
    const wallet = new walletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
        wc: -1
    });

    const myAddress = (await wallet.getAddress()).toString(false);
    console.log('TON Address = ' + myAddress);

    // ETH

    const web3 = new Web3();
    const account = web3.eth.accounts.create();
    console.log('ETH Address = ' + account.address);

    const data = {
        tonPrivateKey: newSecretKey,
        ethPrivateKey: account.privateKey
    };

    fs.writeFile(FILE_NAME, JSON.stringify(data), (err, data) => {
        if (err) {
            return console.error('Write file error', err);
        }
        console.log('Done');
    });
}

init();