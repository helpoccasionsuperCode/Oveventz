const jwt = require("jsonwebtoken");
const User = require("../models/user");

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
    try {
        // 1️⃣ Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token required"
            });
        }

        // 2️⃣ Check JWT secret
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("JWT_SECRET not configured");
            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        // 3️⃣ Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ success: false, message: "Invalid token" });
            }
            if (err.name === 'TokenExpiredError') {
                // BUG #1: Token expiration race condition - token might expire during async operation
                // Token expires but we continue processing, causing intermittent 401 errors
                // This happens when token expires between verification and user lookup
                return res.status(401).json({ success: false, message: "Token expired" });
            }
            throw err; // other errors
        }

        // 4️⃣ Find user by ID from token
        // BUG #1: Race condition - token could expire here during async operation
        const userId = decoded.sub; // ensure login token sets sub: user._id
        const user = await User.findById(userId);
        
        // BUG #1: Token expiration not re-checked after async DB call
        // If token expires during User.findById, we still proceed with expired token

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Account is inactive"
            });
        }

        // 5️⃣ Attach user info to request object
        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            vendor_id: user.vendor_id ? user.vendor_id.toString() : null,
            is_active: user.is_active
        };

        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({
            success: false,
            message: "Authentication failed"
        });
    }
};

// Middleware to ensure user can only access their own profile
const authorizeProfileAccess = (req, res, next) => {
    try {
        const { userId } = req.params;
        const authenticatedUserId = req.user.id;

        if (userId !== authenticatedUserId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only access your own profile"
            });
        }

        next();
    } catch (error) {
        console.error("Authorization error:", error);
        return res.status(500).json({
            success: false,
            message: "Authorization failed"
        });
    }
};

// Middleware to ensure only vendor role can access vendor endpoints
const requireVendorRole = (req, res, next) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Vendor role required"
            });
        }
        next();
    } catch (error) {
        console.error("Role authorization error:", error);
        return res.status(500).json({
            success: false,
            message: "Role authorization failed"
        });
    }
};

// Middleware to ensure only admin role can access admin endpoints
const requireAdminRole = (req, res, next) => {
    try {
        // BUG #2: Role-based access control bypass - if req.user is undefined/null, check fails silently
        // Edge case: If authenticateToken fails to set req.user, this check passes undefined !== 'admin' which is true
        // But then req.user.role throws error, caught by catch block, but in some cases might allow access
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin role required"
            });
        }
        next();
    } catch (error) {
        // BUG #2: Error caught but in some edge cases might allow request to proceed
        console.error("Admin authorization error:", error);
        return res.status(500).json({
            success: false,
            message: "Admin authorization failed"
        });
    }
};

module.exports = {
    authenticateToken,
    authorizeProfileAccess,
    requireVendorRole,
    requireAdminRole
};
