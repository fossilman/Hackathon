package services

import (
	"errors"
	"fmt"
	"time"

	"hackathon-backend/database"
	"hackathon-backend/models"
)

type VoteService struct{}

// Vote 投票
func (s *VoteService) Vote(hackathonID, participantID, submissionID uint64) error {
	fmt.Println("VoteService.Vote: ", hackathonID, participantID, submissionID)
	// 检查活动状态
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	if hackathon.Status != "voting" {
		return errors.New("当前不在投票阶段")
	}

	// 检查阶段时间
	hackathonService := &HackathonService{}
	inTime, err := hackathonService.CheckStageTime(hackathonID, "voting")
	if err != nil {
		return errors.New("投票阶段时间未设置")
	}
	if !inTime {
		return errors.New("不在投票时间范围内")
	}

	// 检查是否已签到
	registrationService := &RegistrationService{}
	checkedIn, _, err := registrationService.GetCheckinStatus(hackathonID, participantID)
	if err != nil {
		return err
	}
	if !checkedIn {
		return errors.New("请先完成签到")
	}

	// 检查作品是否存在
	var submission models.Submission
	if err := database.DB.Where("id = ? AND hackathon_id = ? AND draft = 0", submissionID, hackathonID).First(&submission).Error; err != nil {
		return errors.New("作品不存在")
	}

	// 检查是否已投票（只检查有效的投票，允许重新投票已撤销的作品）
	var existing models.Vote
	if err := database.DB.Where("participant_id = ? AND submission_id = ? AND deleted_at IS NULL", participantID, submissionID).First(&existing).Error; err == nil {
		return errors.New("您已经对该作品投过票了")
	}

	// 获取参与者钱包地址
	var participant models.Participant
	if err := database.DB.Where("id = ?", participantID).First(&participant).Error; err != nil {
		return errors.New("参与者不存在")
	}
	if participant.WalletAddress == "" {
		return errors.New("参与者钱包地址未设置")
	}

	// 准备创建投票记录
	vote := models.Vote{
		HackathonID:   hackathonID,
		ParticipantID: participantID,
		SubmissionID:  submissionID,
		ChainStatus:   "not_registered", // 默认状态
	}

	// 尝试调用链上投票合约（可选，失败不影响链下投票）
	// 注意：由于合约使用 msg.sender 作为投票者，使用服务端私钥代为发送会导致所有投票被识别为同一地址
	// 因此链上投票可能会失败（服务端地址只能投一次），但这不影响链下投票的正常进行
	voteBlockchainService, err := NewVoteBlockchainService()
	if err != nil {
		// 如果初始化失败，仅记录日志，继续执行链下投票
		fmt.Printf("初始化投票合约服务失败: %v，仅进行链下投票\n", err)
		vote.ChainStatus = "service_error"
	} else {
		defer voteBlockchainService.Close()

		// 检查活动是否已在链上注册
		isRegistered, err := voteBlockchainService.IsEventRegistered(hackathonID)
		if err != nil {
			// 如果查询失败，记录日志但不阻止投票（允许链下投票）
			fmt.Printf("检查活动注册状态失败: %v，仅进行链下投票\n", err)
			vote.ChainStatus = "check_error"
		} else if !isRegistered {
			// 如果活动未注册，记录日志但不阻止投票（允许链下投票）
			fmt.Printf("活动 %d 未在链上注册，仅进行链下投票\n", hackathonID)
			vote.ChainStatus = "not_registered"
		} else {
			// 检查是否已在链上投票（使用用户地址查询）
			hasVotedOnChain, err := voteBlockchainService.HasUserVotedForProject(participant.WalletAddress, hackathonID, submissionID)
			if err != nil {
				// 如果查询失败，记录日志但不阻止投票
				fmt.Printf("检查链上投票状态失败: %v，继续执行链下投票\n", err)
			} else if hasVotedOnChain {
				// 如果链上已投票，记录日志但不阻止链下投票（因为可能链上链下不同步）
				fmt.Printf("用户 %s 已在链上对该作品投过票，继续执行链下投票\n", participant.WalletAddress)
			}

			// 尝试调用链上投票（使用默认分数 10，表示支持）
			// 注意：由于合约使用 msg.sender，使用服务端私钥代为发送会导致所有投票被识别为服务端地址
			// 因此第一个投票可能成功，后续投票会失败（因为服务端地址已在该活动中投过票）
			// 这是预期的行为，不影响链下投票的正常进行
			voteId, txHash, err := voteBlockchainService.CastVote(hackathonID, submissionID, participant.WalletAddress, 10)
			if err != nil {
				// 如果链上投票失败，记录详细错误日志但不阻止链下投票
				// 常见失败原因：
				// 1. 服务端地址已在该活动中投过票（hasVoted[msg.sender][_eventId] 检查）
				// 2. Gas 不足（out of gas）- 已增加 Gas Limit 到 500000
				// 3. 合约执行失败
				if txHash != "" {
					fmt.Printf("链上投票失败: %v，交易哈希: %s，继续执行链下投票\n", err, txHash)
					vote.ChainTxHash = txHash
					vote.ChainStatus = "failed" // 交易发送但执行失败
				} else {
					fmt.Printf("链上投票失败: %v，继续执行链下投票\n", err)
					vote.ChainStatus = "send_failed" // 交易发送失败
				}
			} else {
				// 链上投票交易已发送成功
				fmt.Printf("链上投票交易已发送: voteId=%d, txHash=%s\n", voteId, txHash)
				vote.ChainTxHash = txHash
				vote.ChainStatus = "pending" // 待确认状态
				if voteId > 0 {
					vote.ChainVoteID = &voteId
				}
			}
		}
	}

	// 创建投票记录（链下），包含链上数据
	return database.DB.Create(&vote).Error
}

