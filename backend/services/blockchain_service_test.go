package services

import (
	"os"
	"testing"

	"hackathon-backend/config"
)

// TestBlockchainServiceInitialization 测试区块链服务初始化
func TestBlockchainServiceInitialization(t *testing.T) {
	// 先加载配置
	if err := config.LoadConfig(); err != nil {
		t.Skipf("Skipping test: config not available: %v", err)
	}

	// 测试没有私钥时的错误处理
	os.Unsetenv("BLOCKCHAIN_PRIVATE_KEY")
	
	_, err := NewBlockchainService()
	if err == nil {
		t.Error("Expected error when BLOCKCHAIN_PRIVATE_KEY is not set")
	}
	
	t.Logf("Got expected error: %v", err)
}

// TestBlockchainServiceWithInvalidKey 测试无效私钥
func TestBlockchainServiceWithInvalidKey(t *testing.T) {
	// 先加载配置
	if err := config.LoadConfig(); err != nil {
		t.Skipf("Skipping test: config not available: %v", err)
	}

	// 设置无效的私钥
	os.Setenv("BLOCKCHAIN_PRIVATE_KEY", "invalid_key")
	defer os.Unsetenv("BLOCKCHAIN_PRIVATE_KEY")
	
	_, err := NewBlockchainService()
	if err == nil {
		t.Error("Expected error when private key is invalid")
	}
	
	t.Logf("Got expected error: %v", err)
}
