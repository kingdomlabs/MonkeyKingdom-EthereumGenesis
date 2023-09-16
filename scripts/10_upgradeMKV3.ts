import { ethers, upgrades } from "hardhat";
import {
  Address,
  closeReadline,
  getContractName,
  gitCommitReleaseInfo,
  gitPreDeployTest,
  question,
  verifyOnEtherscan,
} from "./utils";
import { MKGenesisV3 } from "../typechain-types";

// yarn hardhat run --network localhost scripts/hardforkV3.ts

const CONTRACT_NAME = "MKGenesis";
const CONTRACT_VERSION = 3;
const contractName = getContractName(CONTRACT_NAME, CONTRACT_VERSION);

async function main() {
  // check signer 0
  const [signer0] = await ethers.getSigners();
  const proxyAdmin = await upgrades.admin.getInstance();
  const expectedOwner = await proxyAdmin.owner();
  if (signer0.address != expectedOwner) {
    console.error(
      `Signer[0] and owner of ${proxyAdmin.address} should be ${expectedOwner}`
    );
    return;
  }

  const MK3 = await ethers.getContractFactory("MKGenesisV3");

  // checks
  // if (network.name != "localhost")
  gitPreDeployTest(CONTRACT_VERSION);

  // upgrade
  let ok = false;

  const MKGenesisV2 = await ethers.getContractFactory("MKGenesisV2");
  const MKGenesisV3 = await ethers.getContractFactory("MKGenesisV3");
  const valid = await upgrades.validateUpgrade(MKGenesisV2, MKGenesisV3);
  if (valid !== undefined) {
    console.error("Upgradability validation failed");
    return;
  } else {
    console.log("Upgradability validation passed");
  }

  while (!ok) {
    try {
      const newImpl = await upgrades.upgradeProxy(Address.MKProxy, MK3, {
        // call new initialize function, update args if necessary
        call: "initializeV3()",
      });
      await newImpl.deployed();
      console.log(`Upgraded ${CONTRACT_NAME} to V${CONTRACT_VERSION}`);
      console.log(`Proxy address: ${Address.MKProxy}`);

      ok = true;

      // brief check
      console.log();
      console.log("Brief check...");
      const mk3 = newImpl as MKGenesisV3;
      const maxSupply = await mk3.MAX_SUPPLY();
      console.log(
        `MAX_SUPPLY is: ${maxSupply} ` +
          (maxSupply.toNumber() == 4443 ? "[OK]" : "[ERROR]")
      );
      const dbMigrationComplete = await mk3.dbMigrationComplete();
      console.log(
        `dbMigrationComplete is: ${dbMigrationComplete} ` +
          (dbMigrationComplete == false ? "[OK]" : "[ERROR]")
      );

      // verify on etherscan
      await verifyOnEtherscan(newImpl.address);
    } catch (e) {
      console.log(e);
      const ans = (await question("Retry? (y/n) ")) as any as string;
      if (ans == "n") break;
    }
  }

  // commit build info into git
  // if (network.name != "localhost")
  await gitCommitReleaseInfo(contractName, CONTRACT_VERSION);

  closeReadline();
}

main();
