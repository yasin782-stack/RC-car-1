
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    min-height: 100vh;
    background: #050505;
    color: white;
    font-family: Arial, sans-serif;
    text-align: center;
}

.container {
    width: 100%;
    max-width: 700px;
    margin: auto;
    padding: 20px;
}

h1 {
    margin-bottom: 10px;
    font-size: 28px;
}

.status {
    margin: 10px;
    color: #aaa;
}

button {
    padding: 12px 22px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    margin: 10px;
}

.camera-container {
    width: 100%;
    max-width: 500px;
    margin: 20px auto;
    background: #111;
    border-radius: 15px;
    overflow: hidden;
    border: 2px solid #333;
}

video {
    width: 100%;
    display: block;
}

canvas {
    display: none;
}

.dashboard {
    margin-top: 30px;
    display: flex;
    justify-content: center;
}

.gauge {
    position: relative;
    width: 300px;
    height: 300px;
    border-radius: 50%;

    background:
        radial-gradient(circle,
            #151515 0%,
            #151515 58%,
            #222 59%,
            #050505 70%);

    border: 8px solid #333;

    box-shadow:
        0 0 20px rgba(255,255,255,0.1),
        inset 0 0 30px rgba(255,255,255,0.05);
}

.gauge::before {
    content: "";

    position: absolute;

    width: 230px;
    height: 230px;

    left: 27px;
    top: 27px;

    border-radius: 50%;

    border: 3px solid #444;
}

.gauge-title {
    position: absolute;

    width: 100%;

    top: 65px;

    font-size: 18px;
    letter-spacing: 3px;

    color: #aaa;
}

.speed {
    position: absolute;

    width: 100%;

    top: 105px;

    font-size: 55px;
    font-weight: bold;
}

.unit {
    position: absolute;

    width: 100%;

    top: 170px;

    font-size: 15px;

    color: #aaa;
}

.needle {
    position: absolute;

    width: 4px;
    height: 105px;

    background: white;

    left: 148px;
    top: 45px;

    transform-origin: 50% 105px;

    transform: rotate(-120deg);

    border-radius: 5px;

    transition: transform 0.2s ease;
}

.center-dot {
    position: absolute;

    width: 18px;
    height: 18px;

    background: white;

    border-radius: 50%;

    left: 133px;
    top: 142px;
}

.info {
    margin-top: 25px;

    color: #777;

    font-size: 13px;
}
