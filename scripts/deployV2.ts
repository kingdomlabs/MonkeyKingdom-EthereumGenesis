import { ethers, upgrades } from 'hardhat';
import { closeReadline, getContractName, getProxyAddress, gitCommitReleaseInfo, question, verifyOnEtherscan } from './utils'

// yarn hardhat run --network localhost scripts/deployV1.ts

const CONTRACT_NAME = "MKGenesis";
const CONTRACT_VERSION = 2;

async function main() {
  const contractName = getContractName(CONTRACT_NAME, CONTRACT_VERSION);
  const Genesis = await ethers.getContractFactory(contractName);

  // check if there's an existing proxy
  const proxyAddr = await getProxyAddress();

  // upgrade
  const genesisImpl = await upgrades.upgradeProxy(proxyAddr, Genesis, {
    // call new initialize function, update args if necessary
    call: 'initializeV2()'
  });
  await genesisImpl.deployed();
  console.log(`${contractName} upgraded:`, genesisImpl.address);

  // await genesisImpl.initializeV2();
  // console.log(`${contractName} initialized`);

  // verify on etherscan
  await verifyOnEtherscan(genesisImpl.address);

  // commit build info into git
  await gitCommitReleaseInfo(contractName, CONTRACT_VERSION)

  closeReadline();
}

main();