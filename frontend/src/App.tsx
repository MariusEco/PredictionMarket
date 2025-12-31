import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import { connectLiquidityPool, connectPredictionMarket } from "./utils/contractUtils";

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [lpContract, setLpContract] = useState<any>(null);
  const [pmContract, setPmContract] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0");
  const [betAmount, setBetAmount] = useState<string>("0");
  const [betOutcome, setBetOutcome] = useState<number>(0);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [oracleAddress, setOracleAddress] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [totalLiquidity, setTotalLiquidity] = useState<string>("0");
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);

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

        console.log("Wallet and contracts connected:", address);

        updateBalances(lp, address);
        setupEventListeners(lp, pm, address);
      } catch (err) {
        console.error(err);
        alert("Error connecting wallet or contracts");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const updateBalances = async (lp: any, addr: string) => {
    try {
      const balance = await lp.getBalance(addr);
      const total = await lp.totalLiquidity();
      setUserBalance(ethers.formatEther(balance));
      setTotalLiquidity(ethers.formatEther(total));
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  };

  const setupEventListeners = (lp: any, pm: any, addr: string) => {
    lp.on("Deposited", (user: string, amount: bigint) => {
      console.log(`Deposited: ${user} deposited ${ethers.formatEther(amount)} ETH`);
      if (user.toLowerCase() === addr.toLowerCase()) {
        updateBalances(lp, addr);
      }
    });

    lp.on("Withdrawn", (user: string, amount: bigint) => {
      console.log(`Withdrawn: ${user} withdrew ${ethers.formatEther(amount)} ETH`);
      if (user.toLowerCase() === addr.toLowerCase()) {
        updateBalances(lp, addr);
      }
    });

    pm.on("BetPlaced", (_eventId: bigint, bettor: string, amount: bigint, outcome: number) => {
      console.log(`BetPlaced: ${bettor} placed ${ethers.formatEther(amount)} ETH on outcome ${outcome}`);
    });

    pm.on("Payout", (_eventId: bigint, bettor: string, amount: bigint) => {
      console.log(`Payout: ${bettor} won ${ethers.formatEther(amount)} ETH`);
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
      alert("Deposit successful!");
    } catch (err) {
      console.error(err);
      alert("Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!lpContract || !account) return;
    try {
      const tx = await lpContract.withdraw(ethers.parseEther(withdrawAmount));
      await tx.wait();
      alert("Withdraw successful!");
    } catch (err) {
      console.error(err);
      alert("Withdraw failed");
    }
  };

  const handlePlaceBet = async () => {
    if (!pmContract || selectedOutcome === null) return;
    try {
      const tx = await pmContract.placeBet(1, selectedOutcome, { value: ethers.parseEther(betAmount) });
      await tx.wait();
      alert("Bet placed!");
      setSelectedOutcome(null);
    } catch (err) {
      console.error(err);
      alert("Bet failed");
    }
  };

  const handleOracleSetWinner = async () => {
    if (!pmContract || !oracleAddress || account?.toLowerCase() !== oracleAddress.toLowerCase()) {
      alert("Only the Oracle can set the winner!");
      return;
    }
    try {
      const tx = await pmContract.setWinningOutcome(1, 0);
      await tx.wait();
      alert("Oracle set the winner!");
    } catch (err) {
      console.error(err);
      alert("Error setting winning outcome");
    }
  };

  return (
    <div className="app">
      {!account ? (
        <div className="landing">
          <div className="logo-large">BETCHAIN</div>
          <button className="button-primary" onClick={connectWalletAndContracts}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="header">
            <div className="logo">BETCHAIN</div>
            <div className="wallet">{account}</div>
          </div>

          {/* BALANCES */}
          <div className="card balance">
            <div>
              <span>Your Pool Balance</span>
              <strong>{userBalance} ETH</strong>
            </div>
            <div>
              <span>Total Liquidity</span>
              <strong>{totalLiquidity} ETH</strong>
            </div>
          </div>

          {/* ODDS */}
          <div className="card">
            <h2>Match Odds (1X2)</h2>
            <div className="odds">
              <button
                className={`odd ${selectedOutcome === 0 ? "active" : ""}`}
                onClick={() => setSelectedOutcome(selectedOutcome === 0 ? null : 0)}
              >
                <span>1</span>
                <strong>2.00</strong>
              </button>
              <button
                className={`odd ${selectedOutcome === 1 ? "active" : ""}`}
                onClick={() => setSelectedOutcome(selectedOutcome === 1 ? null : 1)}
              >
                <span>X</span>
                <strong>3.20</strong>
              </button>
              <button
                className={`odd ${selectedOutcome === 2 ? "active" : ""}`}
                onClick={() => setSelectedOutcome(selectedOutcome === 2 ? null : 2)}
              >
                <span>2</span>
                <strong>3.80</strong>
              </button>
            </div>
          </div>

          {/* BET SLIP */}
          {selectedOutcome !== null && (
            <div className="bet-slip">
              <h2>Bet Slip</h2>
              <p>
                Selected outcome:{" "}
                <strong>
                  {selectedOutcome === 0 ? "1" : selectedOutcome === 1 ? "X" : "2"}
                </strong>
              </p>

              <input
                className="input"
                type="text"
                placeholder="Stake (ETH)"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />

              <button className="button-primary" onClick={handlePlaceBet}>
                Place Bet
              </button>
            </div>
          )}

          {/* DEPOSIT */}
          <div className="card">
            <h2>Liquidity Pool</h2>

            <input
              className="input"
              placeholder="Deposit ETH"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <button className="button-secondary" onClick={handleDeposit}>
              Deposit
            </button>

            <input
              className="input"
              placeholder="Withdraw ETH"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              style={{ marginTop: "12px" }}
            />
            <button className="button-secondary" onClick={handleWithdraw}>
              Withdraw
            </button>
          </div>

          {/* ORACLE */}
          {oracleAddress === account && (
            <div className="card oracle">
              <h2>Oracle Control</h2>
              <button className="button-warning" onClick={handleOracleSetWinner}>
                Set Winning Outcome
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;