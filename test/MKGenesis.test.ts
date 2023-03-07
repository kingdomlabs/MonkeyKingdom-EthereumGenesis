import "dotenv/config";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import _ from 'lodash';
import { genMigrateSig } from "../lib/all";
import { MKGenesisV1, MKGenesisV2 } from "../typechain-types";


console.clear();
const baseURI = "https://meta.monkeykingdom.io/1/";

const signerAddr: string = process.env.AUTH_SIGNER_PUBKEY as string;
let acc: SignerWithAddress[];
const { BigNumber } = ethers;

const solSig = '2fZTA6wXuqYsxe9mwSSDhAkbDd9nZyLrQzgnisDycMVM8jnLNVhb2XkF3D3JcMeyd4JDiB8LhEfpLir2wvzv4VG7';

describe("MonkeyKingdomGenesis", () => {
  async function genesisFixture() {
    const Genesis = await ethers.getContractFactory("MKGenesisV1");
    const genesis: MKGenesisV1 = await upgrades.deployProxy(Genesis, ["MonkeyKingdom Wukong", "MKW", 2222, signerAddr, baseURI]) as MKGenesisV1;
    return { genesis };
  }
  async function erc20Fixture(num_arg = 2222) {
    const Erc20 = await ethers.getContractFactory("DummyToken");
    return {
      erc20: await Erc20.deploy(num_arg)
    }
  }
  async function erc20Fixture2(num_arg = 2222) {
    const Erc20 = await ethers.getContractFactory("DummyToken");
    return {
      erc20: await Erc20.deploy(num_arg)
    }
  }
  async function erc20Fixture3(num_arg = 2222) {
    const Erc20 = await ethers.getContractFactory("DummyToken");
    return {
      erc20: await Erc20.deploy(num_arg)
    }
  }

  before(async () => {
    // const f = await loadFixtuer(fixture);
    acc = await ethers.getSigners();
  });

  describe('upgradeable', () => {
    it('initialize works', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      expect(await genesis.name()).to.equal("MonkeyKingdom Wukong");
      expect(await genesis.symbol()).to.equal("MKW");
      expect(await genesis.baseURI()).to.equal(baseURI);
      expect(await genesis.authSigner()).to.equal(signerAddr);
    });
    it('new fn available at same addr', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      {
        //pre-upgrade mints

        const tokenIds = [10];
        const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
        await genesis.migrate(tokenIds, sig, solSig);

        expect(await genesis.balanceOf(acc[0].address)).to.equal(1);
      }

      const GenesisV2 = await ethers.getContractFactory("MKGenesisV2");
      const genesisV2 = await upgrades.upgradeProxy(genesis.address, GenesisV2) as MKGenesisV2;
      expect(genesis.address).to.equal(genesisV2.address);

      {
        const tokenIds = [2, 4];
        const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
        await genesisV2.migrate(tokenIds, sig, solSig)
        expect(await genesis.balanceOf(acc[0].address)).to.equal(1 + 2);
      }

    });
    it('old fn body replaced at same addr', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const GenesisV2 = await ethers.getContractFactory("MKGenesisV2Test");
      const genesisV2 = await upgrades.upgradeProxy(genesis.address, GenesisV2) as MKGenesisV2;
      expect(genesis.address).to.equal(genesisV2.address);

      const tokenIds = [2, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await expect(genesisV2.migrate(tokenIds, sig, solSig)).to.revertedWith('Migration closed');
    });

  });

  describe('pausable', () => {
    it('not paused by default', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      expect(await genesis.paused()).to.equal(false);
    })
    it('can be paused', async () => {
      const { genesis } = await loadFixture(genesisFixture);

      const tokenIds = [2, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await genesis.migrate(tokenIds, sig, solSig)
      await expect(
        genesis.connect(acc[1]).pause()
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await genesis.pause();
      expect(await genesis.paused()).to.equal(true);
      await expect(
        genesis.transferFrom(acc[0].address, acc[1].address, 2)
      ).to.be.revertedWith('Pausable: paused');

      await expect(
        genesis.connect(acc[1]).unpause()
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await genesis.unpause();
      await genesis.transferFrom(acc[0].address, acc[1].address, 2)
      expect(await genesis.ownerOf(2)).to.equal(acc[1].address);
    })
  })

  describe("migration", () => {
    it('each token id can only be minted once', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const tokenIds = [2, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      genesis.migrate(tokenIds, sig, solSig)
      expect(await genesis.balanceOf(acc[0].address)).to.equal(tokenIds.length);
      const sig2 = genMigrateSig(tokenIds, acc[1].address, solSig);
      await expect(
        genesis.connect(acc[1]).migrate(tokenIds, sig2, solSig)
      ).to.be.revertedWith('ERC721: token already minted');
    })

    it("invalid sig rejected", async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const tokenIds = [2, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig) + '11';
      await expect(
        genesis.connect(acc[1]).migrate(tokenIds, sig, solSig)
      ).to.revertedWith("invalid sig");
    });
    it("sig valid only to intended user", async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const tokenIds = [2, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await expect(
        genesis.connect(acc[1]).migrate(tokenIds, sig, solSig)
      ).to.revertedWith("Invalid sig");

      await genesis.migrate(tokenIds, sig, solSig);
    });
    it("correct sig enable migrating only once", async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const tokenIds = [2, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);

      await genesis.migrate(tokenIds, sig, solSig);
      await expect(
        genesis.migrate(tokenIds, sig, solSig)
      ).to.revertedWith(
        "ERC721: token already minted"
      );
    });

    it("minting update counter", async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const tokenIds = [2, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);

      await genesis.migrate(tokenIds, sig, solSig);
      expect(await genesis.totalSupply()).to.equal(2);
    });
    it("bulk mint works", async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const tokenIds = _.range(1, 51); // end is exclusive
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);

      await genesis.migrate(tokenIds, sig, solSig);
      expect(await genesis.totalSupply()).to.equal(50);
    });

  });

  describe("misc", () => {
    it('recover ERC20 works for owner only', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const { erc20: dummyToken } = await loadFixture(erc20Fixture);

      const qty = BigNumber.from(23);
      await dummyToken.transfer(genesis.address, qty);

      await expect(genesis.connect(acc[2]).recoverERC20(dummyToken.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await expect(() => genesis.recoverERC20(dummyToken.address)).to.changeTokenBalances(
        dummyToken,
        [genesis, acc[0]],
        [qty.mul(-1), qty]
      );
    })

    it('authSigner onlyOwner settable', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      await genesis.setAuthSigner(acc[2].address);
      expect(
        await genesis.authSigner()
      ).to.equal(acc[2].address);

      await expect(
        genesis.connect(acc[2]).setAuthSigner(acc[3].address)
      ).to.be.revertedWith('Ownable: caller is not the owner')

    })

    it("baseURI default", async () => {
      const { genesis } = await loadFixture(genesisFixture);

      const tokenIds = [3, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await genesis.migrate(tokenIds, sig, solSig);

      expect(await genesis.tokenURI(tokenIds[0])).to.equal(
        baseURI + tokenIds[0]
      );
    });

    it("only owner can setbaseuri", async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const tokenIds = [3, 4];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await genesis.migrate(tokenIds, sig, solSig);
      expect(await genesis.tokenURI(tokenIds[0])).to.equal(baseURI + tokenIds[0]);

      const baseURI2 = "https://meta.monkeykingdom.io/testing/";
      await genesis.setBaseURI(baseURI2);
      expect(await genesis.tokenURI(tokenIds[0])).to.equal(baseURI2 + tokenIds[0]);

      const baseURI3 = "https://meta.monkeykingdom.io/non-owner/";
      await expect(genesis.connect(acc[1]).setBaseURI(baseURI3)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      expect(await genesis.tokenURI(tokenIds[0])).to.equal(baseURI2 + tokenIds[0]);
    });
    it('support interface', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      expect(await genesis.supportsInterface('0x80ac58cd')).to.be.true; // _INTERFACE_ID_IERC721
      expect(await genesis.supportsInterface('0x780e9d63')).to.be.true; // _INTERFACE_ID_IERC721ENUMERABLE
    })
  });

  describe("locking", () => {
    it("only owner can add new lockers, lock limits transfer, unlock works", async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const { erc20 } = await loadFixture(erc20Fixture);

      const tokenIds = [5, 6];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await genesis.migrate(tokenIds, sig, solSig);
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.true;

      await expect(
        genesis.connect(acc[1]).updateApprovedContracts([erc20.address], [true])
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await genesis.updateApprovedContracts([erc20.address], [true]);
      await erc20.setMonkey(genesis.address);

      // // t1: lock
      const ownerA = await genesis.ownerOf(tokenIds[0]);
      const t1 = await erc20.lockMonkey(tokenIds[0]);
      await t1.wait();
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.false;

      // // t2: transfer should fail
      await expect(
        genesis.transferFrom(acc[0].address, acc[1].address, tokenIds[0])
      ).to.be.revertedWith("Token locked");
      expect(
        await genesis.ownerOf(tokenIds[0])
      ).to.equal(ownerA);

      // // t3: find pos and unlock
      const pos = await genesis.findPos(tokenIds[0], erc20.address);
      expect(pos).to.equal(0);
      await erc20.unlockMonkey(tokenIds[0], pos);
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.true;

      // // t4: transfer should work
      await genesis.transferFrom(acc[0].address, acc[1].address, tokenIds[0])
      expect(await genesis.ownerOf(tokenIds[0])).to.equal(acc[1].address);

      // t5: find pos should no longer work after unlock
      await expect(
        genesis.findPos(tokenIds[0], erc20.address)
      ).to.be.revertedWith("Not found");
    });
    it('holders can clear locks if locker contract is removed from approved locker list', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const { erc20 } = await loadFixture(erc20Fixture);
      await erc20.setMonkey(genesis.address);

      const tokenIds = [7];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await genesis.migrate(tokenIds, sig, solSig);
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.true;

      await genesis.updateApprovedContracts([erc20.address], [true]);
      const t1 = await erc20.lockMonkey(tokenIds[0]);
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.false;

      await expect(
        erc20.lockMonkey(tokenIds[0])
      ).to.be.revertedWith('ID already locked by caller')
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.false;
    })
    it('holders can clear locks if locker contract is removed from approved locker list', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const { erc20: approvedLocker } = await loadFixture(erc20Fixture);
      const { erc20: approvedLocker2 } = await loadFixture(erc20Fixture2);
      await approvedLocker.setMonkey(genesis.address);
      await approvedLocker2.setMonkey(genesis.address);

      // mint an NFT
      const tokenId = 7;
      const sig = genMigrateSig([tokenId], acc[0].address, solSig);
      await genesis.migrate([tokenId], sig, solSig);
      expect(await genesis.isUnlocked(tokenId)).to.be.true;

      // lock it twice
      await genesis.updateApprovedContracts([approvedLocker.address, approvedLocker2.address], [true, true]);
      await approvedLocker.lockMonkey(tokenId);
      await approvedLocker2.lockMonkey(tokenId);
      await genesis.locks(tokenId, 0);
      await genesis.locks(tokenId, 1);
      expect(await genesis.isUnlocked(tokenId)).to.be.false;

      // MKLockRegistry.lock[tokenId] should be [approvedLocker, approvedLocker2]
      const pos = await genesis.findPos(tokenId, approvedLocker.address);
      expect(pos).to.equal(0);
      const pos2 = await genesis.findPos(tokenId, approvedLocker2.address)
      expect(pos2).to.equal(1);

      // test approvedLocker unlock, this is the if case for MKLockRegistry.unlock()
      await approvedLocker.unlockMonkey(tokenId, pos);

      // MKLockRegistry.lock[tokenId] should be [approved2Locker]
      expect(
        await genesis.findPos(tokenId, approvedLocker2.address)
      ).to.equal(0);
      await expect(
        genesis.locks(tokenId, 1)
      ).to.be.reverted;

      // MKLockRegistry.lock[tokenId] should be [approved2Locker, approvedLocker]
      await approvedLocker.lockMonkey(tokenId);
      expect(
        await genesis.findPos(tokenId, approvedLocker.address)
      ).to.equal(1);

      // attempt from user to clear the lock should fail if the locker is still in approved list
      await expect(
        genesis.clearLockId(tokenId, pos)
      ).to.be.revertedWith('Access denied')

      // removed approvedLocker from approved list, so user should be able to clear lock for themself
      await genesis.updateApprovedContracts([approvedLocker.address, approvedLocker2.address], [false, false]);
      await genesis.clearLockId(tokenId, 0);
      // await genesis.clearLockId(tokenId, 1);

      // undo clearLockId for next test
      await genesis.updateApprovedContracts([approvedLocker.address, approvedLocker2.address], [true, true]);
      await approvedLocker2.lockMonkey(tokenId);

      // MKLockRegistry.lock[tokenId] should be [approvedLocker, approvedLocker2]
      expect(
        await genesis.findPos(tokenId, approvedLocker.address)
      ).to.equal(0);
      expect(
        await genesis.findPos(tokenId, approvedLocker2.address)
      ).to.equal(1);
      await genesis.updateApprovedContracts([approvedLocker.address, approvedLocker2.address], [false, false]);
      await genesis.clearLockId(tokenId, 0);
      await genesis.clearLockId(tokenId, 0);
      expect(await genesis.isUnlocked(tokenId)).to.be.true;
    })

    it('update approved contract checks', async () => {
      const { genesis } = await loadFixture(genesisFixture);
      const { erc20: approvedLocker } = await loadFixture(erc20Fixture);
      const { erc20: approvedLocker2 } = await loadFixture(erc20Fixture2);
      const { erc20: unapprovedLocker } = await loadFixture(erc20Fixture3);
      await approvedLocker.setMonkey(genesis.address);
      await approvedLocker2.setMonkey(genesis.address);
      await unapprovedLocker.setMonkey(genesis.address);
      await genesis.updateApprovedContracts([approvedLocker.address, approvedLocker2.address], [true, true])
      const tokenIds = [7];
      const sig = genMigrateSig(tokenIds, acc[0].address, solSig);
      await genesis.migrate(tokenIds, sig, solSig);
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.true;

      await expect(
        genesis.updateApprovedContracts([approvedLocker.address], [])
      ).to.be.revertedWith(
        '!length'
      );

      await expect(
        approvedLocker.unlockMonkey(tokenIds[0], 0)
      ).to.be.revertedWithPanic('0x32')

      await approvedLocker.lockMonkey(tokenIds[0]);
      expect(await genesis.locks(tokenIds[0], 0)).to.equal(approvedLocker.address);
      await approvedLocker2.lockMonkey(tokenIds[0]);
      expect(await genesis.locks(tokenIds[0], 1)).to.equal(approvedLocker2.address);
      const pos = await genesis.findPos(tokenIds[0], approvedLocker.address);
      expect(pos).to.equal(0);
      const pos2 = await genesis.findPos(tokenIds[0], approvedLocker2.address);
      expect(pos2).to.equal(1);

      expect(
        await genesis.findPos(tokenIds[0], approvedLocker.address)
      ).to.equal(0);

      await genesis.updateApprovedContracts([approvedLocker.address], [false]);
      expect(
        await genesis.findPos(tokenIds[0], approvedLocker.address)
      ).to.equal(0);
      expect(await genesis.isUnlocked(tokenIds[0])).to.be.false;

      await expect(
        unapprovedLocker.lockMonkey(tokenIds[0])
      ).to.be.revertedWith('Access denied')

      await expect(
        unapprovedLocker.unlockMonkey(tokenIds[0], 0)
      ).to.be.revertedWith('Access denied')

      // expect(await genesis.locks(tokenIds[0], 0)).to.equal(approvedLocker.address);
      // await genesis.updateApprovedContracts([approvedLocker.address], [true]);
      // await approvedLocker.unlockMonkey(tokenIds[0], 0)
      // expect(await genesis.isUnlocked(tokenIds[0])).to.be.true;
    })
  });
});
