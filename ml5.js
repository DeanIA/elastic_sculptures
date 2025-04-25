let video;
let handPose;
let hands = [];

let pinch;
let pinchPos;


function pinchFunction() {
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    if (hand.handedness === "Right") {
      
  
      let indexTip = hand.index_finger_tip;
      let indexMid = hand.index_finger_pip;
      let indexBase = hand.index_finger_mcp;
      image(indexPic, indexTip.x, indexTip.y - width/20, 300, 80);

      let thumbTip = hand.thumb_tip;
      let thumbMid = hand.thumb_ip;
      let thumbBase = hand.thumb_cmc;
      image(thumbPic, thumbTip.x, thumbTip.y, 250, 70);
      

      let distanceFingers = dist(
        indexTip.x,
        indexTip.y,
        thumbTip.x,
        thumbTip.y
      );

      if (distanceFingers < 150) {
        pinch = true; // Set rightPinch based on threshold
        pinchPos = new THREE.Vector3(indexTip.x, indexTip.y, indexTip.z3D);
      } else {
        pinch = false;
      }
    }
  }
}

function gotHands(results) {
  hands = results;
}


