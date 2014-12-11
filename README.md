bouncerjs
=========

Activity based authorization for Nodejs

[![Build Status](https://travis-ci.org/malte-wessel/bouncerjs.svg?branch=master)](https://travis-ci.org/malte-wessel/bouncerjs)

## Install

````
npm install bouncerjs --save
````

##Setup

```javascript
var Bouncer = require('bouncerjs');

// Define your activites. In this example we got a model `Post` that will be updated by a user
var activities = {
    post: {
        update: function(params) {
            // Here you define which assertions will be tested in order
            // to allow the user to perform the activity
            // You can use the operators `OR` and `AND`.
            return ['OR',
                ['user:isMemberOfGroup', params.user, 'admin'],
                ['post:belongsToUser', params.user, params.postId]
            ];
        }
    }
};

// Implement the assertions
var assertions = {
    user: {
        isMemberOfGroup: function(user, group, callback) {
            // Your logic to test that the user belongs to the given group.
            if(user.get('group') != group) {
                // If the user does not belong to the given group, pass an error.
                return callback(new Error('User is not member of group ' + group));
            }
            // Otherwise just invoke the callback.
            return callback();
        }
    },
    post: {
        belongsToUser: function(user, postId, callback) {
            // Your logic to test that the post belongs to the given user.
            var post = new Post(postId);
            post.belongsToUser(user.id, function(err, belongsToUser) {
                if(err) return callback(err);
                if(!belongsToUser) return callback(new Error('Post does not belong to user'));
                return callback();
            });
        }
    }
};

// Create a new bouncer instance
var bouncer = new Bouncer({
    // Pass the defined activities and assertions
    activities: activities,
    assertions: assertions,

    // Middleware handler when user is not authenticated
    onNotAuthenticated: function(req, res, next) {
        next(new Error('User is not authenticated'));
    },
    
    // Middleware handler when user not authorized
    onNotAuthorized: function(err, req, res, next) {
        // For example: pass the error from the assertion
        next(err);
    }

});

module.exports = bouncer;
```

##Use

```javascript
var express = require('express');
var app = express();
var PostsController = require('./controllers/posts.js');

// Require the previously created bouncer instance
var bouncer = require('./bouncer.js');

app.put('/post/:id', 
    // Use bouncer.activity() as a middleware
    bouncer.activity('post:update', function(req) {
        return {
           // You will always need to pass the user object in order to 
           // tell bouncerjs that you have an authenticated user.
           user: req.user,
           postId: req.param('id')
        }
    },
    // If the user is allowed to perform the activity,
    // the next middleware will be invoked.
    PostsController.update
);

var server = app.listen(3000);

```

##Documentation
Work in progress!
