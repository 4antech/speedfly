/// UDP server bistrolet    ///////////////////////
const version='210301.1';
const debug=3;
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
///////////////////
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
const infostream =  new MyEmitter();
myEmitter.on('cmd', (cmd) => {
  console.log('an event occurred!');
});  ////myEmitter.emit('cmd');
/////////////////

var azimuth = {
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
    return this._angl;
  },
  set angl(value) {
    if (value>=0 && value <=1048576) {
      this._angl=value;
      sts=new Date();
      azimuth.ts =sts.getTime();
    }
    else {consolelog("! AZIMUTH error set value:"+value);return 0}
  }
};

var ele = {
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
    return this._angl;
  },
  set angl(value) {
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
const fs = require("fs");
///////////////////////my variables
var indtcnt =0;
var flag2stop = 0 ;
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
var  AZ_OFFSET = 0;   //  <---+______ TODO: initfunction. 
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
////////////////////////////////////////////////
dgsize=[9,5,10,12,10,12,6,5,10,12,10,12,6,5,20];
////////////////////////////////////////////////
function validation(message){
//detection START-END Bytes 0x7e 0x7f
  if (message[0]!=126 || message[message.length-1]!=127 ) return 2;//0x7e 0x7f
//detection command number. valid range 0..10
  var cmd=message[2];
  if (cmd<0 || cmd>15) return 3; //unknown command
  if (dgsize[cmd]!=message.length) return 4; //coomand size
// validation code:
// good data           0
// bad args            1
// non-formated        2
// unknown command     3
// bad packet size     4
  return 0;
}
///////////////////////////////////////////////////////////////////////
function getxy(){return Math.sqrt(ts.getTime);};

function createinfo(max,port,num,pattern,address) {
  consolelog("+ trying create streem @ max :"+ max + "  IP:port : "+ address 
  +":"+port + " numb: "+ num + " ptrn: "+ pattern );
  var i=0;
  if (!( () => {for (i=0;i<clients.length;i++) if (clients[i].num==num) return 1;})){
    consolelog("! duplicat identificator for streeam");
    return 0;
  }
  else { 
  
    clients[0].num=num; 
//    var lastidx=clients.length;
//    clients[lastidx]=clients[0]; //create new array element

// while (!clients[lastidx].stopflag){

//  var msgbuf=new Buffer.from("\x7f"+"1234567890123456"+"\x7e");//size=18    
    var cnt=0;
//    if (!max) max=256;
//    if (max) cnt=0; else cnt=-1;  
    var p=new Array;//array for promises
    i=0;
    var prtmp= new Promise(function(resolve,reect){ //main promise
      while (cnt<max){
        p[i] = new Promise(function(resolve,reject){
          if (pattern==1) {
            var outmsg=new Buffer.from("\x7f"+"1234567890123456"+"\x7e");//18Byte
            outmsg[0] = 0x7e;                   //start byte
            ii=azimuth.angl;
            outmsg[1] = (ii &0xff000000)>>24;    //angle
            outmsg[2] = (ii &0xff0000)>>16;
            outmsg[3] = (ii &0xff00)>>8;
            outmsg[4] = (ii &0xff);
            ii=azimuth.ts;
            outmsg[5] = (ii &0xff000000)>>24;    //time
            outmsg[6] = (ii &0xff0000)>>16;
            outmsg[7] = (ii &0xff00)>>8;
            outmsg[8] = (ii &0xff);
            ii=ele.angl;
            outmsg[9] = (ii &0xff000000)>>24;    //angle
            outmsg[10] = (ii &0xff0000)>>16;
            outmsg[11] = (ii &0xff00)>>8;
            outmsg[12] = (ii &0xff);
            ii=ele.ts;
            outmsg[13] = (ii &0xff000000)>>24;    //time
            outmsg[14] = (ii &0xff0000)>>16;
            outmsg[15] = (ii &0xff00)>>8;
            outmsg[16] = (ii &0xff);                       
            
            outmsg[outmsg.length-1] = 0x7f;        
          } else var outmsg=new Buffer.from("\x7f"+"1"+"\x7e");//size=3

          resolve(outmsg);
          reject("---- ERROR");        
        })
        p[i].then((fulfilled) => {
          clients[lastidx].ptr.send(fulfilled,0,fulfilled.length,port, address, 
           ()=>consolelog(">> ["+hexdump(fulfilled)+"] "+address+":"+port+" "));
          clients[lastidx].cnt++; 
        });
        cnt++;
        i++;
        if (stopflag[num]) cnt=max+1; 
//console.log("i="+i+" cnt="+cnt);
      }; // end loop
      resolve(i);
      reject('--- ERROR MP');
    });
    prtmp.then((fulfilled) => {
//   var tmpsock = clients[lastidx].ptr;
//   var tmpadrr =tmpsock.address();
      consolelog(">> sendeded "+ clients[lastidx].cnt + 
      "("+fulfilled+") dgrams @N:" + clients[lastidx].num + " adr:" +  address+":"+port);
      clients[lastidx].num=clients[lastidx].ptrn=clients[lastidx].cnt=0; //clear obj
      clients[0]= {ptr: dgram.createSocket('udp4'),num: 0,cnt: 0,ptrn: 0, stopflag: 0}//create new
    });

//    if (max!=256) {clients[lastidx].stopflag=1;return 0;}
    
//} //end wild wile

  } //end main else
  return 1;

}//end function createinfo()

function startcommand(msg,sender){
  lastidx=clients.length;
  clients[lastidx]=clients[0]; //create new array element

  consolelog("+ starter-function:start command "+hexdump(msg)+" Sender address: " +sender);
  if (msg[2]==0) {
    if (msg[4]){
      if (!createinfo(msg[4],(msg[6]+(msg[5]<<8)),msg[3],msg[7],sender)){ 
        consolelog('* command '+ msg[2]+' strted. sender adress:' + sender);
      }
      else consolelog("! error create stream!");
    }
    else {
//      while (!clients[lastidx].stopflag){

        if (!createinfo(255,(msg[6]+(msg[5]<<8)),msg[3],msg[7],sender)){ 
          consolelog('* command '+ msg[2]+' strted. sender adress:' + sender);
        }
        else consolelog("! error create loop stream!");
      
//      }    
    }
  }
  else consolelog('* command of movement temporary not available ');
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
  " Without full validation! (on some time) becose under construction..."; 
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
  if (validstatus==1) msglog=("! Error packet args ["+ 
    hexdump(message) +"]");        //bad argument
  else if (validstatus==2) msglog=("! error packet format" );//bad in packet
  else if (validstatus==3) msglog=("! unknown command: [" + 
    command.toString(16) + "] packet N=" +dtnum ); //bad incoming packet
  else if (validstatus==4) msglog=("! error packet size:" + 
    message.length +" for this command:[" + 
    command.toString(16) +
    "]" + " packet N=" +dtnum  );        //bad incoming packet
  else if (validstatus==0)  {
    msglog=('* CMD Ok [' + command + ']' + " packet N=" +dtnum  ); //pck&arg Ok!   
    startcommand(message,remote.address);    //   Synhro              <--------------------starter
// myEmitter.emit('cmd');     // asynchro
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
// main: //////////////////////////////////////////
server.bind(SERVERPORT, SERVERHOST, function(){});

