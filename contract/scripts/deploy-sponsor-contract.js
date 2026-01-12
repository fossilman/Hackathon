const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
    console.log("开始部署 PrizePoolContract...");
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    // 获取合约工厂
    const PrizePoolContract = await ethers.getContractFactory("PrizePoolContract");
    
    // 部署合约
    console.log("正在部署合约...");
    const contract = await PrizePoolContract.deploy();
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("PrizePoolContract 部署成功！");
    console.log("合约地址:", contractAddress);
    
    // 等待几个区块确认
    console.log("等待区块确认...");
    const deploymentTx = contract.deploymentTransaction();
    await deploymentTx.wait(5);
    
    console.log("部署交易哈希:", deploymentTx.hash);
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    console.log("网络名称:", network.name);
    console.log("链 ID:", Number(network.chainId));
    
    // 保存部署信息
    const deploymentInfo = {
        network: hre.network.name,
        chainId: Number(network.chainId),
        prizePoolContract: {
            address: contractAddress,
            deployer: deployer.address,
            deploymentHash: deploymentTx.hash,
            deployedAt: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber()
        }
    };
    
    // 读取现有的部署记录
    const deploymentsPath = path.join(__dirname, "../deployments_sponsor.json");
    let deployments = {};
    
    if (fs.existsSync(deploymentsPath)) {
        const deploymentsContent = fs.readFileSync(deploymentsPath, "utf8");
        deployments = JSON.parse(deploymentsContent);
    }
    
    // 更新部署记录
    if (!deployments[hre.network.name]) {
        deployments[hre.network.name] = {};
    }
    deployments[hre.network.name].prizePoolContract = deploymentInfo.prizePoolContract;
    
    // 保存部署记录
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("部署信息已保存到 deployments_sponsor.json");
    
    // 如果不是本地网络，进行验证
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("\n开始验证合约...");
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [],
            });
            console.log("合约验证成功！");
        } catch (error) {
            console.log("合约验证失败:", error.message);
            console.log("\n手动验证命令:");
            console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
        }
    } else {
        console.log("本地网络，跳过验证");
    }
    
    // 输出合约交互示例
    console.log("\n=== 合约交互示例 ===");
    console.log("1. 注册活动:");
    console.log(`   await contract.registerEvent(1, "0x...");`);
    console.log("\n2. 创建活动奖金池:");
    console.log(`   await contract.createEventPrizePool(1, { value: ethers.parseEther("10.0") });`);
    console.log("\n3. 创建赞助商资金池:");
    console.log(`   await contract.createSponsorPool(1, 1, { value: ethers.parseEther("5.0") });`);
    console.log("\n4. 分发奖金:");
    console.log(`   await contract.distributePrizes(1, ["0x..."], [ethers.parseEther("5.0")]);`);
    
    console.log("\n✅ PrizePoolContract 部署完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });
