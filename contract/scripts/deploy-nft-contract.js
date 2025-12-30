const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("开始部署 NFT 合约...");

    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // 部署 NFT 合约
    console.log("\n正在部署 NftContract...");
    const NftContract = await ethers.getContractFactory("NftContract");
    
    // 构造函数参数
    const nftName = "Hackathon Event NFT";
    const nftSymbol = "HENFT";
    
    const nftContract = await NftContract.deploy(nftName, nftSymbol);
    await nftContract.waitForDeployment();
    
    const nftContractAddress = await nftContract.getAddress();
    console.log("NftContract 部署成功!");
    console.log("合约地址:", nftContractAddress);

    // 验证部署
    console.log("\n验证合约部署...");
    const deployedName = await nftContract.name();
    const deployedSymbol = await nftContract.symbol();
    const owner = await nftContract.owner();
    
    console.log("NFT 名称:", deployedName);
    console.log("NFT 符号:", deployedSymbol);
    console.log("合约所有者:", owner);
    console.log("部署者地址:", deployer.address);
    console.log("所有者匹配:", owner === deployer.address);

    // 保存部署信息
    const deploymentInfo = {
        network: hre.network.name,
        nftContract: {
            address: nftContractAddress,
            name: deployedName,
            symbol: deployedSymbol,
            owner: owner,
            deployer: deployer.address,
            deploymentTime: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber()
        },
        constructorArgs: {
            name: nftName,
            symbol: nftSymbol
        }
    };

    // 读取现有的部署记录
    const deploymentsPath = path.join(__dirname, "../deployments_nft.json");
    let deployments = {};
    
    if (fs.existsSync(deploymentsPath)) {
        const deploymentsContent = fs.readFileSync(deploymentsPath, "utf8");
        deployments = JSON.parse(deploymentsContent);
    }

    // 更新部署记录
    if (!deployments[hre.network.name]) {
        deployments[hre.network.name] = {};
    }
    deployments[hre.network.name].nftContract = deploymentInfo.nftContract;

    // 保存部署记录
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("\n部署信息已保存到 deployments_nft.json");

    // 输出合约交互示例
    console.log("\n=== 合约交互示例 ===");
    console.log("1. 注册活动:");
    console.log(`   await nftContract.registerEvent(1);`);
    console.log("\n2. 授权主办方:");
    console.log(`   await nftContract.authorizeOrganizer("0x...", true);`);
    console.log("\n3. 发放 NFT:");
    console.log(`   await nftContract.mintEventNFT(1, "0x...");`);
    console.log("\n4. 查询 NFT:");
    console.log(`   await nftContract.hasParticipantNFT(1, "0x...");`);

    // 如果是测试网，输出验证命令
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n=== 合约验证命令 ===");
        console.log(`npx hardhat verify --network ${hre.network.name} ${nftContractAddress} "${nftName}" "${nftSymbol}"`);
    }

    console.log("\n✅ NFT 合约部署完成!");
    
    return {
        nftContract: nftContract,
        nftContractAddress: nftContractAddress
    };
}

// 执行部署
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });