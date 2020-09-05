/// UDP server bistrolet    ///////////////////////
const version=200904.1;
const debug=1;
const SERVERPORT = 9090;
const pi=Math.PI;
const pi2=Math.PI*2;
const pina2=Math.PI/2;
const r2g=180/Math.PI;
const SERVERHOST='0.0.0.0';
//var HOST='192.162.132.124'; // pumps

const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');
const fs = require("fs");
///////////////////////my variables

var indtcnt =0;
var flag2stop =0 ;
var statemove_el = 0;
var statemove_az = 0;
//variable - flag-status brake-stat 0-off 1-brake-on
var statebrake_el = 0; //not used in pion
var statebrake_az = 0; 
//TODO: set to REAL DATA for device
var  AZ_SOFTLIMIT_CW   = 10; // 180
var  AZ_SOFTLIMIT_CCW  = 20; // 0
var  EL_SOFTLIMIT_UP   = 30; // 88
var  EL_SOFTLIMIT_DOWN = 40; // 5

var  AZ_OFFSET = 0;   //  <---+______TODO: initfunction. 
var  EL_OFFSET = 0;   //  <---+
//END TODO---------------------------
///////////////////////////////////////////////////////
function consolelog(msg){
  if (debug) {
    ts = new Date();
    var textlog=(ts.getTime()+'. ' + msg);
    console.log(textlog);
    if (debug>2) textlog=textlog+' <br>';
    if (debug>1) fs.appendFileSync("./server.log", textlog+'\n');
  }
}
function hexdump(msg){  //return string in
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}
function num2hex1(num){
  if (num<255) return String.fromCharCode(num); 
  else return -1;
}
function div2rad(mega){ 
  if (mega>=0 && mega<=1048576) return mega*Math.PI*2/1048576;
  else return -1;
}
function rad2div(ang){ 
  if (ang==0) return 0;
  else return Math.round((pi2/ang)*1048576);
}
function div2rad_neg(mega){ 
  if (mega>524288 || mega<-524288) console.log("error value for franslate to radian");
  else  return ((mega*pi2/1048576)-pina2);
}
function rad2div_neg(ang){return (rad2div(ang+pina2)-524288);}
/////////////////////////////////////////////////
dgsize=[9,5,10,12,10,12,6,5,10,12,10,12,6,5,20];
/////////////////////////////////////
function validation(message){
//detection START-END Bytes 0x7e 0x7f
  if (message[0]!=126 || message[message.length-1]!=127 ) return 2;//0x7e 0x7f
//detection command number. valid range 0..10
  var cmd=message[2];
  if (cmd<0 || cmd>15) return 3; //unknown command
  if (dgsize[cmd]!=message.length) return 4;
// validation code:
// good data           0
// bad args            1
// non-formated        2
// unknown command     3
// bad packet size     4
  return 0;
}
///////////////////////////////////////////////////////////////////////
function startcommand(msg){
  if (msg[2]==0) {
    console.log('* command ${msg[2]} strted');
  }
  else consolelog('* command under construction');
}
///////////////////////server function
server.on('error', function (err){
  consolelog('! server error: '+err.stack);
  server.close(function(){console.log('!!!!!!!!!!!server down!!!!!!!!!!!!');});
})
server.on('listening', function () {
  lastcmd=0;
  var address = server.address();
  consolelog('* Start UDP Server listening on ' + 
  address.address + ":" + 
  address.port)+ 
  " Without full validation! (on some time) becose under construction...";
});
server.on('message', function (message, remote) {
  var packetResponse=new Buffer.from('12345');
//      packetResponse=new Buffer.from(msgResponse);  
  var msglog='';
  consolelog('< rcv from ' + remote.address + ':' + remote.port + 
  ' - [' + hexdump(message) + ']');
  var command=message[2];
  var dtnum=message[1];
  var validstatus=validation(message); 
//  var validstatus=1;
//  if (validstatus<0) validbyte=127-validstatus;
//console.log(validbyte);
  packetResponse[0]=0x7e;
  packetResponse[1]=message[1];
  packetResponse[2]=message[2]; 
  packetResponse[3]=validstatus;
//      String.fromCharCode(validbyte) +
  packetResponse[4]=0x7f;
  if (validstatus==1) msglog=("! Error packet args ["+ 
    hexdump(message) +"]");        //bad argument
  else if (validstatus==2) msglog=("! error packet format" ); //bad incoming packet
  else if (validstatus==3) msglog=("! unknown command: [" + 
    command.toString(16) + "] packet N=" +dtnum ); //bad incoming packet
  else if (validstatus==4) msglog=("! error packet size:" + 
    message.length +" for this command:[" + 
    command.toString(16) +
    "]" + " packet N=" +dtnum  );        //bad incoming packet
  else if (validstatus==0)  {
    msglog=('* CMD Ok [' + command + ']' + " packet N=" +dtnum  ); //packet & argument Ok!   
    startcommand(message);
  }
  consolelog(msglog +' from ' + remote.address + ':' + remote.port);
// validation code:
// good data           0
// bad args            1
// non-formated        2
// unknown command     3
// bad packet size     4
//  packetResponse=new Buffer.from(msgResponse);  
///////// response function
  server.send(packetResponse, 0, packetResponse.length, remote.port, 
  remote.address, function(err, bytes) {
    if (err) throw err;
    consolelog('> snt UDP server message response to ' + 
      remote.address + ':' + 
      remote.port +' [' + 
      hexdump(packetResponse) + ']');
    consolelog('____________');
  });
  ////////////  
});

// main: //////////////////////////////////////////

server.bind(SERVERPORT, SERVERHOST, function(){
//  consolelog('- Server binded @'+SERVERHOST+':'+SERVERPORT);  
});

