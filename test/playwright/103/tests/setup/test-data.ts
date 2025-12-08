/**
 * 测试数据配置
 * 根据 PRD103 定义的角色创建测试用户
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'organizer' | 'sponsor';
}

export const testUsers: TestUser[] = [
  {
    email: 'admin@test.com',
    password: 'Admin123456',
    name: '测试管理员',
    role: 'admin',
  },
  {
    email: 'organizer1@test.com',
    password: 'Organizer123456',
    name: '测试主办方1',
    role: 'organizer',
  },
  {
    email: 'organizer2@test.com',
    password: 'Organizer123456',
    name: '测试主办方2',
    role: 'organizer',
  },
  {
    email: 'sponsor@test.com',
    password: 'Sponsor123456',
    name: '测试赞助商',
    role: 'sponsor',
  },
];

export const testHackathon = {
  name: '测试Hackathon活动',
  description: '这是一个用于测试的Hackathon活动',
  startTime: '2024-12-01T09:00:00',
  endTime: '2024-12-07T18:00:00',
  location: '测试地点',
  awards: [
    { name: '一等奖', amount: 10000 },
    { name: '二等奖', amount: 5000 },
  ],
};

