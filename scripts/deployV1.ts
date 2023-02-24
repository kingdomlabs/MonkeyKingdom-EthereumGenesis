import { ethers, upgrades } from 'hardhat';
import { checkNoProxyExists, closeReadline, getContractName, gitCommitReleaseInfo, verifyOnEtherscan } from "./utils";

// yarn hardhat run --network localhost scripts/deployV1.ts

const CONTRACT_NAME = "MKGenesis";
const CONTRACT_VERSION = 1;
// initializor args
const ERC721_TOKEN_NAME = "MKGenesis";
const ERC721_TOKEN_SYMBOL = "MKG";
const MAX_SUPPLY = 4443;
const MIGRATE_AUTH = process.env.AUTH_SIGNER_PUBKEY as string;
const BASEURI = "https://meta.monkeykingdom.io/1/";

async function main() {
  const contractName = getContractName(CONTRACT_NAME, CONTRACT_VERSION);
  const Genesis = await ethers.getContractFactory(contractName);

  // check if there's an existing proxy
  await checkNoProxyExists();

  // deploy a new proxy and impl
  // const genesis = await Genesis.attach('0x3E29eb26a3f84D88214400f3E37c8955ea5cb820');
  const genesis = await upgrades.deployProxy(Genesis, [
    ERC721_TOKEN_NAME,
    ERC721_TOKEN_SYMBOL,
    MAX_SUPPLY,
    MIGRATE_AUTH,
    BASEURI
  ]);
  await genesis.deployed();
  console.log(`${contractName} deployed to:`, genesis.address);

  // verify on etherscan
  await verifyOnEtherscan(genesis.address);

  // commit build info into git
  await gitCommitReleaseInfo(contractName, CONTRACT_VERSION)

  closeReadline();
}

main();