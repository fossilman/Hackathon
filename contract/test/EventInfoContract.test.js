const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EventInfoContract", function () {
    let eventContract;
    let owner;
    let organizer;
    let unauthorizedUser;
    
    beforeEach(async function () {
        [owner, organizer, unauthorizedUser] = await ethers.getSigners();
        
        const EventInfoContract = await ethers.getContractFactory("EventInfoContract");
        eventContract = await EventInfoContract.deploy();
        await eventContract.waitForDeployment();
        
        // 授权主办方
        await eventContract.authorizeOrganizer(organizer.address);
    });
    
    describe("Deployment", function () {
        it("应该设置正确的部署者", async function () {
            expect(await eventContract.owner()).to.equal(owner.address);
        });
        
        it("应该正确授权主办方", async function () {
            expect(await eventContract.authorizedOrganizers(organizer.address)).to.be.true;
        });
        
        it("未授权用户不应该被授权", async function () {
            expect(await eventContract.authorizedOrganizers(unauthorizedUser.address)).to.be.false;
        });
    });
    
    describe("Organizer Management", function () {
        it("应该能够授权新主办方", async function () {
            await eventContract.authorizeOrganizer(unauthorizedUser.address);
            expect(await eventContract.authorizedOrganizers(unauthorizedUser.address)).to.be.true;
        });
        
        it("非部署者不能授权主办方", async function () {
            await expect(
                eventContract.connect(unauthorizedUser).authorizeOrganizer(ethers.ZeroAddress)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        
        it("应该能够撤销主办方授权", async function () {
            await eventContract.revokeOrganizer(organizer.address);
            expect(await eventContract.authorizedOrganizers(organizer.address)).to.be.false;
        });
        
        it("不能授权零地址", async function () {
            await expect(
                eventContract.authorizeOrganizer(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid address");
        });
    });
    
    describe("createEvent", function () {
        it("应该成功创建活动", async function () {
            const eventId = 1001;
            const eventName = "Test Hackathon";
            const description = "Test Description";
            const startTime = await time.latest() + 86400; // 明天
            const endTime = startTime + 86400; // 后天
            const location = "Test Location";
            
            await expect(
                eventContract.connect(organizer).createEvent(
                    eventId,
                    eventName,
                    description,
                    startTime,
                    endTime,
                    location
                )
            ).to.emit(eventContract, "EventCreated")
             .withArgs(eventId, organizer.address, eventName, startTime, endTime, anyValue)
             .and.to.emit(eventContract, "OrganizerAuthorized").withArgs(organizer.address, anyValue);
            
            const event = await eventContract.getEvent(eventId);
            expect(event.eventName).to.equal(eventName);
            expect(event.description).to.equal(description);
            expect(event.location).to.equal(location);
            expect(event.organizer).to.equal(organizer.address);
            expect(event.isDeleted).to.be.false;
        });
        
        it("非授权主办方应该无法创建活动", async function () {
            await expect(
                eventContract.connect(unauthorizedUser).createEvent(
                    1002,
                    "Unauthorized Event",
                    "Description",
                    await time.latest() + 86400,
                    await time.latest() + 172800,
                    "Location"
                )
            ).to.be.revertedWith("Not authorized organizer");
        });
        
        it("应该拒绝重复的活动 ID", async function () {
            const eventId = 1003;
            const startTime = await time.latest() + 86400;
            const endTime = startTime + 86400;
            
            await eventContract.connect(organizer).createEvent(
                eventId,
                "Event 1",
                "Description 1",
                startTime,
                endTime,
                "Location 1"
            );
            
            await expect(
                eventContract.connect(organizer).createEvent(
                    eventId,
                    "Event 2",
                    "Description 2",
                    startTime,
                    endTime,
                    "Location 2"
                )
            ).to.be.revertedWith("Event already exists");
        });
        
        it("应该拒绝无效的活动 ID", async function () {
            await expect(
                eventContract.connect(organizer).createEvent(
                    0,
                    "Invalid Event",
                    "Description",
                    await time.latest() + 86400,
                    await time.latest() + 172800,
                    "Location"
                )
            ).to.be.revertedWith("Invalid event ID");
        });
        
        it("应该拒绝空的活动名称", async function () {
            await expect(
                eventContract.connect(organizer).createEvent(
                    1004,
                    "",
                    "Description",
                    await time.latest() + 86400,
                    await time.latest() + 172800,
                    "Location"
                )
            ).to.be.revertedWith("Event name cannot be empty");
        });
        
        it("应该拒绝无效的时间范围", async function () {
            const startTime = await time.latest() + 86400;
            const endTime = startTime - 3600; // 结束时间早于开始时间
            
            await expect(
                eventContract.connect(organizer).createEvent(
                    1005,
                    "Invalid Time Event",
                    "Description",
                    startTime,
                    endTime,
                    "Location"
                )
            ).to.be.revertedWith("Invalid time range");
        });
    });
    
    describe("updateEvent", function () {
        let eventId;
        let startTime;
        let endTime;
        
        beforeEach(async function () {
            eventId = 2001;
            startTime = await time.latest() + 86400;
            endTime = startTime + 86400;
            
            await eventContract.connect(organizer).createEvent(
                eventId,
                "Original Event",
                "Original Description",
                startTime,
                endTime,
                "Original Location"
            );
        });
        
        it("应该成功编辑活动", async function () {
            const newEventName = "Updated Event";
            const newDescription = "Updated Description";
            const changeDescription = "更新活动信息";
            
            await expect(
                eventContract.connect(organizer).updateEvent(
                    eventId,
                    newEventName,
                    newDescription,
                    startTime,
                    endTime,
                    "Updated Location",
                    changeDescription
                )
            ).to.emit(eventContract, "EventUpdated")
             .withArgs(eventId, organizer.address, changeDescription, anyValue);
            
            const event = await eventContract.getEvent(eventId);
            expect(event.eventName).to.equal(newEventName);
            expect(event.description).to.equal(newDescription);
            expect(event.location).to.equal("Updated Location");
        });
        
        it("应该拒绝编辑已开始的活动", async function () {
            // 创建一个已开始的活动
            const pastEventId = 2002;
            const pastStartTime = await time.latest() - 3600; // 1小时前开始
            const pastEndTime = await time.latest() + 3600; // 1小时后结束
            
            await eventContract.connect(organizer).createEvent(
                pastEventId,
                "Past Event",
                "Description",
                pastStartTime,
                pastEndTime,
                "Location"
            );
            
            // 时间快进到活动开始后
            await time.increaseTo(pastStartTime + 1800);
            
            await expect(
                eventContract.connect(organizer).updateEvent(
                    pastEventId,
                    "Updated Name",
                    "Updated Description",
                    pastStartTime,
                    pastEndTime,
                    "Updated Location",
                    "尝试更新"
                )
            ).to.be.revertedWith("Cannot edit started or ended event");
        });
        
        it("应该拒绝编辑不存在的活动", async function () {
            await expect(
                eventContract.connect(organizer).updateEvent(
                    9999,
                    "Non-existent Event",
                    "Description",
                    startTime,
                    endTime,
                    "Location",
                    "Change"
                )
            ).to.be.revertedWith("Event does not exist");
        });
        
        it("应该拒绝编辑已删除的活动", async function () {
            const deletedEventId = 2003;
            const deleteStartTime = await time.latest() + 86400;
            const deleteEndTime = deleteStartTime + 86400;
            
            await eventContract.connect(organizer).createEvent(
                deletedEventId,
                "Event to Delete",
                "Description",
                deleteStartTime,
                deleteEndTime,
                "Location"
            );
            
            await eventContract.connect(organizer).deleteEvent(deletedEventId);
            
            await expect(
                eventContract.connect(organizer).updateEvent(
                    deletedEventId,
                    "Updated Event",
                    "Description",
                    deleteStartTime,
                    deleteEndTime,
                    "Location",
                    "Change"
                )
            ).to.be.revertedWith("Event has been deleted");
        });
    });
    
    describe("deleteEvent", function () {
        let eventId;
        
        beforeEach(async function () {
            eventId = 3001;
            const startTime = await time.latest() + 86400;
            const endTime = startTime + 86400;
            
            await eventContract.connect(organizer).createEvent(
                eventId,
                "Event to Delete",
                "Description",
                startTime,
                endTime,
                "Location"
            );
        });
        
        it("应该成功删除活动", async function () {
            await expect(
                eventContract.connect(organizer).deleteEvent(eventId)
            ).to.emit(eventContract, "EventDeleted")
             .withArgs(eventId, organizer.address, anyValue);
            
            const event = await eventContract.getEvent(eventId);
            expect(event.isDeleted).to.be.true;
        });
        
        it("应该拒绝删除已开始的活动", async function () {
            const pastEventId = 3002;
            const pastStartTime = await time.latest() - 3600;
            const pastEndTime = await time.latest() + 3600;
            
            await eventContract.connect(organizer).createEvent(
                pastEventId,
                "Past Event",
                "Description",
                pastStartTime,
                pastEndTime,
                "Location"
            );
            
            await time.increaseTo(pastStartTime + 1800);
            
            await expect(
                eventContract.connect(organizer).deleteEvent(pastEventId)
            ).to.be.revertedWith("Cannot delete started or ended event");
        });
        
        it("应该拒绝删除不存在的活动", async function () {
            await expect(
                eventContract.connect(organizer).deleteEvent(9999)
            ).to.be.revertedWith("Event does not exist");
        });
        
        it("应该拒绝重复删除活动", async function () {
            await eventContract.connect(organizer).deleteEvent(eventId);
            
            await expect(
                eventContract.connect(organizer).deleteEvent(eventId)
            ).to.be.revertedWith("Event has been deleted");
        });
    });
    
    describe("getEventHistory", function () {
        it("应该正确记录活动历史", async function () {
            const eventId = 4001;
            const startTime = await time.latest() + 86400;
            const endTime = startTime + 86400;
            
            // 创建活动
            await eventContract.connect(organizer).createEvent(
                eventId,
                "History Event",
                "Description",
                startTime,
                endTime,
                "Location"
            );
            
            // 编辑活动
            await eventContract.connect(organizer).updateEvent(
                eventId,
                "Updated Event",
                "Updated Description",
                startTime,
                endTime,
                "Location",
                "第一次更新"
            );
            
            // 再次编辑活动
            await eventContract.connect(organizer).updateEvent(
                eventId,
                "Final Event",
                "Final Description",
                startTime,
                endTime,
                "Final Location",
                "最终更新"
            );
            
            // 获取历史记录
            const histories = await eventContract.getEventHistory(eventId);
            
            expect(histories.length).to.equal(3);
            expect(histories[0].operationType).to.equal(1); // 创建
            expect(histories[0].changeDescription).to.equal("Event created");
            
            expect(histories[1].operationType).to.equal(2); // 编辑
            expect(histories[1].changeDescription).to.equal("第一次更新");
            
            expect(histories[2].operationType).to.equal(2); // 编辑
            expect(histories[2].changeDescription).to.equal("最终更新");
            
            // 检查操作者地址
            expect(histories[0].operator).to.equal(organizer.address);
            expect(histories[1].operator).to.equal(organizer.address);
            expect(histories[2].operator).to.equal(organizer.address);
        });
        
        it("应该记录删除操作历史", async function () {
            const eventId = 4002;
            const startTime = await time.latest() + 86400;
            const endTime = startTime + 86400;
            
            // 创建活动
            await eventContract.connect(organizer).createEvent(
                eventId,
                "Event to Delete",
                "Description",
                startTime,
                endTime,
                "Location"
            );
            
            // 删除活动
            await eventContract.connect(organizer).deleteEvent(eventId);
            
            // 获取历史记录
            const histories = await eventContract.getEventHistory(eventId);
            
            expect(histories.length).to.equal(2);
            expect(histories[0].operationType).to.equal(1); // 创建
            expect(histories[1].operationType).to.equal(3); // 删除
            expect(histories[1].changeDescription).to.equal("Event deleted");
        });
    });
    
    describe("getEvents", function () {
        it("应该批量返回活动信息", async function () {
            const eventIds = [5001, 5002, 5003];
            const startTime = await time.latest() + 86400;
            const endTime = startTime + 86400;
            
            // 创建多个活动
            for (let i = 0; i < eventIds.length; i++) {
                await eventContract.connect(organizer).createEvent(
                    eventIds[i],
                    `Event ${i + 1}`,
                    `Description ${i + 1}`,
                    startTime,
                    endTime,
                    `Location ${i + 1}`
                );
            }
            
            const events = await eventContract.getEvents(eventIds);
            
            expect(events.length).to.equal(eventIds.length);
            for (let i = 0; i < events.length; i++) {
                expect(events[i].eventName).to.equal(`Event ${i + 1}`);
                expect(events[i].description).to.equal(`Description ${i + 1}`);
                expect(events[i].location).to.equal(`Location ${i + 1}`);
            }
        });
        
        it("应该处理不存在的活动 ID", async function () {
            const eventIds = [6001, 9999, 6002]; // 中间包含不存在的 ID
            const startTime = await time.latest() + 86400;
            const endTime = startTime + 86400;
            
            // 创建两个活动
            await eventContract.connect(organizer).createEvent(
                6001,
                "Event 1",
                "Description 1",
                startTime,
                endTime,
                "Location 1"
            );
            
            await eventContract.connect(organizer).createEvent(
                6002,
                "Event 2",
                "Description 2",
                startTime,
                endTime,
                "Location 2"
            );
            
            const events = await eventContract.getEvents(eventIds);
            
            expect(events.length).to.equal(3);
            expect(events[0].eventId).to.equal(6001);
            expect(events[1].eventId).to.equal(0); // 不存在的活动
            expect(events[2].eventId).to.equal(6002);
        });
    });
    
    describe("getAllEventIds", function () {
        it("应该返回所有活动 ID", async function () {
            const eventIds = [7001, 7002, 7003];
            const startTime = await time.latest() + 86400;
            const endTime = startTime + 86400;
            
            // 创建多个活动
            for (const eventId of eventIds) {
                await eventContract.connect(organizer).createEvent(
                    eventId,
                    "Event",
                    "Description",
                    startTime,
                    endTime,
                    "Location"
                );
            }
            
            const allEventIds = await eventContract.getAllEventIds();
            expect(allEventIds.length).to.equal(eventIds.length);
            
            for (let i = 0; i < eventIds.length; i++) {
                expect(allEventIds[i]).to.equal(eventIds[i]);
            }
        });
        
        it("应该返回空数组当没有活动时", async function () {
            const allEventIds = await eventContract.getAllEventIds();
            expect(allEventIds.length).to.equal(0);
        });
    });
});