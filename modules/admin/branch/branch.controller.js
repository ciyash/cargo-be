import Branch from "./branch.model.js";

// ✅ Create a new branch
export const createBranch = async (req, res) => {
    try {
        const branch = new Branch(req.body);
        await branch.save();
        res.status(201).json({ success: true, message: "Branch created successfully", branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Get all branches
export const getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find();
        res.status(200).json({ success: true, branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Get a branch by ID
export const getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

        res.status(200).json({ success: true, branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Update a branch by ID
export const updateBranch = async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

        res.status(200).json({ success: true, message: "Branch updated successfully", branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Delete a branch by ID
export const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

        res.status(200).json({ success: true, message: "Branch deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
