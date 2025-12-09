package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	baseURL    = "http://localhost:8000/api/v1/admin"
	adminEmail = "admin@test.com"
	adminPass  = "Admin123456"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    struct {
		Token string `json:"token"`
		User  struct {
			ID   uint64 `json:"id"`
			Role string `json:"role"`
		} `json:"user"`
	} `json:"data"`
}

type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Phone    string `json:"phone,omitempty"`
}

type CreateHackathonRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	LocationType string `json:"location_type"`
	LocationDetail string `json:"location_detail,omitempty"`
	MaxTeamSize  int    `json:"max_team_size"`
}

func main() {
	fmt.Println("开始创建测试数据...")

	// 1. 登录获取token
	token, err := login()
	if err != nil {
		fmt.Printf("登录失败: %v\n", err)
		return
	}
	fmt.Println("登录成功")

	// 2. 创建测试用户（25个主办方 + 25个赞助商，用于分页测试）
	fmt.Println("创建测试用户...")
	organizerID := uint64(0)
	
	// 先创建测试脚本需要的特定用户
	// 创建 organizer1@test.com
	userReq1 := CreateUserRequest{
		Name:     "主办方用户1",
		Email:    "organizer1@test.com",
		Password: "Organizer123456",
		Role:     "organizer",
		Phone:    "13800000001",
	}
	id1, err := createUser(token, userReq1)
	if err != nil {
		fmt.Printf("创建organizer1失败: %v\n", err)
	} else {
		organizerID = id1
		fmt.Printf("创建organizer1成功 (ID: %d)\n", id1)
	}
	
	// 创建 sponsor@test.com（测试脚本需要）
	userReqSponsor := CreateUserRequest{
		Name:     "赞助商用户",
		Email:    "sponsor@test.com",
		Password: "Sponsor123456",
		Role:     "sponsor",
		Phone:    "13900000000",
	}
	_, err = createUser(token, userReqSponsor)
	if err != nil {
		fmt.Printf("创建sponsor@test.com失败: %v\n", err)
	} else {
		fmt.Printf("创建sponsor@test.com成功\n")
	}
	
	for i := 1; i <= 25; i++ {
		userReq := CreateUserRequest{
			Name:     fmt.Sprintf("主办方用户%d", i),
			Email:    fmt.Sprintf("organizer%d@test.com", i),
			Password: "Organizer123456",
			Role:     "organizer",
			Phone:    fmt.Sprintf("1380000%04d", i),
		}
		id, err := createUser(token, userReq)
		if err != nil {
			fmt.Printf("创建主办方用户%d失败: %v\n", i, err)
		} else {
			if i == 1 {
				organizerID = id
			}
			fmt.Printf("创建主办方用户%d成功 (ID: %d)\n", i, id)
		}
		time.Sleep(100 * time.Millisecond)
	}

	for i := 1; i <= 25; i++ {
		userReq := CreateUserRequest{
			Name:     fmt.Sprintf("赞助商用户%d", i),
			Email:    fmt.Sprintf("sponsor%d@test.com", i),
			Password: "Sponsor123456",
			Role:     "sponsor",
			Phone:    fmt.Sprintf("1390000%04d", i),
		}
		id, err := createUser(token, userReq)
		if err != nil {
			fmt.Printf("创建赞助商用户%d失败: %v\n", i, err)
		} else {
			fmt.Printf("创建赞助商用户%d成功 (ID: %d)\n", i, id)
		}
		time.Sleep(100 * time.Millisecond)
	}

	// 3. 使用organizer1登录创建活动
	if organizerID == 0 {
		fmt.Println("未找到organizer1，无法创建活动")
		return
	}

	fmt.Println("使用organizer1登录创建活动...")
	organizerToken, err := loginWithCredentials("organizer1@test.com", "Organizer123456")
	if err != nil {
		fmt.Printf("organizer1登录失败: %v\n", err)
		return
	}

	// 创建30个活动用于分页测试
	statuses := []string{"preparation", "published", "registration", "checkin", "team_formation", "submission", "voting", "results"}
	locationTypes := []string{"online", "offline", "hybrid"}

	for i := 1; i <= 30; i++ {
		now := time.Now()
		startTime := now.AddDate(0, 0, i)
		endTime := now.AddDate(0, 0, i+7)

		hackathonReq := CreateHackathonRequest{
			Name:         fmt.Sprintf("测试活动%d", i),
			Description:  fmt.Sprintf("这是第%d个测试活动的描述", i),
			StartTime:    startTime.Format(time.RFC3339),
			EndTime:      endTime.Format(time.RFC3339),
			LocationType: locationTypes[i%3],
			MaxTeamSize:  3 + (i % 5),
		}

		if i%3 != 0 {
			hackathonReq.LocationDetail = fmt.Sprintf("测试地点%d", i)
		}

		id, err := createHackathon(organizerToken, hackathonReq)
		if err != nil {
			fmt.Printf("创建活动%d失败: %v\n", i, err)
		} else {
			fmt.Printf("创建活动%d成功 (ID: %d)\n", i, id)

			// 如果活动状态不是preparation，需要更新状态
			status := statuses[i%8]
			if status != "preparation" {
				// 这里可以添加更新活动状态的逻辑
				// 由于需要先发布活动才能切换状态，暂时跳过
			}
		}
		time.Sleep(100 * time.Millisecond)
	}

	fmt.Println("测试数据创建完成！")
}

func login() (string, error) {
	return loginWithCredentials(adminEmail, adminPass)
}

func loginWithCredentials(email, password string) (string, error) {
	reqBody := LoginRequest{
		Email:    email,
		Password: password,
	}
	jsonData, _ := json.Marshal(reqBody)

	resp, err := http.Post(baseURL+"/auth/login", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("登录失败: %s", string(body))
	}

	var loginResp LoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&loginResp); err != nil {
		return "", err
	}

	return loginResp.Data.Token, nil
}

func createUser(token string, req CreateUserRequest) (uint64, error) {
	jsonData, _ := json.Marshal(req)

	httpReq, _ := http.NewRequest("POST", baseURL+"/users", bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("创建用户失败: %s", string(body))
	}

	var result struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			ID uint64 `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, fmt.Errorf("解析响应失败: %v", err)
	}

	return result.Data.ID, nil
}

func createHackathon(token string, req CreateHackathonRequest) (uint64, error) {
	jsonData, _ := json.Marshal(req)

	httpReq, _ := http.NewRequest("POST", baseURL+"/hackathons", bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("创建活动失败: %s", string(body))
	}

	var result struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			ID uint64 `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, fmt.Errorf("解析响应失败: %v", err)
	}

	return result.Data.ID, nil
}

