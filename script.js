/* =========================================================
   RC CAR CONTROLLER
   BLE + GPS + GSM + SMS + CAMERA + EYE DETECTION
========================================================= */

const SERVICE_UUID =
"4fafc201-1fb5-459e-8fcc-c5c9c331914b";

const CMD_CHAR_UUID =
"beb5483e-36e1-4688-b7f5-ea07361b26a8";

const TELE_CHAR_UUID =
"beb5483e-36e1-4688-b7f5-ea07361b26a9";

const MAX_ANGLE = 70;


/* =========================================================
   ELEMENTS
========================================================= */

const statusEl =
document.getElementById("status");

const connectBtn =
document.getElementById("connectBtn");

const fwdBtn =
document.getElementById("fwdBtn");

const backBtn =
document.getElementById("backBtn");

const ecoBtn =
document.getElementById("ecoBtn");

const sportBtn =
document.getElementById("sportBtn");

const app =
document.getElementById("app");

const wheelWrap =
document.getElementById("wheelWrap");

const wheel =
document.getElementById("wheel");

const distFront =
document.getElementById("distFront");

const distRear =
document.getElementById("distRear");

const speedNum =
document.getElementById("speedNum");

const rpmNum =
document.getElementById("rpmNum");

const cameraVideo =
document.getElementById("driverCamera");

const cameraState =
document.getElementById("cameraState");

const cameraBtn =
document.getElementById("cameraBtn");

const switchCameraBtn =
document.getElementById("switchCamera");


/* =========================================================
   BLE
========================================================= */

let bleDevice = null;
let bleServer = null;
let cmdChar = null;
let teleChar = null;


/* =========================================================
   CAMERA
========================================================= */

let cameraStream = null;

let cameraMode = "user";

let faceMesh = null;

let eyeDetectionRunning = false;

let eyesClosedSince = null;

let drowsySent = false;

let lastFaceSeen = 0;

const EYES_CLOSED_TIME = 2000;


/* =========================================================
   BLE CONNECT
========================================================= */

connectBtn.addEventListener(
    "click",
    connectBLE
);


async function connectBLE(){

    if(!navigator.bluetooth){

        statusEl.textContent =
        "Web Bluetooth not supported";

        return;
    }


    try{

        statusEl.textContent =
        "Searching for ESP32...";


        bleDevice =
        await navigator.bluetooth.requestDevice({

            filters:[
                {
                    services:[
                        SERVICE_UUID
                    ]
                }
            ]

        });


        bleDevice.addEventListener(
            "gattserverdisconnected",
            onDisconnected
        );


        statusEl.textContent =
        "Connecting...";


        bleServer =
        await bleDevice.gatt.connect();


        const service =
        await bleServer.getPrimaryService(
            SERVICE_UUID
        );


        cmdChar =
        await service.getCharacteristic(
            CMD_CHAR_UUID
        );


        teleChar =
        await service.getCharacteristic(
            TELE_CHAR_UUID
        );


        if(
            teleChar.properties.notify ||
            teleChar.properties.indicate
        ){

            await teleChar.startNotifications();


            teleChar.addEventListener(
                "characteristicvaluechanged",
                onTelemetry
            );

        }


        statusEl.textContent =
        "Connected to " +
        (bleDevice.name || "ESP32");


        connectBtn.textContent =
        "CONNECTED";


        console.log(
            "BLE connected"
        );

    }

    catch(error){

        console.error(
            "BLE ERROR:",
            error
        );


        statusEl.textContent =
        "BLE Error: " +
        error.message;

    }

}


/* =========================================================
   DISCONNECTED
========================================================= */

function onDisconnected(){

    statusEl.textContent =
    "Disconnected";


    connectBtn.textContent =
    "Connect to Car";


    cmdChar = null;

    teleChar = null;


    stopDrive();

}


/* =========================================================
   SEND BLE COMMAND
========================================================= */

