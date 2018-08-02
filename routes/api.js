const router = require('express').Router();
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
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

// Database for this application
const connection = require('mysql').createPool({
    multipleStatements: true,
    host:     process.env.SQL_SERVER,
    user:     process.env.SQL_USER,
    password: process.env.SQL_PASS,
    database: process.env.SQL_DB
});

/// LOGIN
// Get user session info
router.get('/auth', function(req, res, next) {
	if (!req.session.userId) {
		return res.status(401).json({
			status: 'Not logged in',
			status_code: 3
		});
	}

	return res.status(200).json({
		status: 'Success',
		status_code: 0,
		data: req.session
	});
});
// Login
router.post('/auth', function(req, res, next) {
	if (req.body.username == null || req.body.password == null) {
		return res.status(400).json({
			status: 'Invalid login',
			status_code: 3
		});
	}
	connection.query('SELECT * FROM `user` WHERE username = ?', [req.body.username], (err, results) => {
		if (err) {
			return res.status(500).json({ // probably something to do with mysql
				status: 'Internal server error; please try again later',
				status_code: -1
			});
		}
		if (results.length > 0) {
			if (bcrypt.compareSync(req.body.password, results[0].password)) {
				req.session.userId = results[0].id;
				req.session.user = {
					userId: results[0].id,
					username: results[0].username,
					name: results[0].name
				}
				req.session.save();
				return res.status(200).json({
					status: 'Success',
					status_code: 0
				});
			} else {
				return res.status(401).json({
					status: 'Invalid password',
					status_code: 2
				});
			}
		} else {
			return res.status(401).json({
				status: 'User does not exist',
				status_code: 1
			});
		}

		
	});
});
// Logout
router.delete('/auth', function(req, res, next) {
	req.session.destroy();
	return res.status(200).json({
		status: 'Success',
		status_code: 0
	});
});

/// REPORT GENERATION
router.get('/report', function(req, res, next) {
	if (!req.session.userId) {
		return res.status(401).json({
			status: 'Not logged in',
			status_code: 3
		});
	}

	const report_query = "SELECT site_id, SUM(iAmount) / 100 as MoneyIn " +
	"FROM `billing` " +
	"WHERE strStatus = 'MD' AND dtDate >= ? AND dtDate <= ? " +
	"GROUP BY site_id; " +
	"SELECT site_id, SUM(iAmount) / 100 as MoneyOut " +
	"FROM `billing` " +
	"WHERE strStatus = 'MW' AND dtDate >= ? AND dtDate <= ? " +
	"GROUP BY site_id";

	var total_count = 0;
	var report = {};

	var connections = [ 
		{name: 'stk', con: stk_connection}, {name: 'ttnx', con: ttnx_connection},
		{name: 'sclt', con: sclt_connection}, {name: 'clsc', con: clsc_connection}
	];

	connections.forEach(function(connection) {
		connection.con.query(report_query, [req.query.start, req.query.end, req.query.start, req.query.end], (err, results) => {
			var total_in = 0, total_out = 0, total_hold;
			results[0].forEach(function(row_in) {
				total_in += row_in.MoneyIn;
			});
			results[1].forEach(function(row_out) {
				total_out += row_out.MoneyOut;
			});
	
			total_hold = total_in - total_out;
	
			report[connection.name] = {
				'in': Math.round(total_in * 100) / 100,
				'out': Math.round(total_out * 100) / 100,
				'hold': Math.round(total_hold * 100) / 100,
				'formatted': {
					'in': '$' + (total_in).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
					'out': '$' + (total_out).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
					'hold': '$' + (total_hold).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
				}
			};
	
			if (++total_count >= 4) {
				return res.status(200).json(report);
			}
		});
	});
});

module.exports = router;