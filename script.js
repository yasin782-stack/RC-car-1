/* =====================================================
   RC CAR DASHBOARD - script.js
===================================================== */


/* =====================================================
   BLE CONFIGURATION
===================================================== */

const SERVICE_UUID =
    "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

const CMD_CHAR_UUID =
    "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const TELE_CHAR_UUID =
    "beb5483e-36e1-4688-b7f5-ea07361b26a9";


/* =====================================================
   BLE VARIABLES
===================================================== */

let bleDevice = null;
let bleServer = null;
let cmdChar = null;
let teleChar = null;


/* =====================================================
   DOM ELEMENTS
===================================================== */

const bleStatus =
    document.getElementById("bleStatus");

const connectBtn =
    document.getElementById("connectBLE");

const forwardBtn =
    document.getElementById("forwardBtn");

const reverseBtn =
    document.getElementById("reverseBtn");

const leftBtn =
    document.getElementById("leftBtn");

const rightBtn =
    document.getElementById("rightBtn");

const frontDistance =
    document.getElementById("frontDistance");

const rearDistance =
    document.getElementById("rearDistance");

const gpsStatus =
    document.getElementById("gpsStatus");

const gpsCoords =
    document.getElementById("gpsCoords");

const gsmStatus =
    document.getElementById("gsmStatus");

const smsStatus =
    document.getElementById("smsStatus");

const modeText =
    document.getElementById("modeText");

const speedNum =
    document.getElementById("speedNum");

const rpmNum =
    document.getElementById("rpmNum");

const driverCamera =
    document.getElementById("driverCamera");

const cameraState =
    document.getElementById("cameraState");

const eyeState =
    document.getElementById("eyeState");

const drowsyState =
    document.getElementById("drowsyState");

const cameraPanel =
    document.getElementById("cameraPanel");

const cameraBtn =
    document.getElementById("cameraBtn");

const obstacleWarning =
    document.getElementById("obstacleWarning");

const warningText =
    document.getElementById("warningText");

const drowsyWarning =
    document.getElementById("drowsyWarning");


/* =====================================================
   CAR STATE
===================================================== */

let currentMode = "ECO";

let frontCm = 999;
let rearCm = 999;

const OBSTACLE_LIMIT = 30;

let obstacleStopping = false;


/* =====================================================
   SEND BLE COMMAND
===================================================== */

async function sendCmd(command) {

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
            typeof cmdChar.writeValueWithoutResponse ===
            "function"
        ) {

            await cmdChar.writeValueWithoutResponse(
                data
            );

        } else {

            await cmdChar.writeValue(
                data
            );

        }

        console.log(
            "BLE →",
            command
        );

    } catch (error) {

        console.error(
            "BLE SEND ERROR:",
            error
        );

    }

}


/* =====================================================
   BLE CONNECT
===================================================== */

async function connectBLE() {

    if (!navigator.bluetooth) {

        if (bleStatus) {

            bleStatus.textContent =
                "BLE NOT SUPPORTED";

        }

        return;

    }

    try {

        if (bleStatus) {

            bleStatus.textContent =
                "REQUESTING DEVICE...";

        }


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


        if (bleStatus) {

            bleStatus.textContent =
                "CONNECTING...";

        }


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


        try {

            teleChar =
                await service.getCharacteristic(
                    TELE_CHAR_UUID
                );


            await teleChar.startNotifications();


            teleChar.addEventListener(
                "characteristicvaluechanged",
                onTelemetry
            );


        } catch (error) {

            console.log(
                "Telemetry characteristic unavailable"
            );

        }


        if (bleStatus) {

            bleStatus.textContent =
                "BLE CONNECTED";

            bleStatus.style.color =
                "#4caf50";

        }


        await sendCmd(
            "MODE:" + currentMode
        );


    } catch (error) {

        console.error(
            "BLE CONNECTION ERROR:",
            error
        );


        if (bleStatus) {

            bleStatus.textContent =
                "BLE CONNECTION ERROR";

            bleStatus.style.color =
                "#f44336";

        }

    }

}


/* =====================================================
   BLE DISCONNECTED
===================================================== */

function onDisconnected() {

    cmdChar = null;
    teleChar = null;


    if (bleStatus) {

        bleStatus.textContent =
            "BLE DISCONNECTED";

        bleStatus.style.color =
            "#f44336";

    }


    stopCarUI();

}


