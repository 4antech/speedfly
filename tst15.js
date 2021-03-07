var ver='200906-01'
var debug=1;
function consolelog(msg){
  if (debug) {
    ts = new Date();
    var textlog=(ts.getTime()+'. ' + msg);
    console.log(textlog);
    if (debug>2) textlog=textlog+' <br>';
    if (debug>1) fs.appendFileSync("./server.log", textlog+'\n');
  }
}
function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}
var OPU_SERVER_PORT = 9090; // PORT -- 4 connect 2 OPU-SERVER
var OPU_SERVER_HOST='127.0.0.1';
var MY_SERVER_PORT  = 7777; // my PORT -- 4 connect from OPU-CLIENT 2 MYSERVER 
var MY_SERVER_HOST='0.0.0.0'; // 0 - all interfaces
var dgram = require('dgram');
var myclient = dgram.createSocket('udp4');
var ts = new Date();
var packn = 1;
var cmd = 15; // 0..15
/////// events /////
myclient.on('message', function (message, remote) {
  ts = new Date();
  consolelog('< RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  myclient.close();
});

/////////end events //////////
var arg1 = 1000;
var arg2 = 777;
var arg3 = 557;
var arg4 = 4444;
var arg5 = 5555;
var arg6 = 600;

var message = new Buffer.from('1234567890123456789012345678');
message[0]=0x7e;         // start byte
message[1]=packn & 0xff; // packet number
message[2]=0x0e;            // cmd


message[3]= (arg1 & 0xff000000)>>24;
message[4]= (arg1 & 0xff0000)>>16;
message[5]= (arg1 & 0xff00)>>8;
message[6]= (arg1 & 0xff);

message[7]= (arg2 & 0xff000000)>>24;
message[8]= (arg2 & 0xff0000)>>16;
message[9]= (arg2 & 0xff00)>>8;
message[10]= (arg2 & 0xff);

message[11]= (arg3 & 0xff000000)>>24;
message[12]= (arg3 & 0xff0000)>>16;
message[13]= (arg3 & 0xff00)>>8;
message[14]= (arg3 & 0xff);

message[15]= (arg4 & 0xff000000)>>24;
message[16]= (arg4 & 0xff0000)>>16;
message[17]= (arg4 & 0xff00)>>8;
message[18]= (arg4 & 0xff);

message[19]= (arg5 & 0xff000000)>>24;
message[20]= (arg5 & 0xff0000)>>16;
message[21]= (arg5 & 0xff00)>>8;
message[22]= (arg5 & 0xff);

message[23]= (arg6 & 0xff000000)>>24;
message[24]= (arg6 & 0xff0000)>>16;
message[25]= (arg6 & 0xff00)>>8;
message[26]= (arg6 & 0xff);

message[27]=0x7f;         // stop byte

  myclient.send(message, 0, 28, OPU_SERVER_PORT, OPU_SERVER_HOST, function(err, bytes) {
    //after sending message:
    if (err) throw err;
    ts = new Date();
    consolelog('* Start command. N'+cmd);
    consolelog('> SND UDP client message [' +hexdump(message)+ '] sent to ' + OPU_SERVER_HOST +':'+ OPU_SERVER_PORT);
  });


/*  */
///////////////////////////////

