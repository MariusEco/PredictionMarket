import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { connectLiquidityPool, connectPredictionMarket, connectSportsOracle } from "./utils/contractUtils";

type Match = {
  id: number;
  home: string;
  away: string;
  time: string;
  score: string;
  minute?: number;
};

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [_, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [lpContract, setLpContract] = useState<any>(null);
  const [pmContract, setPmContract] = useState<any>(null);
  const [oracleContract, setOracleContract] = useState<any>(null);

  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0");
  const [userBalance, setUserBalance] = useState<string>("0");
  const [totalLiquidity, setTotalLiquidity] = useState<string>("0");

  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>("0");
  const [potentialPrize, setPotentialPrize] = useState<string>("0");

  const liquidityPoolAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const predictionMarketAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const sportsOracleAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  const connectWalletAndContracts = async () => {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const prov = new ethers.BrowserProvider((window as any).ethereum);
    await prov.send("eth_requestAccounts", []);
    setProvider(prov);

    const signer = await prov.getSigner();
    const address = await signer.getAddress();
    setAccount(address);

    const lp = await connectLiquidityPool(prov, liquidityPoolAddress);
    const pm = await connectPredictionMarket(prov, predictionMarketAddress);
    const oracle = await connectSportsOracle(prov, sportsOracleAddress);

    setLpContract(lp);
    setPmContract(pm);
    setOracleContract(oracle);

    await updateBalances(lp, address);
    setupEventListeners(lp, pm, address);
    fetchTodayMatches();
  };

  const updateBalances = async (lp: any, addr: string) => {
    const bal = await lp.getBalance(addr);
    const total = await lp.totalLiquidity();
    setUserBalance(ethers.formatEther(bal));
    setTotalLiquidity(ethers.formatEther(total));
  };

  const setupEventListeners = (lp: any, pm: any, addr: string) => {
    lp.on("Deposited", (user: string, _: bigint) => {
      if (user.toLowerCase() === addr.toLowerCase()) {
        updateBalances(lp, addr);
      }
    });

    lp.on("Withdrawn", (user: string, _: bigint) => {
      if (user.toLowerCase() === addr.toLowerCase()) {
        updateBalances(lp, addr);
      }
    });

    pm.on("BetPlaced", (_eventId: bigint, bettor: string, amount: bigint, outcome: number) => {
      console.log(`Bet placed by ${bettor} of ${ethers.formatEther(amount)} ETH on outcome ${outcome}`);
    });

    pm.on("Payout", (_eventId: bigint, bettor: string, amount: bigint) => {
      if (bettor.toLowerCase() === addr.toLowerCase()) {
        console.log(`You won ${ethers.formatEther(amount)} ETH`);
        updateBalances(lp, addr);
      }
    });
  };

  const fetchTodayMatches = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?date=${today}`,
        {
          headers: { "x-apisports-key": import.meta.env.VITE_API_SPORTS_KEY },
        }
      );
      const data = await res.json();

      const ongoing = data.response.filter((m: any) => m.fixture.status.short !== "FT");

      const allMatches: Match[] = ongoing.map((m: any) => {
        const isLive = m.fixture.status.short !== "NS";
        const timeOrLive = isLive
          ? "LIVE"
          : new Date(m.fixture.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Bucharest",
          });
        const score = isLive
          ? `${m.goals.home} - ${m.goals.away}`
          : "0 - 0";

        return {
          id: m.fixture.id,
          home: m.teams.home.name,
          away: m.teams.away.name,
          time: timeOrLive,
          score: score,
          minute: isLive ? m.fixture.status.elapsed : undefined,
        };
      });

      setMatches(allMatches);
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  const handleDeposit = async () => {
    if (!lpContract) return;
    const tx = await lpContract.deposit({ value: ethers.parseEther(depositAmount) });
    await tx.wait();
  };

  const handleWithdraw = async () => {
    if (!lpContract) return;
    const tx = await lpContract.withdraw(ethers.parseEther(withdrawAmount));
    await tx.wait();
  };

  const handlePlaceBet = async () => {
    if (!pmContract || selectedOutcome === null || selectedMatch === null) return;
    const tx = await pmContract.placeBet(selectedMatch, selectedOutcome, { value: ethers.parseEther(betAmount) });
    await tx.wait();
    setSelectedOutcome(null);
    setSelectedMatch(null);
  };

  const resolveEventFromApi = async (matchId: number) => {
    if (!oracleContract || !pmContract) return;

    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
      {
        headers: {
          "x-apisports-key": import.meta.env.VITE_API_SPORTS_KEY,
        },
      }
    );

    const data = await res.json();
    const match = data.response[0];

    const home = match.goals.home;
    const away = match.goals.away;

    let outcome = 1;
    if (home > away) outcome = 0;
    if (away > home) outcome = 2;

    const tx1 = await oracleContract.setResultFromApi(matchId, outcome);
    await tx1.wait();

    const tx2 = await pmContract.resolveEvent(matchId);
    await tx2.wait();

    alert("Event resolved and payouts executed");
  };

  const handleBetAmountChange = async (val: string) => {
    setBetAmount(val);

    if (!pmContract || !val) {
      setPotentialPrize("0");
      return;
    }

    try {
      const prize = await pmContract.calculatePotentialPrize(ethers.parseEther(val), 2);
      setPotentialPrize(ethers.formatEther(prize));
    } catch (err) {
      console.error("Failed to calculate potential prize", err);
      setPotentialPrize("0");
    }
  };

  return (
    <div className="app">
      {!account ? (
        <div className="landing">
          <div className="logo-large">BETCHAIN</div>
          <button className="button-primary" onClick={connectWalletAndContracts}>Connect Wallet</button>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="header">
            <div className="logo">BETCHAIN</div>
            <div className="wallet">{account}</div>
          </div>

          {/* BUTTON MANUAL UPDATE MATCHES */}
          <button className="button-primary" onClick={fetchTodayMatches}>
            Update Matches
          </button>

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

          {/* LIQUIDITY POOL */}
          <div className="card card-column">
            <h2>Liquidity Pool</h2>
            <input className="input" placeholder="Deposit ETH" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
            <button className="button-secondary" onClick={handleDeposit}>Deposit</button>

            <input className="input" placeholder="Withdraw ETH" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
            <button className="button-secondary" onClick={handleWithdraw}>Withdraw</button>
          </div>

          {/* MATCH ODDS */}
          {matches.map((m) => (
            <div key={m.id} className="card">
              <h2>{m.home} vs {m.away}</h2>
              <p className="timetext">
                {m.time === "LIVE" ? (
                  <span style={{ color: "red" }}>LIVE {m.minute}'</span>
                ) : (
                  `Start: ${m.time}`
                )} | Score: {m.score}
              </p>
              <div className="odds">
                <button className={`odd ${selectedMatch === m.id && selectedOutcome === 0 ? "active" : ""}`}
                  onClick={() => { setSelectedMatch(m.id); setSelectedOutcome(0); }}>1</button>
                <button className={`odd ${selectedMatch === m.id && selectedOutcome === 1 ? "active" : ""}`}
                  onClick={() => { setSelectedMatch(m.id); setSelectedOutcome(1); }}>X</button>
                <button className={`odd ${selectedMatch === m.id && selectedOutcome === 2 ? "active" : ""}`}
                  onClick={() => { setSelectedMatch(m.id); setSelectedOutcome(2); }}>2</button>
              </div>

              <button className="button-secondary" onClick={() => resolveEventFromApi(m.id)}>Resolve Event</button>
            </div>
          ))}

          {/* BET SLIP */}
          {selectedMatch !== null && (
            <div className="bet-slip">
              <h2>Bet Slip</h2>
              <p>Selected Match: {matches.find(m => m.id === selectedMatch)?.home} vs {matches.find(m => m.id === selectedMatch)?.away}</p>
              <p>Selected outcome: {selectedOutcome === 0 ? "1" : selectedOutcome === 1 ? "X" : "2"}</p>
              <input className="input" placeholder="Stake (ETH)" value={betAmount} onChange={e => { setBetAmount(e.target.value); handleBetAmountChange(e.target.value); }} />
              <p>Potential Prize: {potentialPrize} ETH</p>
              <button className="button-primary" onClick={handlePlaceBet}>Place Bet</button>
            </div>
          )}

        </>
      )}
    </div>
  );
}

export default App;