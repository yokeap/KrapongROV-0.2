'use strict';

var express = require('express')
  , process = require('process')
  , path = require('path')
  , app = express()
  , http = require('http').Server(app)
  , io = require('socket.io')(http)
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , imuSensor = require(__dirname + '/plugins/navigation-data')
  , imuData = new imuSensor()
  , si = require('systeminformation')
  , SerialPort = require('serialport')
  //, events = require('events')
  , dataBuffer  = null  
  , initBuffer  = null
  , initFrame   = null 
  , ffmpeg_options  = '-threads 1 -f v4l2 -video_size 1920x1080 -i /dev/video1 \
                      -c:v copy -f mp4 -g 1 -movflags empty_moov+default_base_moof+frag_keyframe+faststart -frag_duration 500 \
                      -tune zerolatency -';
  // , ffmpeg_options  = '-threads 0 -f v4l2 -video_size 1920x1080 -i /dev/video1 \
  //                     -c:v copy -f mp4 -g 1 -movflags empty_moov+default_base_moof+frag_keyframe+faststart -frag_size 8192 \
  //                     -tune zerolatency -';
                      
console.log(__dirname);

//ELP camera custom driver initializaton config, bitrate:500kbps with QP 1
var camera_settings = exec('H264_UVC_TestAP /dev/video1 --xuset-br 4000000 --xuset-qp 1', 
    (error, stdout, stderr) =>{
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    if (error !== null) {
        console.log(`exec error: ${error}`);
    }
});

var DueSerialport = new SerialPort('/dev/ttyS1', {
  autoOpen: false,
  baudRate: 115200,
  highWaterMark: 65535,
  parser: new SerialPort.parsers.Readline('\n')
});

var MicroSerialport = new SerialPort('/dev/ttyS2', {
  autoOpen: false,
  baudRate: 115200,
  highWaterMark: 65535,
  parser: new SerialPort.parsers.Readline('\n')
});

http.listen(9010, () => {
    console.log('listening on localhost:9010');
});

//app.set('views', __dirname + '/views');
//app.set('view engine', 'ejs');
//app.use(express.favicon());
//app.use(express.logger('dev'));
//app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, "./")));
app.use(express.static(path.join(__dirname, "./public/")));
app.use(express.static(path.join(__dirname, "./public/bower_components")));
app.use(express.static(path.join(__dirname, "./public/webcomponents")));

                      
app.get('/', (req, res) => {
    res.sendfile(__dirname + '/public/index.html');
});

  
io.on('connection', function(socket) {
    console.log('A user connected');
    
    socket.on('video.init.segment', function(data){
      if(data === 'completed'){
        child.on('stream.start', emitSegment);
      }
    });
    
    socket.on('message', (msg) => {
        console.log(msg);
        switch (msg) {
            case 'start' :
                start();
                break;
            case 'imu.on':
                //em.emit('imu.start');
                imuData.registerEmitterHandlers(io);
                break;
            case 'environment.data.on':
              child.on('environment.data.stream', emitEnvironment);
              child.on('pressure.data.stream', emitPressure);
              break;
        }
    });
    
    socket.on('disconnect', () => {
        //stop();
        console.log('A user disconnected');
        // child.removeListener('stream.start', function(data){
        //   console.log('Streaming stop');
        // });
        child.removeListener('stream.start', emitSegment);
        child.removeListener('environment.data.stream', emitEnvironment);
        child.removeListener('pressure.data', emitPressure);
        DueSerialport.removeListener('data', function (rawData){});
        MicroSerialport.removeListener('data', function(rawData){});
    });
    
    var light = 0;
    
    socket.on('thrust.data', function incoming(data) {
      
                
          if(light < 0) light = 0;
          if(light > 95) light = 95;
          if((light >= 0) && (light <= 95)) light = light + data.light;
        //var data = JSON.parse(data.thr);
        var str = String(data.thruster_1 + ',' + data.thruster_2 + ','  + data.thruster_3 + ',' + data.thruster_4 + ',' + data.thruster_5 + ',' + light + ',' + '0' + ',' + '0' + ',');
        console.log(data);
        writeAndDrain(str + '\n', null);
    });
    
    function start() {
      if (initFrame) {
          socket.emit('video.init.segment', initFrame);
          //mp4segmenter.on('segment', emitSegment);
      } else {
          socket.emit('message', 'init segment not ready yet, reload page');
      }
    }
    
    //Occured from child.on
    function emitSegment(data) {
        //console.log(data.length);
        socket.emit('video.segment', data);
    }
    
    function emitEnvironment(data){
        socket.emit('environment.data', data);
    }
    
    function emitPressure(data){
      socket.emit('pressure.data', data);
    }
    
});


