import Department from "../models/Department.js"; 

const getAllDepartments = async (req, res) => {
    Department.sync();
    try {
        const departments = await Department.findAll();
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findByPk(req.params.id);
        if (department) {
            res.json(department);
        } else {
            res.status(404).json({ error: "Department not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const createDepartment = async (req, res) => {
    Department.sync();
    try {
        const { name } = req.body;
        const newDepartment = await Department.create({name});
        console.log(newDepartment);
        res.status(201).json(newDepartment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
};