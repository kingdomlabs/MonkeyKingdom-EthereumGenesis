import { BigNumberish, utils } from "ethers";
import { SigningKey } from "ethers/lib/utils";
import { ethers } from "hardhat";

export const genMigrateSig = (
  tokenIds: number[],
  address: string,
  solSig: string
) => {
  const signerPriKey: string = process.env.AUTH_SIGNER_PRIKEY as string;
  const ethersSigner = new utils.SigningKey(signerPriKey);
  const packed = utils.defaultAbiCoder.encode(
    ["uint256[]", "address", "string"],
    [tokenIds, address, solSig]
  );

  const msg = utils.keccak256(packed);
  const sig0 = ethersSigner.signDigest(msg);
  const sig1 = utils.joinSignature(sig0);
  return sig1;
};

export const genStakingSig = (
  tokenIds: BigNumberish[],
  staker: string,
  ts: number,
  ethersSigner: SigningKey
) => {
  const msg = ethers.utils.solidityKeccak256(
    [`uint256[${tokenIds.length}]`, "address", "uint256"],
    [tokenIds, staker, ts]
  );
  return ethers.utils.joinSignature(ethersSigner.signDigest(msg));
};
