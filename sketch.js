let world;

let trumpQR, bibiQR, le_penQR, mileiQR, museveniQR, putinQR, orbanQR, yoonQR, xiQR;

let figures = [];

function preload() {
  handPose = ml5.handPose({flipped: true});
  indexPic = loadImage("/fingers/indexfinger.png");
  thumbPic = loadImage("/fingers/thumb.png");
  //pinchAnimation = loadImage("/fingers/animation.gif");
  fontAssistant = loadFont("font/Assistant-VariableFont_wght.ttf");
  trumpQR = loadImage("models/trump/trumpQR.png");
  bibiQR = loadImage("models/bibi/bibiQR.png");
  le_penQR = loadImage("models/la_pen/lepenQR.png");
  mileiQR = loadImage("models/milei/mileiQR.png");
  museveniQR = loadImage("models/museveni/museveniQR.png");
  putinQR = loadImage("models/putin/putinQR.png");
  orbanQR = loadImage("models/orban/orbanQR.png");
  yoonQR = loadImage("models/yoon/yoonQR.png");
  xiQR = loadImage("models/xi/xiQR.png");
}



function threeSetupSketch() {
  world = new World();
  world.threeSetup();
  world.loadCustomModel();
  world.setTouchTarget();
  world.addListeners();
  
  // Set up rendering loop
  world.render = world.render.bind(world);
  window.requestAnimationFrame(world.render);
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // ML5
  video = createCapture(VIDEO, { flipped: true });
  video.size(windowWidth, windowHeight);
  video.hide();
  handPose.detectStart(video, gotHands);

  // Three
  threeSetupSketch();
}


function draw() {
  background("white");
  
  //Three
  world.rayCaster();
  world.onPinch();

  //ML5
  pinchFunction();

  //interface
  buttons();

}



function buttons(){

  for (let i = 0; i < 9; i++){
    strokeWeight(0.2);
    rect(0, i * height/9, width/ 6, height /5);
    textSize(20);
    text(figures[i].title, 30, i * (height/9) + height/9/3, width/8);
  }
} 

  function mouseClicked(){
    let buttonWidth = width / 6;
    let buttonHeight = height / 9;
    for (let i = 0; i < 9; i++){

    if(mouseX < buttonWidth && 
      mouseY > i * buttonHeight && 
      mouseY < (i + 1) * buttonHeight){
      
      world.scene.remove(world.model);
      world.figure = figures[i];
      world.loadCustomModel(figures[i]);
      console.log(figures[i]);
      image(world.figure.QR, 200, 200, 150, 150);
  }
  }
}
