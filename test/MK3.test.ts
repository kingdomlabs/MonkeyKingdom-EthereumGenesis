import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import "@nomiclabs/hardhat-waffle";
import { expect } from "chai";
import { deployContract } from "ethereum-waffle";
import { parseEther } from "ethers/lib/utils";
import { ethers, waffle } from "hardhat";
import DummyToken_ATF from "../artifacts/contracts/DummyERC20.sol/DummyToken.json";
import Monkey_ATF from "../artifacts/contracts/MonkeyLegends.sol/MonkeyLegends.json";
import { DummyToken, MonkeyLegends } from "../typechain";
import whitelist from "./whitelist.json";
import "dotenv/config";

const { loadFixture } = waffle;

const signerAddr: string = process.env.AUTH_SIGNER_PUBKEY as string;
const signerPriKey: string = process.env.AUTH_SIGNER_PRIKEY as string;
const ethersSigner = new ethers.utils.SigningKey(signerPriKey);
let acc: SignerWithAddress[];

const genBreedSig = (data: string[], address: string) => {
  const msg = ethers.utils.solidityKeccak256(
    ["string[]", "address"],
    [data, address]
  );

  return ethers.utils.joinSignature(ethersSigner.signDigest(msg));
};
const genWhitelistSig = (tier: number, address: string) => {
  const msg = ethers.utils.solidityKeccak256(
    ["uint256", "address"],
    [tier, address]
  );

  return ethers.utils.joinSignature(ethersSigner.signDigest(msg));
};