// CancelVote 取消投票
func (s *VoteService) CancelVote(participantID, submissionID uint64) error {
	// 检查活动状态
	var vote models.Vote
	// 只查询未删除的投票记录
	if err := database.DB.Where("participant_id = ? AND submission_id = ? AND deleted_at IS NULL", participantID, submissionID).First(&vote).Error; err != nil {
		return errors.New("投票记录不存在")
	}

	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", vote.HackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	if hackathon.Status != "voting" {
		return errors.New("投票阶段已结束，无法取消投票")
	}

	// 检查阶段时间
	hackathonService := &HackathonService{}
	inTime, err := hackathonService.CheckStageTime(vote.HackathonID, "voting")
	if err != nil {
		return errors.New("投票阶段时间未设置")
	}
	if !inTime {
		return errors.New("不在投票时间范围内")
	}

	// 尝试调用链上撤销投票
	// 注意：由于我们使用服务端私钥代为发送投票，链上的投票者地址是服务端地址
	// 因此可以使用服务端私钥调用 revokeVote 来撤销链上投票
	voteBlockchainService, err := NewVoteBlockchainService()
	if err != nil {
		fmt.Printf("初始化投票合约服务失败: %v，仅执行链下删除\n", err)
	} else {
		defer voteBlockchainService.Close()

		// 检查活动是否已在链上注册
		isRegistered, err := voteBlockchainService.IsEventRegistered(vote.HackathonID)
		if err != nil {
			fmt.Printf("检查活动注册状态失败: %v，仅执行链下删除\n", err)
		} else if !isRegistered {
			fmt.Printf("活动 %d 未在链上注册，仅执行链下删除\n", vote.HackathonID)
		} else {
			var voteID uint64 = 0

			// 如果有链上投票ID，直接使用
			if vote.ChainVoteID != nil && *vote.ChainVoteID > 0 {
				voteID = *vote.ChainVoteID
			} else {
				// 如果没有投票ID，尝试通过服务端地址查询
				// 由于我们使用服务端私钥代为发送，链上的投票者地址是服务端地址
				serverAddress := voteBlockchainService.GetServerAddress()
				voteIDs, err := voteBlockchainService.GetUserVotesInEvent(serverAddress, vote.HackathonID)
				if err != nil {
					fmt.Printf("查询服务端地址的投票ID失败: %v\n", err)
				} else {
					// 遍历投票ID，找到对应的 projectId 匹配的投票
					for _, id := range voteIDs {
						record, err := voteBlockchainService.GetVoteRecord(id)
						if err != nil {
							continue
						}
						// 检查是否匹配当前作品ID
						if record["project_id"].(uint64) == submissionID && record["is_active"].(bool) && !record["is_revoked"].(bool) {
							voteID = id
							break
						}
					}
				}
			}

			if voteID > 0 {
				// 尝试撤销链上投票
				revokeTxHash, err := voteBlockchainService.RevokeVote(voteID)
				if err != nil {
					// 如果链上撤销失败，记录日志但不阻止链下删除
					fmt.Printf("链上撤销投票失败: %v，交易哈希: %s，继续执行链下删除\n", err, revokeTxHash)
					// 更新数据库中的链上状态为撤销失败
					database.DB.Model(&vote).Updates(map[string]interface{}{
						"chain_status": "revoke_failed",
					})
				} else {
					// 链上撤销交易已发送成功
					fmt.Printf("链上撤销投票交易已发送: voteId=%d, txHash=%s\n", voteID, revokeTxHash)
					// 更新数据库中的链上状态为撤销中
					database.DB.Model(&vote).Updates(map[string]interface{}{
						"chain_status": "revoking",
						"chain_tx_hash": revokeTxHash, // 更新为撤销交易的哈希
					})
				}
			} else {
				// 如果没有找到投票ID，记录日志
				if vote.ChainTxHash != "" {
					fmt.Printf("投票记录有链上交易哈希 %s 但无法找到对应的投票ID，无法撤销链上投票，仅执行链下删除\n", vote.ChainTxHash)
				} else {
					fmt.Printf("投票记录没有链上数据，无法撤销链上投票，仅执行链下删除\n")
				}
			}
		}
	}

	// 软删除投票记录（链下），而不是硬删除
	// 这样可以保持与链上 totalVotes 的一致性（链上 totalVotes 不会减少）
	now := time.Now()
	return database.DB.Model(&vote).Update("deleted_at", now).Error
}

