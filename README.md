# Monkey Kingdom Genesis NFT on Ethereum

## Upgrade system

Remember all the caveats of the upgrade system, then:

1. determine the last version, `o`, let `n = o+1`
1. create a new MKGenesisV`n`.sol
    1. `contract MKGenesisV`n`  is  `MKGenesisV`o`
    1. clear contract body, for the new contract inherits everything from its parent and has all vars defined in previous version in correct order.
    1. if a new initializing function is required, create a `function initializeV`n`() public virtual reinitializer(`n`) {}`
1. `cp 'scripts/deployV`o`.ts' to 'scripts/deployV`n`.ts'`, increment `CONTRACT_VERSION`
1. if an initialize function was added, make sure to invoke it with proper args in deploy script
1. `yarn hardhat --network xx run scripts/deployV`n`.ts`
1. The deploy script will automatically add artifacts & openzeppelin data to git

## Deployment

1. `cp .env.sample .env` and populate all vars
1. `yarn hardhat --network xx run scripts/deployV1.ts`