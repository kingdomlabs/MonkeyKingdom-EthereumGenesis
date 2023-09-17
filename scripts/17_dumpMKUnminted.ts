import { ContractCallResults, Multicall } from "ethereum-multicall";
import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import _ from "lodash";
import { abi } from "../artifacts/contracts/MKGenesisV2.sol/MKGenesisV2.json";
import { Address, closeReadline } from "./utils";

// yarn hardhat run --network localhost scripts/05_pauseDB_dumpOwner.ts

async function main() {
  const MK3 = await ethers.getContractFactory("MKGenesisV3");
  const mk3 = MK3.attach(Address.DBProxy);

  // dump ownerOf
  const tokenIds = _.range(1, 2222 + 1);
  const CHUNK_SIZE = 200;
  const chunks = _.chunk(tokenIds, CHUNK_SIZE);

  const multicall = new Multicall({
    ethersProvider: ethers.provider,
    tryAggregate: true,
    multicallCustomContractAddress:
      "0xcA11bde05977b3631167028862bE2a173976CA11",
  });

  const unminted: number[] = [];
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
        reference: "MK",
        contractAddress: Address.MKProxy,
        abi: abi,
        calls: chunks[i].map((tokenId) => ({
          reference: tokenId.toString(),
          methodName: "ownerOf",
          methodParameters: [tokenId.toString()],
        })),
      },
    ]);
    console.timeEnd("multicall " + i);
    results.results.MK.callsReturnContext.map((x) => {
      const tokenId = parseInt(x.reference);
      if (x.success == false) {
        unminted.push(tokenId);
      } else {
      }
    });
  }

  console.log("unminted:", unminted.length);

  writeFileSync("./dat/mk_unminted.json", JSON.stringify(unminted, null, 2));

  closeReadline();
}

main();
