'use strict'
var mpu9150 = require(__dirname + '/lib/mpu9150')
  , math = require('mathjs');

var mpu = new mpu9150({
    device: '/dev/i2c-2',
    // mpu9250 address (default is 0x68) 
    address: 0x68,

    ak_address: 0x0C,
    // Set the Gyroscope sensitivity (default 0), where:
    //      0 => 250 degrees / second
    //      1 => 500 degrees / second
    //      2 => 1000 degrees / second
    //      3 => 2000 degrees / second
    GYRO_FS: 2,

    // Set the Accelerometer sensitivity (default 2), where:
    //      0 => +/- 2 g
    //      1 => +/- 4 g
    //      2 => +/- 8 g
    //      3 => +/- 16 g
    ACCEL_FS: 2,
    
    scaleValues: true,

    UpMagneto: true,
    
    DEBUG: true,
});

var kalmanX = new mpu.Kalman_filter();
var kalmanY = new mpu.Kalman_filter();
var kalmanZ = new mpu.Kalman_filter();
var lowpassYaw = 0;
var initialize = false;

var imuSensor = function(){
    
    if(mpu.initialize()){
        //this.imuSensor.initialize = true;
        return true;
    }
    //this.emitter = emitter;
    return false;
};

    var timer = 0
      , pitch = 0
      , roll = 0
      , yaw = 0
      , kalAngleX = 0
      , kalAngleY = 0
      , kalAngleZ = 0
      , gyroXangle = 0
      ,	gyroYangle = 0
      ,	gyroZangle = 0
      , compAngleX = 0
      , compAngleY = 0
      , compAngleZ = 0;
      
imuSensor.prototype.getTemperature = function(){
  return mpu.getTemperatureCelsiusDigital();
};

imuSensor.prototype.registerEmitterHandlers = function(emitter){
  this.emitter = emitter;

      var interval = setInterval(function(){
        var micros = function() {
          return new Date().getTime();
        };
        
        var m9 = mpu.getMotion9();
        
        var dt = (micros() - timer) / 1000000;
        //var dt = (micros() - timer) / 500000;
        timer = micros();
        
        pitch = (mpu.getPitch(m9));
        roll = (mpu.getRoll(m9) - 89);
        console.log("pitch: " + pitch + ",       " + "roll: " + roll);
        //yaw = (Math.round(mpu.getYaw(m9)) + 85.0);
        //yaw = mpu.getYaw(m9).toFixed(3) - 90.0;
        yaw = mpu.getYaw(m9) - 90.0;
        if(yaw >= 0.0 && yaw <= 180.0){
          yaw = yaw;
        }
        else{
          yaw = 180.0 + (180.0 + parseFloat(yaw));
        } 

        var gyroXrate = m9[3] / 131.0;
        var gyroYrate = m9[4] / 131.0;
        var gyroZrate = m9[5] / 131.0;
        
        if ((roll < -90 && kalAngleX > 90) || (roll > 90 && kalAngleX < -90)) {
        	kalmanX.setAngle(roll);
        	compAngleX = roll;
        	kalAngleX = roll;
        	gyroXangle = roll;
        } else {
        	kalAngleX = kalmanX.getAngle(roll, gyroXrate, dt);
        }
        
        if (Math.abs(kalAngleX) > 90) {
        	gyroYrate = -gyroYrate;
        }
        kalAngleY = kalmanY.getAngle(pitch, gyroYrate, dt);
        
        kalAngleZ = kalmanZ.getAngle(yaw, gyroZrate, dt);
        
        gyroXangle += gyroXrate * dt;
        gyroYangle += gyroYrate * dt;
        gyroZangle += gyroZrate * dt;
        compAngleX = 0.93 * (compAngleX + gyroXrate * dt) + 0.07 * roll;
        compAngleY = 0.93 * (compAngleY + gyroYrate * dt) + 0.07 * pitch;
        compAngleZ = 0.93 * (compAngleZ + gyroZrate * dt) + 0.2 * yaw;
        
        if (gyroXangle < -180 || gyroXangle > 180) gyroXangle = kalAngleX;
        if (gyroYangle < -180 || gyroYangle > 180) gyroYangle = kalAngleY;
        
        var imuData = {
        	pitch: compAngleY,
        	roll: compAngleX,
        	clockwise: yaw
        };
        //console.log(imuData.pitch);
        emitter.emit('imu.data', JSON.stringify(imuData));
    }, 50);
};


module.exports = imuSensor;
