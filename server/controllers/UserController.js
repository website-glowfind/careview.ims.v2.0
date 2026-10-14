import User from "../models/User.js"; // Siguraduhing tama ang path at export
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Helper function para sa JWT (Optional pero malinis tignan)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { 
        expiresIn: "1d",
    });
};

const getAllUsers = async (req, res) => {
    try {
        // Sa Mongoose, .find({}) ang kapalit ng .findAll()
        const users = await User.find({}).select("-password"); 
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            if (user.status === "inactive") {
                return res.status(403).json({ error: "This account is inactive. Contact an administrator." });
            }
            user.lastLogin = new Date();
            await user.save();
            const token = generateToken(user._id);

            const userPayload = {
                id: user._id,
                username: user.username,
                name: user.name,
                role: user.role,
                department: user.department,
                email: user.email || "",
                status: user.status || "active",
                permissions: user.permissions || {},
            };

            // Configuration options
            const cookieOptions = {
                httpOnly: true, // Mas ligtas ang token dito
                secure: process.env.NODE_ENV === "production", // true lang pag naka-HTTPS na
                sameSite: "lax",
                path: "/",
                maxAge: 24 * 60 * 60 * 1000, // 1 day
            };

            // 1. I-set ang Token (HttpOnly)
            res.cookie("token", token, cookieOptions);

            // 2. I-set ang User Data (Accessible sa JS/Frontend)
            res.cookie("user", JSON.stringify(userPayload), {
                ...cookieOptions,
                httpOnly: false // Overwrite para mabasa ng Cookies.get()
            });

            return res.status(200).json({
                success: true,
                message: "Login successful",
                user: userPayload
            });
        } else {
            return res.status(401).json({ error: "Invalid username or password" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, username, password, role, department, email, centerBranch, status } = req.body;

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ error: "User already exists" });
        }
        const newUser = await User.create({
            name,
            username,
            password,
            ...(role ? { role } : {}),
            ...(department ? { department } : {}),
            ...(email ? { email } : {}),
            ...(centerBranch ? { centerBranch } : {}),
            ...(status ? { status } : {}),
        });

        if (newUser) {
            const { password: _pw, ...userData } = newUser.toObject();
            res.status(201).json(userData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getLoggedInUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const logoutUser = async (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: "Logged out successfully" });
};

const updateUser = async (req, res) => {
    try {
        const { name, username, role, department, password, email, centerBranch, status, permissions } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name)        user.name       = name;
        if (username)    user.username   = username;
        if (role)        user.role       = role;
        if (department)  user.department = department;
        if (email !== undefined)        user.email        = email;
        if (centerBranch !== undefined) user.centerBranch = centerBranch;
        if (status)                     user.status       = status;
        if (permissions !== undefined) { user.permissions = permissions; user.markModified('permissions'); }
        if (password)    user.password   = password; // hashed via pre-save hook

        const updated = await user.save();
        const { password: _, ...userData } = updated.toObject();
        res.status(200).json(userData);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Generate a secure temporary password, set it on the user, and return it so an
// admin can hand it over. (Email delivery can be wired later via an SMTP service.)
const resetUserPassword = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const raw = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        const tempPassword = (raw + 'Aa1').slice(0, 10);
        user.password = tempPassword; // hashed by the pre-save hook
        await user.save();

        res.status(200).json({ tempPassword, email: user.email || '', username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export {
    getLoggedInUser,
    getAllUsers,
    loginUser,
    registerUser,
    logoutUser,
    updateUser,
    resetUserPassword,
    deleteUser,
};