-- Create database
CREATE DATABASE IF NOT EXISTS odisha_gaurav;
USE odisha_gaurav;

-- History timeline table
CREATE TABLE IF NOT EXISTS history_timeline (
    id INT PRIMARY KEY AUTO_INCREMENT,
    period VARCHAR(100) NOT NULL,
    period_odia VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_odia VARCHAR(255) NOT NULL,
    description TEXT,
    description_odia TEXT,
    image_url VARCHAR(500),
    year_from INT,
    year_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Districts table
CREATE TABLE IF NOT EXISTS districts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    name_odia VARCHAR(100) NOT NULL,
    capital VARCHAR(100),
    capital_odia VARCHAR(100),
    area_km2 DECIMAL(10,2),
    population INT,
    description TEXT,
    description_odia TEXT,
    history TEXT,
    history_odia TEXT,
    famous_for TEXT,
    famous_for_odia TEXT,
    image_url VARCHAR(500),
    map_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cuisine table
CREATE TABLE IF NOT EXISTS cuisine (
    id INT PRIMARY KEY AUTO_INCREMENT,
    district_id INT,
    dish_name VARCHAR(100) NOT NULL,
    dish_name_odia VARCHAR(100) NOT NULL,
    description TEXT,
    description_odia TEXT,
    ingredients TEXT,
    preparation_method TEXT,
    image_url VARCHAR(500),
    is_vegetarian BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
);

-- Freedom fighters table
CREATE TABLE IF NOT EXISTS freedom_fighters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    name_odia VARCHAR(100) NOT NULL,
    birth_date DATE,
    death_date DATE,
    birthplace VARCHAR(100),
    birthplace_odia VARCHAR(100),
    biography TEXT,
    biography_odia TEXT,
    contributions TEXT,
    contributions_odia TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Odissi dance table
CREATE TABLE IF NOT EXISTS odissi_dance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    title_odia VARCHAR(255) NOT NULL,
    description TEXT,
    description_odia TEXT,
    category VARCHAR(50),
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Literature table
CREATE TABLE IF NOT EXISTS literature (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    title_odia VARCHAR(255) NOT NULL,
    author VARCHAR(100),
    author_odia VARCHAR(100),
    type VARCHAR(50),
    description TEXT,
    description_odia TEXT,
    content TEXT,
    content_odia TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gallery table
CREATE TABLE IF NOT EXISTS gallery (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    caption VARCHAR(255),
    caption_odia VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for future features)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    entity_type VARCHAR(50),
    entity_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, entity_type, entity_id)
);

-- Insert sample data for districts
INSERT INTO districts (name, name_odia, capital, capital_odia, area_km2, population, description, description_odia, history, history_odia, famous_for, famous_for_odia, image_url) VALUES
('Puri', 'ପୁରୀ', 'Puri', 'ପୁରୀ', 3051, 1698000, 'Puri is a famous pilgrimage center known for Jagannath Temple', 'ପୁରୀ ଏକ ପ୍ରସିଦ୍ଧ ତୀର୍ଥସ୍ଥଳୀ ଯାହା ଜଗନ୍ନାଥ ମନ୍ଦିର ପାଇଁ ଜଣାଶୁଣା', 'Ancient city with rich history dating back to 3rd century BCE', 'ପ୍ରାଚୀନ ସହର ଯାହାର ଇତିହାସ ଖ୍ରୀଷ୍ଟପୂର୍ବ ୩ୟ ଶତାବ୍ଦୀରୁ ଆରମ୍ଭ', 'Jagannath Temple, Beach, Rath Yatra', 'ଜଗନ୍ନାଥ ମନ୍ଦିର, ସମୁଦ୍ରକୂଳ, ରଥଯାତ୍ରା', '/images/puri.jpg'),
('Cuttack', 'କଟକ', 'Cuttack', 'କଟକ', 3932, 2621000, 'Cuttack is the former capital and commercial hub of Odisha', 'କଟକ ଓଡ଼ିଶାର ପୂର୍ବତନ ରାଜଧାନୀ ଏବଂ ବ୍ୟବସାୟିକ କେନ୍ଦ୍ର', 'Founded in 989 CE by King Nrupa Keshari', '୯୮୯ ଖ୍ରୀଷ୍ଟାବ୍ଦରେ ରାଜା ନୃପ କେଶରୀଙ୍କ ଦ୍ୱାରା ସ୍ଥାପିତ', 'Silver filigree, Durga Puja', 'ତାରକସି, ଦୁର୍ଗା ପୂଜା', '/images/cuttack.jpg'),
('Bhubaneswar', 'ଭୁବନେଶ୍ୱର', 'Bhubaneswar', 'ଭୁବନେଶ୍ୱର', 422, 837000, 'Bhubaneswar is the capital city known as Temple City of India', 'ଭୁବନେଶ୍ୱର ହେଉଛି ରାଜଧାନୀ ସହର ଯାହା ଭାରତର ମନ୍ଦିର ସହର ଭାବରେ ଜଣାଶୁଣା', 'City of temples with over 500 temples', '୫୦୦ରୁ ଅଧିକ ମନ୍ଦିର ଥିବା ସହର', 'Lingaraj Temple, Kalinga architecture', 'ଲିଙ୍ଗରାଜ ମନ୍ଦିର, କଳିଙ୍ଗ ସ୍ଥାପତ୍ୟ', '/images/bhubaneswar.jpg');

