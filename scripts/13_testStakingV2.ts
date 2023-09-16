import { ethers, network, upgrades } from "hardhat";
import { Address, closeReadline } from "./utils";
import { genStakingSig } from "../lib/all";
import { MKGenesisStakingV2, MKGenesisV3 } from "../typechain-types";

// yarn hardhat run --network localhost scripts/deployV1.ts
/*
.openzeppelin/mainnet.json
  "admin": {
    "address": "0x1733340C743B67ac5c7F2DDED89D96E5DFf73217",
    "txHash": "0x85bafbe4dfe7179436d396f71f39dda5cdf0e0480d577941fdfc3c5be834e8a7"
  },
*/

const getTs = async () => {
  let ts = ~~(Date.now() / 1000);
  const { timestamp } = await ethers.provider.getBlock("latest");
  ts = Math.max(ts, timestamp + 1);
  await ethers.provider.send("evm_setNextBlockTimestamp", [ts]);
  return ts;
};

async function main() {
  if (network.name != "localhost") {
    console.error(
      "wrong network, this is only meant to run on localhost (fork of mainnet)"
    );
    return;
  }
  const adminInstance = await upgrades.admin.getInstance();
  console.log("Proxy admin address: ", adminInstance.address);

  if (adminInstance.address != Address.ProxyAdmin) {
    console.error("adminInstance.address != Address.ProxyAdmin");
    return;
  }

  const [newBoss, boss, d535] = await ethers.getSigners();
  const stakeSigner = new ethers.utils.SigningKey(
    process.env.MAINNET_STAKE_SIGNER_PRIKEY as string
  );
  const DB_tokenId = 1109;
  const MK_tokenId = DB_tokenId + 2222;

  await upgrades.forceImport(
    Address.StakingProxy,
    await ethers.getContractFactory("MKGenesisStakingV1")
  );
  const MK3 = await ethers.getContractFactory("MKGenesisV3");
  const mk3 = (await MK3.attach(Address.MKProxy)) as MKGenesisV3;

  const StakingV2 = await ethers.getContractFactory("MKGenesisStakingV2");
  await upgrades.validateUpgrade(Address.StakingProxy, StakingV2);

  {
    const snapshotId = await ethers.provider.send("evm_snapshot", []);

    // check DB who's been staked with V1 before
    // this MK should be locked and unstakeable

    const StakingV1 = await ethers.getContractFactory("MKGenesisStakingV1");
    const stakingV1 = await StakingV1.attach(Address.StakingProxy);

    // stake DB 1109 with staking v1
    const ts = await getTs();
    const sig = genStakingSig([MK_tokenId], stakingV1.address, ts, stakeSigner);
    const stake_tx = await stakingV1
      .connect(d535)
      .stake([MK_tokenId], ts, sig, []);
    const receipt1 = await stake_tx.wait();
    console.log(
      `Staked DB ${DB_tokenId} with staking v1, ${receipt1.transactionHash}: ${receipt1.status}`
    );

    // upgrade staking v1 to v2
    const stakingV2 = (await upgrades.upgradeProxy(
      Address.StakingProxy,
      StakingV2
    )) as MKGenesisStakingV2;
    await stakingV2.deployed();

    // StakingV3 should report staked[MK_tokenId] == true
    const isStaked = await stakingV2.staked(MK_tokenId);
    if (!isStaked) {
      console.error("MK 3331 should be staked [error]");
      return;
    }

    // migrate DB 1109 into MK 3331
    const migrate_tx = await mk3.migrateDB([d535.address], 3331);
    const migrateLock_tx = await mk3.migrateDBLocks([MK_tokenId]);

    // is MK 3331 locked?
    const isUnlocked0 = await mk3.isUnlocked(MK_tokenId);
    if (isUnlocked0 == true) {
      console.error("MK 3331 should be locked [error]");
      return;
    } else {
      console.log("MK 3331 is locked [OK]");
    }

    const unstake_tx = await stakingV2.connect(d535).unstake([MK_tokenId], [0]);
    const receipt2 = await unstake_tx.wait();
    console.log("Unstake", receipt2.transactionHash + ": " + receipt2.status);

    const isUnlocked1 = await mk3.isUnlocked(MK_tokenId);
    if (isUnlocked0 == false && isUnlocked1 == true) {
      console.log("DB previously staked with V1 can be unstaked with V2 [OK]");
    } else {
      console.log(
        "DB previously staked with V1 CANNOT be unstaked with V2 [Fail]"
      );
    }
    await ethers.provider.send("evm_revert", [snapshotId]);
  }

  {
    // check DB who's never been staked with V1 before can stake with V2
    const snapshotId = await ethers.provider.send("evm_snapshot", []);

    const stakingV2 = (await StakingV2.attach(
      Address.StakingProxy
    )) as MKGenesisStakingV2;
    const newImpl = await upgrades.upgradeProxy(
      Address.StakingProxy,
      StakingV2
    );
    await newImpl.deployed();

    // migrate DB 1109 into MK 3331
    const migrate_tx = await mk3.migrateDB([d535.address], 3331);

    const isUnlocked0 = await mk3.isUnlocked(MK_tokenId);

    const ts = await getTs();
    const sig = genStakingSig([MK_tokenId], stakingV2.address, ts, stakeSigner);
    const stake_tx = await stakingV2
      .connect(d535)
      .stake([MK_tokenId], ts, sig, []);
    const receipt = await stake_tx.wait();
    console.log(receipt.transactionHash + ": " + receipt.status);

    const isUnlocked1 = await mk3.isUnlocked(MK_tokenId);
    if (isUnlocked0 == true && isUnlocked1 == false) {
      console.log("Never staked with V1 can be staked with V2 [OK]");
    } else {
      console.log("Never staked with V1 CANNOT be staked with V2 [Fail]");
    }

    await ethers.provider.send("evm_revert", [snapshotId]);
  }

  closeReadline();
}

main();
