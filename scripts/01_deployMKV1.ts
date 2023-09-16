import { ethers, network, upgrades } from 'hardhat';
import { checkJustOneBuildInfo, checkNoProxyExists, closeReadline, getContractName, gitCommitReleaseInfo, gitPreDeployTest, verifyOnEtherscan } from "./utils";

// yarn hardhat run --network localhost scripts/deployV1.ts

const CONTRACT_NAME = "MKGenesis";
const CONTRACT_VERSION = 1;
const INIT = {
  MK: {
    ERC721_TOKEN_NAME: "Monkey Kingdom",
    ERC721_TOKEN_SYMBOL: "MK",
    MAX_SUPPLY: 2222,
    MIGRATE_AUTH: process.env.AUTH_SIGNER_PUBKEY as string,
    BASEURI: "https://meta.monkeykingdom.io/1/",
  },
  DB: {
    ERC721_TOKEN_NAME: "Monkey Kingdom Diamond Baepes",
    ERC721_TOKEN_SYMBOL: "DB",
    MAX_SUPPLY: 2221,
    MIGRATE_AUTH: process.env.AUTH_SIGNER_PUBKEY as string,
    BASEURI: "https://meta.monkeykingdom.io/2/",
  }
}
if (network.name == 'mainnet') {
  INIT.MK.MIGRATE_AUTH = process.env.MAINNET_MK_MIG_AUTH_PUBKEY as string;
  INIT.DB.MIGRATE_AUTH = process.env.MAINNET_DB_MIG_AUTH_PUBKEY as string;
}

async function main() {
  const contractName = getContractName(CONTRACT_NAME, CONTRACT_VERSION);
  const Genesis = await ethers.getContractFactory(contractName);

  // checks
  await checkNoProxyExists();
  await checkJustOneBuildInfo();
  gitPreDeployTest(CONTRACT_VERSION);

  // deploy a new proxy and impl
  for (const [col, cfg] of Object.entries(INIT)) {
    console.log(`Deploying ${col}...`)
    const genesis = await upgrades.deployProxy(Genesis, [
      cfg.ERC721_TOKEN_NAME,
      cfg.ERC721_TOKEN_SYMBOL,
      cfg.MAX_SUPPLY,
      cfg.MIGRATE_AUTH,
      cfg.BASEURI
    ]);
    await genesis.deployed();
    console.log(`${col} deployed to:`, genesis.address);

    // verify on etherscan
    await verifyOnEtherscan(genesis.address);
  }
  // commit build info into git
  await gitCommitReleaseInfo(contractName, CONTRACT_VERSION)
  closeReadline();
}

main();