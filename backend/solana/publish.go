// Package solana 提供活动发布与阶段切换上链能力，统一使用 solana-go 库。发布/阶段切换由前端钱包（如 Phantom）授权签名，后端仅提交已签名交易。
package solana

import (
	"context"
	"encoding/base64"
	"errors"
	"strings"

	"hackathon-backend/config"

	bin "github.com/gagliardetto/binary"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

// PreparePublishConfig 返回前端构建 publish_activity 交易所需的配置与数据，无需后端私钥。
func PreparePublishConfig() (programID, rpcURL string, err error) {
	cfg := config.AppConfig
	if cfg == nil || cfg.Solana.RPCURL == "" || cfg.Solana.ProgramID == "" {
		return "", "", errors.New("活动发布不成功：Solana 未配置（需设置 program_id 与 rpc_url）")
	}
	return strings.TrimSpace(cfg.Solana.ProgramID), strings.TrimSpace(cfg.Solana.RPCURL), nil
}

// SubmitSignedTransaction 将前端已签名的交易（base64 编码）提交到 Solana RPC，返回交易签名。使用 solana-go 的 RPC 客户端。
func SubmitSignedTransaction(signedTxBase64 string, rpcURL string) (txSignature string, err error) {
	signedTxBase64 = strings.TrimSpace(signedTxBase64)
	if signedTxBase64 == "" {
		return "", errors.New("活动发布不成功：未提供已签名交易")
	}
	if rpcURL == "" {
		return "", errors.New("活动发布不成功：未配置 RPC URL")
	}

	txBytes, err := base64.StdEncoding.DecodeString(signedTxBase64)
	if err != nil {
		return "", errors.New("活动发布不成功：交易 base64 解析失败")
	}

	dec := bin.NewBinDecoder(txBytes)
	tx, err := solana.TransactionFromDecoder(dec)
	if err != nil {
		return "", errors.New("活动发布不成功：交易解析失败")
	}

	client := rpc.New(rpcURL)
	sig, err := client.SendTransaction(context.Background(), tx)
	if err != nil {
		return "", err
	}
	return sig.String(), nil
}
