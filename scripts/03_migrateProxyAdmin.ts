import { ethers, upgrades } from "hardhat";
import { closeReadline } from "./utils";

// yarn hardhat run --network localhost scripts/03_migrateProxyAdmin.ts

async function main() {
  const MK3 = await ethers.getContractFactory("MKGenesisV3");
  const validate = await upgrades.validateImplementation(MK3);

  if (validate !== undefined) {
    console.error("Upgradability validation failed");
    return;
  }

  console.log(
    "This scripts transfer ProxyAdmin owner from signer[0] to signer[1], this will affect all contracts managed by the ProxyAdmin instance"
  );
  const adminInstance = await upgrades.admin.getInstance();
  console.log("Proxy admin address: ", adminInstance.address);

  const [boss, newBoss] = await ethers.getSigners();
  if (
    boss.address != "0xb055C236B3Dd0aA53e0a8926B60Ae10dfEDA36ac" ||
    newBoss.address != "0x63EB8Be36BdC3eED63B23d1f965D758DE8E4Ca29" ||
    (await adminInstance.owner()) != boss.address
  ) {
    console.error(
      `Signer[0] and owner of ${adminInstance.address} should be 0xb055C236B3Dd0aA53e0a8926B60Ae10dfEDA36ac, signer[1] should be 0x63EB8Be36BdC3eED63B23d1f965D758DE8E4Ca29`
    );
    return;
  }

  const tx = await upgrades.admin.transferProxyAdminOwnership(newBoss.address);
  console.log(tx);

  closeReadline();
}

main();
