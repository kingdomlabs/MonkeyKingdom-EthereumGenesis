import * as dotenv from "dotenv";

import "hardhat-nodemon";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 20000,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/552ae2cab36942ed9b5e61197df21f5e",
        // blockNumber: 18156160, // pin to a specific block, for cache!
        blockNumber: 18155781, // before DB mig
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        process.env.MAINNET_NEW_OWNER_PRIKEY!,
        process.env.MAINNET_DEPLOYER_PRIKEY!,
        process.env.D535_PRIKEY!,
      ],
    },
    mainnet: {
      url: process.env.MAINNET_RPC,
      accounts: [
        process.env.MAINNET_NEW_OWNER_PRIKEY!,
        process.env.MAINNET_DEPLOYER_PRIKEY!,
      ],
    },
    goerli: {
      url: process.env.GOERLI_RPC,
      accounts:
        process.env.DEPLOYER_PRIKEY !== undefined
          ? [process.env.DEPLOYER_PRIKEY]
          : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 100,
    coinmarketcap: process.env.COINMARKETCAP_KEY,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
