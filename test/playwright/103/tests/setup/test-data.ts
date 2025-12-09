/**
 * 测试数据定义
 * 用于生成足够的测试数据以测试分页功能
 */

export const TEST_DATA = {
  // 用户数据（用于分页测试，需要创建超过一页的用户）
  users: {
    organizers: Array.from({ length: 25 }, (_, i) => ({
      name: `主办方用户${i + 1}`,
      email: `organizer${i + 1}@test.com`,
      password: 'Organizer123456',
      role: 'organizer' as const,
      phone: `1380000${String(i + 1).padStart(4, '0')}`,
    })),
    sponsors: Array.from({ length: 25 }, (_, i) => ({
      name: `赞助商用户${i + 1}`,
      email: `sponsor${i + 1}@test.com`,
      password: 'Sponsor123456',
      role: 'sponsor' as const,
      phone: `1390000${String(i + 1).padStart(4, '0')}`,
    })),
  },
  
  // 活动数据（用于分页测试，需要创建超过一页的活动）
  hackathons: Array.from({ length: 30 }, (_, i) => ({
    name: `测试活动${i + 1}`,
    description: `这是第${i + 1}个测试活动的描述`,
    start_time: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + (i + 7) * 24 * 60 * 60 * 1000).toISOString(),
    location_type: ['online', 'offline', 'hybrid'][i % 3] as 'online' | 'offline' | 'hybrid',
    location_detail: i % 3 === 0 ? undefined : `测试地点${i + 1}`,
    max_team_size: 3 + (i % 5),
    status: [
      'preparation',
      'published',
      'registration',
      'checkin',
      'team_formation',
      'submission',
      'voting',
      'results',
    ][i % 8] as any,
  })),
}

