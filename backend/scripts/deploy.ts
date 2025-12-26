import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect({
        network: "localhost",
        chainType: "l1",
    });

    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);

    console.log("\nDeploying LiquidityPool...");
    const LiquidityPool = await ethers.deployContract("LiquidityPool");
    await LiquidityPool.waitForDeployment();

    const poolAddress = await LiquidityPool.getAddress();
    console.log("LiquidityPool deployed at:", poolAddress);

    console.log("\nDeploying PredictionMarket...");
    const PredictionMarket = await ethers.deployContract("PredictionMarket", [poolAddress]);
    await PredictionMarket.waitForDeployment();

    const predictionAddress = await PredictionMarket.getAddress();
    console.log("PredictionMarket deployed at:", predictionAddress);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});