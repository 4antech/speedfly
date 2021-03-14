#!/usr/bin/env node
/// UDP server bistrolet    ///////////////////////
const version='210301.1';
const debug=2;
const SERVERPORT = 9090;
const pi=Math.PI;
const pi2=Math.PI*2;
const pina2=Math.PI/2;
const r2g=180/Math.PI;
//const SERVERHOST='192.162.132.124';
//const SERVERHOST='10.10.10.30';
const SERVERHOST='0.0.0.0';
var lastidx=0;
//var HOST='192.162.132.124'; // pumps
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const fs = require("fs");
///////////////////
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
const infostream =  new MyEmitter();

/////////////////
///////////////////////my variables
var indtcnt =0;
var flag2stop = 0 ;
var statemove_el = 0;
var statemove_az = 0;
//variable - flag-status brake-stat 0-off 1-brake-on
var statebrake_el = 0; //not used in pion
var statebrake_az = 0; 

//TODO: set to REAL DATA for device
var  AZ_SOFTLIMIT_CW   = 20; // 180
var  AZ_SOFTLIMIT_CCW  = 20; // 0
var  EL_SOFTLIMIT_UP   = 30; // 88
var  EL_SOFTLIMIT_DOWN = 40; // 5
var  AZ_OFFSET = 0;   //  <---+______ TODO: initfunction. 
var  EL_OFFSET = 0;   //  <---+
//END TODO---------------------------
///////////////////////////////////////////////////////


//SerialPort extention
const SerialPort = require('serialport')
const parsers = SerialPort.parsers
const parser = new parsers.Readline({delimiter: '\n'});
const port = new SerialPort('/dev/serial0', {baudRate: 921600});
port.pipe(parser);
port.on('open', () => {
    consolelog('* SerialPort Ok');
    port.write("1|11|15|z\n");
    });
parser.on('data', data=>{
// Сохраняем позицию енкодера
//port.write(data);
console.log(data);
});
//////////////////////////// CAN 
//function readenc(can_address) return enc[can_address];

function xmove(can_address,speed) {
  port.write("2|"+can_address+"|"+speed+"|z\n");
}

var azimuth = {
  flag2stop: 0,
  flag4start: 1,
  movestate: 0,
  ts: 0,
  _angl: 0,
  get angl(){
    prom4ts=new Promise(function(resolv,reject){
      sts=new Date();
      azimuth.ts = sts.getTime();
      resolv(1);
      reject(0)
    })
    prom4ts.then(this._angl = 40950);// get from STAS.  
    //test on softlimit TODO
    return this._angl;
  },
  set angl(value) {
    //test on softlimit TODO
    if (value>=0 && value <=1048576) {
      this._angl=value;
      sts=new Date();
      azimuth.ts =sts.getTime();
    }
    else {consolelog("! AZIMUTH error set value:"+value);return 0}
  }
};

var ele = {
  flag2stop: 0,
  flag4start: 1,
  movestate: 0,
  ts: 0,
  get angl(){
    prom4ts=new Promise(function(resolv,reject){
      sts=new Date();
      ele.ts = sts.getTime();
      resolv(1);
      reject(0)
    })
    prom4ts.then(this._angl = 10240);// get from STAS.  
    //test on softlimit TODO
    return this._angl;
  },
  set angl(value) {
    //test on softlimit TODO
    if (value>=0 && value <=1048576) {
      this._angl=value;
      sts=new Date();
      ele.ts =sts.getTime();
    }
    else {consolelog("! ELEVATION error set value:"+value);return 0}
  }  
};

