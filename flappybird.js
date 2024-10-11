let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 37;
let birdHeight = 27;
let birdX = boardWidth / 2.5;
let birdY = boardHeight / 2;
let birdImg;

let bird = {
    x: birdX,
    y: birdY,
    width: birdWidth,
    height: birdHeight,
    rotation: 0 // New property for bird rotation
};

//pipes
let pipeArray = [];
let pipeWidth = 66;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//power-up
let powerUpArray = [];
let powerUpWidth = 30;
let powerUpHeight = 30;
let powerUpX = boardWidth;
let powerUpY;
let powerUpImg;
let powerUpCollected = false;

//physics
let velocityX = -2;
let velocityY = 0;
let gravity = 0.4;

let gameOver = false;
let score = 0;
let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;
let birdDead = false;
let birdFallSpeed = 0;
let groundHeight = 400; // Adjust based on your ground height

// Day and night backgrounds
let dayBackgroundImg;
let nightBackgroundImg;
let isDay = true;
let backgroundSwitchTime;
let lastSwitchTime = 0;

let transitionAlpha = 0;
let fadingIn = true;

let birdFrames = [
    "U.png", // Up flapping
    "N.png", // Neutral position
    "D.png"  // Down flapping
];
let birdImages = [];
let currentBirdFrame = 0; // Index for current frame
let birdFrameInterval = 5; // Number of frames to wait before switching to next frame
let frameCount = 0; // Frame count for animation
let gameStarted = false; // New variable to track if the game has started
let bobbingSpeed = 0.2; // Adjust speed for bobbing effect
let bobbingHeight = 5; // Adjust height for bobbing effect
let bobbingDirection = 1; // 1 for going up, -1 for going down

// Play button dimensions and position
let playButtonX = (boardWidth - 100) / 2; // Adjust X position for center alignment
let playButtonY = boardHeight / 1.6; // Position as per your layout
let playWidth = 100; // Width of the play image
let playHeight = 50; // Height of the play image

//title image for pregame state
let titleImg; // Add this for the title image

// Function to load images and return a promise
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
    });
}

// Load sounds
const passSound = new Audio('Pass.mp3');
const dieSound = new Audio('die.mp3');
const backgroundMusic = new Audio('bgmusic.mp3'); // Add your background music file

// Function to preload audio
function preloadAudio(audio) {
    return new Promise((resolve) => {
        audio.addEventListener('canplaythrough', () => resolve());
        audio.load(); // Load the audio file
    });
}

async function loadBirdImages() {
    for (const src of birdFrames) {
        const img = await loadImage(src);
        birdImages.push(img);
    }
}

window.onload = async function () {
    await loadBirdImages();
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    // Load images
    birdImg = await loadImage("./flappybird.png");
    topPipeImg = await loadImage("./toppipe.png");
    bottomPipeImg = await loadImage("./bottompipe.png");
    powerUpImg = await loadImage("star.png");
    dayBackgroundImg = await loadImage("flappybirdbg.png");
    nightBackgroundImg = await loadImage("images.png");
    titleImg = await loadImage("title.png"); // Load the title image
    playImg = await loadImage("play.png"); // Load the play image
    gameOverImg = await loadImage("over.png"); // Load the game over image
    
    // Preload audio files
    await preloadAudio(passSound);
    await preloadAudio(dieSound);
    // Preload background music
    await preloadAudio(backgroundMusic);

    // Initialize background switch time
    lastSwitchTime = Date.now();
    setBackgroundSwitchTime();

    // Start background music and loop it
    backgroundMusic.loop = true;
    backgroundMusic.play();

    // Add touch event listener for the play button
    board.addEventListener("touchstart", function(event) {
        const touchX = event.touches[0].clientX - board.getBoundingClientRect().left;
        const touchY = event.touches[0].clientY - board.getBoundingClientRect().top;

        if (
            touchX >= playButtonX && 
            touchX <= playButtonX + playWidth && 
            touchY >= playButtonY && 
            touchY <= playButtonY + playHeight
        ) {
            startGame();
        }
    });
    
    requestAnimationFrame(update);
    setInterval(placePipes, 1500);
    document.addEventListener("keydown", moveBird);
    board.addEventListener("touchstart", moveBird);

    // Start background music on user interaction
    document.addEventListener("keydown", startGame);
    board.addEventListener("touchstart", startGame);
}

function startGame() {
    if (!backgroundMusic.paused) return; // Prevent multiple plays
    backgroundMusic.loop = true;
    backgroundMusic.play();

    gameOver = false; // Reset game over state
    score = 0; // Reset score
}

