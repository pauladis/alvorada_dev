import path from 'path';

// Set test database path
process.env.DATABASE_PATH = path.join(__dirname, '../../test_data/test.db');
process.env.NODE_ENV = 'test';