var stopflag=new Array;
var clients = new Array;
var newclient  = new Object;
newclient={
  ptr: dgram.createSocket('udp4'),
  num: 0,
  cnt:0,
  ptrn:0,
  stopflag:0
};
clients[0]= newclient;//open for future. time-economy
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
////////////////////////////////////////////////
dgsize=[9,5,10,12,10,12,6,5,10,12,10,12,6,5,28];
////////////////////////////////////////////////
function validation(message){
//detection START-END Bytes 0x7e 0x7f
  if (message[0]!=126 || message[message.length-1]!=127 ) return 2;//0x7e 0x7f
//detection command number. valid range 0..15
  var npack=message[1];
  var cmd=message[2];
  if (cmd<0 || cmd>15) return 3; //unknown command
  if (dgsize[cmd]!=message.length) return 4; //command size.
////////////
//validation  args:
///////// command N1 (0x00)
  if (cmd==0) { // 0
    arg1=message[3];
    arg2=message[4];
    arg3=message[6] + (message[5]<<8);
    arg4=message[7];
    consolelog("<< cmd:"+cmd+" N="+npack+"; potok N"+ arg1+"; max pack="+ arg2 +"; port:"+ arg3 +"; pattern "+ arg4+";");
    if (arg2==0 || arg4>10) {consolelog("! error args");return 1;}
  }
///////// command N3 (0x02) & command N9 (0x08)
  else if (cmd==2 || cmd==8) { 
    arg1= (message[3]<<24) + (message[4]<<16) + (message[5]<<8)+message[6];
    arg2= (message[7]<<8) + message[8];
    consolelog("<<cmd:"+cmd+" N="+npack+" coord="+ arg1+" speed="+ arg2);
    if (arg1<0 || arg1>1048576 || arg2<0 || arg2>1000) {consolelog("! error args");return 1;}
//TODO softlimit
//    else if (arg1< || arg1>1048576){return 5}
  }
///////// command N4 (0x03) & command N10 (0x09)
  else if (cmd==3 || cmd==9) { 
    arg1= (message[3]<<24) + (message[4]<<16) + (message[5]<<8)+message[6];
    arg2= (message[7]<<24) + (message[8]<<16) + (message[9]<<8)+message[10];
    consolelog("<<cmd:"+cmd+" N="+npack+" coord="+ arg1+"  time="+ arg2);
    if (arg1<0 || arg1>1048576 ) {consolelog("! error args");return 1;}
  }
///////// command N5 (0x04) & command N11 (0x0a)
  else if (cmd==4 || cmd==10) { 
    arg1= (message[3]<<24) + (message[4]<<16) + (message[5]<<8) + message[6];
    arg2= (message[7]<<8)+message[8];
    consolelog("<<cmd:"+cmd+" N="+npack+" angle="+ arg1+" speed="+ arg2);
    if (arg1<-1048576 || arg1>1048576 || arg2<0 || arg2>1000) {consolelog("! error args");return 1;}
  }
///////// command N6 (0x05) & command N12 (0x0b)
  else if (cmd==5 || cmd==11) { 
    arg1= (message[3]<<24) + (message[4]<<16) + (message[5]<<8) + message[6];
    arg2= (message[7]<<24) + (message[8]<<16) + (message[9]<<8) + message[10];
    consolelog("<<cmd:"+cmd+" N="+npack+" angel="+ arg1+"  time="+ arg2);
    if (arg1<-1048576 || arg1>1048576 ) {consolelog("! error args");return 1;}
  }
///////// command N7 (0x06) & command N13 (0x0c)
  else if (cmd==6 || cmd==12 ) { 
    arg1= (message[3]<<8)+message[4];
    consolelog("<<cmd:"+cmd+" N="+npack+" speed="+ arg1);
    if (arg1<-1048576 || arg1>1048576 ) {consolelog("! error args");return 1;}
  }
///////// command N15 (0x0e)
  else if (cmd==14) { 
  //parsing:
    arg1= (message[3]<<24) + (message[4]<<16) + (message[5]<<8) + message[6];
    arg2= (message[7]<<24) + (message[8]<<16) + (message[9]<<8) + message[10];
    arg3= (message[11]<<24) +(message[12]<<16) + (message[13]<<8) + message[14]; //
    arg4= (message[15]<<24) +(message[16]<<16) + (message[17]<<8) + message[18]; //
    arg5= (message[19]<<24) + (message[20]<<16) + (message[21]<<8)+ message[22]; //
    arg6= (message[23]<<24) + (message[24]<<16) + (message[25]<<8)+ message[26]; //
    consolelog("<< cmd:"+cmd+" N="+npack+" az_cw="+ arg1+"  az_ccw="+ arg2+" el_down="+ arg3+" el_up="+ arg4 +" az_delta="+ arg5+" el_delta="+ arg6);
  //validation
    if (arg1<0 || arg1>1048576 || 
        arg2<0 || arg2>1048576 || 
        arg3<-524288 || arg3>524288 || 
        arg4<-524288 || arg4>524288 || 
        arg5<-1048567 || arg5>1048576 || 
        arg6<-1048567 || arg6>1048576 ) {consolelog("! error args");return 1;}
  //set variable if correct
    else {
      AZ_SOFTLIMIT_CCW   = arg1; 
      AZ_SOFTLIMIT_CW  = arg2;
      EL_SOFTLIMIT_DOWN   = arg3;
      EL_SOFTLIMIT_UP = arg4;
      AZ_OFFSET = arg5;   
      EL_OFFSET = arg6;  
      consolelog("* set variable:")
      consolelog("= set AZ softlimit cw="+ arg1);
      consolelog("= set AZ softlimit ccw="+ arg2);
      consolelog("= set EL softlimit down="+ arg3);
      consolelog("= set EL softlimit el_up="+ arg4);
      consolelog("= set AZ ofset="+ arg5);
      consolelog("= set EL ofset="+ arg6);
    }
  } //end command 15 (0x0e)

  return 0;
} // end of verification function
// validation code:
// good data           0
// bad args            1
// non-formated        2
// unknown command     3
// bad packet size     4
// permition           5
///////////////////////////////////////////////////////////////////////
function getxy(){return Math.sqrt(ts.getTime);}; //TODO: <--- ztychka