// GetMyVotes 获取我的投票记录
func (s *VoteService) GetMyVotes(hackathonID, participantID uint64) ([]models.Vote, error) {
	var votes []models.Vote
	// 只返回有效的投票记录（未撤销的）
	if err := database.DB.Preload("Submission").Preload("Submission.Team").
		Where("hackathon_id = ? AND participant_id = ? AND deleted_at IS NULL", hackathonID, participantID).
		Find(&votes).Error; err != nil {
		return nil, err
	}

	return votes, nil
}

// GetVoteCount 获取作品得票数（只统计有效投票，不包括已撤销的）
func (s *VoteService) GetVoteCount(submissionID uint64) (int64, error) {
	var count int64
	// 只统计未删除的投票记录（deleted_at IS NULL）
	if err := database.DB.Model(&models.Vote{}).Where("submission_id = ? AND deleted_at IS NULL", submissionID).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// GetResults 获取比赛结果
func (s *VoteService) GetResults(hackathonID uint64) ([]map[string]interface{}, error) {
	// 检查活动状态
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return nil, errors.New("活动不存在")
	}

	if hackathon.Status != "results" {
		return nil, errors.New("结果尚未公布")
	}

	// 获取所有提交的作品及其得票数
	var submissions []models.Submission
	if err := database.DB.Preload("Team").Preload("Team.Members").Preload("Team.Members.Participant").
		Where("hackathon_id = ? AND draft = 0", hackathonID).Find(&submissions).Error; err != nil {
		return nil, err
	}

	// 获取奖项设置
	var awards []models.HackathonAward
	if err := database.DB.Where("hackathon_id = ?", hackathonID).Order("`rank` ASC").Find(&awards).Error; err != nil {
		return nil, err
	}

	// 计算每个作品的得票数并排序
	type SubmissionWithVotes struct {
		Submission models.Submission
		VoteCount  int64
	}

	var submissionsWithVotes []SubmissionWithVotes
	for _, submission := range submissions {
		voteCount, _ := s.GetVoteCount(submission.ID)
		submissionsWithVotes = append(submissionsWithVotes, SubmissionWithVotes{
			Submission: submission,
			VoteCount:  voteCount,
		})
	}

	// 按得票数排序（降序）
	for i := 0; i < len(submissionsWithVotes)-1; i++ {
		for j := i + 1; j < len(submissionsWithVotes); j++ {
			if submissionsWithVotes[i].VoteCount < submissionsWithVotes[j].VoteCount {
				submissionsWithVotes[i], submissionsWithVotes[j] = submissionsWithVotes[j], submissionsWithVotes[i]
			}
		}
	}

	// 构建结果
	results := make([]map[string]interface{}, 0)
	for rank, item := range submissionsWithVotes {
		result := map[string]interface{}{
			"rank":       rank + 1,
			"team":       item.Submission.Team,
			"submission": item.Submission,
			"vote_count": item.VoteCount,
			"award":      nil,
		}

		// 分配奖项
		if rank < len(awards) {
			result["award"] = awards[rank]
		}

		results = append(results, result)
	}

	return results, nil
}

