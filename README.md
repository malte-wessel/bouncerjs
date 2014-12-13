bouncerjs
=========

Activity based authorization module for Node. 

[![Build Status](https://travis-ci.org/malte-wessel/bouncerjs.svg?branch=master)](https://travis-ci.org/malte-wessel/bouncerjs)

![bouncerjs](http://wp.patheos.com.s3.amazonaws.com/blogs/deaconsbench/files/2013/12/bouncer.jpg "bouncerjs")

## Install

````
npm install bouncerjs --save
````

##Setup

### Activities
Activities are actions that will be performed by a user. Say we got a model that represents a blog post. Users can view, create, update and delete these posts. Therefore we got four activities, namely `post:view`, `post:create`, `post:update` and `post:delete`. Each activity requires different tests to determine whether or not a user is allowed to perform it. Let's take a closer look at the `post:view` activity. Every user is allowed to view a certain post, if the post is public. If it is not public, only admins and the user that is the owner of the post are allowed to view it. With bouncerjs, you can define such assertions in a declarative way. Have a look at the following example:

```javascript
var activities = {
    post: {
        view: function(params) {
            return ['OR',
                ['post:isPublic', params.postId],
                ['post:belongsToUser', params.user, params.postId],
                ['user:isMemberOfGroup', params.user, 'admin']                
            ];
        }
    }
};
```

We've created the activity `post:view` that returns a set of assertions. These assertions are chained with the operator `OR`. In this case bouncerjs will serially test each assertion. As soon as one assertion succeeds, bouncerjs will gains access to the respective activity.

### Assertions
Now, that we've defined a set of assertions, we need to implement them. 

```javascript

var assertions = {
    post: {
        isPublic: function(postId, callback) {
             // Your logic to test that the post is public.
            var post = new Post(postId);
            post.isPublic(function(err, isPublic) {
                if(err) return callback(err);
                // If the post is not public pass an error to the callback
                if(!isPublic) return callback(new Error('Post is not public'));
                // Otherwise just invoke the callback.
                return callback();
            });
        },
        belongsToUser: function(user, postId, callback) {
            // Your logic to test that the post belongs to the given user.
            var post = new Post(postId);
            post.belongsToUser(user.id, function(err, belongsToUser) {
                if(err) return callback(err);
                if(!belongsToUser) return callback(new Error('Post does not belong to user'));
                return callback();
            });
        }
    },
    user: {
        isMemberOfGroup: function(user, group, callback) {
            // Your logic to test that the user belongs to the given group.
            if(user.group != group) {
                return callback(new Error('User is not member of group ' + group));
            }
            return callback();
        }
    },
};
```

### Configuration
Ok, we have defined the activites and implemented the assertions. Now we need to configure bouncerjs. Therefore we instantiate bouncerjs with the previously created activities and assertions. We also provide two callbacks. `onNotAuthenticated` will be called when a user is not authenticated. `onNotAuthorized` will be called when a user tries to perform an activity he is not allowed to.

```javascript
var Bouncer = require('bouncerjs');

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
Now we can user the bouncer instance to protect our routes. Therefore we use the `activity` method. This method returns a middleware function that handles the authorization.

```javascript
var express = require('express');
var app = express();
var PostsController = require('./controllers/posts.js');

// Require the previously created bouncer instance
var bouncer = require('./bouncer.js');

app.get('/post/:id', 
    // Use bouncer.activity() as a middleware
    bouncer.activity('post:view', function(req) {
        return {
           // You will always need to pass the user object in order to 
           // tell bouncerjs that you have an authenticated user.
           user: req.user,
           postId: req.param('id')
        }
    }),
    // If the user is allowed to perform the activity,
    // the next middleware will be invoked.
    PostsController.view
);

var server = app.listen(3000);

```

##Documentation

#### `new Bouncer(options)`

* `options` {Object}
	* `options.activities` {Object} Namespaced activities
	* `options.assertions` {Object} Namespaced assertions
	* `options.onNotAuthenticated` {Function} Invoked when the `bouncer#activity()` middleware is used and the user is not authenticated.
	* `options.onNotAuthorized` {Function} Invoked when the `bouncer#activity()` middleware is used and the user is not authorized.
	* `options.NotAuthenticatedError` Error class, created and passed when user is not authenticated.

Create a new bouncer instance. Configurate bouncer with a hash of `options`.

#### `bouncer.activity(activity, params)`

* `activity` {String} Name of the activity
* `params` {Function} Function that returns parameters for your assertions. Your assertions will use these parameters for evaluation.


Returns a middleware function that determines whether or not the user is authorized to perform the given activity. The `params` function will be invoked with the `req` object, given by the user's request. Grab the required data for your assertions from `req` and return them. 

**Note**: bouncerjs is all about authorization, not authentication. You will always need to pass a `user` object in order to tell bouncerjs that you have an authenticated user. If you do not pass a `user` object, bouncer assumes that the user is not authenticated and fails with a `NotAuthenticatedError`.

#### Example

```javascript
var express = require('express');
var app = express();
var PostsController = require('./controllers/posts.js');

// Require the bouncerjs instance
var bouncer = require('./bouncer.js');

app.get('/post/:id', 
    // Use bouncer.activity() as a middleware
    bouncer.activity('post:view', function(req) {
        return {
           // You will always need to pass the user object in order to 
           // tell bouncerjs that you have an authenticated user.
           user: req.user,
           postId: req.param('id')
        }
    }),
    // If the user is allowed to perform the activity,
    // the next middleware will be invoked.
    PostsController.view
);

var server = app.listen(3000);
```

#### `bouncer.canPerformActivity(activity, params, callback)`

* `activity` {String} Name of the activity
* `params` {Function|Object} Function that returns parameters for your assertions. Your assertions will use these parameters for evaluation.
* `callback` {Function} Will be invoked with `callback(isAuthorized)`.
	* `isAuthorized` {Boolean} Will be `true` when authorization is successful, `false` if not.

Determines whether or not the user is authorized to perform the given activity. If the user is not authorized to perform the activity, the passed `isAuthorized` value will be `false`. Otherwise it will be `true`. 

#### Example


```javascript
app.get('/post/:id', function(req, res, next) {
	
	var params = {
		user: req.user, 
		postId: req.param('id'),
	};
	
	bouncer.canPerformActivity('post:view', params, function(isAuthorized) {
		// isAuthorized bill be true when 
		// authorization is successful, false if not.
	});

});
```

#### `bouncer.permittedActivities(activities, params, callback)`

* `activities` {Array} Array of activity names, bouncerjs will test each activity against the given user.
* `params` {Function|Object} Function that returns parameters for your assertions. Your assertions will use these parameters for evaluation.
* `callback` {Function} Invoked with `callback(err, permittedActivities)`.
	* `permittedActivities` {Array} Filtered list of activities, the user is authorized to perform.


Sometimes you might want to test more than one activity against one user. Pass an array of activity names and the corresponding parameters to this function. The callback will be invoked with a filtered list of the given activities, the user is allowed to perform. If the user is not allowed to perform any of these activities, the array will be empty.

#### Example

```javascript
app.get('/post/:id', function(req, res, next) {
	
	var activities = ['post:view', 'post:update', 'post:delete'];
	
	var params = {
		user: req.user, 
		postId: req.param('id'),
	};	
	
	bouncer.permittedActivities(activities, params, function(err, permittedActivities) {
		// `permittedActivities` might be ['post:view']
	});

});
```

### Operators

#### `AND`

Every single assertion must succeed.

#### `OR`

One of the assertions must succeed.

All operators can be nested and used in conjunction. Have a look at the following code:

```javascript
var activities = {
	store: function(params) {
		return ['OR',
			['user:isMemberOfGroup', params.user, 'admin'],
			['AND', 
				['category:belongsToUser', params.categoryId, params.user],
				['category:typeIsNot', 'ads', params.categoryType],
				['OR', 
					['user:isMemberOfGroup', params.user, 'premium'],
					['AND',
						['user:isMemberOfGroup', params.user, 'user'],
						['user:hasNotReachedPostCreationLimit', params.user]
					]
				]
			]
		[;
	}
}
```