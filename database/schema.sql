-- 鹦鹉养殖管理系统数据库结构
CREATE DATABASE IF NOT EXISTS parrot_breeding DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parrot_breeding;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信openid',
    nickname VARCHAR(100) COMMENT '昵称',
    avatar_url VARCHAR(255) COMMENT '头像URL',
    phone VARCHAR(20) COMMENT '手机号',
    points INT DEFAULT 0 NOT NULL COMMENT '用户积分',
    last_checkin_date DATE COMMENT '最后签到日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 鹦鹉品种表
CREATE TABLE parrot_species (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '品种名称',
    description TEXT COMMENT '品种描述',
    avg_lifespan INT COMMENT '平均寿命（年）',
    avg_size VARCHAR(50) COMMENT '平均体型',
    care_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium' COMMENT '饲养难度',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 鹦鹉档案表
CREATE TABLE parrots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '鹦鹉名字',
    species_id INT COMMENT '品种ID',
    gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown' COMMENT '性别',
    birth_date DATE COMMENT '出生日期',
    acquisition_date DATE COMMENT '获得日期',
    color VARCHAR(100) COMMENT '羽毛颜色',
    weight DECIMAL(6,2) COMMENT '体重（克）',
    health_status ENUM('healthy', 'sick', 'recovering') DEFAULT 'healthy' COMMENT '健康状态',
    photo_url VARCHAR(255) COMMENT '照片URL',
    notes TEXT COMMENT '备注',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否活跃（未死亡）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (species_id) REFERENCES parrot_species(id)
);

-- 饲料类型表
CREATE TABLE feed_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '饲料名称',
    brand VARCHAR(100) COMMENT '品牌',
    type ENUM('seed', 'pellet', 'fruit', 'vegetable', 'supplement', 'milk_powder') COMMENT '饲料类型',
    nutrition_info TEXT COMMENT '营养信息',
    price DECIMAL(8,2) COMMENT '价格',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 喂食记录表
CREATE TABLE feeding_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parrot_id INT NOT NULL,
    feed_type_id INT,
    amount DECIMAL(6,2) COMMENT '喂食量（克）',
    feeding_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '喂食时间',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parrot_id) REFERENCES parrots(id) ON DELETE CASCADE,
    FOREIGN KEY (feed_type_id) REFERENCES feed_types(id)
);

-- 健康记录表
CREATE TABLE health_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parrot_id INT NOT NULL,
    record_type ENUM('checkup', 'illness', 'treatment', 'vaccination', 'weight') COMMENT '记录类型',
    description TEXT COMMENT '描述',
    weight DECIMAL(6,2) COMMENT '体重（克）',
    temperature DECIMAL(4,1) COMMENT '体温（摄氏度）',
    symptoms TEXT COMMENT '症状',
    treatment TEXT COMMENT '治疗方案',
    medication VARCHAR(255) COMMENT '用药',
    vet_name VARCHAR(100) COMMENT '兽医姓名',
    cost DECIMAL(8,2) COMMENT '费用',
    record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
    next_checkup_date DATE COMMENT '下次检查日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parrot_id) REFERENCES parrots(id) ON DELETE CASCADE
);

-- 清洁记录表
CREATE TABLE cleaning_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parrot_id INT NOT NULL,
    cleaning_type ENUM('cage', 'toys', 'perches', 'food_water') COMMENT '清洁类型',
    description TEXT COMMENT '清洁描述',
    cleaning_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '清洁时间',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parrot_id) REFERENCES parrots(id) ON DELETE CASCADE
);

-- 繁殖记录表
CREATE TABLE breeding_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    male_parrot_id INT NOT NULL,
    female_parrot_id INT NOT NULL,
    mating_date DATE COMMENT '交配日期',
    egg_laying_date DATE COMMENT '产蛋日期',
    egg_count INT DEFAULT 0 COMMENT '蛋数量',
    hatching_date DATE COMMENT '孵化日期',
    chick_count INT DEFAULT 0 COMMENT '雏鸟数量',
    success_rate DECIMAL(5,2) COMMENT '成功率',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (male_parrot_id) REFERENCES parrots(id),
    FOREIGN KEY (female_parrot_id) REFERENCES parrots(id)
);

