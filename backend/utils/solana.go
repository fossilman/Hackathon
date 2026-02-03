package utils

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
	"math/big"
	"strings"
)

// base58 字母表（与 Solana/Bitcoin 一致）
const base58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

// base58Decode 解码 Solana 地址（base58）为 32 字节公钥
func base58Decode(s string) ([]byte, error) {
	if s == "" {
		return nil, errors.New("empty base58 string")
	}
	var n big.Int
	for _, c := range s {
		idx := strings.IndexRune(base58Alphabet, c)
		if idx < 0 {
			return nil, errors.New("invalid base58 character")
		}
		n.Mul(&n, big.NewInt(58))
		n.Add(&n, big.NewInt(int64(idx)))
	}
	b := n.Bytes()
	if len(b) > 32 {
		return nil, errors.New("base58 decoded length too long")
	}
	// 前导零填充为 32 字节
	if len(b) < 32 {
		padded := make([]byte, 32)
		copy(padded[32-len(b):], b)
		return padded, nil
	}
	return b, nil
}

// IsValidSolanaAddress 校验是否为合法 Solana 地址（base58 编码的 32 字节公钥）
func IsValidSolanaAddress(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) < 32 || len(s) > 44 {
		return false
	}
	b, err := base58Decode(s)
	return err == nil && len(b) == 32
}

// VerifySolanaSignature 使用 Ed25519 验证 Phantom/Solana 签名
// address: base58 公钥；message: 原文；signatureBase64: 签名的 base64（64 字节）
func VerifySolanaSignature(address, message, signatureBase64 string) error {
	pubKey, err := base58Decode(address)
	if err != nil || len(pubKey) != 32 {
		return errors.New("无效的 Solana 地址")
	}
	sig, err := base64.StdEncoding.DecodeString(strings.TrimSpace(signatureBase64))
	if err != nil {
		return errors.New("签名 base64 解析失败")
	}
	if len(sig) != ed25519.SignatureSize {
		return errors.New("签名长度错误")
	}
	msgBytes := []byte(message)
	if !ed25519.Verify(pubKey, msgBytes, sig) {
		return errors.New("签名验证失败")
	}
	return nil
}
