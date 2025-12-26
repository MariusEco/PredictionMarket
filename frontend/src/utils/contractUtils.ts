import { ethers } from "ethers";
import LiquidityPoolAbi from "../contracts/LiquidityPool.json";
import PredictionMarketAbi from "../contracts/PredictionMarket.json";

export const connectLiquidityPool = async (
  provider: ethers.BrowserProvider,
  address: string
) => {
  const signer = await provider.getSigner();
  return new ethers.Contract(address, LiquidityPoolAbi.abi, signer);
};

export const connectPredictionMarket = async (
  provider: ethers.BrowserProvider,
  address: string
) => {
  const signer = await provider.getSigner();
  return new ethers.Contract(address, PredictionMarketAbi.abi, signer);
};