/* =====================================================
   TELEMETRY
===================================================== */

function onTelemetry(event) {

    const value =
        new TextDecoder().decode(
            event.target.value
        );


    console.log(
        "ESP32 TELEMETRY:",
        value
    );


    /* -------------------------------------------------
       FRONT DISTANCE
    ------------------------------------------------- */

    const frontMatch =
        value.match(
            /F:(-?\d+)/
        );


    if (frontMatch) {

        frontCm =
            Number(
                frontMatch[1]
            );


        if (frontDistance) {

            frontDistance.textContent =
                frontCm + " cm";

        }

    }


    /* -------------------------------------------------
       REAR DISTANCE
    ------------------------------------------------- */

    const rearMatch =
        value.match(
            /R:(-?\d+)/
        );


    if (rearMatch) {

        rearCm =
            Number(
                rearMatch[1]
            );


        if (rearDistance) {

            rearDistance.textContent =
                rearCm + " cm";

        }

    }


    /* -------------------------------------------------
       GPS
    ------------------------------------------------- */

    const gpsMatch =
        value.match(
            /GPS:(\d)/
        );


    if (gpsMatch && gpsStatus) {

        const connected =
            gpsMatch[1] === "1";


        gpsStatus.textContent =
            connected
                ? "GPS CONNECTED"
                : "GPS NOT CONNECTED";


        gpsStatus.style.color =
            connected
                ? "#4caf50"
                : "#f44336";

    }


    /* -------------------------------------------------
       LATITUDE
    ------------------------------------------------- */

    const latMatch =
        value.match(
            /LAT:([-0-9.]+)/
        );


    /* -------------------------------------------------
       LONGITUDE
    ------------------------------------------------- */

    const lonMatch =
        value.match(
            /LON:([-0-9.]+)/
        );


    if (
        latMatch &&
        lonMatch &&
        gpsCoords
    ) {

        gpsCoords.textContent =
            latMatch[1] +
            ", " +
            lonMatch[1];

    }


    /* -------------------------------------------------
       GSM
    ------------------------------------------------- */

    const gsmMatch =
        value.match(
            /GSM:(\d)/
        );


    if (
        gsmMatch &&
        gsmStatus
    ) {

        const connected =
            gsmMatch[1] === "1";


        gsmStatus.textContent =
            connected
                ? "GSM CONNECTED"
                : "GSM NOT CONNECTED";


        gsmStatus.style.color =
            connected
                ? "#4caf50"
                : "#f44336";

    }


    /* -------------------------------------------------
       SMS
    ------------------------------------------------- */

    const smsMatch =
        value.match(
            /SMS:(\d)/
        );


    if (
        smsMatch &&
        smsStatus
    ) {

        smsStatus.textContent =
            "SMS STATUS: " +
            smsMatch[1];

    }


    checkObstacle();

}


/* =====================================================
   OBSTACLE SAFETY
===================================================== */

function checkObstacle() {

    /* -------------------------------------------------
       FRONT
    ------------------------------------------------- */

    if (
        forwardBtn &&
        forwardBtn.classList.contains("active") &&
        frontCm <= OBSTACLE_LIMIT
    ) {

        obstacleStopping = true;


        if (warningText) {

            warningText.textContent =
                "FRONT OBSTACLE: " +
                frontCm +
                " CM";

        }


        if (obstacleWarning) {

            obstacleWarning.classList.add(
                "active"
            );

        }


        forwardBtn.classList.remove(
            "active"
        );


        sendCmd("S");

        updateSpeed(0);

        return;

    }


    /* -------------------------------------------------
       REAR
    ------------------------------------------------- */

    if (
        reverseBtn &&
        reverseBtn.classList.contains("active") &&
        rearCm <= OBSTACLE_LIMIT
    ) {

        obstacleStopping = true;


        if (warningText) {

            warningText.textContent =
                "REAR OBSTACLE: " +
                rearCm +
                " CM";

        }


        if (obstacleWarning) {

            obstacleWarning.classList.add(
                "active"
            );

        }


        reverseBtn.classList.remove(
            "active"
        );


        sendCmd("S");

        updateSpeed(0);

        return;

    }


    obstacleStopping = false;


    if (obstacleWarning) {

        obstacleWarning.classList.remove(
            "active"
        );

    }

}


