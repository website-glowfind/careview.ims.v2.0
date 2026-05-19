import { DataTypes } from "sequelize";
import { sequelize } from "../lib/db.js";
import { Department } from "./Department.js";

export const Employee = sequelize.define("Employee", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    position: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    dept_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Department,
            key: 'id',
        },
    },
    salary:{
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    job_title: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    tableName: "employees",
    timestamps: true,
    }
);