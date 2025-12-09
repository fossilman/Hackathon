package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const (
	baseURL    = "http://localhost:8000/api/v1/admin"
	adminEmail = "admin@hackathon.com"
	adminPass  = "admin123456"
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

type ResetPasswordRequest struct {
	Password string `json:"password"`
}

func main() {
	// 1. 登录获取token
	token, err := login()
	if err != nil {
		fmt.Printf("登录失败: %v\n", err)
		return
	}
	fmt.Println("登录成功")

	// 2. 查找 admin@test.com 用户
	userID, err := findUser(token, "admin@test.com")
	if err != nil {
		fmt.Printf("查找用户失败: %v\n", err)
		return
	}
	fmt.Printf("找到用户，ID: %d\n", userID)

	// 3. 重置密码
	err = resetPassword(token, userID, "Admin123456")
	if err != nil {
		fmt.Printf("重置密码失败: %v\n", err)
		return
	}
	fmt.Println("密码重置成功！")
}

func login() (string, error) {
	reqBody := LoginRequest{
		Email:    adminEmail,
		Password: adminPass,
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

func findUser(token, email string) (uint64, error) {
	httpReq, _ := http.NewRequest("GET", baseURL+"/users?keyword="+email, nil)
	httpReq.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("查找用户失败: %s", string(body))
	}

	var result struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			List []struct {
				ID    uint64 `json:"id"`
				Email string `json:"email"`
			} `json:"list"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, fmt.Errorf("解析响应失败: %v", err)
	}

	for _, user := range result.Data.List {
		if user.Email == email {
			return user.ID, nil
		}
	}

	return 0, fmt.Errorf("用户不存在")
}

func resetPassword(token string, userID uint64, newPassword string) error {
	reqBody := ResetPasswordRequest{
		Password: newPassword,
	}
	jsonData, _ := json.Marshal(reqBody)

	httpReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/users/%d/reset-password", baseURL, userID), bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("重置密码失败: %s", string(body))
	}

	return nil
}