/* =====================================================
   STOP CAR
===================================================== */

function stopCarUI() {

    if (forwardBtn) {

        forwardBtn.classList.remove(
            "active"
        );

    }


    if (reverseBtn) {

        reverseBtn.classList.remove(
            "active"
        );

    }


    sendCmd("S");

    updateSpeed(0);

}


/* =====================================================
   FORWARD
===================================================== */

function startForward() {

    if (
        typeof drowsyPhase !== "undefined" &&
        drowsyPhase !== "NORMAL"
    ) {

        return;

    }


    if (
        frontCm <= OBSTACLE_LIMIT
    ) {

        obstacleStopping = true;


        if (warningText) {

            warningText.textContent =
                "FRONT OBSTACLE: " +
                frontCm +
                " CM";

        }


        if (obstacleWarning) {

            obstacleWarning.classList.add(
                "active"
            );

        }


        sendCmd("S");

        return;

    }


    obstacleStopping = false;


    if (obstacleWarning) {

        obstacleWarning.classList.remove(
            "active"
        );

    }


    forwardBtn.classList.add(
        "active"
    );


    reverseBtn.classList.remove(
        "active"
    );


    sendCmd("F");


    updateSpeed(
        currentMode === "SPORT"
            ? 25
            : 15
    );

}


/* =====================================================
   BACKWARD
===================================================== */

function startReverse() {

    if (
        typeof drowsyPhase !== "undefined" &&
        drowsyPhase !== "NORMAL"
    ) {

        return;

    }


    if (
        rearCm <= OBSTACLE_LIMIT
    ) {

        obstacleStopping = true;


        if (warningText) {

            warningText.textContent =
                "REAR OBSTACLE: " +
                rearCm +
                " CM";

        }


        if (obstacleWarning) {

            obstacleWarning.classList.add(
                "active"
            );

        }


        sendCmd("S");

        return;

    }


    obstacleStopping = false;


    if (obstacleWarning) {

        obstacleWarning.classList.remove(
            "active"
        );

    }


    reverseBtn.classList.add(
        "active"
    );


    forwardBtn.classList.remove(
        "active"
    );


    sendCmd("B");


    updateSpeed(
        currentMode === "SPORT"
            ? 22
            : 13
    );

}


/* =====================================================
   DRIVE BUTTONS
===================================================== */

if (forwardBtn) {

    forwardBtn.addEventListener(
        "pointerdown",
        startForward
    );


    forwardBtn.addEventListener(
        "pointerup",
        stopCarUI
    );


    forwardBtn.addEventListener(
        "pointercancel",
        stopCarUI
    );

}


if (reverseBtn) {

    reverseBtn.addEventListener(
        "pointerdown",
        startReverse
    );


    reverseBtn.addEventListener(
        "pointerup",
        stopCarUI
    );


    reverseBtn.addEventListener(
        "pointercancel",
        stopCarUI
    );

}


/* =====================================================
   STEERING LEFT
===================================================== */

if (leftBtn) {

    leftBtn.addEventListener(
        "pointerdown",
        function () {

            if (
                typeof drowsyPhase !== "undefined" &&
                drowsyPhase !== "NORMAL"
            ) {

                return;

            }


            leftBtn.classList.add(
                "active"
            );


            rightBtn.classList.remove(
                "active"
            );


            sendCmd(
                "L:-70"
            );

        }
    );


    leftBtn.addEventListener(
        "pointerup",
        function () {

            leftBtn.classList.remove(
                "active"
            );


            sendCmd(
                "L:0"
            );

        }
    );


    leftBtn.addEventListener(
        "pointercancel",
        function () {

            leftBtn.classList.remove(
                "active"
            );


            sendCmd(
                "L:0"
            );

        }
    );

}


/* =====================================================
   STEERING RIGHT
===================================================== */

