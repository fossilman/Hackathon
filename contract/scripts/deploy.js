const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("开始部署 Hackathon 智能合约...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // 部署主平台合约 (会自动部署所有子合约)
  console.log("\n部署 HackathonPlatform 合约...");
  const HackathonPlatform = await ethers.getContractFactory("HackathonPlatform");
  const platform = await HackathonPlatform.deploy();
  await platform.waitForDeployment();

  const platformAddress = await platform.getAddress();
  console.log("HackathonPlatform 部署地址:", platformAddress);

  // 获取子合约地址
  const contractAddresses = await platform.getContractAddresses();
  console.log("\n子合约地址:");
  console.log("HackathonEvent:", contractAddresses[0]);
  console.log("PrizePool:", contractAddresses[1]);
  console.log("HackathonNFT:", contractAddresses[2]);

  // 验证部署
  console.log("\n验证部署...");
  const stats = await platform.getPlatformStats();
  console.log("平台初始统计:", {
    totalEvents: stats.totalEvents.toString(),
    totalParticipants: stats.totalParticipants.toString(),
    totalPrizeDistributed: ethers.formatEther(stats.totalPrizeDistributed),
    totalNFTsMinted: stats.totalNFTsMinted.toString()
  });

  console.log("\n部署完成!");
  
  // 保存合约地址到 deployments.json
  const deployments = {
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      HackathonPlatform: platformAddress,
      HackathonEvent: contractAddresses[0],
      PrizePool: contractAddresses[1],
      HackathonNFT: contractAddresses[2]
    }
  };

  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("合约地址已保存到 deployments.json");
  
  console.log("\n请保存以下合约地址用于前端集成:");
  console.log("主合约地址:", platformAddress);
  console.log("活动合约地址:", contractAddresses[0]);
  console.log("奖金池合约地址:", contractAddresses[1]);
  console.log("NFT合约地址:", contractAddresses[2]);

  // 如果在测试网络，提供验证命令
  if (network.name === "sepolia") {
    console.log("\n验证合约命令:");
    console.log(`npx hardhat verify --network sepolia ${platformAddress}`);
    console.log(`npx hardhat verify --network sepolia ${contractAddresses[0]}`);
    console.log(`npx hardhat verify --network sepolia ${contractAddresses[1]}`);
    console.log(`npx hardhat verify --network sepolia ${contractAddresses[2]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });