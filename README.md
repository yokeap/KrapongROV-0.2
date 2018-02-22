# KrapongROV-0.2
KrapongROV version 0.2, Remotely Operated Vehicle, KU IMS

### Hardware description:
-----------
* Core processor platform: 
  > Beaglebone Black

* Camera module: 
  > Model                 : ELP-USB3MP01H-L150 \
    Sensor                : AR0331 3 MP, 1080P Full HD true colour. \
    WDR                   : Up to 100 dB
    Resolution            : 1920X1080P (H.264), 
    Lens                  : ?? mm Viewing Angle: 150° 
    Minimum Illumination  : 0.05 lux 
    Power Consumption(W)  : DC 5V (150mA) 
    Night vision          : optional, can choose IR board 
    Audio                 : Yes
    
* Motion sensor:
  > MPU9150

* Low level Controller: 
  > Arduino Due 
  
* Back tube (Power Section) monitoring; temperature, all system power consumtion.
  > Arduino Micro 


* Power line communication: 
  > TP-Link AV500 \ 
  Model               : TL-PA4010KIT   \
  Standard Protocol   : HomePlug AV, IEEE802.3, IEEE802.3u \
  Interface           : 1*10/100Mbps Ethernet Port \
  Maximum range       : 300m
  
  ##### This power line is can be used with DC > 48V (tested)
  
 ### Software description:
 ------------
  > Debian 9.3 (Stretch) with kernel 4.9.82-bone10 (custom modified) \
  > Node 8.9.4 \
  > FFMPEG (piping the H.264 stream) \
