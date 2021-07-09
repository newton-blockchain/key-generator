const Web3 = require("web3");
const TonWeb = require("tonweb");
const fs = require("fs");

const textToSign = process.argv[2];

if (!textToSign) {
    console.error('Usage `node sign-eth.js TEXT_TO_SIGN`');
    return;
}

async function init() {
    const web3 = new Web3();

    const FILE_NAME = 'keys.json';

    if (fs.existsSync(FILE_NAME)) {
        console.log(`Getting keys from ${FILE_NAME}..`);
        const json = JSON.parse(fs.readFileSync(FILE_NAME).toString('utf-8'));
        if (!json.ethPrivateKey) throw new Error('invalid ' + FILE_NAME);

        const ethAccount = web3.eth.accounts.privateKeyToAccount(json.ethPrivateKey);

        console.log(`Signing "${textToSign} by ` + ethAccount.address);

        const signature = ethAccount.sign(textToSign).signature;
        console.log(signature);

    } else {
        console.error('No file ' + FILE_NAME);
    }
}

init();