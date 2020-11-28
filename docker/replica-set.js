print('\nINSTANCIATING REPLICA SET\n');

rs.status();
rs.initiate();
rs.slaveOk();

print('\nREPLICA SET STARTUP DONE\n');

print('\n REPLICA CONFIG \n');

rs.conf();

print('\n REPLICA CONFIG END \n');
