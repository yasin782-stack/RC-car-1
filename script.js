/* =========================================================
   RC CAR CONTROLLER
   PART 1 / 2
   BLE + GPS + GSM + SMS + CAMERA + CONTROLS
========================================================= */


/* =========================================================
   BLE UUIDs
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

const app =
document.getElementById("app");

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
   BLE VARIABLES
========================================================= */

let bleDevice = null;

let bleServer = null;

let cmdChar = null;

let teleChar = null;


/* =========================================================
   CAMERA VARIABLES
========================================================= */

let cameraStream = null;

let cameraMode = "user";

let cameraRunning = false;


/* =========================================================
   EYE DETECTION VARIABLES
========================================================= */

let faceLandmarker = null;

let detectingEyes = false;

let eyesClosedSince = 0;

let drowsyWarningSent = false;

let drowsyAlertSent = false;


/*
   ESP32 timing:

   2 seconds  -> EYE:WARN
   10 seconds -> EYE:ALERT
*/

const EYE_WARN_TIME = 2000;

const EYE_ALERT_TIME = 10000;


/*
   Eye closure threshold.
*/

const CLOSED_THRESHOLD = 0.20;


/* =========================================================
   EYE LANDMARKS
========================================================= */

const LEFT_EYE = [
    33,
    160,
    158,
    133,
    153,
    144
];

