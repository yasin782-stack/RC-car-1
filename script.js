
/* =========================================================
   RC CAR CONTROLLER
   BLE + GPS + GSM + SMS + CAMERA + SENSORS
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

const statusEl = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");

const fwdBtn = document.getElementById("fwdBtn");
const backBtn = document.getElementById("backBtn");

const ecoBtn = document.getElementById("ecoBtn");
const sportBtn = document.getElementById("sportBtn");

const wheelWrap = document.getElementById("wheelWrap");
const wheel = document.getElementById("wheel");

const distFront = document.getElementById("distFront");
const distRear = document.getElementById("distRear");

const speedNum = document.getElementById("speedNum");
const rpmNum = document.getElementById("rpmNum");

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


/* =========================================================
   CONNECT BLE
========================================================= */

connectBtn.addEventListener(
    "click",
    connectBLE
);


async function connectBLE() {

    if (!navigator.bluetooth) {

        statusEl.textContent =
        "Web Bluetooth not supported";

        return;
    }

    try {

        statusEl.textContent =
        "Searching for ESP32...";


        bleDevice =
        await navigator.bluetooth.requestDevice({

            filters: [
                {
                    services: [
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


        console.log(
            "COMMAND CHARACTERISTIC:",
            cmdChar.properties
        );


        console.log(
            "TELEMETRY CHARACTERISTIC:",
            teleChar.properties
        );


        if (
            teleChar.properties.notify ||
            teleChar.properties.indicate
        ) {

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
            "✅ BLE CONNECTED"
        );

    }

    catch(error) {

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
   DISCONNECT
========================================================= */

function onDisconnected() {

    statusEl.textContent =
    "Disconnected";


    connectBtn.textContent =
    "Connect to Car";


    cmdChar = null;
    teleChar = null;


    /*
     * Safety stop
     */

    console.log(
        "Sending safety stop"
    );

}


/* =========================================================
   SEND COMMAND
========================================================= */

async function sendCmd(command) {

    if (!cmdChar) {

        console.log(
            "Not connected:",
            command
        );

        statusEl.textContent =
        "Connect to Car first";

        return;

    }


    try {

        const data =
        new TextEncoder()
        .encode(command);


        console.log(
            "➡️ SEND:",
            command
        );


        /*
         * NORMAL WRITE FIRST
         */

        if (
            cmdChar.properties &&
            cmdChar.properties.write
        ) {

            await cmdChar.writeValue(
                data
            );

        }

        /*
         * FALLBACK
         */

        else if (
            cmdChar.properties &&
            cmdChar.properties.writeWithoutResponse
        ) {

            await cmdChar.writeValueWithoutResponse(
                data
            );

        }

        else {

            throw new Error(
                "Command characteristic is not writable"
            );

        }


        console.log(
            "✅ SENT:",
            command
        );

    }

    catch(error) {

        console.error(
            "BLE SEND ERROR:",
            error
        );


        statusEl.textContent =
        "Send error: " +
        error.message;

    }

}


/* =========================================================
   TELEMETRY
========================================================= */

function onTelemetry(event) {

    const value =
    new TextDecoder()
    .decode(
        event.target.value
    );


    console.log(
        "📡 TELEMETRY:",
        value
    );


    /*
     * FRONT / REAR DISTANCE
     *
     * F:50,R:80
     */

    const distance =
    value.match(
        /F:(-?\d+),R:(-?\d+)/
    );


    if (distance) {

        distFront.textContent =
        distance[1];


        distRear.textContent =
        distance[2];

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


    if (gpsMatch && gpsDot) {

        const hasFix =
        gpsMatch[1] === "1";


        gpsDot.className =
        "dot " +
        (
            hasFix
            ? "ok"
            : "bad"
        );


        if (
            hasFix &&
            latMatch &&
            lonMatch &&
            coords
        ) {

            coords.textContent =
            latMatch[1] +
            ", " +
            lonMatch[1];

        }

        else if (coords) {

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


    if (
        gsmMatch &&
        gsmDot
    ) {

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


    if (
        smsMatch &&
        smsDot
    ) {

        if (
            smsMatch[1] === "1"
        ) {

            smsDot.className =
            "dot ok";

        }

        else if (
            smsMatch[1] === "2"
        ) {

            smsDot.className =
            "dot bad";

        }

        else {

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


if (gpsReqBtn) {

    gpsReqBtn.addEventListener(
        "click",
        () => {

            if (!cmdChar) {

                statusEl.textContent =
                "Connect to Car first";

                return;

            }


            sendCmd(
                "GPS?"
            );


            gpsReqBtn.style.opacity =
            "0.4";


            setTimeout(
                () => {

                    gpsReqBtn.style.opacity =
                    "1";

                },
                1000
            );

        }
    );

}


/* =========================================================
   SMS PANEL
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


if (smsBtn) {

    smsBtn.addEventListener(
        "click",
        () => {

            if (!msgPanel)
                return;


            msgPanel.classList.toggle(
                "open"
            );

        }
    );

}


if (msgSendBtn) {

    msgSendBtn.addEventListener(
        "click",
        () => {

            if (!msgInput)
                return;


            const text =
            msgInput.value.trim();


            if (!text)
                return;


            if (!cmdChar) {

                if (msgStatus) {

                    msgStatus.textContent =
                    "Not connected";

                }

                return;

            }


            /*
             * Send SMS command
             */

            sendCmd(
                "MSG:" + text
            );


            if (msgStatus) {

                msgStatus.textContent =
                "SMS sent";

            }


            msgInput.value =
            "";


            setTimeout(
                () => {

                    if (msgStatus) {

                        msgStatus.textContent =
                        "";

                    }

                },
                3000
            );

        }
    );

}


/* =========================================================
   ECO
========================================================= */

ecoBtn.addEventListener(
    "click",
    () => {

        sendCmd(
            "MODE:ECO"
        );


        ecoBtn.classList.add(
            "active"
        );


        sportBtn.classList.remove(
            "active"
        );

    }
);


/* =========================================================
   SPORT
========================================================= */

sportBtn.addEventListener(
    "click",
    () => {

        sendCmd(
            "MODE:SPORT"
        );


        sportBtn.classList.add(
            "active"
        );


        ecoBtn.classList.remove(
            "active"
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


function setTarget(
    moving
) {

    targetSpeed =
    moving
    ? MAX_SPEED
    : 0;

}


function updateGauge() {

    currentSpeed +=
    (
        targetSpeed -
        currentSpeed
    ) * 0.08;


    if (
        Math.abs(
            targetSpeed -
            currentSpeed
        ) < 0.2
    ) {

        currentSpeed =
        targetSpeed;

    }


    speedNum.textContent =
    Math.round(
        currentSpeed
    );


    rpmNum.textContent =
    Math.round(
        (
            currentSpeed /
            MAX_SPEED
        ) *
        MAX_RPM
    );


    requestAnimationFrame(
        updateGauge
    );

}


updateGauge();


/* =========================================================
   FORWARD / BACK
========================================================= */

function setupDriveButton(
    element,
    command
) {

    if (!element)
        return;


    function start(event) {

        event.preventDefault();


        element.classList.add(
            "active"
        );


        sendCmd(
            command
        );


        setTarget(
            true
        );

    }


    function stop(event) {

        event.preventDefault();


        element.classList.remove(
            "active"
        );


        sendCmd(
            "S"
        );


        setTarget(
            false
        );

    }


    element.addEventListener(
        "pointerdown",
        start
    );


    element.addEventListener(
        "pointerup",
        stop
    );


    element.addEventListener(
        "pointercancel",
        stop
    );


    element.addEventListener(
        "pointerleave",
        stop
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

let dragging =
false;

let lastSteeringSend =
0;


function getSteeringAngle(
    event
) {

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
) {

    const now =
    Date.now();


    if (
        now -
        lastSteeringSend
        <
        40
    ) {

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


        dragging =
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

        if (!dragging)
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


function releaseWheel(
    event
) {

    if (!dragging)
        return;


    dragging =
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
    releaseWheel
);


wheelWrap.addEventListener(
    "pointercancel",
    releaseWheel
);


/* =========================================================
   CAMERA START
========================================================= */

cameraBtn.addEventListener(
    "click",
    async () => {

        if (cameraStream) {

            stopCamera();

        }

        else {

            await startCamera();

        }

    }
);


async function startCamera() {

    try {

        cameraState.textContent =
        "STARTING...";


        if (cameraStream) {

            cameraStream
            .getTracks()
            .forEach(
                track =>
                track.stop()
            );

        }


        cameraStream =
        await navigator
        .mediaDevices
        .getUserMedia({

            video: {

                facingMode: {
                    exact:
                    cameraMode
                }

            },

            audio: false

        });


        cameraVideo.srcObject =
        cameraStream;


        await cameraVideo.play();


        cameraState.textContent =
        cameraMode === "user"
        ? "FRONT CAMERA"
        : "BACK CAMERA";


        cameraBtn.textContent =
        "STOP CAMERA";


        console.log(
            "Camera:",
            cameraMode
        );

    }

    catch(error) {

        console.error(
            "Camera error:",
            error
        );


        cameraState.textContent =
        "CAMERA ERROR: " +
        error.name;


        cameraStream =
        null;

    }

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

    if (cameraStream) {

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

        if (!cameraStream) {

            cameraState.textContent =
            "START CAMERA FIRST";

            return;

        }


        cameraMode =
        cameraMode === "user"
        ? "environment"
        : "user";


        await startCamera();

    }
);


/* =========================================================
   PAGE SAFETY
========================================================= */

window.addEventListener(
    "pagehide",
    () => {

        if (cmdChar) {

            sendCmd(
                "S"
            );

        }

    }
);


/* =========================================================
   INITIAL CHECK
========================================================= */

if (!navigator.bluetooth) {

    console.warn(
        "Web Bluetooth is unavailable."
    );

}


if (!navigator.mediaDevices) {

    console.warn(
        "Camera API is unavailable."
    );

}
/* =========================================================
   EYE / DROWSINESS DETECTION
========================================================= */

let faceMesh = null;
let eyeDetectionRunning = false;

let eyesClosedSince = null;
let drowsySent = false;

const EYES_CLOSED_TIME = 2000;


/* =========================================================
   CREATE FACE MESH
========================================================= */

function setupEyeDetection() {

    if (typeof FaceMesh === "undefined") {

        console.error(
            "FaceMesh library not loaded"
        );

        if (cameraState) {
            cameraState.textContent =
                "EYE MODEL ERROR";
        }

        return;

    }


    faceMesh = new FaceMesh({

        locateFile: (file) => {

            return (
                "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" +
                file
            );

        }

    });


    faceMesh.setOptions({

        maxNumFaces: 1,

        refineLandmarks: true,

        minDetectionConfidence: 0.5,

        minTrackingConfidence: 0.5

    });


    faceMesh.onResults(
        processEyeResults
    );

}


/* =========================================================
   DISTANCE BETWEEN TWO POINTS
========================================================= */

function landmarkDistance(a,b) {

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
   EYE OPEN RATIO
========================================================= */

function getEyeRatio(
    top,
    bottom,
    left,
    right
) {

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


    if (horizontal === 0)
        return 0;


    return vertical / horizontal;

}


/* =========================================================
   PROCESS FACE
========================================================= */

function processEyeResults(
    results
) {

    if (!results.multiFaceLandmarks ||
        results.multiFaceLandmarks.length === 0) {

        eyesClosedSince = null;

        setEyeStatus(
            "NO FACE"
        );

        return;

    }


    const landmarks =
        results.multiFaceLandmarks[0];


    /*
     * Left eye landmarks
     */

    const leftRatio =
        getEyeRatio(
            landmarks[159],
            landmarks[145],
            landmarks[33],
            landmarks[133]
        );


    /*
     * Right eye landmarks
     */

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


    /*
     * Approximate threshold.
     * Individual faces/camera angles can require
     * calibration.
     */

    const eyesClosed =
        eyeRatio < 0.20;


    if (eyesClosed) {

        if (!eyesClosedSince) {

            eyesClosedSince =
                Date.now();

        }


        const closedFor =
            Date.now() -
            eyesClosedSince;


        if (
            closedFor >=
            EYES_CLOSED_TIME
        ) {

            setEyeStatus(
                "DROWSY"
            );


            if (!drowsySent) {

                drowsySent =
                    true;


                /*
                 * Tell ESP32 that drowsiness
                 * has been detected.
                 */

                sendCmd(
                    "DROWSY:1"
                );


                console.log(
                    "⚠️ DROWSINESS DETECTED"
                );

            }

        }

        else {

            setEyeStatus(
                "EYES CLOSING"
            );

        }

    }

    else {

        eyesClosedSince =
            null;


        setEyeStatus(
            "EYES OPEN"
        );


        /*
         * Tell ESP32 that driver is awake again.
         */

        if (drowsySent) {

            drowsySent =
                false;


            sendCmd(
                "DROWSY:0"
            );


            console.log(
                "✅ DRIVER AWAKE"
            );

        }

    }

}


/* =========================================================
   EYE STATUS DISPLAY
========================================================= */

function setEyeStatus(
    state
) {

    const eyeState =
        document.getElementById(
            "eyeState"
        );


    const drowsyState =
        document.getElementById(
            "drowsyState"
        );


    if (eyeState) {

        eyeState.textContent =
            "EYES: " +
            state;

    }


    if (drowsyState) {

        if (state === "DROWSY") {

            drowsyState.textContent =
                "DROWSINESS: DETECTED";

        }

        else {

            drowsyState.textContent =
                "DROWSINESS: NORMAL";

        }

    }

}


/* =========================================================
   START EYE PROCESSING
========================================================= */

async function startEyeDetection() {

    if (!faceMesh) {

        setupEyeDetection();

    }


    if (!faceMesh)
        return;


    if (eyeDetectionRunning)
        return;


    eyeDetectionRunning =
        true;


    async function processCamera() {

        if (!eyeDetectionRunning)
            return;


        if (
            cameraVideo.readyState >=
            2
        ) {

            try {

                await faceMesh.send({
                    image:
                        cameraVideo
                });

            }

            catch(error) {

                console.error(
                    "Face detection error:",
                    error
                );

            }

        }


        requestAnimationFrame(
            processCamera
        );

    }


    processCamera();

}


/* =========================================================
   STOP EYE PROCESSING
========================================================= */

function stopEyeDetection() {

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
   MODIFY CAMERA START
========================================================= */

const originalStartCamera =
    startCamera;


startCamera =
async function() {

    await originalStartCamera();


    if (cameraStream) {

        await startEyeDetection();

    }

};


/* =========================================================
   MODIFY CAMERA STOP
========================================================= */

const originalStopCamera =
    stopCamera;


stopCamera =
function() {

    stopEyeDetection();

    originalStopCamera();

};


/* =========================================================
   INITIALIZE
========================================================= */

setupEyeDetection();