describe("MonkeyLegends", () => {
  async function fixture() {
    const acc = await ethers.getSigners();
    const claimPrice = parseEther("1");
    const peach = <DummyToken>(
      await deployContract(acc[0], DummyToken_ATF, [
        ethers.constants.MaxUint256,
      ])
    );
    const peach2 = <DummyToken>(
      await deployContract(acc[0], DummyToken_ATF, [
        ethers.constants.MaxUint256,
      ])
    );
    const monkey = (await deployContract(acc[0], Monkey_ATF, [
      peach.address,
      signerAddr,
    ])) as MonkeyLegends;
    const numReserve = (await monkey.NUM_RESERVED()).toNumber();
    const price = await monkey.mintPrice();
    await peach.increaseAllowance(monkey.address, ethers.constants.MaxUint256);
    return { peach, monkey, price, peach2, numReserve };
  }

  before(async () => {
    const f = await loadFixture(fixture);
    acc = await ethers.getSigners();
  });

  describe("marketing", () => {
    it("mint reserves into owner wallet when contract deploy", async () => {
      const { monkey, price, peach, numReserve } = await loadFixture(fixture);
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve);
    });
    it("marketing reserve count towards total supply", async () => {
      const { monkey, price, peach, numReserve } = await loadFixture(fixture);
      expect(await monkey.totalSupply()).to.equal(numReserve);
    });
  });

  describe(`breeding`, () => {
    it("breed", async () => {
      const { monkey, numReserve } = await loadFixture(fixture);
      const d1 = ["abc", "def", "ghi"];
      const sig1 = genBreedSig(d1, whitelist[0]);
      await monkey.breed(d1[0], d1[1], d1[2], sig1);
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);
    });

    it("count towards total supply", async () => {
      const { monkey, numReserve } = await loadFixture(fixture);
      const d1 = ["abc", "def", "ghi"];
      const sig1 = genBreedSig(d1, whitelist[0]);
      await monkey.breed(d1[0], d1[1], d1[2], sig1);
      expect(await monkey.totalSupply()).to.equal(numReserve + 1);
    });

    it("invalid sig breed fails", async () => {
      const { monkey } = await loadFixture(fixture);
      const d1 = ["abc", "def", "ghi"];
      const sig1 = genBreedSig(d1, whitelist[1]);
      await expect(monkey.breed(d1[0], d1[1], d1[2], sig1)).to.be.revertedWith(
        "Invalid sig"
      );
    });

    it("can't double-submit breeding request", async () => {
      const { monkey, numReserve } = await loadFixture(fixture);
      const d1 = ["abc", "def", "ghi"];
      const sig1 = genBreedSig(d1, whitelist[0]);

      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve);
      await monkey.breed(d1[0], d1[1], d1[2], sig1);
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);
      await expect(monkey.breed(d1[0], d1[1], d1[2], sig1)).to.be.revertedWith(
        "Peach has been used"
      );
    });

    it("breeding restricted to twice per monkey", async () => {
      const { monkey, numReserve } = await loadFixture(fixture);
      {
        const d1 = ["abc", "def", "ghi"];
        const sig1 = genBreedSig(d1, whitelist[0]);
        await monkey.breed(d1[0], d1[1], d1[2], sig1);

        const d2 = ["abc", "def", "ghij"];
        const sig2 = genBreedSig(d2, whitelist[0]);
        await monkey.breed(d2[0], d2[1], d2[2], sig2);

        expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 2);

        const d3 = ["abc", "efg", "ghijj"];
        const sig3 = genBreedSig(d3, whitelist[0]);
        await expect(
          monkey.breed(d3[0], d3[1], d3[2], sig3)
        ).to.be.revertedWith("Wukong breed twice");

        expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 2);
      }
    });

    it("breeding restricted to once per peach", async () => {
      const { monkey, numReserve } = await loadFixture(fixture);
      {
        const d1 = ["abc", "def", "ghi"];
        const sig1 = genBreedSig(d1, whitelist[0]);
        await monkey.breed(d1[0], d1[1], d1[2], sig1);

        expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);

        const d3 = ["abc", "efg", "ghi"];
        const sig3 = genBreedSig(d3, whitelist[0]);
        await expect(
          monkey.breed(d3[0], d3[1], d3[2], sig3)
        ).to.be.revertedWith("Peach has been used");

        expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);
      }
    });
    it.skip("max breeding limit", async () => {
      // when MAX_BREED = 5
      const { monkey } = await loadFixture(fixture);
      const promises = [];
      let i = 0;
      for (; i < 5; i++) {
        const d1 = ["mk" + i, "db" + i, "peach" + i];
        const sig = genBreedSig(d1, whitelist[0]);
        promises.push(monkey.breed(d1[0], d1[1], d1[2], sig));
      }
      await Promise.all(promises);

      {
        const d1 = ["mk" + i, "db" + i, "peach" + i];
        const sig1 = genBreedSig(d1, whitelist[0]);
        await expect(
          monkey.breed(d1[0], d1[1], d1[2], sig1)
        ).to.be.revertedWith("Max no. breed reached");
      }
    }).timeout(100000);
  });

  describe("whitelist minting", () => {
    it("mint price checking", async () => {
      const { monkey, price, numReserve } = await loadFixture(fixture);

      const tier = 1;
      const sig = genWhitelistSig(tier, acc[0].address);
      await expect(
        monkey.mintSignedWhitelist(tier, sig, { value: price.sub("1") })
      ).to.be.revertedWith("Insufficient ETH");
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve);

      await expect(
        await monkey.mintSignedWhitelist(tier, sig, { value: price })
      ).to.changeEtherBalances([acc[0], monkey], [price.mul(-1), price]);
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);
    });
    it("sig valid only to intended user", async () => {
      const { monkey, price, numReserve } = await loadFixture(fixture);
      const tier = 1;
      const sig = genWhitelistSig(tier, acc[0].address);
      await expect(
        monkey.connect(acc[1]).mintSignedWhitelist(tier, sig, { value: price })
      ).to.revertedWith("Invalid sig");

      await monkey.mintSignedWhitelist(tier, sig, { value: price });
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);
    });
    it("sig valid only to intended tier", async () => {
      const { monkey, price, numReserve } = await loadFixture(fixture);
      const tier = 2;
      const sig = genWhitelistSig(tier, acc[0].address);
      await expect(
        monkey.mintSignedWhitelist(tier, sig, { value: price })
      ).to.revertedWith("Invalid tier");

      await monkey.setCurrentWhitelistTier(tier);
      await monkey.mintSignedWhitelist(tier, sig, { value: price });
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);

      await monkey.setCurrentWhitelistTier(tier + 1);
      await expect(monkey.mintSignedWhitelist(tier, sig)).to.revertedWith(
        "Invalid tier"
      );
    });
    it("whitelisted wallet can mint only once during intended tier", async () => {
      const { monkey, price } = await loadFixture(fixture);
      const tier = 1;
      const sig = genWhitelistSig(tier, acc[0].address);

      await monkey.mintSignedWhitelist(tier, sig, { value: price });
      await expect(
        monkey.mintSignedWhitelist(tier, sig, { value: price })
      ).to.revertedWith("Whitelist quota used");
    });

    it("wallet can mint again when tier changes", async () => {
      const { monkey, price, numReserve } = await loadFixture(fixture);
      let tier = 1;

      const sig = genWhitelistSig(tier, acc[0].address);
      await monkey.mintSignedWhitelist(tier, sig, { value: price });
      await expect(
        monkey.mintSignedWhitelist(tier, sig, { value: price })
      ).to.revertedWith("Whitelist quota used");

      tier++;
      await monkey.setCurrentWhitelistTier(tier);
      const sig2 = genWhitelistSig(tier, acc[0].address);
      await monkey.mintSignedWhitelist(tier, sig2, { value: price });
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 2);
    });

    it("minting update counter", async () => {
      const { monkey, price } = await loadFixture(fixture);
      const tier = 1;
      const sig = genWhitelistSig(tier, acc[0].address);

      await monkey.mintSignedWhitelist(tier, sig, { value: price });
      expect(await monkey.numWhitelistMint()).to.equal(1);
    });
    it("only owner can advance tier", async () => {
      const { monkey } = await loadFixture(fixture);
      const tier = 2;
      await expect(
        monkey.connect(acc[2]).setCurrentWhitelistTier(tier)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await monkey.setCurrentWhitelistTier(tier);
      expect(await monkey.currentWhitelistTier()).to.equal(tier);

      await expect(monkey.setCurrentWhitelistTier(tier - 1)).to.be.revertedWith(
        "tier can only go up"
      );
    });
    it.skip("max whitelist mint limit", async () => {
      // MAX_WHITELIST_MINT = 5
      const { monkey, price } = await loadFixture(fixture);
      const tier = 1;
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const sig = genWhitelistSig(tier, acc[i].address);
        promises.push(
          monkey
            .connect(acc[i])
            .mintSignedWhitelist(tier, sig, { value: price })
        );
      }
      await Promise.all(promises);

      const sig = genWhitelistSig(tier, acc[5].address);

      await expect(
        monkey.connect(acc[5]).mintSignedWhitelist(tier, sig, { value: price })
      ).to.be.revertedWith("Whitelist mint finished");

      expect(await monkey.numWhitelistMint()).to.equal(5);
    });
  });

  describe("claiming", () => {
    it("can't claim until open", async () => {
      const { monkey, numReserve } = await loadFixture(fixture);
      await expect(monkey.claim(1)).to.be.revertedWith("Claiming not open");
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve);
    });

    it("can claim gen3 with $peach", async () => {
      const { monkey, numReserve } = await loadFixture(fixture);
      const claimPrice = parseEther("1");
      await monkey.setClaimPrice(claimPrice);
      await monkey.claim(1);
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 1);
    });

    it("claiming takes correct amount of $PEACH for claim one, claim two", async () => {
      const { monkey, peach, numReserve } = await loadFixture(fixture);
      const claimPrice = parseEther("1");
      await monkey.setClaimPrice(claimPrice);

      {
        const n = 1;
        await expect(() => monkey.claim(n)).to.changeTokenBalances(
          peach,
          [acc[0], monkey],
          [claimPrice.mul(-1).mul(n), claimPrice.mul(n)]
        );
      }

      {
        const n = 2;
        await expect(() => monkey.claim(n)).to.changeTokenBalances(
          peach,
          [acc[0], monkey],
          [claimPrice.mul(-1).mul(n), claimPrice.mul(n)]
        );
      }
      expect(await monkey.balanceOf(acc[0].address)).to.equal(numReserve + 3);
    });

    it("insufficient peach allowance reverts", async () => {
      const { monkey, peach } = await loadFixture(fixture);
      const claimPrice = parseEther("1");
      await monkey.setClaimPrice(claimPrice);

      await peach.transfer(acc[1].address, claimPrice);
      await expect(monkey.connect(acc[1]).claim(1)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("insufficient peach balance reverts", async () => {
      const { monkey, peach } = await loadFixture(fixture);
      const claimPrice = parseEther("1");
      await monkey.setClaimPrice(claimPrice);

      await peach.transfer(acc[1].address, claimPrice.sub(1));
      await peach.connect(acc[1]).increaseAllowance(monkey.address, claimPrice);
      await expect(monkey.connect(acc[1]).claim(1)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("only owner can set claim price", async () => {
      const { monkey, peach } = await loadFixture(fixture);
      await expect(
        monkey.connect(acc[2]).setClaimPrice(parseEther("10"))
      ).to.be.revertedWith("Ownable: caller is not the owner");

      const price = parseEther("3");
      await monkey.setClaimPrice(price);
      expect(await monkey.claimPrice()).to.equal(price);
    });

    it("excess quota from whitelist minting goes to claiming");
  });

  describe("misc", () => {
    it("only owner can withdraw earnings", async () => {
      const { monkey, price } = await loadFixture(fixture);

      let tier = 1;
      const sig = genWhitelistSig(tier, acc[0].address);
      await monkey.mintSignedWhitelist(tier, sig, { value: price });

      await expect(monkey.connect(acc[2]).withdrawAll()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await expect(await monkey.withdrawAll()).to.changeEtherBalances(
        [monkey, acc[0]],
        [price.mul(-1), price]
      );
    });

    it("baseURI default", async () => {
      const { monkey, price } = await loadFixture(fixture);

      let tier = 1;
      const sig = genWhitelistSig(tier, acc[0].address);
      await monkey.mintSignedWhitelist(tier, sig, { value: price });

      expect(await monkey.tokenURI(0)).to.equal(
        "https://meta.monkeykingdom.io/3/0"
      );
    });

    it("only owner can setbaseuri", async () => {
      const { monkey } = await loadFixture(fixture);
      const baseURI = "https://meta.monkeykingdom.io/3/";
      await monkey.setBaseURI(baseURI);
      expect(await monkey.tokenURI(0)).to.equal(baseURI + 0);

      const baseURI2 = "https://meta.monkeykingdom.io/3_2/";
      await monkey.setBaseURI(baseURI2);
      await expect(monkey.connect(acc[1]).setBaseURI("")).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      expect(await monkey.tokenURI(0)).to.equal(baseURI2 + 0);
    });
  });

  describe("rename gen3", async () => {
    it("allow 0x20-0x0x7e", async () => {
      const { monkey, price } = await loadFixture(fixture);
      const strings = [
        " !\"#$%&'()*+`-./0123456789:;<=>?",
        "@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_",
        "`abcdefghijklmnopqrstuvwxyz{|}~",
      ];
      for (let i = 0; i < strings.length; i++) {
        await monkey.rename(0, strings[i]);
        expect(await monkey.tokenName(0)).to.equal(strings[i]);
      }
    });

    it("allow asian chars in name", async () => {
      const { monkey, price } = await loadFixture(fixture);
      // thai, vietnamese, chinese, tamil, jap
      const strings = [
        "ประเทศไทย",
        "Việt Nam",
        "中文",
        "தமிழ்",
        "ウィキペディア",
      ];
      for (let i = 0; i < strings.length; i++) {
        await monkey.rename(0, strings[i]);
        expect(await monkey.tokenName(0)).to.equal(strings[i]);
      }
    });

    it("can only rename your own NFT", async () => {
      const { monkey, price } = await loadFixture(fixture);
      await expect(monkey.connect(acc[1]).rename(0, "123")).to.be.revertedWith(
        "hi"
      );
    });

    it("insufficient peach allowance reverts", async () => {
      const { monkey, price, peach, numReserve } = await loadFixture(fixture);
      const tokenId = 0;
      await peach.transfer(acc[1].address, await monkey.renamePrice());
      await monkey.transferFrom(acc[0].address, acc[1].address, tokenId);
      expect(await monkey.ownerOf(tokenId)).to.equal(acc[1].address);
      await expect(
        monkey.connect(acc[1]).rename(tokenId, "123")
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("insufficient peach balance reverts", async () => {
      const { monkey, price, peach, numReserve } = await loadFixture(fixture);
      const tokenId = 0;
      const renamePrice = await monkey.renamePrice();
      await peach.transfer(acc[1].address, renamePrice.sub(1));
      await monkey.transferFrom(acc[0].address, acc[1].address, tokenId);
      await peach
        .connect(acc[1])
        .increaseAllowance(monkey.address, ethers.constants.MaxUint256);
      await expect(
        monkey.connect(acc[1]).rename(tokenId, "123")
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("charges rename fee", async () => {
      const { monkey, price, peach } = await loadFixture(fixture);
      let tier = 1;
      const renamePrice = await monkey.renamePrice();
      const sig = genWhitelistSig(tier, acc[0].address);
      await monkey.mintSignedWhitelist(tier, sig, { value: price });
      await expect(() => monkey.rename(0, "123")).to.changeTokenBalances(
        peach,
        [acc[0], monkey],
        [renamePrice.mul(-1), renamePrice]
      );
    });

  });

  describe("locking", () => {
    it("only owner can add new lockers, lock limits transfer, unlock works", async () => {
      const { monkey, price, peach } = await loadFixture(fixture);
      const peaches = [
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
        <DummyToken>(
          await deployContract(acc[0], DummyToken_ATF, [
            ethers.constants.MaxUint256,
          ])
        ),
      ];
      await Promise.all(peaches.map((p) => p.setMonkey(monkey.address)));
      await monkey.updateApprovedContracts(
        peaches.map((p) => p.address),
        peaches.map((p) => true)
      );

      let tier = 1;
      const sig = genWhitelistSig(tier, acc[0].address);
      await monkey.mintSignedWhitelist(tier, sig, { value: price });

      const tokenId = 0;
      await Promise.all(
        peaches.map((p) => p.lockMonkey(tokenId, { gasLimit: 300000 }))
      );

      expect(await monkey.isUnlocked(tokenId)).to.be.false;

      await expect(
        monkey.transferFrom(acc[0].address, acc[1].address, tokenId)
      ).to.be.revertedWith("Token locked");

      {
        await monkey.updateApprovedContracts(
          peaches.map((p) => p.address),
          peaches.map((v, i) => i >= 2)
        );

        const idx = [0, 1];
        await Promise.all(idx.map((i) => monkey.clearLockId(tokenId, i)));
      }

      for (let i = 2; i < 10; i++) {
        const pos = await monkey.findPos(tokenId, peaches[i].address);
        let tx = await peaches[i].unlockMonkey(tokenId, pos);
        await tx.wait();
      }

      expect(await monkey.isUnlocked(tokenId)).to.be.true;
      await monkey.transferFrom(acc[0].address, acc[1].address, tokenId);
      expect(await monkey.ownerOf(tokenId)).to.equal(acc[1].address);

      await expect(monkey.findPos(0, peach.address)).to.be.revertedWith(
        "Not found"
      );
    });
  });
});
