const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("开始部署 CheckInContract...");
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // 获取合约工厂
    const CheckInContract = await ethers.getContractFactory("CheckInContract");
    
    // 部署合约
    console.log("正在部署合约...");
    const contract = await CheckInContract.deploy();
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("CheckInContract 部署成功！");
    console.log("合约地址:", contractAddress);
    
    // 等待几个区块确认
    console.log("等待区块确认...");
    const deploymentTx = contract.deploymentTransaction();
    await deploymentTx.wait(5);
    
    console.log("部署交易哈希:", deploymentTx.hash);
    console.log("使用的 Gas:", deploymentTx.gasLimit.toString());
    
    // 如果不是本地网络，进行验证
    const network = await ethers.provider.getNetwork();
    console.log("网络名称:", network.name);
    console.log("链 ID:", Number(network.chainId));
    
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("开始验证合约...");
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [],
            });
            console.log("合约验证成功！");
        } catch (error) {
            console.log("合约验证失败:", error.message);
        }
    } else {
        console.log("本地网络，跳过验证");
    }
    
    // 保存合约地址到部署配置文件
    const fs = require("fs");
    const contractConfig = {
        network: network.name,
        chainId: Number(network.chainId),
        contractAddress: contractAddress,
        deploymentHash: deploymentTx.hash,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address
    };
    
    // 保存到 deployments_checkin.json
    fs.writeFileSync(
        `deployments_checkin.json`,
        JSON.stringify(contractConfig, null, 2)
    );
    console.log("合约配置已保存到 deployments_checkin.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });