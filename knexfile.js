"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    development: {
        client: "sqlite3",
        connection: {
            filename: path_1.default.join(__dirname, "data", "school.sqlite"),
        },
        useNullAsDefault: true,
        pool: {
            afterCreate: (conn, cb) => {
                // Enable Foreign Keys and WAL Mode for sqlite
                conn.run("PRAGMA foreign_keys = ON;", () => {
                    conn.run("PRAGMA journal_mode = WAL;", cb);
                });
            },
        },
        migrations: {
            directory: path_1.default.join(__dirname, "src", "database", "migrations"),
            extension: "ts",
        },
        seeds: {
            directory: path_1.default.join(__dirname, "src", "database", "seeds"),
            extension: "ts",
        },
    },
    test: {
        client: "sqlite3",
        connection: {
            filename: ":memory:",
        },
        useNullAsDefault: true,
        pool: {
            afterCreate: (conn, cb) => {
                conn.run("PRAGMA foreign_keys = ON;", cb);
            },
        },
        migrations: {
            directory: path_1.default.join(__dirname, "src", "database", "migrations"),
            extension: "ts",
        },
        seeds: {
            directory: path_1.default.join(__dirname, "src", "database", "seeds"),
            extension: "ts",
        },
    },
    production: {
        client: "pg",
        connection: process.env.DATABASE_URL || {
            host: process.env.DB_HOST || "127.0.0.1",
            port: Number(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || "postgres",
            password: process.env.DB_PASSWORD || "postgres",
            database: process.env.DB_NAME || "school",
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            directory: path_1.default.join(__dirname, "src", "database", "migrations"),
            extension: "ts",
        },
        seeds: {
            directory: path_1.default.join(__dirname, "src", "database", "seeds"),
            extension: "ts",
        },
    },
};
exports.default = config;
