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

var OPU_SERVER_PORT = 9090; // PORT -- 4 connect 2 OPU-SERVER
//var OPU_SERVER_HOST='192.162.132.124';//  PORT -- 4 connect 2 OPU-SERVER
//var OPU_SERVER_HOST='185.255.135.85';
var OPU_SERVER_HOST='127.0.0.1';
//var OPU_SERVER_HOST='127.0.0.1';//  PORT -- 4 connect 2 OPU-SERVER
//var OPU_SERVER_HOST='178.158.224.123'; //  PORT -- 4 connect 2 OPU-SERVER


var MY_SERVER_PORT  = 7777; // my PORT -- 4 connect from OPU-CLIENT 2 MYSERVER 
var MY_SERVER_HOST='0.0.0.0'; // 0 - all interfaces

var dgram = require('dgram');
var myclient = dgram.createSocket('udp4');
var myserver = dgram.createSocket('udp4');

var ts = new Date();

var packn = 1;
var cmd = 0; // 0..11
var max = 10;
var pattern = 1;
var tmp=0;
var tmp0=0;

function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}

/////// events /////
myserver.on('error', function (err){
  consolelog('! server error: '+err.stack);
  server.close(function(){consolelog('!!!!!!!!!!!server down!!!!!!!!!!!!');});
});

myserver.on('listening', function () {
  var address = myserver.address();
  consolelog('* Start UDP Server listening on ' + 
  address.address + ":" + 
  address.port);
});

myserver.on('message', function (message, remote){
  var address = myserver.address();
  if (max) tmp++; else tmp0++;
  if (tmp<=max) {
    consolelog("tmp="+tmp0+" "+ hexdump(message));
  } 
  if (tmp>max) myserver.close(()=>{consolelog(tmp+" datagrams recived on port:"+address.port);});
});


myclient.on('message', function (message, remote) {
  ts = new Date();
  consolelog('< RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  myclient.close();
});

/////////end events //////////
var message = new Buffer.from('123456789');
message[0]=0x7e;         // start byte
message[1]=packn & 0xff; // packet number
message[2]=14;            // cmd
message[3]=7;           //stream number max
message[4]=max;          //max
message[5]=(MY_SERVER_PORT & 0xFF00)>>8;  // big 
message[6]= MY_SERVER_PORT & 0xFF;         // little
message[7]=pattern;            // patern
message[8]=0x7f;         // stop byte

// bind serever//////////////////////////////////////////////////////
myserver.bind(MY_SERVER_PORT, MY_SERVER_HOST, function(){
  //after binding:
  var address = myserver.address();    
  consolelog('# Server binded @'+address.address+':'+address.port);
  //sending message:
  myclient.send(message, 0, 9, OPU_SERVER_PORT, OPU_SERVER_HOST, function(err, bytes) {
    //after sending message:
    if (err) throw err;
    ts = new Date();
    consolelog('* Start command. Open new infostreeam ');
    consolelog('> SND UDP client message [' +hexdump(message)+ '] sent to ' + OPU_SERVER_HOST +':'+ OPU_SERVER_PORT);
  });
  //
});
/*  */
///////////////////////////////

