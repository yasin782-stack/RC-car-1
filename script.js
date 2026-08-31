/* =========================================================
   RC CAR CONTROLLER
   BLE + CAMERA + STEERING + TELEMETRY
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
   BLE VARIABLES
========================================================= */

let bleDevice = null;
let bleServer = null;
let cmdChar = null;
let teleChar = null;


/* =========================================================
   GET HTML ELEMENTS
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
   BLE CONNECT BUTTON
========================================================= */

connectBtn.addEventListener(
    "click",
    connectBLE
);


/* =========================================================
   CONNECT TO ESP32
========================================================= */

async function connectBLE() {

    if (!navigator.bluetooth) {

        statusEl.textContent =
            "Web Bluetooth not supported";

        return;
    }


    try {

        statusEl.textContent =
            "Requesting device...";


        /*
         * Search for the ESP32 using
         * the service UUID.
         */

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
            "Connecting to ESP32...";


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
            "Command characteristic:",
            cmdChar.properties
        );


        console.log(
            "Telemetry characteristic:",
            teleChar.properties
        );


        /*
         * Enable telemetry notifications
         */

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
            "✅ ESP32 connected"
        );

    }

    catch (error) {

        console.error(
            "BLE connection error:",
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

function onDisconnected() {

    statusEl.textContent =
        "Disconnected";

    connectBtn.textContent =
        "Connect to Car";


    bleServer = null;
    cmdChar = null;
    teleChar = null;

}


/* =========================================================
   SEND COMMAND TO ESP32
========================================================= */

async function sendCmd(command) {

    if (!cmdChar) {

        console.log(
            "❌ Not connected. Command:",
            command
        );

        statusEl.textContent =
            "Connect to Car first";

        return;
    }


    try {

        const data =
            new TextEncoder().encode(command);


        console.log(
            "➡️ Sending:",
            command
        );


        /*
         * IMPORTANT:
         *
         * Try normal WRITE first.
         * If ESP32 characteristic only supports
         * WRITE WITHOUT RESPONSE, use that.
         */

        if (
            cmdChar.properties &&
            cmdChar.properties.write
        ) {

            await cmdChar.writeValue(data);

        }

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
                "ESP32 command characteristic is not writable"
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


/* =========================================================
   TELEMETRY
========================================================= */

function onTelemetry(event) {

    const value =
        new TextDecoder().decode(
            event.target.value
        );


    console.log(
        "📡 ESP32:",
        value
    );


    /*
     * Example:
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
     * GPS telemetry
     */

    const gps =
        value.match(
            /GPS:(\d)/
        );


    if (gps) {

        console.log(
            "GPS status:",
            gps[1]
        );

    }

}


/* =========================================================
   ECO MODE
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
   SPORT MODE
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
   SPEED DISPLAY
========================================================= */

let currentSpeed = 0;
let targetSpeed = 0;

const MAX_SPEED = 120;
const MAX_RPM = 8000;

function setTarget(
    moving
) {

    if (moving) {

        targetSpeed =
            MAX_SPEED;

    }

    else {

        targetSpeed = 0;

    }

}


function updateGauge() {

    currentSpeed +=
        (targetSpeed - currentSpeed)
        * 0.08;


    if (
        Math.abs(
            targetSpeed -
            currentSpeed
        ) < 0.2
    ) {

        currentSpeed =
            targetSpeed;

    }


    const speed =
        Math.round(
            currentSpeed
        );


    const rpm =
        Math.round(
            (currentSpeed /
            MAX_SPEED) *
            MAX_RPM
        );


    speedNum.textContent =
        speed;

    rpmNum.textContent =
        rpm;


    requestAnimationFrame(
        updateGauge
    );

}


updateGauge();


/* =========================================================
   FORWARD / BACKWARD
========================================================= */

function setupPedal(
    element,
    command
) {

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


setupPedal(
    fwdBtn,
    "F"
);


setupPedal(
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
) {

    const now =
        Date.now();


    /*
     * Prevent sending
     * too many BLE packets.
     */

    if (
        now -
        lastSteeringSend <
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


/* =========================================================
   WHEEL TOUCH START
========================================================= */

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


/* =========================================================
   WHEEL MOVEMENT
========================================================= */

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


/* =========================================================
   RELEASE STEERING
========================================================= */

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
   CAMERA
========================================================= */

let cameraStream =
    null;

let cameraMode =
    "user";


/* =========================================================
   START CAMERA
========================================================= */

async function startCamera() {

    try {

        cameraState.textContent =
            "STARTING...";


        /*
         * Stop previous stream
         */

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        /*
         * Request selected camera
         */

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


        if (
            cameraMode === "user"
        ) {

            cameraState.textContent =
                "FRONT CAMERA";

        }

        else {

            cameraState.textContent =
                "BACK CAMERA";

        }


        cameraBtn.textContent =
            "STOP CAMERA";


        console.log(
            "✅ Camera started:",
            cameraMode
        );

    }

    catch (error) {

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
   CAMERA BUTTON
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


        if (
            cameraMode === "user"
        ) {

            cameraMode =
                "environment";

        }

        else {

            cameraMode =
                "user";

        }


        await startCamera();

    }
);


/* =========================================================
   SAFETY STOP
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
   INITIAL STATUS
========================================================= */

if (!navigator.bluetooth) {

    statusEl.textContent =
        "Use Chrome Android for BLE";

}


if (!navigator.mediaDevices) {

    cameraState.textContent =
        "Camera API unavailable";

   }
