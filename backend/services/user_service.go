package services

import (
	"errors"
	"fmt"

	"hackathon-backend/database"
	"hackathon-backend/models"
	"hackathon-backend/utils"

	"gorm.io/gorm"
)

type UserService struct{}

// Login 用户登录
func (s *UserService) Login(email, password string) (*models.User, string, error) {
	var user models.User
	if err := database.DB.Where("email = ? AND deleted_at IS NULL", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", errors.New("账号不存在")
		}
		return nil, "", err
	}

	if user.Status == 0 {
		return nil, "", errors.New("账号已被禁用")
	}

	if !utils.CheckPassword(password, user.Password) {
		return nil, "", errors.New("密码错误")
	}

	token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, "", fmt.Errorf("生成token失败: %w", err)
	}

	return &user, token, nil
}

// CreateUser 创建用户（Admin权限）
func (s *UserService) CreateUser(user *models.User) error {
	// 检查邮箱是否已存在
	var existingUser models.User
	if err := database.DB.Where("email = ? AND deleted_at IS NULL", user.Email).First(&existingUser).Error; err == nil {
		return errors.New("邮箱已存在")
	}

	// 加密密码
	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}
	user.Password = hashedPassword

	if err := database.DB.Create(user).Error; err != nil {
		return fmt.Errorf("创建用户失败: %w", err)
	}

	// 清除密码字段
	user.Password = ""

	return nil
}

// GetUserList 获取用户列表
func (s *UserService) GetUserList(page, pageSize int, role, keyword string) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := database.DB.Model(&models.User{}).Where("deleted_at IS NULL")

	if role != "" {
		query = query.Where("role = ?", role)
	}

	if keyword != "" {
		query = query.Where("name LIKE ? OR email LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	// 清除密码字段
	for i := range users {
		users[i].Password = ""
	}

	return users, total, nil
}

// GetUserByID 根据ID获取用户
func (s *UserService) GetUserByID(id uint64) (*models.User, error) {
	var user models.User
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&user).Error; err != nil {
		return nil, err
	}

	user.Password = ""
	return &user, nil
}

// UpdateUser 更新用户信息
func (s *UserService) UpdateUser(id uint64, updates map[string]interface{}) error {
	// 不允许修改邮箱和角色
	if _, ok := updates["email"]; ok {
		return errors.New("不允许修改邮箱")
	}
	if _, ok := updates["role"]; ok {
		return errors.New("不允许修改角色")
	}
	if _, ok := updates["password"]; ok {
		return errors.New("密码需要单独处理")
	}

	if len(updates) == 0 {
		return errors.New("没有可更新的字段")
	}

	return database.DB.Model(&models.User{}).Where("id = ? AND deleted_at IS NULL", id).Updates(updates).Error
}

// DeleteUser 删除用户（软删除）
func (s *UserService) DeleteUser(id uint64) error {
	return database.DB.Where("id = ? AND deleted_at IS NULL", id).Delete(&models.User{}).Error
}

