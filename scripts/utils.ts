import { network, run } from 'hardhat';
import { existsSync, readdirSync, readFileSync } from "fs";
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
        console.log("Verification skipped for local networks");
    } else {
        const ans = await question('Verify on etherscan? (y/n) ') as any as string;
        if (ans == 'y') {
            let success = false;
            while (!success) {
                try {
                    await run("verify:verify", { address });
                    success = true;
                } catch (e) {
                    console.log(e);
                    const ans = await question('Retry? (y/n) ') as any as string;
                    if (ans == 'n') break;
                }
            }
        }
    }
}
export async function checkJustOneBuildInfo() {
    const dir = readdirSync('./artifacts/build-info');
    if (dir.length > 1) {
        console.error('There should be exactly one file under artifacts/build-info. Delete the artifacts folder and try again.');
        process.exit(1);
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
export async function getProxyAddresses() {
    if (network.name == 'localhost' || network.name == 'hardhat') {
        const ans = await question('Proxy addresses (comma seperated): ') as any as string;
        return ans.split(',').map((s: string) => s.trim())
    } else {
        const buf = readFileSync(`./.openzeppelin/${network.name}.json`, "utf8");
        const obj = JSON.parse(buf);
        assert(obj.proxies.length == 2, "There should be exactly two proxies");
        const proxyAddrs = obj.proxies.map(x => x.address);
        const ans = await question(`Is the proxy address ${proxyAddrs}? (y/n) `) as any as string;
        if (ans != 'y') process.exit(1);
        return proxyAddrs;
    }
}

export function gitPreDeployTest(ver: number) {
    const tag = `v${ver}-${network.name}`
    const tags = execSync('git tag -l', { encoding: 'utf-8' }).split('\n');
    const branchName = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    if (tags.indexOf(tag) !== -1) {
        const tags_to_delete = tags.filter(x => x.split('-')[1] == network.name )
        console.error(`Tag ${tag} exists, delete branch ${network.name} & related tags and try again`) as any as string;
        console.error(`Try: git tag -d ${tags_to_delete.join(' ')} && git branch -D ${network.name}`);
        process.exit(1);
    }
    if (branchName != network.name) {
        console.error(`Current branch is ${branchName}, try git checkout -B ${network.name}!`) as any as string;
        process.exit(1);
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
    console.log(files);
    const tag = `v${ver}-${network.name}`
    const ans = await question(`Commit the above files and tag as ${tag}? (y/n) `) as any as string;

    if (ans == 'y') {
        execSync('git add -f ' + files.join(" "));
        execSync(`git commit -m 'build: ${tag}' -o ` + files.join(' '));
        execSync(`git tag ${tag}`);
    }
}