async function sendCmd(command){

    if(!cmdChar){

        console.log(
            "Not connected:",
            command
        );

        return;

    }


    try{

        const data =
        new TextEncoder().encode(
            command
        );


        if(
            cmdChar.properties &&
            cmdChar.properties.write
        ){

            await cmdChar.writeValue(
                data
            );

        }

        else if(
            cmdChar.properties &&
            cmdChar.properties.writeWithoutResponse
        ){

            await cmdChar.writeValueWithoutResponse(
                data
            );

        }

    }

    catch(error){

        console.error(
            "BLE SEND ERROR:",
            error
        );

    }

}


/* =========================================================
   TELEMETRY
========================================================= */

function onTelemetry(event){

    const value =
    new TextDecoder().decode(
        event.target.value
    );


    console.log(
        "TELEMETRY:",
        value
    );


    const distance =
    value.match(
        /F:(-?\d+),R:(-?\d+)/
    );


    if(distance){

        distFront.textContent =
        distance[1];

        distRear.textContent =
        distance[2];

    }


    const gpsMatch =
    value.match(
        /GPS:(\d)/
    );


    const latMatch =
    value.match(
        /LAT:(-?\d+\.\d+)/
    );


    const lonMatch =
    value.match(
        /LON:(-?\d+\.\d+)/
    );


    const gpsDot =
    document.getElementById(
        "gpsDot"
    );


    const coords =
    document.getElementById(
        "coords"
    );


    if(gpsMatch && gpsDot){

        const fixed =
        gpsMatch[1] === "1";


        gpsDot.className =
        "dot " +
        (
            fixed
            ? "ok"
            : "bad"
        );


        if(
            fixed &&
            latMatch &&
            lonMatch &&
            coords
        ){

            coords.textContent =
            latMatch[1] +
            ", " +
            lonMatch[1];

        }

        else if(coords){

            coords.textContent =
            "no GPS fix";

        }

    }


    const gsmMatch =
    value.match(
        /GSM:(\d)/
    );


    const gsmDot =
    document.getElementById(
        "gsmDot"
    );


    if(
        gsmMatch &&
        gsmDot
    ){

        gsmDot.className =
        "dot " +
        (
            gsmMatch[1] === "1"
            ? "ok"
            : "bad"
        );

    }


    const smsMatch =
    value.match(
        /SMS:(\d)/
    );


    const smsDot =
    document.getElementById(
        "smsDot"
    );


    if(
        smsMatch &&
        smsDot
    ){

        if(
            smsMatch[1] === "1"
        ){

            smsDot.className =
            "dot ok";

        }

        else if(
            smsMatch[1] === "2"
        ){

            smsDot.className =
            "dot bad";

        }

        else{

            smsDot.className =
            "dot";

        }

    }

}


/* =========================================================
   GPS REQUEST
========================================================= */

const gpsReqBtn =
document.getElementById(
    "gpsReqBtn"
);


if(gpsReqBtn){

    gpsReqBtn.addEventListener(
        "click",
        () => {

            sendCmd(
                "GPS?"
            );

        }
    );

}


/* =========================================================
   SMS
========================================================= */

const smsBtn =
document.getElementById(
    "smsBtn"
);

const msgPanel =
document.getElementById(
    "msgPanel"
);

const msgInput =
document.getElementById(
    "msgInput"
);

const msgSendBtn =
document.getElementById(
    "msgSendBtn"
);

const msgStatus =
document.getElementById(
    "msgStatus"
);


if(smsBtn){

    smsBtn.addEventListener(
        "click",
        () => {

            if(msgPanel){

                msgPanel.classList.toggle(
                    "open"
                );

            }

        }
    );

}


if(msgSendBtn){

    msgSendBtn.addEventListener(
        "click",
        () => {

            if(!msgInput)
                return;


            const text =
            msgInput.value.trim();


            if(!text)
                return;


            if(!cmdChar){

                if(msgStatus){

                    msgStatus.textContent =
                    "Not connected";

                }

                return;

            }


            sendCmd(
                "MSG:" + text
            );


            if(msgStatus){

                msgStatus.textContent =
                "Message sent";

            }


            msgInput.value =
            "";

        }
    );

}


/* =========================================================
   ECO / SPORT
========================================================= */

