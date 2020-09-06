var ver='200906-01'

var OPU_SERVER_PORT = 9090; // PORT -- 4 connect 2 OPU-SERVER
var OPU_SERVER_HOST='127.0.0.1';//  PORT -- 4 connect 2 OPU-SERVER

var MY_SERVER_PORT  = 7777; // my PORT -- 4 connect from OPU-CLIENT 2 MYSERVER 
var MY_SERVER_HOST='0.0.0.0'; // 0 - all interfaces

var dgram = require('dgram');
var myclient = dgram.createSocket('udp4');
var myserver = dgram.createSocket('udp4');

var ts = new Date();

var packn = 1;
var cmd = 0; // 0..11
var max = 100;
var pattern = 1;
var tmp=0;

function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}

function sendcommand0(){
  var message = new Buffer.from('123456789')
  message[0]=0x7e;         // start byte
  message[1]=packn & 0xff; // packet number
  message[2]=0;            // cmd
  message[3]=77;           //stream number max
  message[4]=max;          //max
  message[5]=(MY_SERVER_PORT & 0xFF00)>>8;  // big 
  message[6]=MY_SERVER_PORT & 0xFF;         // little
  message[7]=1;            // patern
  message[8]=0x7f;         // stop byte

  myserver.on('error', function (err){
    consolelog('! server error: '+err.stack);
    server.close(function(){console.log('!!!!!!!!!!!server down!!!!!!!!!!!!');});
  });

  myserver.on('listening', function () {
    var address = myserver.address();
    console.log('* Start UDP Server listening on ' + 
    address.address + ":" + 
    address.port);
  });
  myserver.on('message', function (message, remote){console.log((tmp++)+' '+ hexdump(message));});

  myserver.bind(MY_SERVER_PORT, MY_SERVER_HOST, function(){
    console.log('- Server binded @'+myserver.address.address+':'+myserver.address.port);
    myclient.send(message, 0, 9, OPU_SERVER_PORT, OPU_SERVER_HOST, function(err, bytes) {
      if (err) throw err;
      ts = new Date();
      console.log(ts.getTime()+' Start command. Open new infostreeam ');
      console.log(ts.getTime()+' SND UDP client message [' +hexdump(message)+ '] sent to ' + OPU_SERVER_HOST +':'+ OPU_SERVER_PORT);
      myclient.on('message', function (message, remote) {
        ts = new Date();
        console.log(ts.getTime()+' RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
        myclient.close();
      });
    });
  });

} // end function sendcommand0

sendcommand0(function (){console.log('The end!');});