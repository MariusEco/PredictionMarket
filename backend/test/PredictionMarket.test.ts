import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Prediction Market system", function () {

    async function deployAll() {
        const [owner, user1, user2] = await ethers.getSigners();

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

        return { owner, user1, user2, LiquidityPool, PredictionMarket, SportsOracle };
    }

    /* -------------------- LIQUIDITY POOL -------------------- */

    it("Should allow users to deposit and withdraw ETH", async function () {
        const { user1, LiquidityPool } = await deployAll();

        await LiquidityPool.connect(user1).deposit({
            value: ethers.parseEther("1")
        });

        expect(await LiquidityPool.getBalance(user1.address))
            .to.equal(ethers.parseEther("1"));

        await LiquidityPool.connect(user1).withdraw(
            ethers.parseEther("0.5")
        );

        expect(await LiquidityPool.getBalance(user1.address))
            .to.equal(ethers.parseEther("0.5"));
    });

    it("Should only allow PredictionMarket to call payout()", async function () {
        const { user1, LiquidityPool } = await deployAll();

        await expect(
            LiquidityPool.connect(user1).payout(user1.address, 1n)
        ).to.be.revertedWith("Only PredictionMarket");
    });

    /* -------------------- SPORTS ORACLE -------------------- */

    it("Owner should set match result via oracle", async function () {
        const { SportsOracle } = await deployAll();

        await expect(
            SportsOracle.setResultFromApi(1, 0)
        ).to.emit(SportsOracle, "ResultUpdated")
            .withArgs(1, 0);

        expect(await SportsOracle.getResult(1)).to.equal(0);
    });

    it("Non-owner should NOT set oracle result", async function () {
        const { user1, SportsOracle } = await deployAll();

        await expect(
            SportsOracle.connect(user1).setResultFromApi(1, 0)
        ).to.be.revertedWithCustomError(
            SportsOracle,
            "OwnableUnauthorizedAccount"
        );
    });

    /* -------------------- PREDICTION MARKET -------------------- */

    it("Should allow users to place bets", async function () {
        const { user1, PredictionMarket } = await deployAll();

        await expect(
            PredictionMarket.connect(user1).placeBet(1, 0, {
                value: ethers.parseEther("0.2")
            })
        ).to.emit(PredictionMarket, "BetPlaced");
    });

    it("Should pay only winning bets after resolving event", async function () {
        const { user1, user2, LiquidityPool, PredictionMarket, SportsOracle } =
            await deployAll();

        // fund liquidity pool
        await LiquidityPool.deposit({
            value: ethers.parseEther("5")
        });

        // user1 bets on outcome 0
        await PredictionMarket.connect(user1).placeBet(1, 0, {
            value: ethers.parseEther("1")
        });

        // user2 bets on outcome 1
        await PredictionMarket.connect(user2).placeBet(1, 1, {
            value: ethers.parseEther("1")
        });

        // oracle sets winning outcome = 0
        await SportsOracle.setResultFromApi(1, 0);

        // resolve event
        await expect(
            PredictionMarket.resolveEvent(1)
        ).to.emit(PredictionMarket, "Payout");

        // liquidity should decrease
        const remainingLiquidity = await LiquidityPool.totalLiquidity();
        expect(remainingLiquidity).to.equal(
            ethers.parseEther("3") // 5 - (1 * 2)
        );
    });

});