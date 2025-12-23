package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"gopkg.in/yaml.v3"
)

type Config struct {
	DBHost         string   `yaml:"-"` // 不从YAML直接读取，从database子结构读取
	DBPort         string   `yaml:"-"`
	DBUser         string   `yaml:"-"`
	DBPassword     string   `yaml:"-"`
	DBName         string   `yaml:"-"`
	JWTSecret      string   `yaml:"-"`
	JWTExpireHours int      `yaml:"-"`
	ServerPort     string   `yaml:"-"`
	ServerMode     string   `yaml:"-"`
	CORSOrigins    []string `yaml:"-"`
	TestWallets    []string `yaml:"-"` // 测试钱包地址列表

	// 区块链配置
	BlockchainNetwork        string `yaml:"-"`
	BlockchainRPCURL         string `yaml:"-"`
	ChainID                  int64  `yaml:"-"`
	PrivateKey               string `yaml:"-"`
	HackathonPlatformContract string `yaml:"-"`
	HackathonEventContract    string `yaml:"-"`
	PrizePoolContract         string `yaml:"-"`
	HackathonNFTContract      string `yaml:"-"`

	// YAML配置结构
	Database struct {
		Host     string `yaml:"host"`
		Port     string `yaml:"port"`
		User     string `yaml:"user"`
		Password string `yaml:"password"`
		Name     string `yaml:"name"`
	} `yaml:"database"`
	JWT struct {
		Secret      string `yaml:"secret"`
		ExpireHours int    `yaml:"expire_hours"`
	} `yaml:"jwt"`
	Server struct {
		Port string `yaml:"port"`
		Mode string `yaml:"mode"`
	} `yaml:"server"`
	CORS struct {
		AllowOrigins []string `yaml:"allow_origins"`
	} `yaml:"cors"`
	Blockchain struct {
		Network string `yaml:"network"`
		RPCURL  string `yaml:"rpc_url"`
		ChainID int64  `yaml:"chain_id"`
	} `yaml:"blockchain"`
	Contracts struct {
		HackathonPlatform string `yaml:"hackathon_platform"`
		HackathonEvent    string `yaml:"hackathon_event"`
		PrizePool         string `yaml:"prize_pool"`
		HackathonNFT      string `yaml:"hackathon_nft"`
	} `yaml:"contracts"`
	Deployment struct {
		Deployer   string `yaml:"deployer"`
		DeployedAt string `yaml:"deployed_at"`
	} `yaml:"deployment"`
}

var AppConfig *Config

// LoadConfig 加载配置文件
// 优先级：config.yaml > .env > 默认值
func LoadConfig() error {
	// 默认配置
	defaultConfig := &Config{
		DBHost:         "localhost",
		DBPort:         "3306",
		DBUser:         "root",
		DBPassword:     "password",
		DBName:         "hackathon_db",
		JWTSecret:      "your-secret-key-change-in-production",
		JWTExpireHours: 24,
		ServerPort:     "8000",
		ServerMode:     "debug",
		CORSOrigins:    []string{"http://localhost:3000", "http://localhost:3001"},
		TestWallets: []string{
			"0x1111111111111111111111111111111111111111",
			"0x2222222222222222222222222222222222222222",
			"0x3333333333333333333333333333333333333333",
			"0x4444444444444444444444444444444444444444",
			"0x5555555555555555555555555555555555555555",
		},
		// 区块链默认配置
		BlockchainNetwork: "sepolia",
		BlockchainRPCURL:  "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID",
		ChainID:           11155111,
		PrivateKey:        "", // 需要从环境变量设置
	}

	// 设置默认合约地址
	defaultConfig.HackathonPlatformContract = "0x3231E959664609b55Ef0bdd483e414B54c510E74"
	defaultConfig.HackathonEventContract = "0x413EfD5873c5bD7D985BF0934d2E00f00315c52c"
	defaultConfig.PrizePoolContract = "0x089351624799f31817faB699f7eeb18BC4101759"
	defaultConfig.HackathonNFTContract = "0x0A4CB10f7666142055CE8D955125C05E8A6Ef5ff"

	// 尝试从YAML配置文件加载
	configFile := "config.yaml"
	if _, err := os.Stat(configFile); err == nil {
		if err := loadFromYAML(configFile, defaultConfig); err != nil {
			return fmt.Errorf("加载配置文件失败: %w", err)
		}
	}

	// 尝试加载.env文件（如果存在），用于覆盖配置
	_ = godotenv.Load()

	// 从环境变量覆盖配置（如果设置了环境变量）
	testWallets := defaultConfig.TestWallets
	if envWallets := getEnv("TEST_WALLETS", ""); envWallets != "" {
		testWallets = getEnvAsSlice("TEST_WALLETS", defaultConfig.TestWallets)
	}

	AppConfig = &Config{
		DBHost:         getEnv("DB_HOST", defaultConfig.DBHost),
		DBPort:         getEnv("DB_PORT", defaultConfig.DBPort),
		DBUser:         getEnv("DB_USER", defaultConfig.DBUser),
		DBPassword:     getEnv("DB_PASSWORD", defaultConfig.DBPassword),
		DBName:         getEnv("DB_NAME", defaultConfig.DBName),
		JWTSecret:      getEnv("JWT_SECRET", defaultConfig.JWTSecret),
		JWTExpireHours: getEnvAsInt("JWT_EXPIRE_HOURS", defaultConfig.JWTExpireHours),
		ServerPort:     getEnv("SERVER_PORT", defaultConfig.ServerPort),
		ServerMode:     getEnv("SERVER_MODE", defaultConfig.ServerMode),
		CORSOrigins:    getEnvAsSlice("CORS_ALLOW_ORIGINS", defaultConfig.CORSOrigins),
		TestWallets:    testWallets,
		
		// 区块链配置
		BlockchainNetwork:         getEnv("BLOCKCHAIN_NETWORK", defaultConfig.BlockchainNetwork),
		BlockchainRPCURL:          getEnv("BLOCKCHAIN_RPC_URL", defaultConfig.BlockchainRPCURL),
		ChainID:                   getEnvAsInt64("CHAIN_ID", defaultConfig.ChainID),
		PrivateKey:                getEnv("PRIVATE_KEY", defaultConfig.PrivateKey),
		HackathonPlatformContract: getEnv("CONTRACT_HACKATHON_PLATFORM", defaultConfig.HackathonPlatformContract),
		HackathonEventContract:    getEnv("CONTRACT_HACKATHON_EVENT", defaultConfig.HackathonEventContract),
		PrizePoolContract:         getEnv("CONTRACT_PRIZE_POOL", defaultConfig.PrizePoolContract),
		HackathonNFTContract:      getEnv("CONTRACT_HACKATHON_NFT", defaultConfig.HackathonNFTContract),
	}

	return nil
}

