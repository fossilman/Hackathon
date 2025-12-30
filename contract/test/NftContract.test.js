const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NftContract", function () {
    let nftContract;
    let owner, organizer, participant1, participant2, unauthorized;
    let eventId1 = 1;
    let eventId2 = 2;

    beforeEach(async function () {
        // 获取测试账户
        [owner, organizer, participant1, participant2, unauthorized] = await ethers.getSigners();

        // 部署 NFT 合约
        const NftContract = await ethers.getContractFactory("NftContract");
        nftContract = await NftContract.deploy("Hackathon Event NFT", "HENFT");
        await nftContract.waitForDeployment();
    });

    describe("部署", function () {
        it("应该正确设置合约名称和符号", async function () {
            expect(await nftContract.name()).to.equal("Hackathon Event NFT");
            expect(await nftContract.symbol()).to.equal("HENFT");
        });

        it("应该正确设置合约所有者", async function () {
            expect(await nftContract.owner()).to.equal(owner.address);
        });

        it("应该正确初始化计数器", async function () {
            expect(await nftContract.totalSupply()).to.equal(0);
        });
    });

    describe("活动管理", function () {
        it("所有者应该能够注册活动", async function () {
            await expect(nftContract.registerEvent(eventId1))
                .to.emit(nftContract, "EventRegistered")
                .withArgs(eventId1, true, await getBlockTimestamp());

            expect(await nftContract.isEventRegistered(eventId1)).to.be.true;
        });

        it("不应该允许注册重复的活动", async function () {
            await nftContract.registerEvent(eventId1);
            
            await expect(nftContract.registerEvent(eventId1))
                .to.be.revertedWith("Event already registered");
        });

        it("不应该允许注册无效的活动 ID", async function () {
            await expect(nftContract.registerEvent(0))
                .to.be.revertedWith("Invalid event ID");
        });

        it("非所有者不应该能够注册活动", async function () {
            await expect(nftContract.connect(unauthorized).registerEvent(eventId1))
                .to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });

    describe("主办方授权", function () {
        it("所有者应该能够授权主办方", async function () {
            await expect(nftContract.authorizeOrganizer(organizer.address, true))
                .to.emit(nftContract, "OrganizerAuthorized")
                .withArgs(organizer.address, true, await getBlockTimestamp());

            expect(await nftContract.isAuthorizedOrganizer(organizer.address)).to.be.true;
        });

        it("所有者应该能够撤销主办方授权", async function () {
            await nftContract.authorizeOrganizer(organizer.address, true);
            
            await expect(nftContract.authorizeOrganizer(organizer.address, false))
                .to.emit(nftContract, "OrganizerAuthorized")
                .withArgs(organizer.address, false, await getBlockTimestamp());

            expect(await nftContract.isAuthorizedOrganizer(organizer.address)).to.be.false;
        });

        it("不应该允许授权无效地址", async function () {
            await expect(nftContract.authorizeOrganizer(ethers.ZeroAddress, true))
                .to.be.revertedWith("Invalid address");
        });

        it("非所有者不应该能够授权主办方", async function () {
            await expect(nftContract.connect(unauthorized).authorizeOrganizer(organizer.address, true))
                .to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
        });
    });

    describe("NFT 发放", function () {
        beforeEach(async function () {
            // 注册活动并授权主办方
            await nftContract.registerEvent(eventId1);
            await nftContract.authorizeOrganizer(organizer.address, true);
        });

        it("授权主办方应该能够发放 NFT", async function () {
            await expect(nftContract.connect(organizer).mintEventNFT(eventId1, participant1.address))
                .to.emit(nftContract, "NFTMinted")
                .withArgs(eventId1, 1, participant1.address, organizer.address, await getBlockTimestamp());

            expect(await nftContract.hasParticipantNFT(eventId1, participant1.address)).to.be.true;
            expect(await nftContract.balanceOf(participant1.address)).to.equal(1);
            expect(await nftContract.ownerOf(1)).to.equal(participant1.address);
        });

        it("合约所有者应该能够发放 NFT", async function () {
            await expect(nftContract.mintEventNFT(eventId1, participant1.address))
                .to.emit(nftContract, "NFTMinted")
                .withArgs(eventId1, 1, participant1.address, owner.address, await getBlockTimestamp());

            expect(await nftContract.hasParticipantNFT(eventId1, participant1.address)).to.be.true;
        });

        it("不应该允许为同一参赛者重复发放 NFT", async function () {
            await nftContract.connect(organizer).mintEventNFT(eventId1, participant1.address);
            
            await expect(nftContract.connect(organizer).mintEventNFT(eventId1, participant1.address))
                .to.be.revertedWith("Participant already has NFT for this event");
        });

        it("不应该允许为不存在的活动发放 NFT", async function () {
            await expect(nftContract.connect(organizer).mintEventNFT(999, participant1.address))
                .to.be.revertedWith("Event does not exist");
        });

        it("不应该允许为无效地址发放 NFT", async function () {
            await expect(nftContract.connect(organizer).mintEventNFT(eventId1, ethers.ZeroAddress))
                .to.be.revertedWith("Invalid address");
        });

        it("未授权用户不应该能够发放 NFT", async function () {
            await expect(nftContract.connect(unauthorized).mintEventNFT(eventId1, participant1.address))
                .to.be.revertedWith("Not authorized organizer");
        });

        it("应该正确返回 NFT Token ID", async function () {
            const tokenId = await nftContract.connect(organizer).mintEventNFT.staticCall(eventId1, participant1.address);
            expect(tokenId).to.equal(1);

            await nftContract.connect(organizer).mintEventNFT(eventId1, participant1.address);
            
            const tokenId2 = await nftContract.connect(organizer).mintEventNFT.staticCall(eventId1, participant2.address);
            expect(tokenId2).to.equal(2);
        });
    });

    describe("批量 NFT 发放", function () {
        beforeEach(async function () {
            await nftContract.registerEvent(eventId1);
            await nftContract.authorizeOrganizer(organizer.address, true);
        });

        it("应该能够批量发放 NFT", async function () {
            const participants = [participant1.address, participant2.address];
            
            const tokenIds = await nftContract.connect(organizer).batchMintEventNFT.staticCall(eventId1, participants);
            expect(tokenIds).to.deep.equal([1, 2]);

            await expect(nftContract.connect(organizer).batchMintEventNFT(eventId1, participants))
                .to.emit(nftContract, "NFTMinted")
                .withArgs(eventId1, 1, participant1.address, organizer.address, await getBlockTimestamp())
                .and.to.emit(nftContract, "NFTMinted")
                .withArgs(eventId1, 2, participant2.address, organizer.address, await getBlockTimestamp());

            expect(await nftContract.hasParticipantNFT(eventId1, participant1.address)).to.be.true;
            expect(await nftContract.hasParticipantNFT(eventId1, participant2.address)).to.be.true;
        });

        it("不应该允许空的参赛者数组", async function () {
            await expect(nftContract.connect(organizer).batchMintEventNFT(eventId1, []))
                .to.be.revertedWith("Empty participants array");
        });

        it("不应该允许超过 50 个参赛者的批量操作", async function () {
            const participants = new Array(51).fill(participant1.address);
            
            await expect(nftContract.connect(organizer).batchMintEventNFT(eventId1, participants))
                .to.be.revertedWith("Too many participants in one batch");
        });
    });

    describe("NFT 查询", function () {
        beforeEach(async function () {
            await nftContract.registerEvent(eventId1);
            await nftContract.registerEvent(eventId2);
            await nftContract.authorizeOrganizer(organizer.address, true);
            
            // 发放一些 NFT
            await nftContract.connect(organizer).mintEventNFT(eventId1, participant1.address);
            await nftContract.connect(organizer).mintEventNFT(eventId1, participant2.address);
            await nftContract.connect(organizer).mintEventNFT(eventId2, participant1.address);
        });

        it("应该正确返回活动 NFT 数量", async function () {
            expect(await nftContract.getEventNFTCount(eventId1)).to.equal(2);
            expect(await nftContract.getEventNFTCount(eventId2)).to.equal(1);
        });

        it("应该正确返回活动 NFT Token ID", async function () {
            const tokenIds1 = await nftContract.getEventNFTTokenIds(eventId1);
            expect(tokenIds1).to.deep.equal([1, 2]);

            const tokenIds2 = await nftContract.getEventNFTTokenIds(eventId2);
            expect(tokenIds2).to.deep.equal([3]);
        });

        it("应该正确返回参赛者 NFT Token ID", async function () {
            const tokenId = await nftContract.getParticipantNFTTokenId(eventId1, participant1.address);
            expect(tokenId).to.equal(1);

            const noTokenId = await nftContract.getParticipantNFTTokenId(eventId1, unauthorized.address);
            expect(noTokenId).to.equal(0);
        });

        it("应该正确返回 NFT 详细信息", async function () {
            const nftInfo = await nftContract.getNFTInfo(1);
            expect(nftInfo.eventId).to.equal(eventId1);
            expect(nftInfo.tokenId).to.equal(1);
            expect(nftInfo.participant).to.equal(participant1.address);
            expect(nftInfo.organizer).to.equal(organizer.address);
            expect(nftInfo.isActive).to.be.true;
        });

        it("应该正确返回参赛者所有 NFT", async function () {
            const participantNFTs = await nftContract.getParticipantNFTs(participant1.address);
            expect(participantNFTs.length).to.equal(2);
            expect(participantNFTs[0].eventId).to.equal(eventId1);
            expect(participantNFTs[1].eventId).to.equal(eventId2);
        });

        it("应该正确返回总供应量", async function () {
            expect(await nftContract.totalSupply()).to.equal(3);
        });
    });

    describe("Token URI", function () {
        beforeEach(async function () {
            await nftContract.registerEvent(eventId1);
            await nftContract.authorizeOrganizer(organizer.address, true);
            await nftContract.connect(organizer).mintEventNFT(eventId1, participant1.address);
        });

        it("应该返回正确的 Token URI", async function () {
            const tokenURI = await nftContract.tokenURI(1);
            expect(tokenURI).to.equal("https://api.hackathon.com/nft/event/1/token/1");
        });

        it("不存在的 Token 应该抛出错误", async function () {
            await expect(nftContract.tokenURI(999))
                .to.be.revertedWith("NFT does not exist");
        });
    });

    // 辅助函数
    async function getBlockTimestamp() {
        const block = await ethers.provider.getBlock("latest");
        return block.timestamp + 1; // 下一个区块的时间戳
    }
});