if (rightBtn) {

    rightBtn.addEventListener(
        "pointerdown",
        function () {

            if (
                typeof drowsyPhase !== "undefined" &&
                drowsyPhase !== "NORMAL"
            ) {

                return;

            }


            rightBtn.classList.add(
                "active"
            );


            leftBtn.classList.remove(
                "active"
            );


            sendCmd(
                "L:70"
            );

        }
    );


    rightBtn.addEventListener(
        "pointerup",
        function () {

            rightBtn.classList.remove(
                "active"
            );


            sendCmd(
                "L:0"
            );

        }
    );


    rightBtn.addEventListener(
        "pointercancel",
        function () {

            rightBtn.classList.remove(
                "active"
            );


            sendCmd(
                "L:0"
            );

        }
    );

}


/* =====================================================
   SPEED / RPM
===================================================== */

function updateSpeed(speed) {

    if (speedNum) {

        speedNum.textContent =
            Math.round(speed);

    }


    if (rpmNum) {

        rpmNum.textContent =
            Math.round(
                speed * 140
            );

    }

}


/* =====================================================
   MODE
===================================================== */

function setMode(mode) {

    currentMode =
        mode;


    sendCmd(
        "MODE:" + mode
    );


    if (modeText) {

        modeText.textContent =
            mode;

    }


    if (
        forwardBtn &&
        reverseBtn
    ) {

        if (
            mode === "SPORT"
        ) {

            forwardBtn.classList.add(
                "sport"
            );

            reverseBtn.classList.add(
                "sport"
            );

        } else {

            forwardBtn.classList.remove(
                "sport"
            );

            reverseBtn.classList.remove(
                "sport"
            );

        }

    }

}


/* =====================================================
   GPS REQUEST
===================================================== */

function requestGPS() {

    sendCmd(
        "GPS?"
    );

}


/* =====================================================
   SMS
===================================================== */

function sendSMS(message) {

    if (!message) {

        return;

    }


    sendCmd(
        "MSG:" + message
    );

}


/* =====================================================
   DROWSINESS UI
===================================================== */

function setDrowsyUI() {

    if (drowsyState) {

        drowsyState.textContent =
            "SLEEPY DRIVER";


        drowsyState.style.color =
            "#f44336";

    }


    if (cameraPanel) {

        cameraPanel.classList.add(
            "drowsy"
        );

    }


    if (drowsyWarning) {

        drowsyWarning.classList.add(
            "active"
        );

    }


    if (forwardBtn) {

        forwardBtn.classList.remove(
            "active"
        );

    }


    if (reverseBtn) {

        reverseBtn.classList.remove(
            "active"
        );

    }


    updateSpeed(0);

}


/* =====================================================
   NORMAL DRIVER UI
===================================================== */

function clearDrowsyUI() {

    if (drowsyState) {

        drowsyState.textContent =
            "DRIVER NORMAL";


        drowsyState.style.color =
            "#4caf50";

    }


    if (cameraPanel) {

        cameraPanel.classList.remove(
            "drowsy"
        );

    }


    if (drowsyWarning) {

        drowsyWarning.classList.remove(
            "active"
        );

    }


    if (forwardBtn) {

        forwardBtn.classList.remove(
            "active"
        );

    }


    if (reverseBtn) {

        reverseBtn.classList.remove(
            "active"
        );

    }


    updateSpeed(0);

}
/* =====================================================
   DROWSINESS VARIABLES
===================================================== */

let eyesClosedSince = 0;

let drowsyPhase = "NORMAL";

const EYE_WARN_MS = 2000;

const EYE_ALERT_MS = 10000;


/* =====================================================
   PROCESS EYE STATE
===================================================== */

function processEyeState(eyesClosed) {

    if (eyesClosed) {

        if (eyeState) {
            eyeState.textContent =
                "EYES: CLOSED";
        }


        if (eyesClosedSince === 0) {

            eyesClosedSince =
                Date.now();

        }


        const elapsed =
            Date.now() -
            eyesClosedSince;


        /* =============================================
           SLEEPY WARNING - 2 SECONDS
        ============================================= */

        if (
            elapsed >= EYE_WARN_MS &&
            elapsed < EYE_ALERT_MS
        ) {

            if (
                drowsyPhase === "NORMAL"
            ) {

                drowsyPhase =
                    "WARN";


                setDrowsyUI();


                sendCmd(
                    "EYE:WARN"
                );


                stopCarUI();

            }

        }


        /* =============================================
           SLEEPY ALERT - 10 SECONDS
        ============================================= */

        if (
            elapsed >= EYE_ALERT_MS
        ) {

            if (
                drowsyPhase !== "ALERT"
            ) {

                drowsyPhase =
                    "ALERT";


                setDrowsyUI();


                sendCmd(
                    "EYE:ALERT"
                );


                stopCarUI();

            }

        }


    } else {

        if (eyeState) {

            eyeState.textContent =
                "EYES: OPEN";

        }


        eyesClosedSince =
            0;


        /* =============================================
           DRIVER NORMAL AGAIN
        ============================================= */

        if (
            drowsyPhase !== "NORMAL"
        ) {

            drowsyPhase =
                "NORMAL";


            clearDrowsyUI();


            sendCmd(
                "EYE:CLEAR"
            );

        }

    }

}