const RIGHT_EYE = [
    362,
    385,
    387,
    263,
    373,
    380
];


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
        (
            bleDevice.name ||
            "ESP32"
        );


        connectBtn.textContent =
        "CONNECTED";


        console.log(
            "BLE CONNECTED"
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
   BLE DISCONNECT
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

async function sendCmd(
    command
){

    if(!cmdChar){

        console.log(
            "BLE not connected:",
            command
        );

        return false;

    }


    try{

        const data =
        new TextEncoder().encode(
            command
        );


        console.log(
            "BLE SEND:",
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

        else{

            throw new Error(
                "BLE characteristic is not writable"
            );

        }


        return true;

    }

    catch(error){

        console.error(
            "BLE SEND ERROR:",
            error
        );

        return false;

    }

}


/* =========================================================
   TELEMETRY
========================================================= */

function onTelemetry(
    event
){

    const value =
    new TextDecoder().decode(
        event.target.value
    );


    console.log(
        "TELEMETRY:",
        value
    );


    /*
     * FRONT / REAR DISTANCE
     *
     * Example:
     *
     * F:50,R:80
     */

    const distance =
    value.match(
        /F:(-?\d+),R:(-?\d+)/
    );


    if(distance){

        distFront.textContent =
        distance[1];


        distRear.textContent =
        distance[2];


        updateCollision(
            parseInt(
                distance[1],
                10
            ),

            parseInt(
                distance[2],
                10
            )

        );

    }


    /*
     * GPS
     */

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


    if(
        gpsMatch &&
        gpsDot
    ){

        const hasFix =
        gpsMatch[1] === "1";


        gpsDot.className =
        "dot " +
        (
            hasFix
            ? "ok"
            : "bad"
        );


        if(
            hasFix &&
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


    /*
     * GSM
     */

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


    /*
     * SMS
     */

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
   COLLISION DISPLAY
========================================================= */

function updateCollision(
    front,
    rear
){

    const overlay =
    document.getElementById(
        "collisionOverlay"
    );


    const icon =
    document.getElementById(
        "collisionIcon"
    );


    if(
        !overlay ||
        !icon
    ){

        return;

    }


    const safeDistance =
    app.classList.contains(
        "sport"
    )
    ? 38
    : 20;


    const tooClose =
    (
        front > 0 &&
        front < safeDistance
    )
    ||
    (
        rear > 0 &&
        rear < safeDistance
    );


    overlay.classList.toggle(
        "active",
        tooClose
    );


    icon.classList.toggle(
        "active",
        tooClose
    );

}


/* =========================================================
   GPS BUTTON
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


            gpsReqBtn.style.opacity =
            "0.5";


            setTimeout(
                () => {

                    gpsReqBtn.style.opacity =
                    "1";

                },
                800
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
        async () => {

            if(!msgInput)
                return;


            const text =
            msgInput.value.trim();


            if(!text){

                if(msgStatus){

                    msgStatus.textContent =
                    "Enter a message";

                }

                return;

            }


            if(!cmdChar){

                if(msgStatus){

                    msgStatus.textContent =
                    "Connect to Car first";

                }

                return;

            }


            if(msgStatus){

                msgStatus.textContent =
                "Sending...";

            }


            const sent =
            await sendCmd(
                "MSG:" + text
            );


            if(sent){

                if(msgStatus){

                    msgStatus.textContent =
                    "SMS command sent";

                }


                msgInput.value =
                "";

            }

            else{

                if(msgStatus){

                    msgStatus.textContent =
                    "Send failed";

                }

            }

        }
    );

}


/* =========================================================
   ECO MODE
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


        console.log(
            "ECO MODE"
        );

    }
);


/* =========================================================
   SPORT MODE
========================================================= */

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


        console.log(
            "SPORT MODE"
        );

    }
);


/* =========================================================
   SPEED / RPM
========================================================= */

const MAX_SPEED =
120;

const MAX_RPM =
8000;

let currentSpeed =
0;

let targetSpeed =
0;


function setTargetSpeed(
    moving
){

    if(!moving){

        targetSpeed =
        0;

        return;

    }


    if(
        app.classList.contains(
            "sport"
        )
    ){

        targetSpeed =
        MAX_SPEED;

    }

    else{

        targetSpeed =
        MAX_SPEED *
        0.55;

    }

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
   DRIVE START
========================================================= */

function startDrive(
    button,
    command
){

    if(!button)
        return;


    if(command === "F"){

        backBtn.classList.remove(
            "active"
        );

    }


    if(command === "B"){

        fwdBtn.classList.remove(
            "active"
        );

    }


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


/* =========================================================
   DRIVE STOP
========================================================= */

function stopDrive(){

    if(fwdBtn){

        fwdBtn.classList.remove(
            "active"
        );

    }


    if(backBtn){

        backBtn.classList.remove(
            "active"
        );

    }


    sendCmd(
        "S"
    );


    setTargetSpeed(
        false
    );

}


/* =========================================================
   DRIVE BUTTON SETUP
========================================================= */

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

            if(event.buttons){

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

let steeringActive =
false;

let lastSteeringSend =
0;


function getSteeringAngle(
    event
){

    const rect =
    wheelWrap.getBoundingClientRect();


    const cx =
    rect.left +
    rect.width /
    2;


    const cy =
    rect.top +
    rect.height /
    2;


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


/* =========================================================
   SEND STEERING
========================================================= */

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
        Math.round(
            angle
        )
    );

}


/* =========================================================
   STEERING DOWN
========================================================= */

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


/* =========================================================
   STEERING MOVE
========================================================= */

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


/* =========================================================
   STEERING RELEASE
========================================================= */

function releaseSteering(){

    if(!steeringActive)
        return;


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
   CAMERA BUTTON
========================================================= */

cameraBtn.addEventListener(
    "click",
    async () => {

        if(cameraRunning){

            stopCamera();

        }

        else{

            await startCamera();

        }

    }
);

/* =========================================================
   START CAMERA
========================================================= */

async function startCamera(){

    if(
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ){

        cameraState.textContent =
        "CAMERA NOT SUPPORTED";

        return;
    }


    try{

        cameraState.textContent =
        "STARTING CAMERA...";


        if(cameraStream){

            cameraStream
            .getTracks()
            .forEach(
                track =>
                track.stop()
            );

        }


        cameraStream =
        await navigator.mediaDevices.getUserMedia({

            video:{

                facingMode:{
                    ideal:
                    cameraMode
                },

                width:{
                    ideal:640
                },

                height:{
                    ideal:480
                }

            },

            audio:false

        });


        cameraVideo.srcObject =
        cameraStream;


        await cameraVideo.play();


        cameraRunning =
        true;


        cameraBtn.textContent =
        "STOP CAMERA";


        cameraState.textContent =
        cameraMode === "user"
        ? "FRONT CAMERA"
        : "BACK CAMERA";


        await initializeEyeDetection();


        console.log(
            "CAMERA STARTED"
        );

    }

    catch(error){

        console.error(
            "CAMERA ERROR:",
            error
        );


        cameraStream =
        null;

        cameraRunning =
        false;


        cameraState.textContent =
        "CAMERA ERROR";


        const eyeState =
        document.getElementById(
            "eyeState"
        );


        if(eyeState){

            if(
                error.name ===
                "NotAllowedError"
            ){

                eyeState.textContent =
                "CAMERA PERMISSION BLOCKED";

            }

            else if(
                error.name ===
                "NotFoundError"
            ){

                eyeState.textContent =
                "NO CAMERA FOUND";

            }

            else if(
                error.name ===
                "NotReadableError"
            ){

                eyeState.textContent =
                "CAMERA BUSY";

            }

            else{

                eyeState.textContent =
                error.name ||
                "CHECK CAMERA";

            }

        }

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


    cameraRunning =
    false;


    cameraState.textContent =
    "CAMERA OFF";


    cameraBtn.textContent =
    "START CAMERA";


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
        "EYES: --";

    }


    if(drowsyState){

        drowsyState.textContent =
        "DROWSINESS: NORMAL";

    }

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


        if(cameraRunning){

            await startCamera();

        }

    }
);


/* =========================================================
   EYE DETECTION
========================================================= */

async function initializeEyeDetection(){

    if(faceLandmarker){

        startEyeDetectionLoop();

        return;

    }


    try{

        cameraState.textContent =
        "LOADING AI...";


        const vision =
        await import(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm"
        );


        const {
            FaceLandmarker,
            FilesetResolver
        } = vision;


        const filesetResolver =
        await FilesetResolver.forVisionTasks(

            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"

        );


        try{

            faceLandmarker =
            await FaceLandmarker.createFromOptions(
                filesetResolver,
                {

                    baseOptions:{

                        modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",

                        delegate:
                        "GPU"

                    },

                    runningMode:
                    "VIDEO",

                    numFaces:
                    1

                }
            );

        }

        catch(gpuError){

            console.warn(
                "GPU unavailable. Using CPU.",
                gpuError
            );


            faceLandmarker =
            await FaceLandmarker.createFromOptions(
                filesetResolver,
                {

                    baseOptions:{

                        modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",

                        delegate:
                        "CPU"

                    },

                    runningMode:
                    "VIDEO",

                    numFaces:
                    1

                }
            );

        }


        cameraState.textContent =
        "AI READY";


        startEyeDetectionLoop();

    }

    catch(error){

        console.error(
            "AI LOAD ERROR:",
            error
        );


        cameraState.textContent =
        "AI LOAD ERROR";


        const eyeState =
        document.getElementById(
            "eyeState"
        );


        if(eyeState){

            eyeState.textContent =
            "AI ERROR - CHECK INTERNET";

        }

    }

}


/* =========================================================
   EYE DETECTION LOOP
========================================================= */

function startEyeDetectionLoop(){

    if(detectingEyes)
        return;


    detectingEyes =
    true;


    requestAnimationFrame(
        detectEyesFrame
    );

}


/* =========================================================
   DETECT EYES FRAME
========================================================= */

function detectEyesFrame(){

    if(
        !cameraRunning ||
        !faceLandmarker
    ){

        detectingEyes =
        false;

        return;

    }


    try{

        const now =
        performance.now();


        const result =
        faceLandmarker.detectForVideo(
            cameraVideo,
            now
        );


        if(
            result &&
            result.faceLandmarks &&
            result.faceLandmarks.length > 0
        ){

            const landmarks =
            result.faceLandmarks[0];


            processEyeState(
                calculateEyesClosed(
                    landmarks
                )
            );

        }

        else{

            setEyeStatus(
                "FACE NOT DETECTED"
            );


            /*
             * Do not treat this as a camera error.
             */

            eyesClosedSince =
            0;


            if(
                drowsyWarningSent ||
                drowsyAlertSent
            ){

                drowsyWarningSent =
                false;


                drowsyAlertSent =
                false;


                sendCmd(
                    "EYE:CLEAR"
                );

            }

        }

    }

    catch(error){

        console.warn(
            "Temporary eye detection issue:",
            error
        );

    }


    requestAnimationFrame(
        detectEyesFrame
    );

}


/* =========================================================
   3D LANDMARK DISTANCE
========================================================= */

function distance3D(
    a,
    b
){

    const dx =
    a.x - b.x;


    const dy =
    a.y - b.y;


    const dz =
    (
        a.z || 0
    )
    -
    (
        b.z || 0
    );


    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );

}


/* =========================================================
   EYE ASPECT RATIO
========================================================= */

function eyeAspectRatio(
    landmarks,
    points
){

    const p1 =
    landmarks[points[0]];

    const p2 =
    landmarks[points[1]];

    const p3 =
    landmarks[points[2]];

    const p4 =
    landmarks[points[3]];

    const p5 =
    landmarks[points[4]];

    const p6 =
    landmarks[points[5]];


    if(
        !p1 ||
        !p2 ||
        !p3 ||
        !p4 ||
        !p5 ||
        !p6
    ){

        return 1;

    }


    const vertical1 =
    distance3D(
        p2,
        p6
    );


    const vertical2 =
    distance3D(
        p3,
        p5
    );


    const horizontal =
    distance3D(
        p1,
        p4
    );


    if(
        horizontal === 0
    ){

        return 1;

    }


    return (
        vertical1 +
        vertical2
    )
    /
    (
        2 *
        horizontal
    );

}


/* =========================================================
   CALCULATE EYE CLOSURE
========================================================= */

function calculateEyesClosed(
    landmarks
){

    const leftEAR =
    eyeAspectRatio(
        landmarks,
        LEFT_EYE
    );


    const rightEAR =
    eyeAspectRatio(
        landmarks,
        RIGHT_EYE
    );


    const averageEAR =
    (
        leftEAR +
        rightEAR
    )
    /
    2;


    return (
        averageEAR <
        CLOSED_THRESHOLD
    );

}


/* =========================================================
   PROCESS EYE STATE
========================================================= */

function processEyeState(
    eyesClosed
){

    if(eyesClosed){

        if(
            eyesClosedSince === 0
        ){

            eyesClosedSince =
            Date.now();

        }


        const closedTime =
        Date.now() -
        eyesClosedSince;


        const seconds =
        closedTime /
        1000;


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
            "EYES: CLOSED";

        }


        /*
         * 2 SECOND WARNING
         */

        if(
            closedTime >=
            EYE_WARN_TIME &&
            !drowsyWarningSent
        ){

            drowsyWarningSent =
            true;


            if(drowsyState){

                drowsyState.textContent =
                "DROWSINESS: WARNING";

            }


            if(cameraPanel){

                cameraPanel.classList.add(
                    "drowsy"
                );

            }


            /*
             * EXACT ESP32 COMMAND
             */

            sendCmd(
                "EYE:WARN"
            );


            console.log(
                "EYE:WARN SENT"
            );

        }


        /*
         * Show countdown before warning.
         */

        if(
            closedTime <
            EYE_WARN_TIME
        ){

            if(drowsyState){

                drowsyState.textContent =
                "EYES CLOSED " +
                seconds.toFixed(1) +
                "s";

            }

        }


        /*
         * 10 SECOND ALERT
         */

        if(
            closedTime >=
            EYE_ALERT_TIME &&
            !drowsyAlertSent
        ){

            drowsyAlertSent =
            true;


            if(drowsyState){

                drowsyState.textContent =
                "DROWSINESS: ALERT";

            }


            if(cameraPanel){

                cameraPanel.classList.add(
                    "drowsy"
                );

            }


            /*
             * EXACT ESP32 COMMAND
             */

            sendCmd(
                "EYE:ALERT"
            );


            console.log(
                "EYE:ALERT SENT"
            );

        }

    }

    else{

        /*
         * Eyes are open.
         */

        eyesClosedSince =
        0;


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
            "EYES: OPEN";

        }


        if(drowsyState){

            drowsyState.textContent =
            "DROWSINESS: NORMAL";

        }


        /*
         * Tell ESP32 that driver is awake.
         */

        if(
            drowsyWarningSent ||
            drowsyAlertSent
        ){

            drowsyWarningSent =
            false;


            drowsyAlertSent =
            false;


            sendCmd(
                "EYE:CLEAR"
            );


            console.log(
                "EYE:CLEAR SENT"
            );

        }


        if(cameraPanel){

            cameraPanel.classList.remove(
                "drowsy"
            );

        }

    }

}


/* =========================================================
   EYE STATUS
========================================================= */

function setEyeStatus(
    state
){

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

        if(
            state ===
            "FACE NOT DETECTED"
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
   PAGE SAFETY
========================================================= */

window.addEventListener(
    "blur",
    () => {

        stopDrive();

    }
);


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
   BROWSER CHECK
========================================================= */

if(!navigator.bluetooth){

    console.warn(
        "Web Bluetooth is unavailable."
    );

}


if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
){

    console.warn(
        "Camera API is unavailable."
    );

}


console.log(
    "RC CAR CONTROLLER READY"
);
/* =========================================
   DROWSINESS WARNING
========================================= */

const drowsyWarning =
    document.getElementById("drowsyWarning");

const eyeState =
    document.getElementById("eyeState");

const drowsyState =
    document.getElementById("drowsyState");


function checkDrowsiness() {

    if (!drowsyWarning) return;

    const eyeText =
        eyeState
            ? eyeState.innerText.toUpperCase()
            : "";

    const drowsyText =
        drowsyState
            ? drowsyState.innerText.toUpperCase()
            : "";


    const eyesClosed =
        eyeText.includes("CLOSED") ||
        eyeText.includes("CLOSE");


    const drowsy =
        drowsyText.includes("DROWSY") ||
        drowsyText.includes("WARNING") ||
        drowsyText.includes("ALERT");


    if (eyesClosed || drowsy) {

        drowsyWarning.classList.add("active");

    } else {

        drowsyWarning.classList.remove("active");

    }
}


/* =========================================
   WATCH CAMERA STATUS
========================================= */

const drowsyObserver =
    new MutationObserver(
        checkDrowsiness
    );


if (eyeState) {

    drowsyObserver.observe(
        eyeState,
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );

}


if (drowsyState) {

    drowsyObserver.observe(
        drowsyState,
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );

}


/* =========================================
   INITIAL CHECK
========================================= */

checkDrowsiness();

