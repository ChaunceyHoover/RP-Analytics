const router = require('express').Router();
const mysql = require('mysql');
const path = require('path');
require('dotenv').load();

// All supported systems
const stk_connection = mysql.createPool({
	multipleStatements: true,
	host:     process.env.STK_HOST,
	user:     process.env.STK_USER,
	password: process.env.STK_PASS,
	database: process.env.STK_DB
});
const ttnx_connection = mysql.createPool({
	multipleStatements: true,
	host:     process.env.TTNX_HOST,
	user:     process.env.TTNX_USER,
	password: process.env.TTNX_PASS,
	database: process.env.TTNX_DB
});
const sclt_connection = mysql.createPool({
	multipleStatements: true,
	host:     process.env.SCLT_HOST,
	user:     process.env.SCLT_USER,
	password: process.env.SCLT_PASS,
	database: process.env.SCLT_DB
});
const clsc_connection = mysql.createPool({
	multipleStatements: true,
	host:     process.env.CLSC_HOST,
	user:     process.env.CLSC_USER,
	password: process.env.CLSC_PASS,
	database: process.env.CLSC_DB
});

router.get('/', function(req, res, next) {
	if (!req.session.userId) {
		return res.redirect('/login');
	}

	var total = 0;
	var site_query = "SELECT site_id, site_active FROM `sites`";

	const connections = [
		{name: 'stk', con: stk_connection}, {name: 'ttnx', con: ttnx_connection}, 
		{name: 'sclt', con: sclt_connection}, {name: 'clsc', con: clsc_connection}];
	var data = {};
	
	connections.forEach(function(connection) {
		connection.con.query(site_query, function(err, results) {
			if (err) throw err;
	
			let total_sites = results.length, active_sites = 0;
			results.forEach(function(site_row) {
				if (site_row.site_active == 1) {
					active_sites++;
				}
			});
			data[connection.name] = { total_sites, active_sites };

			if (++total === 4) {
				console.log(data);
				return res.render('index', { 
					moment: require('moment'), 
					title: "Home", 
					user: req.session.user,
					data: data
				});
			}
		});
	});

	
});

router.get('/login', function(req, res, next) {
    return res.render('login', { title: 'Login' });
});

module.exports = router;