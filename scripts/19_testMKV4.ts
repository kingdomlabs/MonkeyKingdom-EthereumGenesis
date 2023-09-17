import { writeFileSync } from "fs";
import { ethers, network, upgrades } from "hardhat";
import _ from "lodash";
import { abi } from "../artifacts/contracts/MKGenesisV2.sol/MKGenesisV2.json";
import {
  Address,
  closeReadline,
  getContractName,
  gitCommitReleaseInfo,
  gitPreDeployTest,
  question,
  verifyOnEtherscan,
} from "./utils";
import unminted from "../dat/mk_unminted.json";
import { MKGenesisV4 } from "../typechain-types";

// yarn hardhat run --network localhost scripts/05_pauseDB_dumpOwner.ts

const CONTRACT_NAME = "MKGenesis";
const CONTRACT_VERSION = 4;
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
  const MK4 = await ethers.getContractFactory("MKGenesisV4");

  // checks
  if (network.name != "localhost") gitPreDeployTest(CONTRACT_VERSION);

  // upgrade

  let ok = false;
  const valid = await upgrades.validateUpgrade(MK3, MK4);
  if (valid !== undefined) {
    console.error("Upgradability validation failed");
    return;
  } else {
    console.log("Upgradability validation passed");
  }
  while (!ok) {
    try {
      const newImpl = await upgrades.upgradeProxy(Address.MKProxy, MK4, {
        // call new initialize function, update args if necessary
      });
      await newImpl.deployed();
      console.log(`Upgraded ${CONTRACT_NAME} to V${CONTRACT_VERSION}`);
      console.log(`Proxy address: ${Address.MKProxy}`);

      ok = true;

      // brief check
      console.log();
      console.log("Brief check...");
      const mk4 = newImpl as MKGenesisV4;
      const maxSupply = await mk4.MAX_SUPPLY();
      console.log(
        `MAX_SUPPLY is: ${maxSupply} ` +
          (maxSupply.toNumber() == 4443 ? "[OK]" : "[ERROR]")
      );

      // test
      // await mk4.migrateOtherMKs(unminted);

      // verify on etherscan
      await verifyOnEtherscan(newImpl.address);
    } catch (e) {
      console.log(e);
      const ans = (await question("Retry? (y/n) ")) as any as string;
      if (ans == "n") break;
    }
  }

  // commit build info into git
  if (network.name != "localhost")
    await gitCommitReleaseInfo(contractName, CONTRACT_VERSION);

  closeReadline();
}

main();
