import { Employee } from "../models/Employee.js";

export const getEmployees = async (req, res) => {
  try {
    const { company, department, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (company && company !== 'ALL') filter.company = company;
    if (department)                   filter.department = department;
    if (search) {
      filter.$or = [
        { fullName:   { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { position:   { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ fullName: 1 }).skip(skip).limit(limitNum),
      Employee.countDocuments(filter),
    ]);

    res.status(200).json({
      employees,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkImport = async (req, res) => {
  try {
    const { employees } = req.body; // [{ fullName, employeeId, department, position, company }]
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: "No employee data provided" });
    }

    // Upsert by employeeId — update if exists, insert if not
    const ops = employees.map(emp => ({
      updateOne: {
        filter: { employeeId: emp.employeeId },
        update: { $set: emp },
        upsert: true,
      },
    }));

    const result = await Employee.bulkWrite(ops);
    res.status(200).json({
      message: "Import successful",
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      total: employees.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { fullName, employeeId, department, position, company } = req.body;

    // Guard against duplicate employeeId (excluding the current doc)
    if (employeeId) {
      const existing = await Employee.findOne({
        employeeId,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ error: `Employee ID ${employeeId} already exists` });
      }
    }

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: { fullName, employeeId, department, position, company } },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: "Employee not found" });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Employee deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
