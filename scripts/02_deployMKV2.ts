import { ethers, upgrades } from 'hardhat';
import { closeReadline, getContractName, getProxyAddresses, gitCommitReleaseInfo, gitPreDeployTest, question, verifyOnEtherscan } from './utils'

// yarn hardhat run --network localhost scripts/deployV2.ts

const CONTRACT_NAME = "MKGenesis";
const CONTRACT_VERSION = 2;

async function main() {
  const contractName = getContractName(CONTRACT_NAME, CONTRACT_VERSION);
  const Genesis = await ethers.getContractFactory(contractName);

  // checks
  gitPreDeployTest(CONTRACT_VERSION);
  const proxyAddrs = await getProxyAddresses();

  for (const addr of proxyAddrs) {
    // upgrade
    console.log('Upgrading', addr);
    let ok = false;
    while (!ok) {
      try {
        const newImpl = await upgrades.upgradeProxy(addr, Genesis, {
          // call new initialize function, update args if necessary
          call: 'initializeV2()'
        });
        await newImpl.deployed();
        console.log(`${addr} upgraded`);
        ok = true;

        // verify on etherscan
        await verifyOnEtherscan(newImpl.address);

      } catch (e) {
        console.log(e);
        const ans = await question('Retry? (y/n) ') as any as string;
        if (ans == 'n') break;
      }
    }
  }

  // commit build info into git
  await gitCommitReleaseInfo(contractName, CONTRACT_VERSION)

  closeReadline();
}

main();