/* =====================================================
   DROWSY DRIVER UI
===================================================== */

function setDrowsyUI() {

    if (drowsyState) {

        drowsyState.textContent =
            "SLEEPY DRIVER";


        drowsyState.style.color =
            "#f44336";

    }


    if (cameraPanel) {

        cameraPanel.classList.add(
            "drowsy"
        );

    }


    if (drowsyWarning) {

        drowsyWarning.classList.add(
            "active"
        );

    }


    /* ---------------------------------------------
       STOP DRIVE BUTTONS
    --------------------------------------------- */

    if (forwardBtn) {

        forwardBtn.classList.remove(
            "active"
        );

    }


    if (reverseBtn) {

        reverseBtn.classList.remove(
            "active"
        );

    }


    /* ---------------------------------------------
       STOP SPEED / RPM DISPLAY
    --------------------------------------------- */

    updateSpeed(0);

}


/* =====================================================
   DRIVER NORMAL UI
===================================================== */

function clearDrowsyUI() {

    if (drowsyState) {

        drowsyState.textContent =
            "DRIVER NORMAL";


        drowsyState.style.color =
            "#4caf50";

    }


    if (cameraPanel) {

        cameraPanel.classList.remove(
            "drowsy"
        );

    }


    if (drowsyWarning) {

        drowsyWarning.classList.remove(
            "active"
        );

    }


    if (forwardBtn) {

        forwardBtn.classList.remove(
            "active"
        );

    }


    if (reverseBtn) {

        reverseBtn.classList.remove(
            "active"
        );

    }


    updateSpeed(0);

}


/* =====================================================
   CAMERA VARIABLES
===================================================== */

let cameraStream = null;

let cameraRunning = false;

let faceMesh = null;


/* =====================================================
   START CAMERA
===================================================== */

async function startCamera() {

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            if (cameraState) {

                cameraState.textContent =
                    "CAMERA NOT SUPPORTED";

                cameraState.style.color =
                    "#f44336";

            }

            return;

        }


        if (cameraState) {

            cameraState.textContent =
                "STARTING CAMERA...";

            cameraState.style.color =
                "#ffffff";

        }


        cameraStream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video: {

                        facingMode:
                            "user",

                        width: {
                            ideal: 640
                        },

                        height: {
                            ideal: 480
                        }

                    },

                    audio: false

                });


        if (driverCamera) {

            driverCamera.srcObject =
                cameraStream;


            await driverCamera.play();

        }


        cameraRunning =
            true;


        if (cameraState) {

            cameraState.textContent =
                "CAMERA ACTIVE";

            cameraState.style.color =
                "#4caf50";

        }


        setupFaceMesh();


    } catch (error) {

        console.error(
            "CAMERA ERROR:",
            error
        );


        if (cameraState) {

            cameraState.textContent =
                "CAMERA ERROR";

            cameraState.style.color =
                "#f44336";

        }

    }

}


/* =====================================================
   STOP CAMERA
===================================================== */

function stopCamera() {

    cameraRunning =
        false;


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                function(track) {

                    track.stop();

                }
            );


        cameraStream =
            null;

    }


    if (driverCamera) {

        driverCamera.srcObject =
            null;

    }


    if (cameraState) {

        cameraState.textContent =
            "CAMERA OFF";

        cameraState.style.color =
            "#f44336";

    }


    if (eyeState) {

        eyeState.textContent =
            "EYES: --";

    }


    eyesClosedSince =
        0;


    drowsyPhase =
        "NORMAL";


    clearDrowsyUI();


    sendCmd(
        "EYE:CLEAR"
    );

}


