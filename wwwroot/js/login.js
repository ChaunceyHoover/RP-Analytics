function login() {
	$.post('/api/auth', { username: $('#username').val(), password: $('#password').val() }, function(result) {
		window.location.href = '/';
	}).fail(function(res) {
		switch(Math.floor(res.status / 100)) {
			case 4: // 4xx error
				if (res.responseJSON.status_code === 1) {
					// User doesn't exist
				} else if (res.responseJSON.status_code === 2) {
					// Invalid password
				} else if (res.responseJSON.status_code === 3) {
					// No username or password (or both) given
				}
				console.log(res);
				break;
			case 5: // 5xx error
				console.log('5xx err');
				break;
			default: // ??? error
				break;
		}
	});
}

$('#username, #password').keydown(function(event) {
	if (event.which === 13) {
		login();
	}
});