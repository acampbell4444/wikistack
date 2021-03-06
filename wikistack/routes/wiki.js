const express = require('express');
const router = express.Router();
var models = require('../models');
var Page = models.Page; 
var User = models.User; 

router.get('/', function (req, res, next) {
	Page.findAll({
		include: [
		{model: User, as: 'Author'}
		]
	})
	.then(function (pages) {
    // page instance will have a .author property
    // as a filled in user object ({ name, email })
    if (pages === null) {
    	res.status(404).send();
    } else {
    	res.render('index', {
    		pages: pages
    	});
    }
})
	.catch(next);
});

router.get('/users', function(req, res, next) {
	User.findAll({}).then(function(users){
		res.render('users_index', { users: users });
	}).catch(next);
});

router.get('/users/:id', function(req, res, next) {
	var userPromise = User.findById(req.params.id);
	var pagesPromise = Page.findAll({
		where: {
			AuthorId: req.params.id
		}
	});

	Promise.all([
		userPromise, 
		pagesPromise
		])
	.then(function(values) {
		var user = values[0];
		var pages = values[1];
		res.render('userpage', { user: user, pages: pages });
	})
	.catch(next);

});

router.get('/add', function(req, res) {
	res.render('addpage');
});

router.get('/search', function(req, res) {
	if(Object.keys(req.query).length) {
		var queryTags = req.query.tag_name.split(',').map(x=>x.trim())
		Page.findAll({
	    	// $overlap matches a set of possibilities
	    	where : {
	    		tags: {
	    			$overlap: queryTags
	    		}
	    	},
	    	include: [
	    	{model: User, as: 'Author'}
	    	]  
	    }).then(function(pages){
	    	res.render('tagsearch', { pages: pages });
	    })
	}else {
		res.render('tagsearch')
	}
})

router.get('/:urlTitle', function (req, res, next) {
	Page.findOne({
		where: {
			urlTitle: req.params.urlTitle 
		},
		include: [
			{model: User, as: 'Author'}
		]
	})
	.then(function (page) {
		if(Object.keys(req.query)[0]==='delete_wiki_url') {
			page.destroy()
			.then(function(success) {
				Page.findAll({
					include: [
	    				{model: User, as: 'Author'}
	    			]  
				})
				.then(function(pages) {
					res.render('index', {pages: pages})
				})
			})
	}else if (page === null) {
    	res.status(404).send();
    } else {
    	res.render('wikipage', {page: page})
    }
})
	.catch(next);
});

router.get('/:urlTitle/similar', function (req, res, next) {
	var page;
	Page.findOne({
		where: {
			urlTitle: req.params.urlTitle
		}
	})
	.then(success=>{
		page=success.dataValues;
		Page.findAll({
	    	// $overlap matches a set of possibilities
	    	where : {
	    		tags: {
	    			$overlap: page.tags
	    		},
	    		urlTitle: {
	    			$ne: req.params.urlTitle
	    		}
	    	},
	    	include: [
	    	{model: User, as: 'Author'}
	    	]  
	    }).then(function(pages){
	    	var found = pages.length ? true : false;
	    	res.render('similar', { pages: pages, pagesFound: found});
	    })
	})
});

router.get('/:urlTitle/edit', function (req, res, next) {
	Page.findOne({
		where: {
			urlTitle: req.params.urlTitle
		},
		include: [
			{model: User, as: 'Author'}
		]
	})
	.then(page=>{
		res.render('editpage', {page:page});
	})
});

router.post('/:urlTitle/edit', function (req, res, next) {
	console.log('params',req.params.urlTitle)
	console.log(req.body)

	var selectedPage;
	var selectedUser;
	
	Page.findOne({
		where: {
			urlTitle: req.params.urlTitle
		},
		include: [
			{model: User, as: 'Author'}
		]
	})
	.then(page=>{
		selectedPage = page;
		User.findOne({
			where: {
				id: page.AuthorId
			}
		})
		.then(function(user){
			selectedUser = user;
			page.update({title: req.body.title,content: req.body.page_content, urlTitle: req.body.title.replace(/\W/g, ''), tags: req.body.tags.split(',')})
			.then(function(success) {
				console.log('####', req.body.title)
				console.log('*****',req.body.title.replace(/\W/g, ''))
				selectedUser.update({name: req.body.author_name, email: req.body.author_email})
				.then(function(success) {
					var address = req.body.title.replace(/\W/g, '')
					res.redirect('/wiki/'+address);
				})
			})
		})
	})
});



router.post('/', function(req, res, next) {	
	
	User.findOrCreate({
		where: {
			name: req.body.author_name,
			email: req.body.author_email
		}
	})
	.then(function (values) {
		var user = values[0];
		var tags = req.body.tags.split(',').map(x=>x.trim())
		var page = Page.build({
			title: req.body.title,
			content: req.body.page_content,
			tags: tags
			});
		return page.save().then(function (page) {
			return page.setAuthor(user);
		});
	})
	.then(function (page) {
		res.redirect(page.urlTitle);
	})
	.catch(next);
});





module.exports = router;



















