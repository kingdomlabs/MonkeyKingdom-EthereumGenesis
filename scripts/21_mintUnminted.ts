import { ethers } from "hardhat";
import _ from "lodash";
import unminted from "../dat/mk_unminted.json";
import { Address, closeReadline } from "./utils";

// yarn hardhat run --network localhost scripts/05_pauseDB_dumpOwner.ts

async function main() {
  const MK4 = await ethers.getContractFactory("MKGenesisV4");
  const mk4 = MK4.attach(Address.MKProxy);

  console.log(`Minting ${unminted.length} unminted tokens...`);
  const tx = await mk4.migrateOtherMKs(unminted);
  const errors: any[] = [];
  const all = _.shuffle(unminted)
    .slice(0, 50)
    .map(async (tokenId) => {
      const owner = await mk4.ownerOf(tokenId);
      if (owner.toLowerCase() != "0x21cdbb13a1c539c83a7848b51beec8a3297b9e1b") {
        errors.push({ tokenId, owner });
      }
    });
  await Promise.all(all);
  if (errors.length > 0) {
    console.log("errors", errors);
  } else {
    console.log("all checked out");
  }

  closeReadline();
}

main();
