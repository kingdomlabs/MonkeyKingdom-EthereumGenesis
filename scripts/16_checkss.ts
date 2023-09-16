import { ethers } from "hardhat";
import _ from "lodash";
import { closeReadline } from "./utils";
import { MKGenesisV2, MKGenesisV3 } from "../typechain-types";

// yarn hardhat run --network localhost scripts/hardforkV3.ts

const MKProxyAddr = "0xB3a2bec1f41DFC24F489a136B6d471BDEdeDf0e1";
const DBProxyAddr = "0x28d7136aaa5D6C4C0D69c1a3Bb3b64B23F696d4e";

async function main() {
  const MK3 = await ethers.getContractFactory("MKGenesisV3");
  const mk3 = MK3.attach(MKProxyAddr) as MKGenesisV3;

  const MK2 = await ethers.getContractFactory("MKGenesisV2");
  const mk2 = MK2.attach(MKProxyAddr) as MKGenesisV2;

  const DB2 = await ethers.getContractFactory("MKGenesisV2");
  const db2 = DB2.attach(DBProxyAddr);

  const tokenIds = _.range(1, 2221 + 1);
  // const tokenIds = _.shuffle(_.range(1, 2221 + 1)).slice(0, 100);

  for (const tokenId of tokenIds) {
    console.log(tokenId);
    const dbOwner = await db2
      .ownerOf(tokenId)
      .catch((e: any) => "0x21CdBb13A1C539c83a7848b51bEEc8A3297B9E1B");
    const dbIsUnlocked = await db2.isUnlocked(tokenId).catch((e: any) => true);
    const mkOwner = await mk2.ownerOf(tokenId + 2222);
    const mkIsUnlocked = await mk3.isUnlocked(tokenId + 2222);
    if (dbOwner != mkOwner) {
      console.error(`${tokenId}: ${dbOwner} != ${mkOwner}`);
      return;
    } else if (dbIsUnlocked != mkIsUnlocked) {
      console.error(
        "isUnlocked",
        `${tokenId}: ${dbIsUnlocked} != ${mkIsUnlocked}`
      );
    } else {
      // console.log(`${tokenId}: ${dbOwner} == ${mkOwner}`);
    }
  }
  console.log("all good");

  // check DB 1109 which is owned by 0xd535

  closeReadline();
}

main();