ecoBtn.addEventListener(
    "click",
    () => {

        app.classList.remove(
            "sport"
        );


        ecoBtn.classList.add(
            "active"
        );


        sportBtn.classList.remove(
            "active"
        );


        sendCmd(
            "MODE:ECO"
        );

    }
);


sportBtn.addEventListener(
    "click",
    () => {

        app.classList.add(
            "sport"
        );


        sportBtn.classList.add(
            "active"
        );


        ecoBtn.classList.remove(
            "active"
        );


        sendCmd(
            "MODE:SPORT"
        );

    }
);


/* =========================================================
   SPEED / RPM
========================================================= */

const MAX_SPEED = 120;

const MAX_RPM = 8000;

let currentSpeed = 0;

let targetSpeed = 0;


function setTargetSpeed(
    moving
){

    targetSpeed =
    moving
    ? MAX_SPEED
    : 0;

}


function updateGauge(){

    currentSpeed +=
    (
        targetSpeed -
        currentSpeed
    ) * 0.08;


    if(
        Math.abs(
            targetSpeed -
            currentSpeed
        ) < 0.2
    ){

        currentSpeed =
        targetSpeed;

    }


    if(speedNum){

        speedNum.textContent =
        Math.round(
            currentSpeed
        );

    }


    if(rpmNum){

        rpmNum.textContent =
        Math.round(
            (
                currentSpeed /
                MAX_SPEED
            ) *
            MAX_RPM
        );

    }


    requestAnimationFrame(
        updateGauge
    );

}


updateGauge();


/* =========================================================
   DRIVE
========================================================= */

function startDrive(
    button,
    command
){

    if(!button)
        return;


    button.classList.add(
        "active"
    );


    sendCmd(
        command
    );


    setTargetSpeed(
        true
    );

}


function stopDrive(){

    if(fwdBtn)
        fwdBtn.classList.remove(
            "active"
        );


    if(backBtn)
        backBtn.classList.remove(
            "active"
        );


    sendCmd(
        "S"
    );


    setTargetSpeed(
        false
    );

}


function setupDriveButton(
    button,
    command
){

    if(!button)
        return;


    button.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();


            if(
                command === "F" &&
                backBtn
            ){

                backBtn.classList.remove(
                    "active"
                );

            }


            if(
                command === "B" &&
                fwdBtn
            ){

                fwdBtn.classList.remove(
                    "active"
                );

            }


            startDrive(
                button,
                command
            );

        }
    );


    button.addEventListener(
        "pointerup",
        event => {

            event.preventDefault();

            stopDrive();

        }
    );


    button.addEventListener(
        "pointercancel",
        stopDrive
    );


    button.addEventListener(
        "pointerleave",
        event => {

            if(
                event.buttons
            ){

                stopDrive();

            }

        }
    );

}


setupDriveButton(
    fwdBtn,
    "F"
);


setupDriveButton(
    backBtn,
    "B"
);


/* =========================================================
   STEERING
========================================================= */

let steeringActive = false;

let lastSteeringSend = 0;


function getSteeringAngle(
    event
){

    const rect =
    wheelWrap.getBoundingClientRect();


    const cx =
    rect.left +
    rect.width / 2;


    const cy =
    rect.top +
    rect.height / 2;


    const dx =
    event.clientX -
    cx;


    const dy =
    event.clientY -
    cy;


    let angle =
    Math.atan2(
        dx,
        -dy
    )
    *
    180 /
    Math.PI;


    angle =
    Math.max(
        -MAX_ANGLE,
        Math.min(
            MAX_ANGLE,
            angle
        )
    );


    return angle;

}


function sendSteering(
    angle
){

    const now =
    Date.now();


    if(
        now -
        lastSteeringSend <
        40
    ){

        return;

    }


    lastSteeringSend =
    now;


    sendCmd(
        "L:" +
        Math.round(angle)
    );

}


wheelWrap.addEventListener(
    "pointerdown",
    event => {

        event.preventDefault();

        steeringActive =
        true;


        wheelWrap.setPointerCapture(
            event.pointerId
        );


        const angle =
        getSteeringAngle(
            event
        );


        wheel.style.transition =
        "none";


        wheel.style.transform =
        `rotate(${angle}deg)`;


        sendSteering(
            angle
        );

    }
);


