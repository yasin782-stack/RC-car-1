const video = document.getElementById("camera");
const button = document.getElementById("startCamera");
const statusText = document.getElementById("status");


// ================================
// CAMERA DIAGNOSTIC
// ================================

async function startCamera() {

    statusText.innerHTML = "Requesting front camera...";

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {
                        exact: "user"
                    }
                },
                audio: false
            });

        video.srcObject = stream;

        statusText.innerHTML =
            "✅ FRONT CAMERA WORKING";

        button.textContent = "Front Camera Running";
        button.disabled = true;

    } catch (error) {

        console.error(error);

        statusText.innerHTML =
            "❌ Camera Error<br>" +
            error.name + "<br>" +
            error.message;

    }
}


    // Check HTTPS
    if (!window.isSecureContext) {

        statusText.innerHTML =
            "❌ NOT SECURE<br>" +
            "This page must use HTTPS.";

        return;
    }


    // Check browser camera API
    if (!navigator.mediaDevices) {

        statusText.innerHTML =
            "❌ Camera API unavailable<br>" +
            "Your browser may not support camera access.";

        return;
    }


    if (!navigator.mediaDevices.getUserMedia) {

        statusText.innerHTML =
            "❌ getUserMedia unavailable";

        return;
    }


    statusText.innerHTML =
        "✅ HTTPS detected<br>" +
        "✅ Camera API detected<br>" +
        "Requesting permission...";


    try {

       const stream =
    await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user"
        },
        audio: false
    }); 


        video.srcObject = stream;

        statusText.innerHTML =
            "✅ CAMERA WORKING!";

        button.textContent =
            "Camera Running";

        button.disabled = true;


        console.log(
            "Camera stream:",
            stream
        );


        // Show camera information

        const tracks =
            stream.getVideoTracks();

        if (tracks.length > 0) {

            console.log(
                "Camera:",
                tracks[0].label
            );

            console.log(
                "Camera settings:",
                tracks[0].getSettings()
            );
        }


    } catch (error) {

        console.error(
            "CAMERA ERROR:",
            error
        );


        statusText.innerHTML =
            "❌ CAMERA ERROR<br><br>" +
            "<b>Name:</b> " +
            error.name +
            "<br>" +
            "<b>Message:</b> " +
            error.message;


        alert(
            "Camera error\n\n" +
            "Name: " +
            error.name +
            "\n\n" +
            "Message: " +
            error.message
        );

    }

}


// ================================
// BUTTON
// ================================

button.addEventListener(
    "click",
    startCamera
);


// ================================
// INITIAL DIAGNOSTICS
// ================================

console.log(
    "Secure context:",
    window.isSecureContext
);

console.log(
    "MediaDevices:",
    navigator.mediaDevices
);

console.log(
    "getUserMedia:",
    navigator.mediaDevices
        ? navigator.mediaDevices.getUserMedia
        : "Unavailable"
);


// ================================
// SPEED GAUGE
// ================================

const speedText =
    document.getElementById("speed");

const needle =
    document.getElementById("needle");


function setSpeed(speed) {

    speed =
        Math.max(
            0,
            Math.min(180, speed)
        );


    speedText.textContent =
        Math.round(speed);


    const angle =
        -120 +
        (speed / 180) * 240;


    needle.style.transform =
        `rotate(${angle}deg)`;

}


setSpeed(0);
