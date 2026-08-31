/* =========================================
   RC CAR - BLE + CAMERA
========================================= */

const SERVICE_UUID =
    "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

const CMD_CHAR_UUID =
    "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const TELE_CHAR_UUID =
    "beb5483e-36e1-4688-b7f5-ea07361b26a9";


/* =========================================
   ELEMENTS
========================================= */

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


/* =========================================
   BLE VARIABLES
========================================= */

let bleDevice = null;
let bleServer = null;
let cmdChar = null;
let teleChar = null;


/* =========================================
   CAMERA VARIABLES
========================================= */

let cameraStream = null;
let cameraMode = "user";


/* =========================================
   BLE CONNECT
========================================= */

connectBtn.addEventListener(
    "click",
    connectBLE
);

async function sendCommand(command) {

    if (!cmdChar) {

        statusEl.textContent =
            "Not connected";

        console.log(
            "BLE not connected:",
            command
        );

        return;
    }

    try {

        const data =
            new TextEncoder().encode(command);

        console.log(
            "Sending to ESP32:",
            command
        );

        if (cmdChar.properties.write) {

            await cmdChar.writeValue(data);

        }
        else if (
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
            "✅ Sent:",
            command
        );

    }
    catch (error) {

        console.error(
            "❌ BLE send error:",
            error
        );

        statusEl.textContent =
            "Send error: " +
            error.message;
    }
}

/* =========================================
   DISCONNECT
========================================= */

function onDisconnected() {

    statusEl.textContent =
        "Disconnected";

    connectBtn.textContent =
        "Connect to Car";

    sendCommand("S");

}


/* =========================================
   SEND BLE COMMAND
========================================= */

async function sendCommand(command) {

    if (!cmdChar) {

        console.log(
            "BLE not connected:",
            command
        );

        return;
    }


    try {

        const data =
            new TextEncoder().encode(command);


        if (
            cmdChar.writeValueWithoutResponse
        ) {

            await cmdChar.writeValueWithoutResponse(
                data
            );

        }
        else {

            await cmdChar.writeValue(
                data
            );

        }


        console.log(
            "Sent:",
            command
        );

    }

    catch (error) {

        console.error(
            "BLE send error:",
            error
        );

    }

}


/* =========================================
   TELEMETRY FROM ESP32
========================================= */

function onTelemetry(event) {

    const value =
        new TextDecoder().decode(
            event.target.value
        );


    console.log(
        "ESP32:",
        value
    );


    /* Distance */

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


    /* GPS */

    const gps =
        value.match(
            /GPS:(\d)/
        );


    if (gps) {

        console.log(
            "GPS:",
            gps[1]
        );

    }

}


/* =========================================
   ECO MODE
========================================= */

ecoBtn.addEventListener(
    "click",
    () => {

        sendCommand(
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


/* =========================================
   SPORT MODE
========================================= */

sportBtn.addEventListener(
    "click",
    () => {

        sendCommand(
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


/* =========================================
   FORWARD
========================================= */

function forwardStart(event) {

    event.preventDefault();

    fwdBtn.classList.add(
        "active"
    );

    sendCommand("F");

}


function forwardStop(event) {

    event.preventDefault();

    fwdBtn.classList.remove(
        "active"
    );

    sendCommand("S");

}


fwdBtn.addEventListener(
    "pointerdown",
    forwardStart
);

fwdBtn.addEventListener(
    "pointerup",
    forwardStop
);

fwdBtn.addEventListener(
    "pointercancel",
    forwardStop
);

fwdBtn.addEventListener(
    "pointerleave",
    forwardStop
);


/* =========================================
   BACKWARD
========================================= */

function backStart(event) {

    event.preventDefault();

    backBtn.classList.add(
        "active"
    );

    sendCommand("B");

}


function backStop(event) {

    event.preventDefault();

    backBtn.classList.remove(
        "active"
    );

    sendCommand("S");

}


backBtn.addEventListener(
    "pointerdown",
    backStart
);

backBtn.addEventListener(
    "pointerup",
    backStop
);

backBtn.addEventListener(
    "pointercancel",
    backStop
);

backBtn.addEventListener(
    "pointerleave",
    backStop
);


/* =========================================
   STEERING
========================================= */

let steering = false;
let lastSteeringSend = 0;


function getSteeringAngle(event) {

    const rect =
        wheelWrap.getBoundingClientRect();


    const centerX =
        rect.left +
        rect.width / 2;


    const centerY =
        rect.top +
        rect.height / 2;


    const dx =
        event.clientX -
        centerX;


    const dy =
        event.clientY -
        centerY;


    let angle =
        Math.atan2(
            dx,
            -dy
        ) *
        180 /
        Math.PI;


    angle =
        Math.max(
            -70,
            Math.min(
                70,
                angle
            )
        );


    return angle;

}


function sendSteering(angle) {

    const now =
        Date.now();


    if (
        now -
        lastSteeringSend <
        40
    ) {

        return;

    }


    lastSteeringSend =
        now;


    sendCommand(
        "L:" +
        Math.round(angle)
    );

}


function applySteering(angle) {

    wheel.style.transform =
        `rotate(${angle}deg)`;

    sendSteering(angle);

}


wheelWrap.addEventListener(
    "pointerdown",
    event => {

        event.preventDefault();

        steering = true;

        wheelWrap.setPointerCapture(
            event.pointerId
        );


        applySteering(
            getSteeringAngle(event)
        );

    }
);


wheelWrap.addEventListener(
    "pointermove",
    event => {

        if (!steering)
            return;


        event.preventDefault();


        applySteering(
            getSteeringAngle(event)
        );

    }
);


function releaseSteering(event) {

    if (!steering)
        return;


    steering = false;


    wheel.style.transition =
        "transform .2s";


    wheel.style.transform =
        "rotate(0deg)";


    sendCommand("L:0");

}


wheelWrap.addEventListener(
    "pointerup",
    releaseSteering
);

wheelWrap.addEventListener(
    "pointercancel",
    releaseSteering
);


/* =========================================
   CAMERA
========================================= */

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


/* =========================================
   START CAMERA
========================================= */

async function startCamera() {

    try {

        cameraState.textContent =
            "STARTING...";


        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

        }


        cameraStream =
            await navigator.mediaDevices
            .getUserMedia({

                video: {
                    facingMode: {
                        exact: cameraMode
                    }
                },

                audio: false

            });


        cameraVideo.srcObject =
            cameraStream;


        await cameraVideo.play();


        if (cameraMode === "user") {

            cameraState.textContent =
                "FRONT CAMERA";

        }
        else {

            cameraState.textContent =
                "BACK CAMERA";

        }


        cameraBtn.textContent =
            "STOP CAMERA";

    }

    catch (error) {

        console.error(error);

        cameraState.textContent =
            "CAMERA ERROR: " +
            error.name;

        cameraStream = null;

    }

}


/* =========================================
   STOP CAMERA
========================================= */

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

    }


    cameraStream = null;

    cameraVideo.srcObject = null;

    cameraState.textContent =
        "CAMERA OFF";

    cameraBtn.textContent =
        "START CAMERA";

}


/* =========================================
   SWITCH CAMERA
========================================= */

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


/* =========================================
   INITIAL SPEED DISPLAY
========================================= */

speedNum.textContent = "0";
rpmNum.textContent = "0";


/* =========================================
   SAFETY STOP WHEN PAGE CLOSES
========================================= */

window.addEventListener(
    "beforeunload",
    () => {

        sendCommand("S");

    }
);
