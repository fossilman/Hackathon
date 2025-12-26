package services

import (
	"fmt"
	"time"

	"hackathon-backend/database"
	"hackathon-backend/models"
)

type VerificationService struct{}

// VerificationReport 验证报告结构
type VerificationReport struct {
	HackathonID     uint64                 `json:"hackathon_id"`
	VerifiedAt      time.Time              `json:"verified_at"`
	IsValid         bool                   `json:"is_valid"`
	Summary         string                 `json:"summary"`
	EventVerification *EventVerification   `json:"event_verification,omitempty"`
	VotesVerification *VotesVerification   `json:"votes_verification,omitempty"`
	Issues          []string               `json:"issues,omitempty"`
}

// EventVerification 活动信息验证结果
type EventVerification struct {
	IsValid         bool                   `json:"is_valid"`
	DatabaseData    map[string]any `json:"database_data"`
	BlockchainData  map[string]any `json:"blockchain_data"`
	Differences     []string               `json:"differences,omitempty"`
}

// VotesVerification 投票记录验证结果
type VotesVerification struct {
	IsValid            bool     `json:"is_valid"`
	TotalVotesDB       int      `json:"total_votes_db"`
	TotalVotesChain    int      `json:"total_votes_chain"`
	VerifiedVoters     int      `json:"verified_voters"`
	MismatchedVoters   []string `json:"mismatched_voters,omitempty"`
	Differences        []string `json:"differences,omitempty"`
}

// VerifyEventData 验证活动信息真实性
func (s *VerificationService) VerifyEventData(hackathonID uint64) (*VerificationReport, error) {
	// 1. 从数据库获取活动信息
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ?", hackathonID).First(&hackathon).Error; err != nil {
		return nil, fmt.Errorf("活动不存在")
	}

	// 检查活动是否已上链
	if hackathon.ChainEventID == 0 {
		return &VerificationReport{
			HackathonID: hackathonID,
			VerifiedAt:  time.Now(),
			IsValid:     false,
			Summary:     "活动未上链，无法验证",
			Issues:      []string{"活动未上链"},
		}, nil
	}

	// 2. 从区块链获取活动信息
	blockchainService, err := NewBlockchainService()
	if err != nil {
		return nil, fmt.Errorf("区块链服务初始化失败: %w", err)
	}
	defer blockchainService.Close()

	chainData, err := blockchainService.GetEvent(hackathon.ChainEventID)
	if err != nil {
		return nil, fmt.Errorf("获取链上活动信息失败: %w", err)
	}

	// 3. 对比数据
	dbData := map[string]any{
		"name":        hackathon.Name,
		"description": hackathon.Description,
		"location":    hackathon.LocationDetail,
		"start_time":  hackathon.StartTime,
		"end_time":    hackathon.EndTime,
	}

	differences := []string{}
	isValid := true

	// 对比名称
	if hackathon.Name != chainData["name"].(string) {
		differences = append(differences, fmt.Sprintf("活动名称不匹配: 数据库[%s] vs 链上[%s]",
			hackathon.Name, chainData["name"]))
		isValid = false
	}

	// 对比描述
	if hackathon.Description != chainData["description"].(string) {
		differences = append(differences, fmt.Sprintf("活动描述不匹配"))
		isValid = false
	}

	// 对比地点
	if hackathon.LocationDetail != chainData["location"].(string) {
		differences = append(differences, fmt.Sprintf("活动地点不匹配: 数据库[%s] vs 链上[%s]",
			hackathon.LocationDetail, chainData["location"]))
		isValid = false
	}

	// 对比时间（允许误差在1分钟内）
	dbStartTime := hackathon.StartTime
	chainStartTime := chainData["start_time"].(time.Time)
	if dbStartTime.Sub(chainStartTime).Abs() > time.Minute {
		differences = append(differences, fmt.Sprintf("开始时间不匹配: 数据库[%s] vs 链上[%s]",
			dbStartTime.Format("2006-01-02 15:04:05"), chainStartTime.Format("2006-01-02 15:04:05")))
		isValid = false
	}

	dbEndTime := hackathon.EndTime
	chainEndTime := chainData["end_time"].(time.Time)
	if dbEndTime.Sub(chainEndTime).Abs() > time.Minute {
		differences = append(differences, fmt.Sprintf("结束时间不匹配: 数据库[%s] vs 链上[%s]",
			dbEndTime.Format("2006-01-02 15:04:05"), chainEndTime.Format("2006-01-02 15:04:05")))
		isValid = false
	}

	// 构建验证报告
	summary := "活动信息验证通过"
	if !isValid {
		summary = fmt.Sprintf("活动信息验证失败，发现 %d 处不匹配", len(differences))
	}

	return &VerificationReport{
		HackathonID: hackathonID,
		VerifiedAt:  time.Now(),
		IsValid:     isValid,
		Summary:     summary,
		EventVerification: &EventVerification{
			IsValid:        isValid,
			DatabaseData:   dbData,
			BlockchainData: chainData,
			Differences:    differences,
		},
	}, nil
}

