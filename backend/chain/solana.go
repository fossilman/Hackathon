// Package chain 提供 Solana 链上数据读取（本地测试链），用于投票、分发奖金时读取链上签到列表等。
package chain

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"hackathon-backend/config"
)

// RPC 请求/响应
type rpcRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message  string `json:"message"`
}

// GetProgramAccounts 返回 program 下所有账户。
func GetProgramAccounts(programID string) ([]AccountInfo, error) {
	log.Printf("[链上] getProgramAccounts program_id=%s", programID)
	params := []interface{}{
		programID,
		map[string]interface{}{"encoding": "base64"},
	}
	var raw json.RawMessage
	if err := rpcCall("getProgramAccounts", params, &raw); err != nil {
		return nil, err
	}
	if raw == nil || bytes.Equal(raw, []byte("null")) {
		return nil, nil
	}
	var list []struct {
		Pubkey  string      `json:"pubkey"`
		Account accountInfo `json:"account"`
	}
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	out := make([]AccountInfo, 0, len(list))
	for _, item := range list {
		var data []byte
		switch v := item.Account.Data.(type) {
		case string:
			data, _ = base64.StdEncoding.DecodeString(v)
		default:
			continue
		}
		out = append(out, AccountInfo{
			Pubkey: item.Pubkey,
			Data:   data,
			Owner:  item.Account.Owner,
		})
	}
	return out, nil
}

type accountInfo struct {
	Data  interface{} `json:"data"`  // base64 string or array
	Owner string      `json:"owner"`
}

// AccountInfo 链上账户摘要
type AccountInfo struct {
	Pubkey string
	Data   []byte
	Owner  string
}

// GetTransaction 获取交易详情，用于验证 tx 是否成功。
func GetTransaction(signature string) (confirmed bool, err error) {
	log.Printf("[链上] getTransaction signature=%s", signature)
	params := []interface{}{signature, map[string]string{"encoding": "json"}}
	var raw json.RawMessage
	if err := rpcCall("getTransaction", params, &raw); err != nil {
		return false, err
	}
	if raw == nil || bytes.Equal(raw, []byte("null")) {
		return false, nil
	}
	var tx struct {
		Meta *struct {
			Err interface{} `json:"err"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(raw, &tx); err != nil {
		return false, err
	}
	return tx.Meta != nil && tx.Meta.Err == nil, nil
}

func rpcCall(method string, params []interface{}, result interface{}) error {
	body, _ := json.Marshal(rpcRequest{JSONRPC: "2.0", ID: 1, Method: method, Params: params})
	req, err := http.NewRequest(http.MethodPost, config.AppConfig.SolanaRPCURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	var r rpcResponse
	if err := json.Unmarshal(data, &r); err != nil {
		return err
	}
	if r.Error != nil {
		return fmt.Errorf("rpc error: %s", r.Error.Message)
	}
	if result != nil && len(r.Result) > 0 {
		return json.Unmarshal(r.Result, result)
	}
	return nil
}

// Checkin 账户 data 布局：discriminator(8) + event(32) + participant(32) + bump(1) + mint(32) = 113
const checkinDataLen = 8 + 32 + 32 + 1 + 32

// CheckinWallet 从链上 Checkin 账户解析出的参与者钱包（base58 需由调用方或前端解析，这里仅返回 hex 便于比对）。
func ParseCheckinParticipant(data []byte) string {
	if len(data) < 8+32+32 {
		return ""
	}
	// participant 在 offset 8+32 处，32 字节
	b := data[8+32 : 8+32+32]
	return fmt.Sprintf("%x", b)
}

// GetCheckinWalletsFromProgram 从链上读取 program 下所有 Checkin 账户的参与者（返回 hex 格式便于与 DB 中 wallet 比对）。
// 投票、分发奖金时用此列表保证仅链上签到地址有效；eventPDA 可选，非空时仅返回 event 匹配的（需 32 字节 hex）。
func GetCheckinWalletsFromProgram(programID string, eventPDAHex string) ([]string, error) {
	if programID == "" {
		return nil, nil
	}
	accounts, err := GetProgramAccounts(programID)
	if err != nil {
		return nil, err
	}
	var wallets []string
	for _, acc := range accounts {
		if acc.Owner != programID || len(acc.Data) < checkinDataLen {
			continue
		}
		d := acc.Data
		if eventPDAHex != "" && len(d) >= 8+32 {
			eventBytes := fmt.Sprintf("%x", d[8:8+32])
			if eventBytes != eventPDAHex {
				continue
			}
		}
		w := ParseCheckinParticipant(d)
		if w != "" {
			wallets = append(wallets, w)
		}
	}
	return wallets, nil
}

// GetCheckinWallets 从链上读取某活动的签到钱包列表（hex 格式）；hackathon 需已填 EventPDA（或传空则返回全部）。
func GetCheckinWallets(eventPDAHex string) ([]string, error) {
	log.Printf("[链上] GetCheckinWallets event_pda_hex=%s", eventPDAHex)
	programID := config.AppConfig.SolanaProgramID
	wallets, err := GetCheckinWalletsFromProgram(programID, eventPDAHex)
	if err == nil {
		log.Printf("[链上] GetCheckinWallets 返回 %d 个钱包", len(wallets))
	}
	return wallets, err
}
