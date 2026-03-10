require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var listingsRouter = require('./routes/listings');
var swapRequestsRouter = require('./routes/swapRequests');
var wishlistRouter = require('./routes/wishlist.js');
var conversationsRouter = require('./routes/conversations');
var reportsRouter = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

var app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'hbs');

//app.use(cors({ origin: 'http://localhost:5173' })); // enable CORS for the frontend

const allowedOrigins = [
  'http://localhost:5173',
  'https://swap-frontend-tigr.onrender.com'
]

app.use(cors({
  origin:function(origin, callback){
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin)===-1){
      const msg = 'The CORS policy for this site will not allow access';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Backend API running" });
});

// Users routes
app.use("/users", usersRouter);

// Listings routes (protected)
app.use("/api/listings", listingsRouter);

// Swap requests routes (protected)
app.use("/api/swap-requests", swapRequestsRouter);

// Wishlist routes (protected)
app.use("/api/wishlist", wishlistRouter);

// Messages routes (protected)
app.use("/api/conversations", conversationsRouter)

// Report routes (protected)
app.use('/api/reports', reportsRouter);

// Notiflication routes (protected)
app.use('/api/notifications', notificationRoutes);

// catch 404
app.use((req, res, next) => {
  res.status(404).json({ message: "Not Found" });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

module.exports = app;
