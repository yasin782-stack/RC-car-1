const video = document.getElementById("camera");
const startButton = document.getElementById("startCamera");
const switchButton = document.getElementById("switchCamera");
const statusText = document.getElementById("status");

let currentStream = null;
let currentCamera = "user";


// ================================
// START CAMERA
// ================================

async function startCamera() {

    statusText.textContent =
        "Requesting camera...";

    try {

        // Stop previous camera
        if (currentStream) {

            currentStream
                .getTracks()
                .forEach(track => track.stop());

        }


        const stream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: {
                        exact: currentCamera
                    }
                },

                audio: false

            });


        currentStream = stream;

        video.srcObject = stream;

        statusText.textContent =
            currentCamera === "user"
                ? "✅ FRONT CAMERA"
                : "✅ BACK CAMERA";

        startButton.textContent =
            "Camera Running";


    } catch (error) {

        console.error(error);

        statusText.innerHTML =
            "❌ Camera Error<br>" +
            error.name + "<br>" +
            error.message;

    }
}


// ================================
// START BUTTON
// ================================

startButton.addEventListener(
    "click",
    startCamera
);


// ================================
// SWITCH CAMERA
// ================================

switchButton.addEventListener(
    "click",
    async () => {

        if (!currentStream) {

            statusText.textContent =
                "Start the camera first.";

            return;
        }


        if (currentCamera === "user") {

            currentCamera = "environment";

        } else {

            currentCamera = "user";

        }


        await startCamera();

    }
);
