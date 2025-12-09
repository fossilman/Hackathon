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
	Token string `json:"token"`
}

type UserItem struct {
	ID    uint64 `json:"id"`
	Email string `json:"email"`
}

type UserListResponse struct {
	List []UserItem `json:"list"`
}

type HackathonItem struct {
	ID   uint64 `json:"id"`
	Name string `json:"name"`
}

type HackathonListResponse struct {
	List []HackathonItem `json:"list"`
}

func main() {
	fmt.Println("开始清理测试数据...")

	// 1. 登录获取token
	token, err := login()
	if err != nil {
		fmt.Printf("登录失败: %v\n", err)
		return
	}
	fmt.Println("登录成功")

	// 2. 删除测试用户
	fmt.Println("删除测试用户...")
	page := 1
	pageSize := 100

	for {
		users, err := getUserList(token, page, pageSize)
		if err != nil {
			fmt.Printf("获取用户列表失败: %v\n", err)
			break
		}

		if len(users) == 0 {
			break
		}

			for _, user := range users {
				// 删除测试用户（organizer1-25, sponsor1-25）
				email := user.Email
				if (email >= "organizer1@test.com" && email <= "organizer25@test.com") ||
					(email >= "sponsor1@test.com" && email <= "sponsor25@test.com") {
					if err := deleteUser(token, user.ID); err != nil {
						fmt.Printf("删除用户 %s (ID: %d) 失败: %v\n", email, user.ID, err)
					} else {
						fmt.Printf("删除用户 %s (ID: %d) 成功\n", email, user.ID)
					}
					time.Sleep(50 * time.Millisecond)
				}
			}

		if len(users) < pageSize {
			break
		}
		page++
	}

	// 3. 使用organizer1登录删除活动
	fmt.Println("使用organizer1登录删除活动...")
	organizerToken, err := loginWithCredentials("organizer1@test.com", "Organizer123456")
	if err != nil {
		fmt.Printf("organizer1登录失败: %v\n", err)
	} else {
		page = 1
		for {
			hackathons, err := getHackathonList(organizerToken, page, pageSize)
			if err != nil {
				fmt.Printf("获取活动列表失败: %v\n", err)
				break
			}

			if len(hackathons) == 0 {
				break
			}

			for _, hackathon := range hackathons {
				// 删除测试活动（测试活动1-30）
				name := hackathon.Name
				if name >= "测试活动1" && name <= "测试活动30" {
					if err := deleteHackathon(organizerToken, hackathon.ID); err != nil {
						fmt.Printf("删除活动 %s (ID: %d) 失败: %v\n", name, hackathon.ID, err)
					} else {
						fmt.Printf("删除活动 %s (ID: %d) 成功\n", name, hackathon.ID)
					}
					time.Sleep(50 * time.Millisecond)
				}
			}

			if len(hackathons) < pageSize {
				break
			}
			page++
		}
	}

	fmt.Println("测试数据清理完成！")
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

	return loginResp.Token, nil
}

func getUserList(token string, page, pageSize int) ([]UserItem, error) {
	url := fmt.Sprintf("%s/users?page=%d&page_size=%d", baseURL, page, pageSize)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("获取用户列表失败: %s", string(body))
	}

	var result UserListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.List, nil
}

func getHackathonList(token string, page, pageSize int) ([]HackathonItem, error) {
	url := fmt.Sprintf("%s/hackathons?page=%d&page_size=%d", baseURL, page, pageSize)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("获取活动列表失败: %s", string(body))
	}

	var result HackathonListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.List, nil
}

func deleteUser(token string, id uint64) error {
	url := fmt.Sprintf("%s/users/%d", baseURL, id)
	req, _ := http.NewRequest("DELETE", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("删除用户失败: %s", string(body))
	}

	return nil
}

func deleteHackathon(token string, id uint64) error {
	url := fmt.Sprintf("%s/hackathons/%d", baseURL, id)
	req, _ := http.NewRequest("DELETE", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("删除活动失败: %s", string(body))
	}

	return nil
}