// Set the background switch time based on the duration of day and night
function setBackgroundSwitchTime() {
    backgroundSwitchTime = isDay ? 60000 : 50000;
}

function placePipes() {
    if (gameOver || !gameStarted) {
        return;
    }

    let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    let openingSpace = board.height / 4;

    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(bottomPipe);

    if (Math.random() < 0.2) {
        let powerUpY = randomPipeY + pipeHeight + (openingSpace / 2) - (powerUpHeight / 2);
        let powerUp = {
            img: powerUpImg,
            x: powerUpX,
            y: powerUpY,
            width: powerUpWidth,
            height: powerUpHeight,
            rotation: 0
        };
        powerUpArray.push(powerUp);
    }
}

function update() {
    requestAnimationFrame(update);
    if (gameOver) {
        return;
    }
    context.clearRect(0, 0, board.width, board.height);

    if (!gameStarted) {
        context.clearRect(0, 0, board.width, board.height);

        bird.y += bobbingSpeed * bobbingDirection;

        if (bird.y > birdY + bobbingHeight || bird.y < birdY - bobbingHeight) {
            bobbingDirection *= -1;
        }

        context.drawImage(birdImages[currentBirdFrame], bird.x, bird.y, bird.width, bird.height);

        let titleWidth = 200; // desired width
        let titleHeight = 100; // desired height
        context.drawImage(titleImg, (boardWidth - titleWidth) / 2, boardHeight / 5, titleWidth, titleHeight);


        // Replace the "Tap to Start" text with the play image
        let playWidth = 100; // Set the desired width for the play image
        let playHeight = 50; // Set the desired height for the play image
        context.drawImage(playImg, (boardWidth - playWidth) / 2, boardHeight / 1.6, playWidth, playHeight); // Draw the play image

        return;
    }

    // Check time to switch backgrounds
    if (Date.now() - lastSwitchTime > backgroundSwitchTime) {
        // Start fading out
        fadingIn = false; 
        lastSwitchTime = Date.now(); // Update the last switch time
        setBackgroundSwitchTime(); // Set the new background switch time
    }

    // Fade transition effect
    if (!fadingIn) {
        transitionAlpha += 0.01; // Increase alpha for fading out
        if (transitionAlpha >= 1) {
            transitionAlpha = 1; // Clamp to max
            fadingIn = true; // Start fading in again
            isDay = !isDay; // Toggle day/night after fade out
        }
    } else {
        transitionAlpha -= 0.01; // Decrease alpha for fading in
        if (transitionAlpha <= 0) {
            transitionAlpha = 0; // Clamp to min
        }
    }

    // Draw the background with current alpha
    context.globalAlpha = 1 - transitionAlpha; // Set alpha for the background image
    if (isDay) {
        context.drawImage(dayBackgroundImg, 0, 0, board.width, board.height); // Draw day background
    } else {
        context.drawImage(nightBackgroundImg, 0, 0, board.width, board.height); // Draw night background
    }

    // Now set the alpha for the fade effect (the other image)
    context.globalAlpha = transitionAlpha; // Set global alpha for fade effect
    context.fillStyle = "rgba(255, 255, 255, 0.5)"; // Change this to white or whatever color you want for the fade
    context.fillRect(0, 0, board.width, board.height); // Fade effect over the entire canvas

    context.globalAlpha = 1; // Reset global alpha to default

    // Draw the rest of the game elements (bird, pipes, power-ups, etc.)
    drawGameElements();
}

    // Function to draw game elements
    // Draw the rest of the game elements (bird, pipes, power-ups, etc.)
    let starsCollected = 0; // Variable to track collected stars
    let scaleFactor = 1; // Variable for scaling animation
    let scalingDown = false; // Flag to control the scaling animation

     // Load the star icon
     let starIcon = new Image();
     starIcon.src = "star.png"; // Path to your star icon
     function drawGameElements() {
    frameCount++;
    if (frameCount >= birdFrameInterval) {
        currentBirdFrame = (currentBirdFrame + 1) % birdImages.length; // Loop through frames
        frameCount = 0; // Reset frame count
    }
    // Bird physics
    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0); // Apply gravity to current bird.y, limit the bird.y to top of the canvas

    // Check if the bird has fallen below the board
    if (bird.y + bird.height >= boardHeight) {
        gameOver = true; // Set game over if the bird hits the ground
        dieSound.play(); // Play game over sound on collision
        backgroundMusic.pause(); // Pause the background music
        backgroundMusic.currentTime = 0; // Reset the music to the beginning
    }

    // Scaling animation for when a star is collected
    if (scalingDown) {
        scaleFactor += 0.05; // Increase scale factor for zoom effect
        if (scaleFactor >= 1.5) {
            scalingDown = false; // Stop scaling after reaching max
            scaleFactor = 1; // Reset scale factor
            // Optionally, add a small delay before stopping sound
            setTimeout(() => {
                passSound.play(); // Play sound when collecting a power-up
            }, 100); // Delay sound playback
        }
    }
    

    // Rotate bird based on its velocity
    bird.rotation = Math.min(Math.max(bird.rotation + velocityY, -7), 7); // Limit rotation between -7 and 7 degrees

    // Draw the bird with rotation and scaling
    context.save(); // Save the current drawing state
    context.translate(bird.x + bird.width / 2, bird.y + bird.height / 2); // Move origin to the center of the bird
    context.scale(scaleFactor, scaleFactor); // Apply the scale
    context.rotate(bird.rotation * Math.PI / 180); // Convert degrees to radians
    context.drawImage(birdImages[currentBirdFrame], -bird.width / 2, -bird.height / 2, bird.width, bird.height); // Draw the bird centered
    context.restore();  // Restore the previous drawing state

