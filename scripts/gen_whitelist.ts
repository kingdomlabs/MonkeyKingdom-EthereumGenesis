import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const hre = require("hardhat");
const ethers = hre.ethers;
const _ = require('lodash');
const { writeFileSync } = require('fs');

(async () => {
    const addresses = (await ethers.getSigners()).map((s: { address: any; }) => s.address);
    console.log(addresses.length)
    let i = 0;
    while (addresses.length < 3000) {
        addresses.push((await ethers.Wallet.createRandom()).address);
        if (i % 100 == 0) console.log(i)
        i += 1;
    }
    writeFileSync('../test/whitelist.json', JSON.stringify(addresses, null, 2));
    console.log('done');
})();
