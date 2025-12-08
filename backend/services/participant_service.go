package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"hackathon-backend/database"
	"hackathon-backend/models"
	"hackathon-backend/utils"

	"github.com/ethereum/go-ethereum/crypto"
	"gorm.io/gorm"
)

type ParticipantService struct{}

// GenerateNonce 生成随机nonce
func (s *ParticipantService) GenerateNonce() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// ConnectWallet 连接钱包，获取nonce
func (s *ParticipantService) ConnectWallet(walletAddress string) (string, error) {
	var participant models.Participant

	// 查找或创建参赛者
	err := database.DB.Where("wallet_address = ? AND deleted_at IS NULL", walletAddress).First(&participant).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		// 创建新参赛者
		participant = models.Participant{
			WalletAddress: walletAddress,
		}
		if err := database.DB.Create(&participant).Error; err != nil {
			return "", fmt.Errorf("创建参赛者失败: %w", err)
		}
	} else if err != nil {
		return "", err
	}

	// 生成nonce
	nonce, err := s.GenerateNonce()
	if err != nil {
		return "", fmt.Errorf("生成nonce失败: %w", err)
	}

	// 更新nonce
	participant.Nonce = nonce
	if err := database.DB.Save(&participant).Error; err != nil {
		return "", fmt.Errorf("更新nonce失败: %w", err)
	}

	return nonce, nil
}

// VerifySignature 验证签名并登录
func (s *ParticipantService) VerifySignature(walletAddress, signature string) (*models.Participant, string, error) {
	var participant models.Participant
	if err := database.DB.Where("wallet_address = ? AND deleted_at IS NULL", walletAddress).First(&participant).Error; err != nil {
		return nil, "", errors.New("钱包地址未注册")
	}

	if participant.Nonce == "" {
		return nil, "", errors.New("请先获取nonce")
	}

	// 验证签名
	if err := s.verifyEthereumSignature(walletAddress, participant.Nonce, signature); err != nil {
		return nil, "", fmt.Errorf("签名验证失败: %w", err)
	}

	// 更新最后登录时间
	now := time.Now()
	participant.LastLoginAt = &now
	participant.Nonce = "" // 清除nonce
	if err := database.DB.Save(&participant).Error; err != nil {
		return nil, "", fmt.Errorf("更新登录信息失败: %w", err)
	}

	// 生成token
	token, err := utils.GenerateParticipantToken(participant.ID, participant.WalletAddress)
	if err != nil {
		return nil, "", fmt.Errorf("生成token失败: %w", err)
	}

	return &participant, token, nil
}

// verifyEthereumSignature 验证以太坊签名
// 签名消息格式: "\x19Ethereum Signed Message:\n" + len(message) + message
// message = "Please sign this message to authenticate: {nonce}"
func (s *ParticipantService) verifyEthereumSignature(walletAddress, nonce, signature string) error {
	// 构建签名消息
	message := fmt.Sprintf("Please sign this message to authenticate: %s", nonce)
	messageHash := crypto.Keccak256Hash([]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)))

	// 移除0x前缀并解析签名
	sig := strings.TrimPrefix(signature, "0x")
	if len(sig) != 130 {
		return errors.New("签名格式错误")
	}

	sigBytes, err := hex.DecodeString(sig)
	if err != nil {
		return fmt.Errorf("解析签名失败: %w", err)
	}

	// 恢复公钥
	if sigBytes[64] != 27 && sigBytes[64] != 28 {
		return errors.New("签名恢复ID无效")
	}
	sigBytes[64] -= 27 // 转换为0或1

	recoveredPubKey, err := crypto.SigToPub(messageHash.Bytes(), sigBytes)
	if err != nil {
		return fmt.Errorf("恢复公钥失败: %w", err)
	}

	// 从公钥恢复地址
	recoveredAddress := crypto.PubkeyToAddress(*recoveredPubKey)

	// 验证地址是否匹配（不区分大小写）
	if !strings.EqualFold(recoveredAddress.Hex(), walletAddress) {
		return errors.New("签名地址不匹配")
	}

	return nil
}

