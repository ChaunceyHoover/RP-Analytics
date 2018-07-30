var generating = false;
var report = {};

function logout() {
	$.ajax({
		url: '/api/auth',
		type: 'DELETE',
		contentType: 'application/json',
		success: function(res) {
			window.location.href = '/login';
		},
		error: function(res) {
			alert('Logout doesn\'t work for some reason. Tell Chauncey.');
			window.location.href = '/login';
		}
	});
}

function generate_report() {
	if (generating) return;

	// Verify user entered proper date (mm/dd)
	var start = $('#start').val(), end = $('#end').val();
	if (start.length === 0 || start.length > 5) {
		alert('Please enter valid start date (mm/dd).')
		return;
	} else if (end.length === 0 || end.length > 5) {
		alert('Please enter valid end date (mm/dd).');
		return;
	}

	// Get date and format to ensure MM/DD
	var regex = /(\d\d|\d).(\d\d|\d)/;
	var start_result = regex.exec(start), end_result = regex.exec(end);
	if (start_result == null) {
		alert('Please enter a valid start date (mm/dd)');
		return;
	} else if (end_result == null) {
		alert('Please enter a valid end date (mm/dd)');
		return;
	}
	
	// prevent user from spamming reports
	generating = true;

	// clear fields
	$.each(['in', 'out', 'hold', 'total'], function(index1, value1) {
		$.each(['current', 'previous'], function(index2, value2) {
			$.each(['stk', 'ttnx', 'sclt', 'clsc'], function(index3, value3) {
				$('#' + value3 + '-' + value2 + '-' + value1).html('-');
			});
		});
	});

	function pad(num, size) {
		var s = "0" + num;
		return s.substr(s.length - size);
	}
	report.date = { 
		start: pad(start_result[1], 2) + '/' + pad(start_result[2], 2), 
		end: pad(end_result[1], 2) + '/' + pad(end_result[2], 2)
	};

	// Format datetime strings for request (YYYY-MM-DD HH:mm:SS)
	var c_start_time = (new Date().getFullYear()) + '-' + pad(start_result[1], 2) + '-' + pad(start_result[2], 2) +
						'%2000:00:00';
	var c_end_time = (new Date().getFullYear()) + '-' + pad(end_result[1], 2) + '-' + pad(end_result[2], 2) +
						'%2000:00:00';
	var p_start_time = (new Date().getFullYear() - 1) + '-' + pad(start_result[1], 2) + '-' + pad(start_result[2], 2) +
						'%2000:00:00';
	var p_end_time = (new Date().getFullYear() - 1) + '-' + pad(end_result[1], 2) + '-' + pad(end_result[2], 2) +
						'%2000:00:00';

	// Signify loading by changing button color
	$('#generate_btn').toggleClass('btn-success', false);
	$('#generate_btn').toggleClass('btn-danger', true);

	// Used as a check to signify when both async methods are completed
	var current = false, previous = false;

	// Shows status for both reports being generated
	function show_status() {
		$('#report-status').html('Current: ' + (current ? 'Complete' : 'Generating...') + ' | Previous: ' + (previous ? 'Complete' : 'Generating...'));
	}

	// Current year
	$.ajax({
		url: '/api/report?start=' + c_start_time + '&end=' + c_end_time,
		type: 'GET',
		contentType: 'application/json',
		success: function(res) {
			$.each(['in', 'out', 'hold', 'total'], function(index1, value1) {
				$.each(['stk', 'ttnx', 'sclt', 'clsc'], function(index2, value2) {
					$('#' + value2 + '-current-' + value1).html(res[value2][value1]); 
					$('#' + value2 + '-current-' + value1).html(res[value2].formatted[value1]);
				});
			});
			report.current = res;
		},
		error: function(res) {
			console.log(res);
		},
		complete: function() {
			current = true;
			show_status();
			if (current && previous) {
				results_completed()
			}
		}
	});
	// Previous year
	$.ajax({
		url: '/api/report?start=' + p_start_time + '&end=' + p_end_time,
		type: 'GET',
		contentType: 'application/json',
		success: function(res) {
			$.each(['in', 'out', 'hold', 'total'], function(index1, value1) {
				$.each(['stk', 'ttnx', 'sclt', 'clsc'], function(index2, value2) {
					$('#' + value2 + '-previous-' + value1).html(res[value2][value1]); // if there is no formatted value, uses this
					$('#' + value2 + '-previous-' + value1).html(res[value2].formatted[value1]); // overwrites to formatted value, if exists
				});
			});
			report.previous = res;
		},
		error: function(res) {
			console.log(res);
		},
		complete: function() {
			previous = true;
			show_status();
			if (current && previous) {
				results_completed()
			}
		}
	});
	
	show_status(current, previous);

	function results_completed() {
		$('#generate_btn').toggleClass('btn-success', true);
		$('#generate_btn').toggleClass('btn-danger', false);
		$('#report-status').html('Report For: ' + pad(start_result[1], 2) + '/' + pad(start_result[2], 2) + ' to ' + pad(end_result[1], 2) + '/' + pad(end_result[2], 2));
		generating = false;
	}
}

function export_report() {
	if (report == null || report.date == null || report.current == null || report.previous == null) {
		alert('Please generate a report before exporting');
		return;
	} 

	var blob = 'Report Generated for ' + report.date.start + ' to ' + report.date.end + "\n"
			+ "System,In,Out,Hold,Active/In-Active rooms,Total rooms\n"
			+ 'STK,' + report.current.stk.in + ',' + report.current.stk.out + ',' + report.current.stk.hold + ',,' + report.current.stk.total + '\n'
			+ 'TTNX,' + report.current.ttnx.in + ',' + report.current.ttnx.out + ',' + report.current.ttnx.hold + ',,' + report.current.ttnx.total + '\n'
			+ 'SCLT,' + report.current.sclt.in + ',' + report.current.sclt.out + ',' + report.current.sclt.hold + ',,' + report.current.sclt.total + '\n'
			+ 'CLSC,' + report.current.clsc.in + ',' + report.current.clsc.out + ',' + report.current.clsc.hold + ',,' + report.current.clsc.total + '\n';
	
	saveAs(
		new Blob([blob], { type: "text/plain;charset=" + document.characterSet }),
		"report.csv"
	);
}