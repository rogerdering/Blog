var Sequelize = require('sequelize');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');

var sequelize = new Sequelize('blog', 'postgres', 1234, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});

var User = sequelize.define('user', {
	username: Sequelize.STRING,
	email: Sequelize.STRING,
	password: Sequelize.STRING
});

var Post = sequelize.define('post', {
	title: Sequelize.TEXT,
	body: Sequelize.TEXT
})

var Comment = sequelize.define('comment', {
	title: Sequelize.TEXT,
	body: Sequelize.TEXT
})

User.hasMany(Post);
Post.belongsTo(User);
Post.hasMany(Comment);
Comment.belongsTo(Post);

var app = express();

app.use(session({
	secret: 'oh wow very secret much security',
	resave: true,
	saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', './src/views');
app.set('view engine', 'jade');

app.get('/', function (request, response) {
	response.render('index', {
		message: request.query.message,
		user: request.session.user
	});
});

app.get('/register', function (request, response) { 
	response.render('register', {
		message: request.query.message
	})
})

app.post('/register', function (request, response) {
	var user = User.build({
		username: request.body.username,
		email: request.body.email,
		password: request.body.password
	})

	user.save().then(function() {
	})
	response.redirect('/')
})

app.get('/profile', function (request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		response.render('profile', {
			user: user
		});
	}
});

app.post('/login', function (request, response) {
	if(request.body.email.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
		return;
	}

	if(request.body.password.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}

	User.findOne({
		where: {
			email: request.body.email
		}
	}).then(function (user) {
		if (user !== null && request.body.password === user.password) {
			request.session.user = user;
			response.redirect('/profile');
		} else {
			response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		}
	}, function (error) {
		response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});

app.post('/post', function (request, response) {

	User.findOne({ 
		where: {
			id: request.session.user.id
		} 
	}).then(function (user) {
		user.createPost({
			title: request.body.title,
			body: request.body.body
		});
	});
	response.redirect('/profile')
})

app.get('/all', function (request, response) {
	Post.findAll({ 
	}).then(function (posts) {
		response.render('all', { 
			posts: posts
		}) 
	})
});

app.get('/posts', function (request, response) {
	Post.findAll({ 
		where: {
			userId: request.session.user.id
		} 
	}).then(function (posts) {
		response.render('posts', { 
			posts: posts
		}) 
	})
});

app.post('/search', function (request, response) {
	Post.findOne({
		where: {
			title: request.body.title
		}
	}).then(function (post) {
		request.session.post = post;
		response.redirect('/post');
	});
})

app.get('/post', function (request, response) {
	var post = request.session.post;
	Comment.findAll({
		where: {
			postId: request.session.post.id
		}
	}).then(function(comments) {
		response.render('post', {
			post: post,
			comments: comments
		})
	})
});

app.post('/comment', function (request, response) {
	var comment = Comment.build({
		postId: request.session.post.id,
		title: request.body.title,
		body: request.body.body
	})

	comment.save().then(function() {
	})
	response.redirect('/post')
})

app.get('/logout', function (request, response) {
	request.session.destroy(function(error) {
		if(error) {
			throw error;
		}
		response.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
	})
});

sequelize.sync({force: true}).then(function () {
	User.create({
		username: "roger",
		email: "roger@nycda.cool",
		password: "password"
	}).then(function () {
		var server = app.listen(3000, function () {
			console.log('Example app listening on port: ' + server.address().port);
		});
	});
}, function (error) {
	console.log('sync failed: ');
	console.log(error);
});