// loadFromYAML 从YAML文件加载配置
func loadFromYAML(filename string, defaultConfig *Config) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	var yamlConfig Config
	if err := yaml.Unmarshal(data, &yamlConfig); err != nil {
		return fmt.Errorf("解析YAML配置失败: %w", err)
	}

	// 合并配置（YAML中的值覆盖默认值）
	if yamlConfig.Database.Host != "" {
		defaultConfig.DBHost = yamlConfig.Database.Host
	}
	if yamlConfig.Database.Port != "" {
		defaultConfig.DBPort = yamlConfig.Database.Port
	}
	if yamlConfig.Database.User != "" {
		defaultConfig.DBUser = yamlConfig.Database.User
	}
	if yamlConfig.Database.Password != "" {
		defaultConfig.DBPassword = yamlConfig.Database.Password
	}
	if yamlConfig.Database.Name != "" {
		defaultConfig.DBName = yamlConfig.Database.Name
	}
	if yamlConfig.JWT.Secret != "" {
		defaultConfig.JWTSecret = yamlConfig.JWT.Secret
	}
	if yamlConfig.JWT.ExpireHours > 0 {
		defaultConfig.JWTExpireHours = yamlConfig.JWT.ExpireHours
	}
	if yamlConfig.Server.Port != "" {
		defaultConfig.ServerPort = yamlConfig.Server.Port
	}
	if yamlConfig.Server.Mode != "" {
		defaultConfig.ServerMode = yamlConfig.Server.Mode
	}
	if len(yamlConfig.CORS.AllowOrigins) > 0 {
		defaultConfig.CORSOrigins = yamlConfig.CORS.AllowOrigins
	}

	// 区块链配置
	if yamlConfig.Blockchain.Network != "" {
		defaultConfig.BlockchainNetwork = yamlConfig.Blockchain.Network
	}
	if yamlConfig.Blockchain.RPCURL != "" {
		defaultConfig.BlockchainRPCURL = yamlConfig.Blockchain.RPCURL
	}
	if yamlConfig.Blockchain.ChainID > 0 {
		defaultConfig.ChainID = yamlConfig.Blockchain.ChainID
	}

	// 合约地址配置
	if yamlConfig.Contracts.HackathonPlatform != "" {
		defaultConfig.HackathonPlatformContract = yamlConfig.Contracts.HackathonPlatform
	}
	if yamlConfig.Contracts.HackathonEvent != "" {
		defaultConfig.HackathonEventContract = yamlConfig.Contracts.HackathonEvent
	}
	if yamlConfig.Contracts.PrizePool != "" {
		defaultConfig.PrizePoolContract = yamlConfig.Contracts.PrizePool
	}
	if yamlConfig.Contracts.HackathonNFT != "" {
		defaultConfig.HackathonNFTContract = yamlConfig.Contracts.HackathonNFT
	}

	return nil
}

// LoadConfigFromPath 从指定路径加载配置文件
func LoadConfigFromPath(configPath string) error {
	// 获取配置文件所在目录
	configDir := filepath.Dir(configPath)
	if configDir == "." {
		configDir, _ = os.Getwd()
	}

	// 切换到配置文件所在目录
	originalDir, _ := os.Getwd()
	defer os.Chdir(originalDir)
	os.Chdir(configDir)

	// 加载配置
	return LoadConfig()
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		var result int
		if _, err := fmt.Sscanf(value, "%d", &result); err == nil {
			return result
		}
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// 简单的逗号分隔处理
		var result []string
		start := 0
		for i, char := range value {
			if char == ',' {
				if i > start {
					result = append(result, value[start:i])
				}
				start = i + 1
			}
		}
		if start < len(value) {
			result = append(result, value[start:])
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}
func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		var result int64
		if _, err := fmt.Sscanf(value, "%d", &result); err == nil {
			return result
		}
	}
	return defaultValue
}