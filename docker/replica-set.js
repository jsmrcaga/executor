print('\nINSTANCIATING REPLICA SET\n');

print('STATUS:\n');
rs.status();
print('STATUS END\n');

print('INITIATE\n');
rs.initiate({
	_id: 'mongoset',
	members: [{
		_id: 1,
		host: "localhost:27017",
		priority: 1
	}]
});
print('INITIATE END\n');
// rs.secondaryOk();

print('\nREPLICA SET STARTUP DONE\n');

print('\n REPLICA CONFIG \n');

rs.conf();

print('\n REPLICA CONFIG END \n');