wheelWrap.addEventListener(
    "pointermove",
    event => {

        if(!steeringActive)
            return;


        event.preventDefault();


        const angle =
        getSteeringAngle(
            event
        );


        wheel.style.transform =
        `rotate(${angle}deg)`;


        sendSteering(
            angle
        );

    }
);


function releaseSteering(){

    steeringActive =
    false;


    wheel.style.transition =
    "transform .2s ease";


    wheel.style.transform =
    "rotate(0deg)";


    sendCmd(
        "L:0"
    );

}


wheelWrap.addEventListener(
    "pointerup",
    releaseSteering
);


wheelWrap.addEventListener(
    "pointercancel",
    releaseSteering
);


/* =========================================================
   CAMERA
========================================================= */

cameraBtn.addEventListener(
    "click",
    async () => {

        if(cameraStream){

            stopCamera();

        }

        else{

            await startCamera();

        }

    }
);


async function startCamera(){

    if(
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ){

        cameraState.textContent =
        "CAMERA API UNAVAILABLE";

        return;

    }


    try{

        cameraState.textContent =
        "REQUESTING CAMERA...";


        if(cameraStream){

            cameraStream
            .getTracks()
            .forEach(
                track =>
                track.stop()
            );

        }


        /*
         * Try the selected camera first.
         */

        try{

            cameraStream =
            await navigator
            .mediaDevices
            .getUserMedia({

                video:{
                    facingMode:{
                        exact:
                        cameraMode
                    }
                },

                audio:false

            });

        }

        catch(error){

            /*
             * Some phones do not support
             * exact facingMode.
             * Retry with ideal.
             */

            cameraStream =
            await navigator
            .mediaDevices
            .getUserMedia({

                video:{
                    facingMode:{
                        ideal:
                        cameraMode
                    }
                },

                audio:false

            });

        }


        cameraVideo.srcObject =
        cameraStream;


        await cameraVideo.play();


        cameraState.textContent =
        cameraMode === "user"
        ? "FRONT CAMERA"
        : "BACK CAMERA";


        cameraBtn.textContent =
        "STOP CAMERA";


        startEyeDetection();


        console.log(
            "Camera started"
        );

    }

    catch(error){

        console.error(
            "CAMERA ERROR:",
            error
        );


        cameraStream =
        null;


        cameraState.textContent =
        "CAMERA ERROR: " +
        error.name;

    }

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera(){

    stopEyeDetection();


    if(cameraStream){

        cameraStream
        .getTracks()
        .forEach(
            track =>
            track.stop()
        );

    }


    cameraStream =
    null;


    cameraVideo.srcObject =
    null;


    cameraState.textContent =
    "CAMERA OFF";


    cameraBtn.textContent =
    "START CAMERA";

}


/* =========================================================
   SWITCH CAMERA
========================================================= */

switchCameraBtn.addEventListener(
    "click",
    async () => {

        cameraMode =
        cameraMode === "user"
        ? "environment"
        : "user";


        if(cameraStream){

            await startCamera();

        }

    }
);


/* =========================================================
   FACE MESH SETUP
========================================================= */

function setupEyeDetection(){

    if(
        typeof FaceMesh ===
        "undefined"
    ){

        console.warn(
            "FaceMesh not loaded yet"
        );

        return false;

    }


    if(faceMesh)
        return true;


    faceMesh =
    new FaceMesh({

        locateFile:
        file => {

            return (
                "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" +
                file
            );

        }

    });


    faceMesh.setOptions({

        maxNumFaces:1,

        refineLandmarks:true,

        minDetectionConfidence:
        0.5,

        minTrackingConfidence:
        0.5

    });


    faceMesh.onResults(
        processEyeResults
    );


    return true;

}


/* =========================================================
   LANDMARK DISTANCE
========================================================= */

function landmarkDistance(
    a,
    b
){

    const dx =
    a.x - b.x;


    const dy =
    a.y - b.y;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


/* =========================================================
   EYE RATIO
========================================================= */

function getEyeRatio(
    top,
    bottom,
    left,
    right
){

    const vertical =
    landmarkDistance(
        top,
        bottom
    );


    const horizontal =
    landmarkDistance(
        left,
        right
    );


    if(horizontal === 0)
        return 0;


        return vertical /
    horizontal;

}


/* =========================================================
   EYE RESULTS
========================================================= */

function processEyeResults(results){

    if(
        !results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0
    ){

        setEyeStatus(
            "FACE NOT DETECTED"
        );

        eyesClosedSince = null;

        return;
    }


    lastFaceSeen = Date.now();


    const landmarks =
        results.multiFaceLandmarks[0];


    const leftRatio =
        getEyeRatio(
            landmarks[159],
            landmarks[145],
            landmarks[33],
            landmarks[133]
        );


    const rightRatio =
        getEyeRatio(
            landmarks[386],
            landmarks[374],
            landmarks[362],
            landmarks[263]
        );


    const eyeRatio =
        (
            leftRatio +
            rightRatio
        ) / 2;


    const eyesClosed =
        eyeRatio < 0.20;


    if(eyesClosed){

        if(!eyesClosedSince){

            eyesClosedSince =
                Date.now();

        }


        const closedFor =
            Date.now() -
            eyesClosedSince;


        if(
            closedFor >=
            EYES_CLOSED_TIME
        ){

            setEyeStatus(
                "DROWSY"
            );


            if(!drowsySent){

                drowsySent =
                    true;


                sendCmd(
                    "DROWSY:1"
                );


                console.log(
                    "DROWSINESS DETECTED"
                );

            }

        }

        else{

            setEyeStatus(
                "EYES CLOSING"
            );

        }

    }

    else{

        eyesClosedSince =
            null;


        setEyeStatus(
            "EYES OPEN"
        );


        if(drowsySent){

            drowsySent =
                false;


            sendCmd(
                "DROWSY:0"
            );


            console.log(
                "DRIVER AWAKE"
            );

        }

    }

}


/* =========================================================
   EYE STATUS DISPLAY
========================================================= */

function setEyeStatus(state){

    const eyeState =
        document.getElementById(
            "eyeState"
        );


    const drowsyState =
        document.getElementById(
            "drowsyState"
        );


    if(eyeState){

        eyeState.textContent =
            "EYES: " +
            state;

    }


    if(drowsyState){

        if(state === "DROWSY"){

            drowsyState.textContent =
                "DROWSINESS: DETECTED";

        }

        else if(
            state === "FACE NOT DETECTED"
        ){

            drowsyState.textContent =
                "FACE: NOT DETECTED";

        }

        else{

            drowsyState.textContent =
                "DROWSINESS: NORMAL";

        }

    }

}


/* =========================================================
   START EYE DETECTION
========================================================= */

async function startEyeDetection(){

    if(!setupEyeDetection()){

        setEyeStatus(
            "MODEL LOADING"
        );

        return;

    }


    if(eyeDetectionRunning)
        return;


    eyeDetectionRunning =
        true;


    async function processCameraFrame(){

        if(!eyeDetectionRunning)
            return;


        if(
            cameraStream &&
            cameraVideo.readyState >= 2
        ){

            try{

                await faceMesh.send({

                    image:
                        cameraVideo

                });

            }

            catch(error){

                console.warn(
                    "Temporary face processing issue:",
                    error.message
                );

            }

        }


        requestAnimationFrame(
            processCameraFrame
        );

    }


    processCameraFrame();

}


/* =========================================================
   STOP EYE DETECTION
========================================================= */

function stopEyeDetection(){

    eyeDetectionRunning =
        false;


    eyesClosedSince =
        null;


    drowsySent =
        false;


    setEyeStatus(
        "CAMERA OFF"
    );

}


/* =========================================================
   PAGE SAFETY
========================================================= */

window.addEventListener(
    "pagehide",
    () => {

        if(cmdChar){

            sendCmd(
                "S"
            );

        }

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

setupEyeDetection();


console.log(
    "RC CAR CONTROLLER READY"
);