// Draw pipes
for (let i = 0; i < pipeArray.length; i++) {
    let pipe = pipeArray[i];
    pipe.x += velocityX;
    context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

    if (!pipe.passed && bird.x + bird.width / 2 > pipe.x + pipe.width / 2) {
        score += 0.5; // 0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
        pipe.passed = true; // Mark the pipe as passed
    }

    if (detectCollision(bird, pipe)) {
        gameOver = true;
        dieSound.play(); // Play game over sound on collision
        backgroundMusic.pause(); // Pause the background music on collision
        backgroundMusic.currentTime = 0; // Reset the music to the beginning
    }
}

// Update and draw power-ups
for (let i = 0; i < powerUpArray.length; i++) {
    let powerUp = powerUpArray[i];
    powerUp.x += velocityX;

    // Update the rotation for the power-up
    powerUp.rotation += 2; // Adjust the rotation speed as needed

    // Draw the power-up with rotation
    context.save(); // Save the current drawing state
    context.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2); // Move origin to the center of the power-up
    context.rotate(powerUp.rotation * Math.PI / 180); // Convert degrees to radians
    context.drawImage(powerUp.img, -powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height); // Draw the power-up centered
    context.restore(); // Restore the previous drawing state

    // Check for collision with the bird
    if (detectCollision(bird, powerUp)) {
        powerUpCollected = true;
        powerUpArray.splice(i, 1);
        starsCollected++; // Increment star collection count
        scalingDown = true; // Start scaling animation
        passSound.play(); // Play sound when collecting a power-up
    }
}

    // Clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift(); // Removes first element from the array
    }

    // Clear off-screen power-ups
    while (powerUpArray.length > 0 && powerUpArray[0].x < -powerUpWidth) {
        powerUpArray.shift(); // Removes first element from the array
    }

    // Draw score
    context.fillStyle = "Black";
    context.font = "40px A"; // Font size adjusted
    context.fillText("" + Math.floor(score), boardWidth / 2, 130); // Draw score

    // Draw high score
    context.fillStyle = "Black";
    context.font = "15px A"; // Font size adjusted
    context.textAlign = "center"; // Center the text
    context.fillText("Highscore: " + highScore, boardWidth / 2, 40); // Draw high score

    // Draw star icon and number of stars collected in the top-left corner
let iconSize = 30; // Adjust the size of the star icon if necessary
context.drawImage(starIcon, 20, 20, iconSize, iconSize); // Draw star icon at (20, 20)
context.fillStyle = "Black";
context.font = "20px A"; // Adjust font size as needed
context.fillText(starsCollected, 60, 42); // Display the star count next to the icon


