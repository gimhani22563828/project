const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify the token and extract user info
const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1]; // Get token from cookies or Authorization header

  if (!token) {
    return res.status(403).json({ message: "Access denied, token missing!" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    req.user = verified; // Attach decoded token to req.user
    next(); // Proceed to next middleware
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token!" }); // Handle invalid/expired token errors
  }
};

// Middleware to authenticate user with JWT
exports.authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Fallback to cookies if token is not in headers
    if (!token && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    // If no token is found, deny access
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure the user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    // Ensure the user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is deactivated.' });
    }

    // Attach user to the request object
    req.user = user;
    next(); // Proceed to next middleware
  } catch (error) {
    // Handle various token verification errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// Middleware to authorize admin access
exports.authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next(); // Proceed if user is admin
};

// Middleware to ensure user can only access their own data
exports.authorizeUser = (resourceUserId) => {
  return (req, res, next) => {
    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Regular user can only access their own resources
    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only access your own data.' });
    }

    next(); // Proceed if user owns the resource
  };
};

// Middleware to authorize resource access based on resource userId field
exports.authorizeResource = async (req, res, next) => {
  try {
    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if resource ID is provided in URL params
    const resourceId = req.params.id;
    if (!resourceId) {
      return next(); // Proceed if no resource ID is provided
    }

    // Determine resource model based on URL path
    let Model;
    if (req.originalUrl.includes('/transactions')) {
      Model = require('../models/Transaction');
    } else if (req.originalUrl.includes('/budgets')) {
      Model = require('../models/Budget');
    } else if (req.originalUrl.includes('/goals')) {
      Model = require('../models/Goal');
    } else {
      return next(); // Proceed if resource type is not recognized
    }

    // Find resource and check ownership
    const resource = await Model.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    if (resource.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only access your own data.' });
    }

    next(); // Proceed if user is the owner of the resource
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