// VerifyVotesData 验证投票记录真实性
func (s *VerificationService) VerifyVotesData(hackathonID uint64) (*VerificationReport, error) {
	// 1. 从数据库获取活动信息
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ?", hackathonID).First(&hackathon).Error; err != nil {
		return nil, fmt.Errorf("活动不存在")
	}

	// 检查活动是否已上链
	if hackathon.ChainEventID == 0 {
		return &VerificationReport{
			HackathonID: hackathonID,
			VerifiedAt:  time.Now(),
			IsValid:     false,
			Summary:     "活动未上链，无法验证投票记录",
			Issues:      []string{"活动未上链"},
		}, nil
	}

	// 2. 从数据库获取投票记录
	var dbVotes []models.Vote
	if err := database.DB.Where("hackathon_id = ?", hackathonID).
		Preload("Participant").Find(&dbVotes).Error; err != nil {
		return nil, fmt.Errorf("获取投票记录失败: %w", err)
	}

	// 3. 初始化区块链服务
	blockchainService, err := NewBlockchainService()
	if err != nil {
		return nil, fmt.Errorf("区块链服务初始化失败: %w", err)
	}
	defer blockchainService.Close()

	// 4. 验证每个投票者的投票记录
	verifiedVoters := 0
	mismatchedVoters := []string{}
	differences := []string{}

	// 按投票者分组
	voterVotes := make(map[string][]models.Vote)
	for _, vote := range dbVotes {
		voterVotes[vote.Participant.WalletAddress] = append(voterVotes[vote.Participant.WalletAddress], vote)
	}

	// 验证每个投票者
	for walletAddress, votes := range voterVotes {
		// 从链上获取该投票者的投票记录
		chainVotes, err := blockchainService.GetUserVotes(hackathon.ChainEventID, walletAddress)
		if err != nil {
			differences = append(differences, fmt.Sprintf("无法获取投票者 %s 的链上投票记录: %v", walletAddress, err))
			mismatchedVoters = append(mismatchedVoters, walletAddress)
			continue
		}

		// 过滤掉已撤销的投票
		activeChainVotes := 0
		for _, chainVote := range chainVotes {
			if !chainVote.IsRevoked {
				activeChainVotes++
			}
		}

		// 对比投票数量
		if len(votes) != activeChainVotes {
			differences = append(differences, fmt.Sprintf("投票者 %s 的投票数量不匹配: 数据库[%d] vs 链上[%d]",
				walletAddress, len(votes), activeChainVotes))
			mismatchedVoters = append(mismatchedVoters, walletAddress)
		} else {
			verifiedVoters++
		}
	}

	isValid := len(mismatchedVoters) == 0

	summary := fmt.Sprintf("投票记录验证完成：验证 %d 位投票者，%d 位通过验证",
		len(voterVotes), verifiedVoters)
	if !isValid {
		summary += fmt.Sprintf("，%d 位存在不匹配", len(mismatchedVoters))
	}

	return &VerificationReport{
		HackathonID: hackathonID,
		VerifiedAt:  time.Now(),
		IsValid:     isValid,
		Summary:     summary,
		VotesVerification: &VotesVerification{
			IsValid:          isValid,
			TotalVotesDB:     len(dbVotes),
			TotalVotesChain:  0, // 需要遍历所有投票者才能获得总数
			VerifiedVoters:   verifiedVoters,
			MismatchedVoters: mismatchedVoters,
			Differences:      differences,
		},
	}, nil
}

// VerifyAll 验证活动的所有信息（活动信息+投票记录）
func (s *VerificationService) VerifyAll(hackathonID uint64) (*VerificationReport, error) {
	// 1. 验证活动信息
	eventReport, err := s.VerifyEventData(hackathonID)
	if err != nil {
		return nil, err
	}

	// 2. 验证投票记录
	votesReport, err := s.VerifyVotesData(hackathonID)
	if err != nil {
		return nil, err
	}

	// 3. 合并验证结果
	isValid := eventReport.IsValid && votesReport.IsValid
	issues := []string{}
	if !eventReport.IsValid {
		issues = append(issues, "活动信息验证失败")
	}
	if !votesReport.IsValid {
		issues = append(issues, "投票记录验证失败")
	}

	summary := "所有信息验证通过"
	if !isValid {
		summary = fmt.Sprintf("验证失败，发现 %d 个问题", len(issues))
	}

	return &VerificationReport{
		HackathonID:       hackathonID,
		VerifiedAt:        time.Now(),
		IsValid:           isValid,
		Summary:           summary,
		EventVerification: eventReport.EventVerification,
		VotesVerification: votesReport.VotesVerification,
		Issues:            issues,
	}, nil
}
