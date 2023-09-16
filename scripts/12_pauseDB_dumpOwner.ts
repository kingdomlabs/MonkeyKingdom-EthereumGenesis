import { ContractCallResults, Multicall } from "ethereum-multicall";
import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import _ from "lodash";
import { abi as DB_ABI } from "../artifacts/contracts/MKGenesisV2.sol/MKGenesisV2.json";
import { Address, closeReadline } from "./utils";

// yarn hardhat run --network localhost scripts/05_pauseDB_dumpOwner.ts

async function main() {
  const MK2 = await ethers.getContractFactory("MKGenesisV2");
  const db2 = MK2.attach(Address.DBProxy);

  const expectedOwner = await db2.owner();
  const [signer0] = await ethers.getSigners();
  if (signer0.address != expectedOwner) {
    console.error(
      `Signer[0] and owner of ${db2.address} should be ${expectedOwner}`
    );
    return;
  }

  // pause DB
  const isPaused = await db2.paused();
  if (!isPaused) {
    const pause_tx = await db2.pause();
    await pause_tx.wait();
    console.log("Paused");
  } else {
    console.log("Already paused");
  }

  // dump ownerOf
  const tokenIds = _.range(1, 2221 + 1);
  const CHUNK_SIZE = 200;
  const chunks = _.chunk(tokenIds, CHUNK_SIZE);

  const multicall = new Multicall({
    ethersProvider: ethers.provider,
    tryAggregate: true,
    multicallCustomContractAddress:
      "0xcA11bde05977b3631167028862bE2a173976CA11",
  });

  let owners: any[] = [];
  // this will be slow and might timeout but retry multiple times and it'd eventually work as hardhat has cache
  for (let i = 0; i < chunks.length; i++) {
    console.log(
      "chunk",
      i,
      `${chunks[i][0]} - ${chunks[i][chunks[i].length - 1]}`
    );
    console.time("multicall " + i);

    const results: ContractCallResults = await multicall.call([
      {
        reference: "DB",
        contractAddress: Address.DBProxy,
        abi: DB_ABI,
        calls: chunks[i].map((tokenId) => ({
          reference: tokenId.toString(),
          methodName: "ownerOf",
          methodParameters: [tokenId.toString()],
        })),
      },
    ]);
    console.timeEnd("multicall " + i);
    results.results.DB.callsReturnContext.map((x) => {
      const tokenId = parseInt(x.reference);
      owners[tokenId] =
        x.returnValues[0] ?? "0x21CdBb13A1C539c83a7848b51bEEc8A3297B9E1B";
    });
    // await new Promise((r) => setTimeout(r, 2000));
  }

  let lockedTokenIds: any[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(
      "chunk",
      i,
      `${chunks[i][0]} - ${chunks[i][chunks[i].length - 1]}`
    );
    console.time("multicall " + i);

    const results: ContractCallResults = await multicall.call([
      {
        reference: "DB",
        contractAddress: Address.DBProxy,
        abi: DB_ABI,
        calls: chunks[i].map((tokenId) => ({
          reference: tokenId.toString(),
          methodName: "locks",
          methodParameters: [tokenId.toString(), 0],
        })),
      },
    ]);
    console.timeEnd("multicall " + i);
    results.results.DB.callsReturnContext.map((x) => {
      const tokenId = parseInt(x.reference);
      if (x.returnValues[0]) {
        lockedTokenIds.push(tokenId);
      }
    });
    // await new Promise((r) => setTimeout(r, 2000));
  }

  // await Promise.all(jobs);

  owners = owners.slice(1); // remove 0th element, as tokenId starts from 1
  lockedTokenIds = lockedTokenIds.map((x) => x + 2222);

  console.log(`${owners.length} owners`);
  console.log(
    `Cross check against etherscan: totalSupply should now be ${
      owners.filter((x) => x != "0x21CdBb13A1C539c83a7848b51bEEc8A3297B9E1B")
        .length
    }`
  );

  writeFileSync("./dat/db_v2_owners.json", JSON.stringify(owners, null, 2));
  writeFileSync(
    "./dat/db_v2_lockedTokenIds.json",
    JSON.stringify(lockedTokenIds, null, 2)
  );

  closeReadline();
}

main();
