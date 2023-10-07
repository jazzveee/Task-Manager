const express = require('express');
const app = express();
const jwt = require('jsonwebtoken')

const {mongoose} = require('./db/mongoose');

const bodyParser = require('body-parser');

// Load in the mongoose models 
const {List, Task, User} = require('./db/models');

// Middleware

// Load body-parser middleware
app.use(bodyParser.json());

// Enable CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

    res.header(
        'Access-Control-Expose-Headers',
        'x-access-token, x-refresh-token'
    );

    next();
});

// Check whether the request has a valid JWT token
let authenticate = (req, res, next ) => {
    let token = req.header('x-access-token');

    //verify JWT token
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            // there was an error
            // jwt is invalid
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id;
            next()
        }
    })
}


// Verify refresh token middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if(!user) {
            // cannot find user
            return Promise.reject({
                'error': 'User not found. Make sure the refresh token and user id are correct'
            });
        }

        // if user is found
        req.user_id = user._id;
        req.refreshToken = refreshToken;
        req.userObject = user;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if session is expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refreshtoken is not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is valid - call next() to continue with processing with this web request
            next();
        } else {
            return Promise.reject({
                'error':'Refresh token has expired or the session is invalid',
                'message': `id is ${_id}`,
                'valid': `Session is ${isSessionValid}`,
                'refresh-token': `${refreshToken}`
            })
        }
    }).catch((e) => {
        res.status(401).send(e);
    });
}

// Route Handlers
// List Routes

// Get all lists
app.get('/lists', authenticate, (req, res) => {
    // Return an array of all the lists in the database belongs to the authenticated user
    List.find({
        _userId: req.user_id
    }).then((lists) => {
        res.send(lists);
    }).catch((e) => {
        res.send(e)
    });
});

// Create a new list
app.post('/lists', authenticate, (req, res) => {
    // Create a new list and return the new list back to the user
    // The list information will be passed in the JSON request body
    let newList = new List({
        title: req.body.title,
        _userId: req.user_id
    });
    newList.save().then((listDoc) => {
        res.send(listDoc)
    });
})

// Update a specified list
app.patch('/lists/:listId', authenticate, (req, res) => {
    // Update the specifiled list (list document with id in the URL) with the new values in the JSON body of the request
    List.findOneAndUpdate({_id: req.params.listId, _userId: req.user_id}, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200);
    });
});

// Delete a list
app.delete('/lists/:listId', authenticate, (req, res) => {
    // Delete the specified list (document with id in the URL)
    List.findOneAndRemove({_id: req.params.listId, _userId: req.user_id}).then((removedListDoc) => {
        res.send(removedListDoc);
        deleteTasksFromList(removedListDoc._id);
    });
});

// Get all tasks inside a list
app.get('/lists/:listId/tasks', authenticate, (req, res) => {
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    });
});

// Find a task in a list
app.get('/lists/:listId/tasks/:taskId', (req, res) => {
    Task.findOne({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((task) => {
        res.send(task);
    });
})
// Create a new task in a list 
app.post('/lists/:listId/tasks', authenticate, (req, res) => {
    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object is found
            return true;
        }
        //list object is not found
        return false;
    }).then((canCreateTask)=>{
        if (canCreateTask) {
            let newTask = new Task({
                title: req.body.title,
                _listId: req.params.listId
            });
            newTask.save().then((newTaskDoc) => {
                res.send(newTaskDoc);
            });
        } else {
            res.sendStatus(404);
        }
    })
    
});

// Update an existing task
app.patch('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
    
    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object is found
            return true;
        }
        //list object is not found
        return false;
    }).then((canUpdateTask) => {
        if(canUpdateTask) {
            // if the currently authenticated user can update task
            Task.findOneAndUpdate({
                _id: req.params.taskId,
                _listId: req.params.listId
            }, { $set: req.body }).then(() => {
                res.send({message: 'updated successfully!'})
            });
        } else {
            res.sendStatus(404);
        }
    })
    
});

// Delete an existing task
app.delete('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object is found
            return true;
        }
        //list object is not found
        return false;
    }).then((canDeleteTask) => {
        if (canDeleteTask){
            Task.findOneAndRemove({
                _id: req.params.taskId,
                _listId: req.params.listId
            }).then((removedTaskDoc) => {
                res.send(removedTaskDoc);
            });
        } else {
            res.sendStatus(404);
        }
        
    })
    
});

// User routes
// Add a new user
app.post('/users', (req, res) => {
    // User sign up
    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // session created successfully and refreshToken returned
        // now generate an access auth token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            //access auth token generated successfully, now we return an object containing the auth tokens
            return {accessToken, refreshToken}
        });
    }).then((authTokens) => {
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    });
})

// User login
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            //session created successfully - refreshToken returned
            // generate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                return {accessToken, refreshToken}
            });
        }).then((authTokens) => {
            res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
});

// Generate and returns an access token
app.get('/users/me/access-token', verifySession, (req, res) => {
    // the user is authenticated, user_id and user object is available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({accessToken});
    }).catch((e) => {
        res.status(400).send(e);
    });
});
    

// Helper methods
let deleteTasksFromList = (_listId) => {
    Task.deleteMany({
        _listId
    }).then(() => {
        console.log("Tasks from " + _listId + " were deleted")
    })
}

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});