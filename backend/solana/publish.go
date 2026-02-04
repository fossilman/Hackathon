// Package solana 提供活动发布上链能力。发布由前端钱包（如 Phantom）授权签名，后端仅提交已签名交易，不配置私钥。
package solana

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"hackathon-backend/config"
)

// PreparePublishConfig 返回前端构建 publish_activity 交易所需的配置与数据，无需后端私钥。
func PreparePublishConfig() (programID, rpcURL string, err error) {
	cfg := config.AppConfig
	if cfg == nil || cfg.Solana.RPCURL == "" || cfg.Solana.ProgramID == "" {
		return "", "", errors.New("活动发布不成功：Solana 未配置（需设置 program_id 与 rpc_url）")
	}
	return strings.TrimSpace(cfg.Solana.ProgramID), strings.TrimSpace(cfg.Solana.RPCURL), nil
}

// SubmitSignedTransaction 将前端已签名的交易提交到 Solana RPC，返回交易签名。发布密钥由前端钱包授权，后端不持有私钥。
func SubmitSignedTransaction(signedTxBase64 string, rpcURL string) (txSignature string, err error) {
	signedTxBase64 = strings.TrimSpace(signedTxBase64)
	if signedTxBase64 == "" {
		return "", errors.New("活动发布不成功：未提供已签名交易")
	}
	if rpcURL == "" {
		return "", errors.New("活动发布不成功：未配置 RPC URL")
	}

	body := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "sendTransaction",
		"params":  []interface{}{signedTxBase64, map[string]string{"encoding": "base64"}},
	}
	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, rpcURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("活动发布不成功：提交交易请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("活动发布不成功：RPC 请求失败: %w", err)
	}
	defer resp.Body.Close()

	var rpcResp struct {
		Result string          `json:"result"`
		Error  *struct{ Message string } `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return "", fmt.Errorf("活动发布不成功：解析 RPC 响应失败: %w", err)
	}
	if rpcResp.Error != nil {
		return "", fmt.Errorf("活动发布不成功：上链失败 %s", rpcResp.Error.Message)
	}
	txSignature = strings.TrimSpace(rpcResp.Result)
	if txSignature == "" {
		return "", errors.New("活动发布不成功：上链未返回交易签名")
	}
	return txSignature, nil
}