/* =====================================================
   MEDIAPIPE FACE MESH
===================================================== */

function setupFaceMesh() {

    if (
        typeof FaceMesh ===
        "undefined"
    ) {

        console.error(
            "MediaPipe FaceMesh not loaded"
        );


        if (cameraState) {

            cameraState.textContent =
                "FACE MESH ERROR";

            cameraState.style.color =
                "#f44336";

        }

        return;

    }


    faceMesh =
        new FaceMesh({

            locateFile:
                function(file) {

                    return (
                        "https://cdn.jsdelivr.net/npm/" +
                        "@mediapipe/face_mesh/" +
                        file
                    );

                }

        });


    faceMesh.setOptions({

        maxNumFaces:
            1,

        refineLandmarks:
            true,

        minDetectionConfidence:
            0.5,

        minTrackingConfidence:
            0.5

    });


    faceMesh.onResults(
        handleFaceResults
    );


    runFaceDetection();

}


/* =====================================================
   FACE DETECTION LOOP
===================================================== */

async function runFaceDetection() {

    if (
        !cameraRunning ||
        !faceMesh
    ) {

        return;

    }


    try {

        if (
            driverCamera &&
            driverCamera.readyState >= 2
        ) {

            await faceMesh.send({

                image:
                    driverCamera

            });

        }

    } catch (error) {

        console.error(
            "FACE DETECTION ERROR:",
            error
        );

    }


    if (cameraRunning) {

        requestAnimationFrame(
            runFaceDetection
        );

    }

}


/* =====================================================
   LANDMARK DISTANCE
===================================================== */

function distance(a, b) {

    const dx =
        a.x - b.x;

    const dy =
        a.y - b.y;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


/* =====================================================
   EYE ASPECT RATIO
===================================================== */

function calculateEAR(
    landmarks,
    points
) {

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


    const vertical1 =
        distance(
            p2,
            p6
        );


    const vertical2 =
        distance(
            p3,
            p5
        );


    const horizontal =
        distance(
            p1,
            p4
        );


    if (
        horizontal === 0
    ) {

        return 1;

    }


    return (
        vertical1 +
        vertical2
    ) /
    (
        2 *
        horizontal
    );

}


/* =====================================================
   FACE RESULTS
===================================================== */

function handleFaceResults(
    results
) {

    if (
        !results.multiFaceLandmarks ||
        !results.multiFaceLandmarks.length
    ) {

        if (eyeState) {

            eyeState.textContent =
                "FACE NOT DETECTED";

        }

        return;

    }


    const landmarks =
        results.multiFaceLandmarks[0];


    const leftEAR =
        calculateEAR(
            landmarks,
            [
                33,
                160,
                158,
                133,
                153,
                144
            ]
        );


    const rightEAR =
        calculateEAR(
            landmarks,
            [
                362,
                385,
                387,
                263,
                373,
                380
            ]
        );


    const ear =
        (
            leftEAR +
            rightEAR
        ) / 2;


    /*
     * Lower EAR means
     * more closed eyes.
     */

    const eyesClosed =
        ear < 0.22;


    processEyeState(
        eyesClosed
    );

}


/* =====================================================
   CAMERA BUTTON
===================================================== */

if (cameraBtn) {

    cameraBtn.addEventListener(
        "click",
        function() {

            if (
                cameraRunning
            ) {

                stopCamera();

            } else {

                startCamera();

            }

        }
    );

}


/* =====================================================
   BLE CONNECT BUTTON
===================================================== */

if (connectBtn) {

    connectBtn.addEventListener(
        "click",
        function() {

            connectBLE();

        }
    );

}


/* =====================================================
   INITIAL DASHBOARD STATE
===================================================== */

updateSpeed(0);


if (drowsyState) {

    drowsyState.textContent =
        "DRIVER NORMAL";

    drowsyState.style.color =
        "#4caf50";

}


if (eyeState) {

    eyeState.textContent =
        "EYES: --";

}


if (cameraState) {

    cameraState.textContent =
        "CAMERA NOT STARTED";

}


console.log(
    "RC CAR DASHBOARD READY"
);