-- 支出记录表
CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    parrot_id INT COMMENT '关联鹦鹉ID（可为空，表示通用支出）',
    category ENUM('food', 'medical', 'toys', 'cage', 'other') COMMENT '支出类别',
    amount DECIMAL(8,2) NOT NULL COMMENT '金额',
    description VARCHAR(255) COMMENT '描述',
    expense_date DATE DEFAULT (CURRENT_DATE) COMMENT '支出日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parrot_id) REFERENCES parrots(id) ON DELETE SET NULL
);

-- 收入记录表
CREATE TABLE incomes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    parrot_id INT COMMENT '关联鹦鹉ID（可为空，表示通用收入）',
    category ENUM('breeding_sale', 'bird_sale', 'service', 'competition', 'other') COMMENT '收入类别',
    amount DECIMAL(8,2) NOT NULL COMMENT '金额',
    description VARCHAR(255) COMMENT '描述',
    income_date DATE DEFAULT (CURRENT_DATE) COMMENT '收入日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parrot_id) REFERENCES parrots(id) ON DELETE SET NULL
);

-- 提醒设置表
CREATE TABLE reminders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    parrot_id INT,
    reminder_type ENUM('feeding', 'cleaning', 'checkup', 'medication') COMMENT '提醒类型',
    title VARCHAR(100) NOT NULL COMMENT '提醒标题',
    description TEXT COMMENT '提醒描述',
    reminder_time TIME COMMENT '提醒时间',
    frequency ENUM('daily', 'weekly', 'monthly', 'once') DEFAULT 'daily' COMMENT '频率',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parrot_id) REFERENCES parrots(id) ON DELETE CASCADE
);

-- 用户统计表
CREATE TABLE user_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    stats_views INT DEFAULT 0 COMMENT '统计页面查看次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_stats (user_id)
);

-- 用户积分记录表
CREATE TABLE user_points_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    point_type VARCHAR(50) NOT NULL COMMENT '积分类型：checkin, daily_visit, feeding, health, cleaning, breeding, expense',
    points INT NOT NULL COMMENT '获取的积分数量',
    record_date DATE NOT NULL COMMENT '记录日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_points_record (user_id, point_type, record_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户反馈表
CREATE TABLE feedbacks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content TEXT NOT NULL COMMENT '反馈内容',
    contact VARCHAR(255) COMMENT '联系方式',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 系统公告表
CREATE TABLE announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL COMMENT '公告标题',
    content TEXT NOT NULL COMMENT '公告内容',
    status ENUM('draft', 'published') DEFAULT 'draft' COMMENT '状态',
    created_by_user_id INT COMMENT '创建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 插入一些基础的鹦鹉品种数据
INSERT INTO parrot_species (name, description, avg_lifespan, avg_size, care_level) VALUES
('虎皮鹦鹉', '小型鹦鹉，活泼好动，容易饲养', 8, '18cm', 'easy'),
('玄凤鹦鹉', '中型鹦鹉，性格温和，有冠羽', 15, '32cm', 'easy'),
('牡丹鹦鹉', '小型鹦鹉，色彩鲜艳，成对饲养', 10, '15cm', 'medium'),
('金刚鹦鹉', '大型鹦鹉，智商很高，需要大空间', 50, '90cm', 'hard'),
('灰鹦鹉', '中大型鹦鹉，智商极高，会说话', 60, '33cm', 'hard'),
('太阳鹦鹉', '中型鹦鹉，色彩艳丽，叫声较大', 25, '30cm', 'medium');

-- 插入一些基础的饲料类型数据
INSERT INTO feed_types (name, brand, type, nutrition_info, price) VALUES
('混合种子', '通用', 'seed', '含多种谷物种子，适合小型鹦鹉', 25.00),
('营养颗粒', '凡赛尔', 'pellet', '均衡营养，适合各种鹦鹉', 45.00),
('苹果片', '新鲜水果', 'fruit', '维生素C丰富，适量喂食', 8.00),
('胡萝卜', '新鲜蔬菜', 'vegetable', '维生素A丰富，有助视力', 5.00),
('钙粉', '营养补充', 'supplement', '补充钙质，促进骨骼发育', 15.00);