'use strict';

var express = require('express')
  , path = require('path')
  , app = express()
  , spawn = require('child_process').spawn
  , imuSensor = require(__dirname + '/plugins/navigation-data')
//  , events = require('events')
  , dataBuffer  = null
  , initBuffer  = null
  , initFrame   = null 
  , ffmpeg_options  = '-threads 1 -f v4l2 -video_size 1920x1080 -i /dev/video1 \
                      -c:v copy -f mp4 -g 1 -movflags empty_moov+default_base_moof+frag_keyframe -frag_duration 60000 \
                      -tune zerolatency -';


const http = require('http').Server(app)
    , io = require('socket.io')(http)
    , exec = require('child_process').exec;
    

//ELP camera config initializaton
var camera_settings = exec('H264_UVC_TestAP /dev/video1 --xuset-br 5000000 --xuset-qp 1', 
    (error, stdout, stderr) =>{
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    if (error !== null) {
        console.log(`exec error: ${error}`);
    }
});

http.listen(9010, () => {
    console.log('listening on localhost:9010');
});

console.log(__dirname);

var imuData = new imuSensor();

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
      dataBuffer = dataBuffer == null ? data : Buffer.concat([dataBuffer,data]);;
      return;
      }
      
    //continues streaming  
    dataBuffer = dataBuffer == null ? data : Buffer.concat([dataBuffer,data]);
    child.emit('stream.start', dataBuffer);
    dataBuffer = null;
  });
  
  child.stderr.on('data', function(error)
  {
  	  console.log("FFMPEG: " + error.toString());
  	  //var timeStampInMs = window.performance && window.performance.now && window.performance.timing && window.performance.timing.navigationStart ? window.performance.now() + window.performance.timing.navigationStart : Date.now();
     
  });
  
  //imuData.registerEmitterHandlers(io);
  
//   var em = new events.EventEmitter();
  
//     em.on('imu.start', function(){
//           imuData.registerEmitterHandlers(io);
//     });

io.on('connection', function(socket) {
    console.log('A user connected');
    
    
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
        socket.emit('video.segment', data);
    }
    
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
        }
    });
    
    socket.on('disconnect', () => {
        //stop();
        console.log('A user disconnected');
    });
    
    socket.on('thrust.data', function incoming(data) {
        //var data = JSON.parse(message);
        var str = String(data.thruster_1 + ',' + data.thruster_2 + ','  + data.thruster_3 + ',' + data.thruster_4 + ',' +data.thruster_5 + ',' + data.light + ',' + '0' + ',' + '0' + ',');
        //console.log(data);
        writeAndDrain(str + '\n', null);
    });
    
    //imuData.registerEmitterHandlers(io);
});


function writeAndDrain (data, callback) {
  //console.log(data + ',' + mpu.getTemperatureCelsius());
  console.log(data);
  port.write(data, function (error) {
		if(error){console.log(error);}
	  else{
	    //console.log('Write Completed/n');
			// waits until all output data has been transmitted to the serial port.
		  port.drain(callback);
		}
  });
}

var SerialPort = require('serialport');
var Open = false;
var port = new SerialPort('/dev/ttyS1', {
  autoOpen: false,
  baudRate: 115200,
  highWaterMark: 65535
  //parser: SerialPort.parsers.readline('\n'),
});

port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }

  // Because there's no callback to write, write errors will be emitted on the port:
  port.write('main screen turn on');
  console.log("         Write Completed       ");
});


port.on('open', function() {
  Open = true;
  //writeAndDrain('main screen turn on\n', null);
  /*port.write('main screen turn on\n', function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    console.log('message written');
  });*/
});


