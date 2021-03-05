#!/usr/bin/env node

const SerialPort = require('serialport')
const parsers = SerialPort.parsers

// motors id (3,4) 6. encoders 5,7
encoders = Array();
encoders[15] = 1;
encoders[16] = 1;
const parser = new parsers.Readline({delimiter: '\n'});
const port = new SerialPort('/dev/serial0', {baudRate: 921600});
port.pipe(parser);
port.on('open', () => {
    console.log('Port open')
    port.write("1|11|15|z\n"); // INIT CAN AND OTHERS...
    parser.on('data', data=>{ 
 	p = data.split("|");
 	switch(p[0]) {
		case "1":
		console.log("Init OK");
		break;
		case "2": // roll motors
		encoders[p[1]] = p[2];
		var hrTime = process.hrtime();		// p[1] - ID encodera p[2] - position
		
	console.log((hrTime[0] * 1000000 + hrTime[1] / 1000)+" "+p[1]+" :: "+p[2]);
			    

//			Событие изменения координат
//			()=> {};

		break;
	} 
    });
});

function readenc(a) {return encoders[a];}

function roll(id,vector,speed) {port.write("2|"+id+"|"+vector+"|"+speed);} //  id = [3,4, 6] vector = [1,0] speed = 0-100

const readline = require('readline');
const rl = readline.createInterface({input: process.stdin, output: process.stdout });
rl.on('line', (line) => {

arr = line.split(" ");
if (arr[0]==-1) console.log(readenc(15)); else {
console.log(arr[0]+','+arr[1]+','+arr[2]);
roll(arr[0],arr[1],arr[2]);
}
});

