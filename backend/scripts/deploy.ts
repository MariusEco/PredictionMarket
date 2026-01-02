import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect({ network: "localhost", chainType: "l1" });

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const LiquidityPool = await ethers.deployContract("LiquidityPool");
    await LiquidityPool.waitForDeployment();

    const PredictionMarket = await ethers.deployContract(
        "PredictionMarket",
        [await LiquidityPool.getAddress()]
    );
    await PredictionMarket.waitForDeployment();

    const SportsOracle = await ethers.deployContract("SportsOracle");
    await SportsOracle.waitForDeployment();

    await LiquidityPool.setPredictionMarket(await PredictionMarket.getAddress());
    await PredictionMarket.setSportsOracle(await SportsOracle.getAddress());

    console.log("LiquidityPool:", await LiquidityPool.getAddress());
    console.log("PredictionMarket:", await PredictionMarket.getAddress());
    console.log("SportsOracle:", await SportsOracle.getAddress());
}

main().catch(console.error);