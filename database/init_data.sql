-- 鹦鹉养殖管理系统初始化数据
USE parrot_breeding;

-- 插入测试用户数据
INSERT INTO users (openid, nickname, avatar_url, phone) VALUES
('test_openid_001', '测试用户1', 'https://example.com/avatar1.jpg', '13800138001'),
('test_openid_002', '测试用户2', 'https://example.com/avatar2.jpg', '13800138002'),
('admin_openid', '管理员', 'https://example.com/admin.jpg', '13800138000');

-- 插入鹦鹉品种数据
INSERT INTO parrot_species (name, description, avg_lifespan, avg_size, care_level) VALUES
('虎皮鹦鹉', '小型鹦鹉，活泼好动，容易饲养', 8, '18cm', 'easy'),
('玄凤鹦鹉', '中型鹦鹉，性格温和，头顶有冠羽', 15, '32cm', 'medium'),
('金刚鹦鹉', '大型鹦鹉，色彩鲜艳，需要专业护理', 50, '85cm', 'hard'),
('亚马逊鹦鹉', '中大型鹦鹉，智商很高，善于模仿', 40, '35cm', 'medium'),
('非洲灰鹦鹉', '中型鹦鹉，智商极高，语言能力强', 60, '33cm', 'hard');

-- 插入饲料类型数据
INSERT INTO feed_types (name, brand, type, nutrition_info) VALUES
('混合种子', '通用品牌', 'seed', '蛋白质15%，脂肪12%，纤维8%'),
('滋养丸', '通用品牌', 'pellet', '蛋白质18%，脂肪8%，维生素丰富'),
('苹果', '新鲜', 'fruit', '维生素C丰富，天然糖分'),
('胡萝卜', '新鲜', 'vegetable', '纤维丰富，维生素A、K'),
('维生素补充剂', '专业品牌', 'supplement', '多种维生素和矿物质'),
('幼鸟奶粉', '专业品牌', 'milk_powder', '专为幼鸟设计，营养全面，易消化');

-- 插入测试鹦鹉数据
INSERT INTO parrots (user_id, name, species_id, gender, birth_date, acquisition_date, color, weight, health_status, notes) VALUES
(1, '小绿', 1, 'male', '2023-03-15', '2023-04-01', '绿色', 35.5, 'healthy', '活泼好动，喜欢唱歌'),
(1, '小黄', 1, 'female', '2023-02-20', '2023-04-01', '黄色', 32.8, 'healthy', '性格温和，喜欢安静'),
(2, '灰灰', 5, 'unknown', '2022-08-10', '2022-09-15', '灰色', 450.0, 'healthy', '非常聪明，会说很多话'),
(3, '彩虹', 3, 'female', '2021-12-01', '2022-01-20', '红蓝黄', 1200.0, 'healthy', '美丽的金刚鹦鹉');

-- 插入测试记录数据
INSERT INTO records (user_id, parrot_id, type, content, notes, record_date) VALUES
(1, 1, 'feeding', '喂食混合种子 20g', '食欲正常', '2024-01-15 08:00:00'),
(1, 1, 'health', '日常健康检查', '精神状态良好，羽毛光泽', '2024-01-15 10:00:00'),
(1, 2, 'feeding', '喂食滋养丸 15g', '食欲良好', '2024-01-15 08:30:00'),
(2, 3, 'feeding', '喂食坚果 10g', '非常喜欢吃坚果', '2024-01-15 09:00:00'),
(2, 3, 'training', '语言训练', '学会了新词汇"你好"', '2024-01-15 16:00:00'),
(3, 4, 'cleaning', '清洁笼子', '更换垫料，清洗食盆水盆', '2024-01-15 14:00:00');