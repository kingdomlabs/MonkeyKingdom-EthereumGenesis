import {utils} from "ethers"

export const genMigrateSig = (tokenIds: number[], address: string, solSig: string) => {
    const signerPriKey: string = process.env.AUTH_SIGNER_PRIKEY as string;
    const ethersSigner = new utils.SigningKey(signerPriKey);
    const packed = utils.defaultAbiCoder.encode(
        ["uint256[]", "address", "string"],
        [tokenIds, address, solSig]
    );

    const msg = utils.keccak256(packed);
    const sig0 = ethersSigner.signDigest(msg)
    const sig1 = utils.joinSignature(sig0);
    return sig1
};