-- Insert sample cuisine data
INSERT INTO cuisine (district_id, dish_name, dish_name_odia, description, description_odia, ingredients, preparation_method, image_url, is_vegetarian) VALUES
(1, 'Dalma', 'ଡାଲମା', 'Traditional dish of dal and vegetables', 'ଡାଲି ଏବଂ ପନିପରିବାର ପାରମ୍ପରିକ ଖାଦ୍ୟ', 'Toor dal, vegetables, coconut, spices', 'Cook dal with vegetables and temper with spices', '/images/dalma.jpg', TRUE),
(2, 'Chhena Poda', 'ଛେନାପୋଡ଼ା', 'Baked cottage cheese dessert', 'ଚିଜ୍ ର ମିଠା', 'Chhena, sugar, cardamom', 'Bake the mixture until golden brown', '/images/chhenapoda.jpg', TRUE),
(3, 'Khaja', 'ଖଜା', 'Crispy sweet snack', 'ଖଜା', 'Maida, sugar, ghee', 'Deep fry and dip in sugar syrup', '/images/khaja.jpg', TRUE);

-- Insert sample history data
INSERT INTO history_timeline (period, period_odia, title, title_odia, description, description_odia, year_from, year_to, image_url) VALUES
('Ancient Kalinga', 'ପ୍ରାଚୀନ କଳିଙ୍ଗ', 'Kalinga War', 'କଳିଙ୍ଗ ଯୁଦ୍ଧ', 'The Kalinga War in 261 BCE transformed Emperor Ashoka', '୨୬୧ ଖ୍ରୀଷ୍ଟପୂର୍ବରେ କଳିଙ୍ଗ ଯୁଦ୍ଧ ସମ୍ରାଟ ଅଶୋକଙ୍କୁ ପରିବର୍ତ୍ତନ କଲା', -261, -261, '/images/kalinga-war.jpg'),
('Medieval Period', 'ମଧ୍ୟଯୁଗ', 'Sun Temple Construction', 'ସୂର୍ଯ୍ୟ ମନ୍ଦିର ନିର୍ମାଣ', 'Construction of Konark Sun Temple by King Narasimhadeva I', 'ରାଜା ନରସିଂହଦେବ ପ୍ରଥମଙ୍କ ଦ୍ୱାରା କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ନିର୍ମାଣ', 1238, 1250, '/images/konark.jpg');

-- Insert sample freedom fighters
INSERT INTO freedom_fighters (name, name_odia, birth_date, death_date, birthplace, birthplace_odia, biography, biography_odia, contributions, contributions_odia, image_url) VALUES
('Baji Rout', 'ବାଜି ରାଉତ', '1926-10-05', '1938-10-11', 'Nilakanthapur', 'ନୀଳକଣ୍ଠପୁର', 'Youngest martyr of India at age 12', '୧୨ ବର୍ଷ ବୟସରେ ଭାରତର ସର୍ବକନିଷ୍ଠ ସହିଦ', 'Refused to ferry British police across river', 'ବ୍ରିଟିଶ ପୋଲିସକୁ ନଦୀ ପାର କରାଇବାକୁ ମନା କରିଦେଲେ', '/images/baji-rout.jpg'),
('Madhusudan Das', 'ମଧୁସୂଦନ ଦାସ', '1848-04-28', '1934-02-04', 'Cuttack', 'କଟକ', 'Utkal Gourav and first Odia graduate', 'ଉତ୍କଳ ଗୌରବ ଏବଂ ପ୍ରଥମ ଓଡ଼ିଆ ସ୍ନାତକ', 'Fought for Odia language unification', 'ଓଡ଼ିଆ ଭାଷା ଏକୀକରଣ ପାଇଁ ସଂଗ୍ରାମ କଲେ', '/images/madhusudan.jpg');

-- Insert sample Odissi dance data
INSERT INTO odissi_dance (title, title_odia, description, description_odia, category, image_url) VALUES
('Mangalacharan', 'ମଙ୍ଗଳାଚରଣ', 'Opening item of Odissi dance', 'ଓଡ଼ିଶୀ ନୃତ୍ୟର ପ୍ରାରମ୍ଭିକ ଅଂଶ', 'Mudra', '/images/mangalacharan.jpg'),
('Batu', 'ବାଟୁ', 'Pure dance item', 'ଶୁଦ୍ଧ ନୃତ୍ୟ ଅଂଶ', 'Posture', '/images/batu.jpg');

-- Insert sample literature
INSERT INTO literature (title, title_odia, author, author_odia, type, description, description_odia, image_url) VALUES
('Sarala Mahabharata', 'ସାରଳା ମହାଭାରତ', 'Sarala Das', 'ସାରଳା ଦାସ', 'Epic', 'First Odia translation of Mahabharata', 'ମହାଭାରତର ପ୍ରଥମ ଓଡ଼ିଆ ଅନୁବାଦ', '/images/sarala.jpg'),
('Chha Mana Atha Guntha', 'ଛ ମାଣ ଆଠ ଗୁଣ୍ଠ', 'Fakir Mohan Senapati', 'ଫକୀର ମୋହନ ସେନାପତି', 'Novel', 'First Odia novel depicting social issues', 'ସାମାଜିକ ସମସ୍ୟା ଦର୍ଶାଉଥିବା ପ୍ରଥମ ଓଡ଼ିଆ ଉପନ୍ୟାସ', '/images/chhamana.jpg');