const Web3 = require("web3");
const TonWeb = require("tonweb");
const fs = require("fs");

const tonMultisigIndex = Number(process.argv[2]);

if (isNaN(tonMultisigIndex)) {
    console.error('Usage `node sign-ton.js mulitisig-index`');
    return;
}

async function init() {
    const nacl = TonWeb.utils.nacl;
    const web3 = new Web3();
    const BN = Web3.utils.BN;

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
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.hexToBytes(tonSecretKey));
        const secretKey = keyPair.secretKey;

        const tonweb = new TonWeb(new TonWeb.HttpProvider());
        const walletClass = tonweb.wallet.all['v3R2'];
        const wallet = new walletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: -1
        });

        function wait(ms) {
            return new Promise(resolve => {
                setTimeout(() => resolve(), ms);
            });
        }

        const sendInternal = async (byteArray /* Uint8Array | TonWeb.boc.Cell */, toAddress) => {
            let seqno = await wallet.methods.seqno().call();
            if (!seqno) {
                seqno = 0;
            }
            console.log({seqno});
            await wait(3000);
            const query = await wallet.methods.transfer({
                secretKey: secretKey,
                toAddress: toAddress,
                amount: TonWeb.utils.toNano('0.3'),
                seqno: seqno,
                payload: byteArray,
                sendMode: 3
            });

            console.log(await query.send());
        }

        const sendToMultisig = async () => {
            const tonMultisigAddress = 'Ef_8C2w4oNoiU2zpyxQDSJhZOphjV9QdjfDm2S-AShIfDCHK';
            const WALLET_ID = 101;
            const queryId = new BN(1680123600).mul(new BN(4294967296)).add(new BN(12)); // 30 mar 2023
            const destAddress = 'EQA0i8-CdGnF_DhUHHf92R1ONH6sIA9vLZ_WLcCIhfBBXwtG';

            const orderHeader = TonWeb.Contract.createInternalMessageHeader(new TonWeb.utils.Address(destAddress), TonWeb.utils.toNano('0.123'));
            const msgToBridge = TonWeb.Contract.createCommonMsgInfo(orderHeader, undefined, undefined);

            const cell = new TonWeb.boc.Cell();
            cell.bits.writeUint(new TonWeb.utils.BN(tonMultisigIndex), 8);
            cell.bits.writeBit(0); // null signatures dict
            cell.bits.writeUint(new TonWeb.utils.BN(WALLET_ID), 32);
            cell.bits.writeUint(queryId, 64);
            cell.bits.writeUint(new TonWeb.utils.BN(3), 8); // send mode 3
            cell.refs.push(msgToBridge);

            const rootHash = await cell.hash();
            const rootSignature = TonWeb.utils.nacl.sign.detached(rootHash, secretKey);

            const body = new TonWeb.boc.Cell();
            body.bits.writeBytes(rootSignature);
            body.writeCell(cell);
            return sendInternal(body, tonMultisigAddress);
        }

        await sendToMultisig();
    } else {
        console.error('No file ' + FILE_NAME);
    }
}

init();