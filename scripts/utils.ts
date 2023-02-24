import { network, run } from 'hardhat';
import { existsSync, readFileSync } from "fs";
import { execSync } from 'child_process';

// readline
import { stdin, stdout } from 'node:process';
import readline from 'node:readline';
import { promisify } from 'util';
import assert from 'assert';
const rl = readline.createInterface({ input: stdin, output: stdout });
export const question = promisify(rl.question).bind(rl);
export const closeReadline = () => rl.close();

// reuseable functions
export const getContractName = (name: string, ver: number) => `${name}V${ver}`;
export async function verifyOnEtherscan(address: string) {
    if (network.name == 'localhost' || network.name == 'hardhat') {
        console.log("Skip verify on localhost");
    } else {
        const ans = await question('Verify on etherscan? (y/n) ') as any as string;
        if (ans == 'y') {
            await run("verify:verify", { address });
        }
    }
}
export async function checkNoProxyExists() {
    if (network.name == 'localhost' || network.name == 'hardhat') return;
    const exists = existsSync(`./.openzeppelin/${network.name}.json`);
    if (exists) {
        const buf = readFileSync(`./.openzeppelin/${network.name}.json`, "utf8");
        const obj = JSON.parse(buf);
        const num = obj.proxies.length;
        if (num != 0) {
            const ans = await question(`There are ${num} existing proxies, continue? (y/n) `) as any as string;
            if (ans != 'y') process.exit(1);
        }
    }
}
export async function getProxyAddress() {
    if (network.name == 'localhost' || network.name == 'hardhat') {
        return await question('Proxy address: ') as any as string;
    } else {
        const buf = readFileSync(`./.openzeppelin/${network.name}.json`, "utf8");
        const obj = JSON.parse(buf);
        assert(obj.proxies.length == 1, "There should be only one proxy");
        const proxyAddr = obj.proxies[0].address;
        const ans = await question(`Is the proxy address ${proxyAddr}? (y/n) `) as any as string;
        if (ans != 'y') process.exit(1);
        return proxyAddr;
    }
}

export async function gitCommitReleaseInfo(name: string, ver: number) {
    const buildInfoPath = `./artifacts/contracts/${name}.sol/` + JSON.parse(readFileSync(`./artifacts/contracts/${name}.sol/${name}.dbg.json`, "utf8")).buildInfo;
    const files = [
        buildInfoPath, // artifacts/build-info/xxx.json             // hardhat build info, has source code for all compiled files, could be useful for etherscan verification if auto verification fails
        `./artifacts/contracts/${name}.sol/${name}.json`,           // abi
        `contracts/*`                                              // source code
    ]
    if (network.name == 'mainnet' || network.name == 'goerli') {
        files.push(`.openzeppelin/${network.name}.json`)            // openzeppelin upgrade proxy & storage layout info
    }
    const tag = `v${ver}-${network.name}`
    console.log(files);
    const ans = await question(`Commit the above files and tag as ${tag}? (y/n) `) as any as string;

    if (ans == 'y') {
        execSync('git add -f ' + files.join(" "));
        execSync(`git commit -m 'build: ${tag}' -o ` + files.join(' '));
        execSync(`git tag ${tag}`);
    }
}