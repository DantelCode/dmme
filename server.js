require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./config/db');
require('./config/passport')(passport);

const app = express();

// Connect DB
db.connect();

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
// Configure helmet to keep security headers but allow inline scripts/styles
// and the external CDN used for html2canvas. Inline scripts are currently
// used across templates; relaxing CSP here enables them while retaining
// other protections from Helmet.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      scriptSrcAttr: ["'self'"],
      scriptSrcElem: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrcAttr: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Session
const sessionStore = MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: 'sessions' });
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// CSRF
app.use(csurf({ cookie: false }));
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.currentUser = req.user || null;
  next();
});

// Rate Limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});
app.use(limiter);

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/payments');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api/messages', messageRoutes);
app.use('/payments', paymentRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('errors/403', { title: 'Invalid CSRF Token' });
  }
  res.status(500).render('errors/500', { error: err });
});

const PORT = process.env.PORT || 3000;
// create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, { /* default options */ });

// expose io to controllers via app.set
app.set('io', io);

io.on('connection', (socket) => {
  // allow client to register to a user room
  socket.on('register', (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
