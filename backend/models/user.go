package models

import (
	"time"

	"gorm.io/gorm"
)

// User 用户表（管理员、主办方、赞助商）
type User struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string         `gorm:"type:varchar(100);not null" json:"name"`
	Email     string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"type:varchar(255);not null" json:"-"` // 不返回密码
	Role      string         `gorm:"type:enum('admin','organizer','sponsor');not null" json:"role"`
	Phone     string         `gorm:"type:varchar(20)" json:"phone"`
	SponsorID *uint64        `gorm:"index" json:"sponsor_id"`
	Status    int            `gorm:"type:tinyint(1);default:1" json:"status"` // 1-启用，0-禁用
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