function writeAndDrain (data, callback) {
  //console.log(data + ',' + mpu.getTemperatureCelsius());
  //console.log(data);
  DueSerialport.write(data, function (error) {
		if(error){console.log(error);}
	  else{
	    //console.log('Write Completed/n');
			// waits until all output data has been transmitted to the serial port.
		  DueSerialport.drain(callback);
		}
  });
}


DueSerialport.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }

  // Because there's no callback to write, write errors will be emitted on the port:
  DueSerialport.write('main screen turn on');
  console.log("Arduino Due has been connected");
});

// DueSerialport.on('open', function() {
//   //writeAndDrain('main screen turn on\n', null);
//   /*port.write('main screen turn on\n', function(err) {
//     if (err) {
//       return console.log('Error on write: ', err.message);
//     }
//     console.log('message written');
//   });*/
  
// });


DueSerialport.on('data', function (rawData) {
  var tempString = rawData.toString();
   child.emit(tempString);
  // if(tempString.charAt(0) == 'f'){
  //   console.log(tempString.substr(2));
  //   child.emit('environment.data.stream', tempString.substr(2));
  // }
  // if(tempString.charAt(0) == 'd'){
  //   console.log(tempString.substr(2));
  //   child.emit('environment.data.stream', tempString.substr(2));
  // }
  });

MicroSerialport.open(function(err){
  if(err){
    return console.log('Error opening port: ', err.message);
  }
  MicroSerialport.write('Beaglebone turn on');
  console.log('Arduino micro has been connected');
});

var env = {
   amp: 0,
   cpu: 0,
   ram: 0,
   temp: 0,
   tx: 0
  }


var systemmonitor = setInterval(function(){
  
  MicroSerialport.on('data', function (rawData) {
  console.log('Micro_Data:' + data.toString());
    var data = JSON.parse(rawData);
    env.amp = data.amp;
    //console.log(data.amp);
  });
  
  si.currentLoad(function(data){
    env.cpu = Number(data.currentload).toFixed(2);
    //console.log('CPU load : ' + env.cpu);
    
  });
    
  si.mem(function(data){
    env.ram = Number(data.used / 1000000).toFixed(2);
    //console.log('Memory (ram) : ' + Number(data.used / 1000000).toFixed(2) + '/' + Number(data.total / 1000000).toFixed(2));
  });
  
  si.cpuTemperature(function(data){
    env.temp = Number(imuData.getTemperature()).toFixed(2);
    //console.log('Temperature : ' + env.temp);
  });
  
  si.networkStats('eth0', function(data){
    env.tx = Number((data.tx_sec * 8) / 1000000).toFixed(2);
    //console.log('TX  : ' + Number((data.tx_sec * 8) / 1000000).toFixed(2));
    //console.log('TX Total  : ' + Number(data.tx / 1000000).toFixed(2));
  });
  
  child.emit('environment.data.stream', env);
}, 1000);

/*********************************
**ffmpeg mp4 fragmentation capturing stdout process.
* 
* *******************************/
var child = spawn( 'ffmpeg', ffmpeg_options.match( /\S+/g ) );
child.stdout.on('data', function(data){
  //init frame process, the init frame must be containing ftype(24bytes) on top of header stream.
  if( initFrame === null ){
    initBuffer = initBuffer == null ? data : Buffer.concat( [initBuffer,data] );
    //checking fytp header
    if( initBuffer.length < 25 ){
      // return if that is fytp header (24bytes)
      return;
    }
    initFrame = initBuffer;
    return;                       //return the buffer concatenation of fytp+moov+moof+mdat(not sure)  
  }
  /*********************************************************************************
   * 
   * note: not sure what is section meaning, now this is not used.
   *          assumming this involved the I-frame (GOP).
   * *******************************************************************************/
  if( data.length == 8192 ){
    dataBuffer = dataBuffer == null ? data : Buffer.concat([dataBuffer,data]);
    return;
    }

  //continues streaming  
  dataBuffer = dataBuffer == null ? data : Buffer.concat([dataBuffer,data]);
  child.emit('stream.start', dataBuffer);
  dataBuffer = null;
});
child.stderr.on('data', function(error){
	  console.log("FFMPEG: " + error.toString());
	  //var timeStampInMs = window.performance && window.performance.now && window.performance.timing && window.performance.timing.navigationStart ? window.performance.now() + window.performance.timing.navigationStart : Date.now();
   
});


/*
 * set cpu priority process for FFMPEG
*/
var proc= spawn("renice", [-20, process.pid]);
  proc.on('exit', function (code) {
      if (code !== 0){
          console.log("Process "+ "cmd" +" exec failed with code - " +code);
      }
  });
  proc.stdout.on('data', function(data){
      console.log('stdout: ' + data);
  });
  proc.stderr.on('data', function(data){
      console.log('stderr: '+ data);
  });