// Draw game over state
if (gameOver) {
    context.fillStyle = "rgba(255, 0, 0, 0.5)"; // Semi-transparent red overlay
    context.fillRect(0, 0, boardWidth, boardHeight); // Overlay
    context.fillStyle = "black";
    context.textAlign = "center"; 
    context.font = "40px A"; 

    // Draw "Game Over" image instead of text
    context.drawImage(gameOverImg, (boardWidth - 200) / 2, boardHeight / 2 - 150, 200, 100); // Adjust size and position as needed

    context.fillStyle = "white";
    context.font = "20px A"; 
    context.fillText("Score: " + Math.floor(score), boardWidth / 2, boardHeight / 2 - 15);
    let starIconSize = 30; 
    context.drawImage(starIcon, boardWidth / 2 - 24, boardHeight / 2 + 0, starIconSize, starIconSize); 
    context.fillText(starsCollected, boardWidth / 2 - -16, boardHeight / 2 +25); 
    context.fillText("Highscore: " + highScore, boardWidth / 2, boardHeight / 2 + 60); 
    // Draw "Tap to Play" image instead of text
    context.drawImage(playImg, (boardWidth - playWidth) / 2, boardHeight / 2 + 90, playWidth, playHeight); // Adjust position and size as needed
    return; // Exit update function
}
    // Check for high score and update it
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore); // Save the new high score
    }
}


function checkCollision() {
    // Check for collision with ground
    if (bird.y + bird.height >= groundHeight) {
        setGameOver();
    }

    // Check for collision with pipes
    for (let pipe of pipeArray) {
        if (
            bird.x + bird.width > pipe.x &&
            bird.x < pipe.x + pipe.width &&
            (bird.y < pipe.y + pipe.height || bird.y + bird.height > pipe.y + pipe.height + boardHeight / 4)
        ) {
            setGameOver();
        }
    }
}

function setGameOver() {
    gameOver = true;
    dieSound.play();
    backgroundMusic.pause(); // Pause the background music
    backgroundMusic.currentTime = 0; // Optionally reset it for the next game
}

// Function to restart the game state only on player request
function restartGame() {
    if (!gameOver) return; // Ensure the game is over before restarting
    // Reset game state variables for a new round
    score = 0; // Reset score
    starsCollected = 0; // Reset collected stars count
    pipeArray = []; // Clear pipes
    powerUpArray = []; // Clear power-ups
    bird.y = birdY; // Reset bird position
    bird.rotation = 0; // Reset bird rotation
    velocityY = 0; // Reset bird's velocity
    gameOver = false; // Reset game over state
    gameStarted = false; // Reset game started state

    // Reset background transition settings
    isDay = true;
    lastSwitchTime = Date.now();
    transitionAlpha = 0;
    fadingIn = true;
    setBackgroundSwitchTime();

    // Reset audio if needed
    backgroundMusic.currentTime = 0; 
    backgroundMusic.play(); // Play background music again

    // Optionally, you can call startGame to set everything up
    startGame();
}

// Function to start the game and reset necessary variables
// Start the game only if it's not already started
function startGame() {
    if (gameStarted) return; // Prevent starting if the game has already started
    gameStarted = true; // Set the game as started
    velocityY = -6; // Bird will jump on the first tap

    // Reset necessary variables for a new game round
    bird.y = birdY; // Reset bird position to its initial Y position
    velocityY = 0; // Reset bird's velocity for the new round
}


// Add event listeners for restarting the game
document.addEventListener("keydown", function(event) {
    if (gameOver) {
        restartGame(); // Restart the game on key press
    } else {
        moveBird(event); // Continue moving the bird on key press
    }
});

board.addEventListener("touchstart", function() {
    if (gameOver) {
        restartGame(); // Restart the game on touch
    } else {
        moveBird(); // Continue moving the bird on touch
    }
});


function setVolume(value) {
    backgroundMusic.volume = 1.0; // Set background music volume (0.0 to 1.0)
    passSound.volume = 1.0; // Set pass sound volume
    dieSound.volume = 1.0; // Set die sound volume
}

// Move bird
function moveBird(event) {
    if (gameOver) {
        restartGame(); // Restart the game on key press or touch
        return; // Prevent any action if the game is over
    }

    if (gameStarted) {
        velocityY += gravity;
        bird.y = Math.max(bird.y + velocityY, 0); // Apply gravity to the bird's y position
    }
    
    if (!gameStarted) {
        gameStarted = true; // Set the game as started when the player taps the screen
        velocityY = -6; // Bird will jump on the first tap
    } else {
        // Add upward velocity to the bird when key is pressed or screen is tapped
        velocityY = -6; // Adjust jump height as needed
    }
    
    // Reset background music for the new game
    if (backgroundMusic.paused) {
        backgroundMusic.currentTime = 0; 
        backgroundMusic.play(); // Play background music again
    }
}

    // Collision detection function
    function detectCollision(rect1, rect2) {
        return !(
            rect1.x + rect1.width < rect2.x ||
            rect1.x > rect2.x + rect2.width ||
            rect1.y + rect1.height < rect2.y ||
            rect1.y > rect2.y + rect2.height
        );
    }