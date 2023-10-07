// This file handles connection logic to the MongoDB database

// initialise dotenv
require('dotenv').config();

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_CONNECT,{useNewUrlParser: true}).then(() => {
    console.log("Connected to mongoDB successfully")
}).catch((e) => {
    console.log("Error while attempting to connect to MongoDB");
    console.log(e);
});

module.exports = {
    mongoose
};