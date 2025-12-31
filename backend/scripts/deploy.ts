import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect({ network: "localhost", chainType: "l1" });

    const [deployer, oracle] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    console.log("Oracle account:", oracle.address);

    console.log("\nDeploying LiquidityPool...");
    const LiquidityPoolFactory: any = await ethers.deployContract("LiquidityPool");
    await LiquidityPoolFactory.waitForDeployment();
    const poolAddress = await LiquidityPoolFactory.getAddress();
    console.log("LiquidityPool deployed at:", poolAddress);

    console.log("\nDeploying PredictionMarket...");
    const PredictionMarketFactory: any = await ethers.deployContract("PredictionMarket", [poolAddress]);
    await PredictionMarketFactory.waitForDeployment();
    const predictionAddress = await PredictionMarketFactory.getAddress();
    console.log("PredictionMarket deployed at:", predictionAddress);

    const lpWithSigner: any = LiquidityPoolFactory.connect(deployer);
    const tx1 = await lpWithSigner.setPredictionMarket(predictionAddress);
    await tx1.wait();
    console.log("PredictionMarket set in LiquidityPool");

    const pmWithSigner: any = PredictionMarketFactory.connect(deployer);
    const tx2 = await pmWithSigner.setOracle(oracle.address);
    await tx2.wait();
    console.log("Oracle set in PredictionMarket:", oracle.address);

}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});