import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { connectLiquidityPool, connectPredictionMarket } from "./utils/contractUtils";

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [lpContract, setLpContract] = useState<any>(null);
  const [pmContract, setPmContract] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [betAmount, setBetAmount] = useState<string>("0");
  const [betOutcome, setBetOutcome] = useState<number>(0);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [oracleAddress, setOracleAddress] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [totalLiquidity, setTotalLiquidity] = useState<string>("0");

  const liquidityPoolAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const predictionMarketAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const connectWalletAndContracts = async () => {
    if ((window as any).ethereum) {
      try {
        const prov = new ethers.BrowserProvider((window as any).ethereum);
        await prov.send("eth_requestAccounts", []);
        setProvider(prov);

        const signer = await prov.getSigner();
        const address = await signer.getAddress();
        setAccount(address);

        const lp = await connectLiquidityPool(prov, liquidityPoolAddress);
        const pm = await connectPredictionMarket(prov, predictionMarketAddress);

        setLpContract(lp);
        setPmContract(pm);

        const ownerAddr = await pm.owner();
        setOwnerAddress(ownerAddr);

        const oracleAddr = await pm.oracle();
        setOracleAddress(oracleAddr);

        console.log("Wallet și contracte conectate:", address);

        updateBalances(lp, address);
        setupEventListeners(lp, pm, address);
      } catch (err) {
        console.error(err);
        alert("Eroare la conectare wallet sau contracte");
      }
    } else {
      alert("Instalează MetaMask!");
    }
  };

  const updateBalances = async (lp: any, addr: string) => {
    try {
      const balance = await lp.getBalance(addr);
      const total = await lp.totalLiquidity();
      setUserBalance(ethers.formatEther(balance));
      setTotalLiquidity(ethers.formatEther(total));
    } catch (err) {
      console.error("Eroare la fetch balanțe:", err);
    }
  };

  const setupEventListeners = (lp: any, pm: any, addr: string) => {
    lp.on("Deposited", (user: string, amount: bigint) => {
      console.log(`Deposited: ${user} a depus ${ethers.formatEther(amount)} ETH`);
      if (user.toLowerCase() === addr.toLowerCase()) {
        updateBalances(lp, addr);
      }
    });

    lp.on("Withdrawn", (user: string, amount: bigint) => {
      console.log(`Withdrawn: ${user} a retras ${ethers.formatEther(amount)} ETH`);
      if (user.toLowerCase() === addr.toLowerCase()) {
        updateBalances(lp, addr);
      }
    });

    pm.on("BetPlaced", (_eventId: bigint, bettor: string, amount: bigint, outcome: number) => {
      console.log(`BetPlaced: ${bettor} a pariat ${ethers.formatEther(amount)} ETH pe outcome ${outcome}`);
    });

    pm.on("Payout", (_eventId: bigint, bettor: string, amount: bigint) => {
      console.log(`Payout: ${bettor} a câștigat ${ethers.formatEther(amount)} ETH`);
      if (bettor.toLowerCase() === addr.toLowerCase()) {
        updateBalances(lp, addr);
      }
    });
  };

  const handleDeposit = async () => {
    if (!lpContract || !account) return;
    try {
      const tx = await lpContract.deposit({ value: ethers.parseEther(depositAmount) });
      await tx.wait();
      alert("Deposit efectuat!");
    } catch (err) {
      console.error(err);
      alert("Deposit eșuat");
    }
  };

  const handlePlaceBet = async () => {
    if (!pmContract) return;
    try {
      const tx = await pmContract.placeBet(1, betOutcome, { value: ethers.parseEther(betAmount) });
      await tx.wait();
      alert("Pariu plasat!");
    } catch (err) {
      console.error(err);
      alert("Pariu eșuat");
    }
  };

  const handleOracleSetWinner = async () => {
    if (!pmContract || !oracleAddress || account?.toLowerCase() !== oracleAddress.toLowerCase()) {
      alert("Doar Oracle-ul poate seta câștigătorul!");
      return;
    }
    try {
      const tx = await pmContract.setWinningOutcome(1, 0);
      await tx.wait();
      alert("Oracle a setat câștigătorul!");
    } catch (err) {
      console.error(err);
      alert("Eroare la setWinningOutcome");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Prediction Market Frontend</h1>

      {account ? (
        <div>
          <p>Wallet conectat: {account}</p>
          <div style={{ marginTop: "10px" }}>
            <p>Balanța ta în Liquidity Pool: {userBalance} ETH</p>
            <p>Total Liquidity în Pool: {totalLiquidity} ETH</p>
          </div>

          {/* Deposit */}
          <div style={{ marginTop: "20px" }}>
            <h2>Deposit ETH în Liquidity Pool</h2>
            <input
              type="text"
              placeholder="Amount in ETH"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <button onClick={handleDeposit}>Deposit</button>
          </div>

          {/* Place Bet */}
          <div style={{ marginTop: "20px" }}>
            <h2>Place Bet</h2>
            <input
              type="text"
              placeholder="Amount in ETH"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
            />
            <input
              type="number"
              placeholder="Outcome (0 or 1)"
              value={betOutcome}
              onChange={(e) => setBetOutcome(Number(e.target.value))}
              min={0}
              max={1}
            />
            <button onClick={handlePlaceBet}>Place Bet</button>
          </div>

          {/* Simulate Oracle */}
          {oracleAddress === account && (
            <div style={{ marginTop: "20px" }}>
              <h2>Simulate Oracle - Set Winner</h2>
              <button onClick={handleOracleSetWinner}>Set Winner (Oracle)</button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={connectWalletAndContracts}>Connect Wallet + Contracts</button>
      )}
    </div>
  );
}

export default App;