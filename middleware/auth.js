const jwt = require('jsonwebtoken');
const User = require('../models/User');


const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken; // Read token from cookies

  if (!token) {
    return res.status(403).json({ message: "Access denied, token missing!" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token!" });
  }
};

// Middleware to authenticate user with JWT
exports.authenticate = async (req, res, next) => {
  try {
    let token;

    // Check if token is provided in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token is provided in cookies (fallback)
    if (!token && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    // If no token found, deny access
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is deactivated.' });
    }

    // Set user on request object
    req.user = user;
    next();
  } catch (error) {
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
  next();
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
    
    next();
  };
};

// Authorize resource access based on resource userId field
exports.authorizeResource = async (req, res, next) => {
  try {
    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if resource ID is provided
    const resourceId = req.params.id;
    if (!resourceId) {
      return next();
    }
    
    // Determine resource type based on URL path
    let Model;
    if (req.originalUrl.includes('/transactions')) {
      Model = require('../models/Transaction');
    } else if (req.originalUrl.includes('/budgets')) {
      Model = require('../models/Budget');
    } else if (req.originalUrl.includes('/goals')) {
      Model = require('../models/Goal');
    } else {
      return next();
    }
    
    // Find resource and check ownership
    const resource = await Model.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }
    
    if (resource.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only access your own data.' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
