const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HackathonPlatform", function () {
  let platform, eventContract, prizePoolContract, nftContract;
  let owner, organizer, participant1, participant2, sponsor;

  beforeEach(async function () {
    [owner, organizer, participant1, participant2, sponsor] = await ethers.getSigners();

    // 部署主合约
    const HackathonPlatform = await ethers.getContractFactory("HackathonPlatform");
    platform = await HackathonPlatform.deploy();
    await platform.waitForDeployment();

    // 获取子合约实例
    const addresses = await platform.getContractAddresses();
    const HackathonEvent = await ethers.getContractFactory("HackathonEvent");
    const PrizePool = await ethers.getContractFactory("PrizePool");
    const HackathonNFT = await ethers.getContractFactory("HackathonNFT");

    eventContract = HackathonEvent.attach(addresses[0]);
    prizePoolContract = PrizePool.attach(addresses[1]);
    nftContract = HackathonNFT.attach(addresses[2]);
  });

  describe("平台部署", function () {
    it("应该正确部署所有合约", async function () {
      const addresses = await platform.getContractAddresses();
      expect(addresses[0]).to.not.equal(ethers.ZeroAddress);
      expect(addresses[1]).to.not.equal(ethers.ZeroAddress);
      expect(addresses[2]).to.not.equal(ethers.ZeroAddress);
    });

    it("应该初始化平台统计", async function () {
      const stats = await platform.getPlatformStats();
      expect(stats.totalEvents).to.equal(0);
      expect(stats.totalParticipants).to.equal(0);
      expect(stats.totalPrizeDistributed).to.equal(0);
      expect(stats.totalNFTsMinted).to.equal(0);
    });
  });

  describe("活动创建", function () {
    it("应该能创建带奖金池的活动", async function () {
      const prizeAmount = ethers.parseEther("1.0");
      const distributionRules = [
        { rank: 1, percentage: 50 },
        { rank: 2, percentage: 30 },
        { rank: 3, percentage: 20 }
      ];

      const tx = await platform.connect(organizer).createEventWithPrize(
        "Test Hackathon",
        "A test hackathon event",
        Math.floor(Date.now() / 1000) + 3600, // 1小时后开始
        Math.floor(Date.now() / 1000) + 7200, // 2小时后结束
        "Online",
        distributionRules,
        { value: prizeAmount }
      );

      await expect(tx).to.emit(platform, "EventCreatedWithPrize");

      const stats = await platform.getPlatformStats();
      expect(stats.totalEvents).to.equal(1);
      expect(stats.totalPrizeDistributed).to.equal(prizeAmount);
    });
  });

  describe("参赛者签到和NFT", function () {
    let eventId;

    beforeEach(async function () {
      const prizeAmount = ethers.parseEther("1.0");
      const distributionRules = [{ rank: 1, percentage: 100 }];

      const tx = await platform.connect(organizer).createEventWithPrize(
        "Test Hackathon",
        "A test hackathon event",
        Math.floor(Date.now() / 1000) + 3600,
        Math.floor(Date.now() / 1000) + 7200,
        "Online",
        distributionRules,
        { value: prizeAmount }
      );

      // 获取实际的 eventId
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return platform.interface.parseLog(log).name === "EventCreatedWithPrize";
        } catch (e) {
          return false;
        }
      });
      eventId = event ? platform.interface.parseLog(event).args.eventId : await eventContract.eventCounter();
      
      // 激活活动
      await eventContract.connect(organizer).activateEvent(eventId);
    });

    it("应该能签到并铸造NFT", async function () {
      const tokenURI = "https://example.com/nft/1";

      await platform.connect(participant1).checkInAndMintNFT(eventId, tokenURI);

      // 验证签到
      expect(await eventContract.isCheckedIn(eventId, participant1.address)).to.be.true;

      // 验证NFT
      expect(await nftContract.hasParticipationNFT(eventId, participant1.address)).to.be.true;

      const stats = await platform.getPlatformStats();
      expect(stats.totalParticipants).to.equal(1);
      expect(stats.totalNFTsMinted).to.equal(1);
    });
  });

  describe("投票功能", function () {
    let eventId;

    beforeEach(async function () {
      const prizeAmount = ethers.parseEther("1.0");
      const distributionRules = [{ rank: 1, percentage: 100 }];

      const tx = await platform.connect(organizer).createEventWithPrize(
        "Test Hackathon",
        "A test hackathon event",
        Math.floor(Date.now() / 1000) + 3600,
        Math.floor(Date.now() / 1000) + 7200,
        "Online",
        distributionRules,
        { value: prizeAmount }
      );

      // 获取实际的 eventId
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return platform.interface.parseLog(log).name === "EventCreatedWithPrize";
        } catch (e) {
          return false;
        }
      });
      eventId = event ? platform.interface.parseLog(event).args.eventId : await eventContract.eventCounter();
      
      await eventContract.connect(organizer).activateEvent(eventId);
      await platform.connect(participant1).checkInAndMintNFT(eventId, "uri1");
    });

    it("应该能投票和撤销投票", async function () {
      // 投票
      await eventContract.connect(participant1).vote(eventId, 1, 8);

      const votes = await eventContract.getUserVotes(eventId, participant1.address);
      expect(votes.length).to.equal(1);
      expect(votes[0].score).to.equal(8);
      expect(votes[0].isRevoked).to.be.false;

      // 撤销投票
      await eventContract.connect(participant1).revokeVote(eventId, 0);

      const updatedVotes = await eventContract.getUserVotes(eventId, participant1.address);
      expect(updatedVotes[0].isRevoked).to.be.true;
    });
  });

  describe("赞助功能", function () {
    let eventId;

    beforeEach(async function () {
      const prizeAmount = ethers.parseEther("1.0");
      const distributionRules = [{ rank: 1, percentage: 100 }];

      const tx = await platform.connect(organizer).createEventWithPrize(
        "Test Hackathon",
        "A test hackathon event",
        Math.floor(Date.now() / 1000) + 3600,
        Math.floor(Date.now() / 1000) + 7200,
        "Online",
        distributionRules,
        { value: prizeAmount }
      );

      // 获取实际的 eventId
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return platform.interface.parseLog(log).name === "EventCreatedWithPrize";
        } catch (e) {
          return false;
        }
      });
      eventId = event ? platform.interface.parseLog(event).args.eventId : await eventContract.eventCounter();
    });

    it("应该能申请赞助并批准", async function () {
      const sponsorAmount = ethers.parseEther("0.5");

      // 申请赞助
      await prizePoolContract.connect(sponsor).requestSponsorship(eventId, { value: sponsorAmount });

      // 批准赞助
      await prizePoolContract.connect(organizer).approveSponsorshipRequest(1);

      const poolInfo = await prizePoolContract.getPoolInfo(eventId);
      expect(poolInfo.totalAmount).to.equal(ethers.parseEther("1.5"));
    });

    it("应该能拒绝赞助并退款", async function () {
      const sponsorAmount = ethers.parseEther("0.5");
      const initialBalance = await sponsor.provider.getBalance(sponsor.address);

      // 申请赞助
      const tx1 = await prizePoolContract.connect(sponsor).requestSponsorship(eventId, { value: sponsorAmount });
      const receipt1 = await tx1.wait();
      const gasCost1 = receipt1.gasUsed * receipt1.gasPrice;

      // 拒绝赞助
      const tx2 = await prizePoolContract.connect(organizer).rejectSponsorshipRequest(1);
      await tx2.wait();

      const finalBalance = await sponsor.provider.getBalance(sponsor.address);
      // 应该退还赞助金额（减去gas费用）
      expect(finalBalance).to.be.closeTo(initialBalance - gasCost1, ethers.parseEther("0.01"));
    });
  });

  describe("奖金分发", function () {
    let eventId;

    beforeEach(async function () {
      const prizeAmount = ethers.parseEther("1.0");
      const distributionRules = [
        { rank: 1, percentage: 60 },
        { rank: 2, percentage: 40 }
      ];

      const tx = await platform.connect(organizer).createEventWithPrize(
        "Test Hackathon",
        "A test hackathon event",
        Math.floor(Date.now() / 1000) + 3600,
        Math.floor(Date.now() / 1000) + 7200,
        "Online",
        distributionRules,
        { value: prizeAmount }
      );

      // 获取实际的 eventId
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return platform.interface.parseLog(log).name === "EventCreatedWithPrize";
        } catch (e) {
          return false;
        }
      });
      eventId = event ? platform.interface.parseLog(event).args.eventId : await eventContract.eventCounter();
      
      await eventContract.connect(organizer).activateEvent(eventId);

      // 设置团队分成
      const teamShares1 = [
        { member: participant1.address, percentage: 100 }
      ];
      const teamShares2 = [
        { member: participant2.address, percentage: 100 }
      ];

      await prizePoolContract.connect(participant1).setTeamShares(eventId, 1, teamShares1);
      await prizePoolContract.connect(participant2).setTeamShares(eventId, 2, teamShares2);
    });

    it("应该能分发奖金", async function () {
      const initialBalance1 = await participant1.provider.getBalance(participant1.address);
      const initialBalance2 = await participant2.provider.getBalance(participant2.address);

      // 分发奖金
      await prizePoolContract.connect(organizer).distributePrizes(eventId, [1, 2], [1, 2]);

      const finalBalance1 = await participant1.provider.getBalance(participant1.address);
      const finalBalance2 = await participant2.provider.getBalance(participant2.address);

      // 第一名应该获得60%的奖金
      expect(finalBalance1 - initialBalance1).to.equal(ethers.parseEther("0.6"));
      // 第二名应该获得40%的奖金
      expect(finalBalance2 - initialBalance2).to.equal(ethers.parseEther("0.4"));
    });
  });

  describe("数据验证", function () {
    it("应该能验证活动数据完整性", async function () {
      const prizeAmount = ethers.parseEther("1.0");
      const distributionRules = [{ rank: 1, percentage: 100 }];

      const tx = await platform.connect(organizer).createEventWithPrize(
        "Test Hackathon",
        "A test hackathon event",
        Math.floor(Date.now() / 1000) + 3600,
        Math.floor(Date.now() / 1000) + 7200,
        "Online",
        distributionRules,
        { value: prizeAmount }
      );

      // 获取实际的 eventId
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return platform.interface.parseLog(log).name === "EventCreatedWithPrize";
        } catch (e) {
          return false;
        }
      });
      const eventId = event ? platform.interface.parseLog(event).args.eventId : await eventContract.eventCounter();

      const integrity = await platform.verifyEventIntegrity(eventId);
      expect(integrity.eventExists).to.be.true;
      expect(integrity.poolExists).to.be.true;
      expect(integrity.dataConsistent).to.be.true;
    });
  });
});