package models

import (
	"time"

	"gorm.io/gorm"
)

// Hackathon 活动表
type Hackathon struct {
	ID           uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string         `gorm:"type:varchar(100);not null" json:"name"`
	Description  string         `gorm:"type:text;not null" json:"description"`
	StartTime    time.Time      `gorm:"not null" json:"start_time"`
	EndTime      time.Time      `gorm:"not null" json:"end_time"`
	LocationType string         `gorm:"type:enum('online','offline','hybrid');not null" json:"location_type"`
	LocationDetail string       `gorm:"type:varchar(500)" json:"location_detail"`
	Status       string         `gorm:"type:enum('preparation','published','registration','checkin','team_formation','submission','voting','results');default:'preparation'" json:"status"`
	OrganizerID  uint64         `gorm:"index;not null" json:"organizer_id"`
	MaxTeamSize  int            `gorm:"default:3" json:"max_team_size"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// 关联关系
	Organizer    User            `gorm:"foreignKey:OrganizerID" json:"organizer,omitempty"`
	Stages       []HackathonStage `gorm:"foreignKey:HackathonID" json:"stages,omitempty"`
	Awards       []HackathonAward `gorm:"foreignKey:HackathonID" json:"awards,omitempty"`
}

// TableName 指定表名
func (Hackathon) TableName() string {
	return "hackathons"
}

// HackathonStage 活动阶段时间表
type HackathonStage struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	HackathonID uint64    `gorm:"uniqueIndex:uk_hackathon_stage;not null" json:"hackathon_id"`
	Stage       string    `gorm:"type:enum('registration','checkin','team_formation','submission','voting');not null" json:"stage"`
	StartTime   time.Time `gorm:"not null" json:"start_time"`
	EndTime     time.Time `gorm:"not null" json:"end_time"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName 指定表名
func (HackathonStage) TableName() string {
	return "hackathon_stages"
}

// HackathonAward 活动奖项表
type HackathonAward struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	HackathonID uint64    `gorm:"index;not null" json:"hackathon_id"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`
	Prize       string    `gorm:"type:varchar(255);not null" json:"prize"`
	Quantity    int       `gorm:"default:1" json:"quantity"`
	Rank        int       `gorm:"not null" json:"rank"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName 指定表名
func (HackathonAward) TableName() string {
	return "hackathon_awards"
}

