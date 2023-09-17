import { ethers, upgrades } from "hardhat";
import _ from "lodash";
import DB_OWNERS from "../dat/db_v2_owners.json";
import DB_LOCKS from "../dat/db_v2_lockedTokenIds.json";
import { Address, closeReadline, question } from "./utils";
import { MKGenesisStakingV2, MKGenesisV3 } from "../typechain-types";

// yarn hardhat run --network localhost scripts/hardforkV3.ts

const MKProxyAddr = "0xB3a2bec1f41DFC24F489a136B6d471BDEdeDf0e1";

async function main() {
  const MK3 = await ethers.getContractFactory("MKGenesisV3");
  const mk3 = MK3.attach(MKProxyAddr) as MKGenesisV3;

  // await upgrades.forceImport(
  //   Address.StakingProxy,
  //   await ethers.getContractFactory("MKGenesisStakingV1")
  // );

  const StakingV2 = await ethers.getContractFactory("MKGenesisStakingV2");
  const report = await upgrades.validateUpgrade(
    Address.StakingProxy,
    StakingV2
  );
  if (report != undefined) {
    console.error(report);
    return;
  } else {
    console.log("Upgrade validation passed");
  }

  // const stakingV2 = (await upgrades.upgradeProxy(
  //   Address.StakingProxy,
  //   StakingV2
  // )) as MKGenesisStakingV2;
  // await stakingV2.deployed();
  // console.log("Staking upgraded to V2:", stakingV2.address);

  console.log();
  console.log("Now the data migration");

  let gas = 0;
  let gasPrice = [];
  let txs = [];
  {
    const chunkSize = Math.ceil(DB_LOCKS.length / 4);
    const chunks = _.chunk(DB_LOCKS, chunkSize);
    console.log();
    console.log("First we set the locks...");
    for (let i = 0; i < chunks.length; i++) {
      if (i < 99) continue;
      console.log("chunk", i);
      try {
        const tx = await mk3.migrateDBLocks(chunks[i]);
        txs.push(tx);
        // const receipt = await tx.wait();
        // gas += receipt.gasUsed.toNumber();
        // console.log(receipt.status);
      } catch (e) {
        console.error(`failed at ${i}`, e);
        return;
      }
    }
  }
  {
    // tmp chk for locks
    const lock = await mk3.locks(2224, 0);
    console.log({ lock });
  }

  await question("continue?");

  console.log("Gas used: ", gas);
  console.log();
  console.log("Then the DB themselves...");

  const chunkSize = Math.ceil(DB_OWNERS.length / 4);
  const chunks = _.chunk(DB_OWNERS, chunkSize);
  // const all = [];
  for (let i = 0; i < chunks.length; i++) {
    // if (i < 2) continue;
    console.log("chunk", i);
    const offset = 2223 + chunkSize * i;
    try {
      const tx = await mk3.migrateDB(chunks[i], offset);
      txs.push(tx);
      // all.push(tx);
      console.log(`${offset}: ${tx.hash}`);
      // const receipt = await tx.wait();
      // gas += receipt.gasUsed.toNumber();
      // console.log(receipt.status);
    } catch (e) {
      console.error(`failed at ${offset}`, e);
      return;
    }
    // console.log(`${offset}`);
  }

  const receipts = await Promise.all(txs.map((x) => x.wait()));
  console.log(receipts.map((x) => x.gasUsed.toString()));

  // console.log("Total gas used: ", gas);
  // await Promise.all(all.map((x) => x.wait()));

  closeReadline();
}

main();
