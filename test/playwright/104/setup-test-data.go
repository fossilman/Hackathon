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
	Name         string            `json:"name"`
	Description  string            `json:"description"`
	StartTime    string            `json:"start_time"`
	EndTime      string            `json:"end_time"`
	LocationType string            `json:"location_type"`
	LocationDetail string          `json:"location_detail,omitempty"`
	MaxTeamSize  int               `json:"max_team_size"`
	Stages       []HackathonStage  `json:"stages"`
	Awards       []HackathonAward  `json:"awards"`
}

type HackathonStage struct {
	Stage     string `json:"stage"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

type HackathonAward struct {
	Name     string `json:"name"`
	Prize    string `json:"prize"`
	Quantity int    `json:"quantity"`
	Rank     int    `json:"rank"`
}

func main() {
	fmt.Println("开始创建 PRD104 测试数据...")

	// 1. 登录获取token
	token, err := login()
	if err != nil {
		fmt.Printf("登录失败: %v\n", err)
		return
	}
	fmt.Println("登录成功")

	// 2. 创建主办方用户
	fmt.Println("创建主办方用户...")
	organizerID := uint64(0)
	
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
	
	time.Sleep(200 * time.Millisecond)

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

	// 4. 创建活动，覆盖各个阶段
	// 创建42个活动用于分页测试（每页12个，需要至少3页，42个可以测试4页）
	now := time.Now()
	statuses := []string{"published", "registration", "checkin", "team_formation", "submission", "voting", "results"}
	locationTypes := []string{"online", "offline", "hybrid"}

	// 为每个阶段创建6个活动（共42个）
	for stageIdx, status := range statuses {
		for i := 1; i <= 6; i++ {
			idx := stageIdx*6 + i
			
			// 计算活动时间（拉长时间范围，确保每个阶段都有测试数据）
			// 从60天前到90天后，确保时间跨度足够大
			daysOffset := idx - 60
			startTime := now.AddDate(0, 0, daysOffset)
			endTime := now.AddDate(0, 0, daysOffset+7)
			
			// 根据阶段设置阶段时间
			stages := createStagesForStatus(status, startTime, endTime)
			
			hackathonReq := CreateHackathonRequest{
				Name:         fmt.Sprintf("测试活动-%s-%d", status, idx),
				Description:  fmt.Sprintf("这是用于测试%s阶段的活动%d，描述内容较长，用于测试分页和搜索功能。", status, idx),
				StartTime:    startTime.Format(time.RFC3339),
				EndTime:      endTime.Format(time.RFC3339),
				LocationType: locationTypes[idx%3],
				MaxTeamSize:  3 + (idx % 5),
				Stages:       stages,
				Awards: []HackathonAward{
					{Name: "一等奖", Prize: "10000元", Quantity: 1, Rank: 1},
					{Name: "二等奖", Prize: "5000元", Quantity: 2, Rank: 2},
					{Name: "三等奖", Prize: "2000元", Quantity: 3, Rank: 3},
				},
			}

			if idx%3 != 0 {
				hackathonReq.LocationDetail = fmt.Sprintf("测试地点%d", idx)
			}

			id, err := createHackathon(organizerToken, hackathonReq)
			if err != nil {
				fmt.Printf("创建活动%d失败: %v\n", idx, err)
			} else {
				fmt.Printf("创建活动%d成功 (ID: %d, Status: %s)\n", idx, id, status)
				
				// 发布活动
				if err := publishHackathon(organizerToken, id); err != nil {
					fmt.Printf("发布活动%d失败: %v\n", id, err)
				} else {
					fmt.Printf("发布活动%d成功\n", id)
				}
				
				// 切换到相应阶段
				if status != "published" {
					if err := switchStage(organizerToken, id, status); err != nil {
						fmt.Printf("切换活动%d到%s阶段失败: %v\n", id, status, err)
					} else {
						fmt.Printf("切换活动%d到%s阶段成功\n", id, status)
					}
				}
			}
			time.Sleep(200 * time.Millisecond)
		}
	}

	fmt.Println("\n测试数据创建完成！")
	fmt.Println("已创建42个活动，覆盖所有阶段：")
	fmt.Println("- published: 6个")
	fmt.Println("- registration: 6个")
	fmt.Println("- checkin: 6个")
	fmt.Println("- team_formation: 6个")
	fmt.Println("- submission: 6个")
	fmt.Println("- voting: 6个")
	fmt.Println("- results: 6个")
	fmt.Println("\n活动时间范围：从60天前到90天后，确保每个阶段都有测试数据可用")
	fmt.Println("分页测试：每页12个活动，42个活动可以测试4页")
}

func createStagesForStatus(status string, startTime, endTime time.Time) []HackathonStage {
	// 根据活动状态创建相应的阶段时间
	// 每个阶段持续1-2天
	stages := []HackathonStage{}
	
	switch status {
	case "published":
		// 已发布但未开始报名
		return stages
	case "registration":
		// 报名阶段：现在开始，持续2天
		stages = append(stages, HackathonStage{
			Stage:     "registration",
			StartTime: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, 2).Format(time.RFC3339),
		})
	case "checkin":
		// 签到阶段：现在开始，持续1天
		stages = append(stages, HackathonStage{
			Stage:     "registration",
			StartTime: time.Now().AddDate(0, 0, -3).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -1).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "checkin",
			StartTime: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, 1).Format(time.RFC3339),
		})
	case "team_formation":
		// 组队阶段：现在开始，持续2天
		stages = append(stages, HackathonStage{
			Stage:     "registration",
			StartTime: time.Now().AddDate(0, 0, -5).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -3).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "checkin",
			StartTime: time.Now().AddDate(0, 0, -3).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -1).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "team_formation",
			StartTime: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, 2).Format(time.RFC3339),
		})
	case "submission":
		// 提交阶段：现在开始，持续3天
		stages = append(stages, HackathonStage{
			Stage:     "registration",
			StartTime: time.Now().AddDate(0, 0, -7).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -5).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "checkin",
			StartTime: time.Now().AddDate(0, 0, -5).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -3).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "team_formation",
			StartTime: time.Now().AddDate(0, 0, -3).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -1).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "submission",
			StartTime: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, 3).Format(time.RFC3339),
		})
	case "voting":
		// 投票阶段：现在开始，持续2天
		stages = append(stages, HackathonStage{
			Stage:     "registration",
			StartTime: time.Now().AddDate(0, 0, -10).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -8).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "checkin",
			StartTime: time.Now().AddDate(0, 0, -8).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -6).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "team_formation",
			StartTime: time.Now().AddDate(0, 0, -6).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -4).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "submission",
			StartTime: time.Now().AddDate(0, 0, -4).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -2).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "voting",
			StartTime: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, 2).Format(time.RFC3339),
		})
	case "results":
		// 公布结果阶段：所有阶段已完成
		stages = append(stages, HackathonStage{
			Stage:     "registration",
			StartTime: time.Now().AddDate(0, 0, -12).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -10).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "checkin",
			StartTime: time.Now().AddDate(0, 0, -10).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -8).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "team_formation",
			StartTime: time.Now().AddDate(0, 0, -8).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -6).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "submission",
			StartTime: time.Now().AddDate(0, 0, -6).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -4).Format(time.RFC3339),
		}, HackathonStage{
			Stage:     "voting",
			StartTime: time.Now().AddDate(0, 0, -4).Format(time.RFC3339),
			EndTime:   time.Now().AddDate(0, 0, -2).Format(time.RFC3339),
		})
	}
	
	return stages
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

func publishHackathon(token string, hackathonID uint64) error {
	httpReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/hackathons/%d/publish", baseURL, hackathonID), nil)
	httpReq.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("发布活动失败: %s", string(body))
	}

	return nil
}

func switchStage(token string, hackathonID uint64, stage string) error {
	httpReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/hackathons/%d/stages/%s/switch", baseURL, hackathonID, stage), nil)
	httpReq.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("切换阶段失败: %s", string(body))
	}

	return nil
}