function startcommand(msg,sender){


  consolelog("+ starter-function:start command "+hexdump(msg)+" Sender address: " +sender);
  consolelog('* command temporary not available ');
};

///////////////////////server function
server.on('error', function (err){
  consolelog('! server error: '+err.stack);
  server.close(function(){console.log('!!!!!!!!!!!server down!!!!!!!!!!!!');});
});

server.on('listening', function () {
  lastcmd=0;
  var address = server.address();
  consolelog('* Start UDP Server listening on ' + 
  address.address + ":" + 
  address.port)+ 
  " With full validation."; 
});

server.on('message', function (message, remote) {
  var msglog='';
  consolelog('< rcv from ' + remote.address + ':' + remote.port + 
  ' - [' + hexdump(message) + ']');
  var command=message[2];
  var dtnum=message[1];
  var validstatus=validation(message); 
 
  var packetResponse=new Buffer.from('whois');
  packetResponse[0]=0x7e;
  packetResponse[1]=message[1];
  packetResponse[2]=message[2];
  packetResponse[3]=validstatus;
  packetResponse[4]=0x7f;
  if      (validstatus==1) msglog=("! Error packet args ["+ hexdump(message) +"]");        //bad argument
  else if (validstatus==2) msglog=("! error packet format" );//bad in packet
  else if (validstatus==3) msglog=("! unknown command: [" + command.toString(16) + "] packet N=" +dtnum ); //bad incoming packet
  else if (validstatus==4) msglog=("! error packet size:" + message.length +" for this command:[" + command.toString(16) + "]" + " packet N=" +dtnum  );        //bad incoming packet
  else if (validstatus==0)  {
    msglog=('* CMD Ok [' + command + ']' + " packet N=" +dtnum  ); //pck&arg Ok!   
//    var cmd=command;
//    startcommand(message,remote.address);    //   Synhro              <--------------------starter
    if (command==1 || command==0) myEmitter.emit('info',message);
    if (command>1 && command<8) myEmitter.emit('az',message);
    if (command>7 && command<14) myEmitter.emit('el',message);
    if (command==14) myEmitter.emit('sys',message);
//    myEmitter.emit('cmd',message);     // asynchro
  };
  consolelog(msglog +' from ' + remote.address + ':' + remote.port);
  /////
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
});//on.message

//////// Event on command after validation&responce ///////
///infostream
myEmitter.on('info', (message) => {
  var cmd=message[2];
  consolelog('^ Event 4 infostream. command N'+(1+cmd)+"cmd("+cmd+")");
  if (cmd==0){ 
    lastidx=clients.length;
    clients[lastidx]=clients[0]; //create new array element
    //start event from pattern
  } else {
    // flag stop 2 client
    // kill client from array
    // reindex array
  }
});

///azimuth
myEmitter.on('az', (message) => {
  var cmd=message[2];
  consolelog('^ Event 4 Azimuth. command N'+(1+cmd)+"cmd("+cmd+")");
// TODO
// if breake then move_az(0) & stop!
// correct obgect flag
// stop prev event.
// start new event uses object az as flag
/*
  az.flag2stop=0;


  while (az.flag){};

  az.flag4start=0;


  while (!az.flag2stop){}
  az.flag4start=1;
*/
});

///elevation
myEmitter.on('el', (message) => {
  var cmd=message[2];
  consolelog('^ Event 4 Elevation. command N'+(1+cmd)+"cmd("+cmd+")");
// TODO
// if breake then move_el(0) & stop!
// correct obgect flag
// stop prev event.
// start new event uses object el as flag
});

///Change sys param
myEmitter.on('sys', (message) => {
  var cmd=message[2];
  consolelog('^ Event Change sys param. command N'+(1+cmd)+"cmd("+cmd+")");
  // test curent position for new limit?
});

////myEmitter.emit('cmd');
////////////////////////////////

// main: //////////////////////////////////////////
server.bind(SERVERPORT, SERVERHOST, function(){});

